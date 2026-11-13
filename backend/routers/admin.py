"""Admin console: stats, seller applications, all orders, settings, users & roles."""

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import IN_ENV, RANK, ROLES, effective_role, require_role
from lib.db import db
from models.shop import (
    AdminStats, ApplicationDecision, Order, RoleIn, SellerApplication, Settings, StatusUpdate, UserRow, UsersOut,
)

router = APIRouter()
admin_only = require_role("admin")


@router.get("/admin/stats", response_model=AdminStats)
async def stats(_: dict = Depends(admin_only)):
    orders = await db.orders.find({"status": {"$ne": "cancelled"}}, {"_id": 0, "total": 1}).to_list(10000)
    return AdminStats(
        users=await db.users.count_documents(IN_ENV),
        sellers=await db.users.count_documents({"role": "seller", **IN_ENV}),
        products=await db.products.count_documents({}),
        orders=await db.orders.count_documents({}),
        pending_applications=await db.seller_applications.count_documents({"status": "pending"}),
        revenue=round(sum(o["total"] for o in orders), 2),
    )


@router.get("/admin/applications", response_model=list[SellerApplication])
async def applications(_: dict = Depends(admin_only)):
    docs = await db.seller_applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [SellerApplication(**d) for d in docs]


@router.patch("/admin/applications/{id}", response_model=SellerApplication)
async def decide(id: str, body: ApplicationDecision, _: dict = Depends(admin_only)):
    app = await db.seller_applications.find_one({"id": id}, {"_id": 0})
    if not app:
        raise HTTPException(status_code=404, detail="Not found")
    await db.seller_applications.update_one({"id": id}, {"$set": {"status": body.status}})
    if body.status == "approved":
        user = await db.users.find_one({"user_id": app["user_id"]}, {"_id": 0, "role": 1})
        role_update = {} if user and effective_role(user.get("role")) == "admin" else {"role": "seller"}
        await db.users.update_one(
            {"user_id": app["user_id"]},
            {"$set": {**role_update, "store_name": app["store_name"], "city": app["city"]}},
        )
    return SellerApplication(**{**app, "status": body.status})


@router.get("/admin/orders", response_model=list[Order])
async def all_orders(_: dict = Depends(admin_only)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Order(**d) for d in docs]


@router.patch("/admin/orders/{id}/status", response_model=Order)
async def set_status(id: str, body: StatusUpdate, _: dict = Depends(admin_only)):
    doc = await db.orders.find_one({"id": id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    update: dict = {"status": body.status}
    if body.status == "delivered" and doc["payment_method"] == "cod":
        update["payment_status"] = "paid"
    await db.orders.update_one({"id": id}, {"$set": update})
    return Order(**{**doc, **update})


@router.put("/admin/settings", response_model=Settings)
async def save_settings(body: Settings, _: dict = Depends(admin_only)):
    await db.settings.update_one({"key": "global"}, {"$set": body.model_dump()}, upsert=True)
    return body


@router.get("/users", response_model=UsersOut)
async def list_users(admin: dict = Depends(admin_only)):
    people = await db.users.find(IN_ENV, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return UsersOut(
        roles=[r for r in ROLES if RANK[r] <= RANK[admin["role"]]],
        users=[
            UserRow(user_id=p["user_id"], role=effective_role(p.get("role")), email=p.get("email", ""),
                    name=p.get("name", ""), store_name=p.get("store_name", ""))
            for p in people
        ],
    )


@router.patch("/users/{user_id}/role")
async def set_role(user_id: str, body: RoleIn, admin: dict = Depends(admin_only)):
    if body.role not in ROLES or RANK[body.role] > RANK[admin["role"]]:
        raise HTTPException(status_code=403, detail="Not allowed")
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if target is None:
        raise HTTPException(status_code=404, detail="Not found")
    if (effective_role(target.get("role")) == "admin" and body.role != "admin"
            and await db.users.count_documents({"role": "admin", **IN_ENV}) <= 1):
        raise HTTPException(status_code=409, detail="Keep at least one admin")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": body.role}})
    return {"user_id": user_id, "role": body.role}
