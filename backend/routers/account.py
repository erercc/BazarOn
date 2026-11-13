"""Signed-in user: profile + seller application."""

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_member
from lib.db import db
from models.shop import Me, SellerApplication, SellerApplicationIn

router = APIRouter()


@router.get("/me", response_model=Me)
async def me(member: dict = Depends(current_member)):
    app = await db.seller_applications.find_one({"user_id": member["user_id"]}, {"_id": 0, "status": 1})
    return Me(
        user_id=member["user_id"],
        role=member["role"],
        email=member.get("email", ""),
        name=member.get("name", ""),
        store_name=member.get("store_name", ""),
        application_status=app["status"] if app else None,
    )


@router.post("/seller/apply", response_model=SellerApplication)
async def apply_seller(body: SellerApplicationIn, member: dict = Depends(current_member)):
    if member["role"] in ("seller", "admin"):
        raise HTTPException(status_code=409, detail="Already a seller")
    existing = await db.seller_applications.find_one({"user_id": member["user_id"]}, {"_id": 0})
    if existing and existing["status"] == "pending":
        raise HTTPException(status_code=409, detail="Application already pending")
    app = SellerApplication(**body.model_dump(), user_id=member["user_id"], email=member.get("email", ""))
    await db.seller_applications.replace_one({"user_id": member["user_id"]}, app.model_dump(), upsert=True)
    return app
