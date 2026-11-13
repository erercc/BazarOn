"""Roles on top of Clerk identity. The role list is code; each person's role is data in db.users."""

import os
from datetime import datetime, timezone

import requests
from fastapi import Depends, HTTPException
from pymongo import ReturnDocument
from starlette.concurrency import run_in_threadpool

try:  # launched as `backend.server`
    from backend.clerk_auth import require_user
except ModuleNotFoundError:  # launched from inside backend/ as `server`
    from clerk_auth import require_user

from lib.db import db

# Highest first; keep `admin`.
ROLES = ["admin", "seller", "customer"]
DEFAULT_ROLE = "customer"
RETIRED_ROLES: dict[str, str] = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}

ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


async def move_retired_roles() -> None:
    for old, new in RETIRED_ROLES.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})


def _clerk_user(user_id: str) -> dict:  # one Clerk lookup on first sign-in, never per request
    r = requests.get(
        f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
        headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"},
    )
    r.raise_for_status()
    return r.json()


def _is_admin_email(clerk_user: dict) -> bool:
    admins = {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}
    return any(
        e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified"
        for e in clerk_user.get("email_addresses", [])
    )


def _profile(clerk_user: dict) -> dict:
    emails = clerk_user.get("email_addresses", [])
    primary = next((e for e in emails if e.get("id") == clerk_user.get("primary_email_address_id")), None)
    email = (primary or (emails[0] if emails else {})).get("email_address", "")
    name = " ".join(p for p in [clerk_user.get("first_name"), clerk_user.get("last_name")] if p) or email.split("@")[0]
    return {"email": email, "name": name}


async def current_member(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if member is None or not member.get("role"):  # first sign-in
        cu = await run_in_threadpool(_clerk_user, uid)
        role = "admin" if _is_admin_email(cu) else DEFAULT_ROLE
        await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": role}})
        member = await db.users.find_one_and_update(
            {"user_id": uid},
            {"$setOnInsert": {"user_id": uid, "role": role, "created_at": datetime.now(timezone.utc)},
             "$set": _profile(cu)},
            upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER,
        )
    if member.get("env") != ENV:
        await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV}})
    return {**member, "env": ENV, "role": effective_role(member["role"])}


def require_role(*roles: str):
    async def check(member: dict = Depends(current_member)) -> dict:
        if member["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not allowed")
        return member
    return check
