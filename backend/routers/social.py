"""Verified-purchase reviews with photos, file uploads, and the wishlist."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from starlette.concurrency import run_in_threadpool

from lib.auth import current_member
from lib.db import db
from lib.storage import APP_NAME, get_object, put_object
from models.shop import Product, Review, ReviewEligibility, ReviewIn, UploadOut, WishlistIds

router = APIRouter()

IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
MAX_BYTES = 5 * 1024 * 1024
FILES_PREFIX = "/api/files/"


# ---------- uploads ----------
@router.post("/uploads", response_model=UploadOut)
async def upload(file: UploadFile = File(...), member: dict = Depends(current_member)):
    ext = IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, WEBP or GIF images")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image larger than 5 MB")
    path = f"{APP_NAME}/reviews/{member['user_id']}/{uuid.uuid4()}.{ext}"
    result = await run_in_threadpool(put_object, path, data, file.content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"], "owner_id": member["user_id"],
        "original_filename": file.filename, "content_type": file.content_type, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": datetime.now(timezone.utc),
    })
    return UploadOut(path=result["path"], url=FILES_PREFIX + result["path"])


@router.get("/files/{path:path}")
async def download(path: str):
    # Review photos are public; only files recorded in db.files are served.
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = await run_in_threadpool(get_object, path)
    return Response(content=data, media_type=record.get("content_type") or content_type,
                    headers={"Cache-Control": "public, max-age=86400"})


# ---------- reviews ----------
async def _has_purchased(user_id: str, product_id: str) -> bool:
    return bool(await db.orders.find_one(
        {"user_id": user_id, "items.product_id": product_id, "status": {"$ne": "cancelled"}}, {"_id": 1}
    ))


@router.get("/products/{id}/reviews", response_model=list[Review])
async def list_reviews(id: str):
    docs = await db.reviews.find({"product_id": id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Review(**d) for d in docs]


@router.get("/products/{id}/review-eligibility", response_model=ReviewEligibility)
async def eligibility(id: str, member: dict = Depends(current_member)):
    reviewed = bool(await db.reviews.find_one({"product_id": id, "user_id": member["user_id"]}, {"_id": 1}))
    bought = await _has_purchased(member["user_id"], id)
    return ReviewEligibility(can_review=bought and not reviewed, has_reviewed=reviewed)


@router.post("/products/{id}/reviews", response_model=Review)
async def create_review(id: str, body: ReviewIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    product = await db.products.find_one({"id": id}, {"_id": 0, "rating": 1, "reviews_count": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not await _has_purchased(uid, id):
        raise HTTPException(status_code=403, detail={"code": "not_purchased"})
    paths = [u.removeprefix(FILES_PREFIX) for u in body.images]
    if paths and await db.files.count_documents({"storage_path": {"$in": paths}, "owner_id": uid}) != len(set(paths)):
        raise HTTPException(status_code=422, detail="Unknown image")
    review = Review(**body.model_dump(), product_id=id, user_id=uid, user_name=member.get("name", ""))
    res = await db.reviews.update_one(
        {"product_id": id, "user_id": uid}, {"$setOnInsert": review.model_dump()}, upsert=True
    )
    if res.upserted_id is None:
        raise HTTPException(status_code=409, detail={"code": "already_reviewed"})
    count = product.get("reviews_count", 0)
    rating = round((product.get("rating", 0) * count + body.rating) / (count + 1), 2)
    await db.products.update_many({"id": id}, {"$set": {"rating": rating}, "$inc": {"reviews_count": 1}})
    return review


# ---------- wishlist ----------
async def _ids(uid: str) -> list[str]:
    doc = await db.wishlists.find_one({"user_id": uid}, {"_id": 0, "product_ids": 1})
    return (doc or {}).get("product_ids", [])


@router.get("/wishlist/ids", response_model=WishlistIds)
async def wishlist_ids(member: dict = Depends(current_member)):
    return WishlistIds(ids=await _ids(member["user_id"]))


@router.get("/wishlist", response_model=list[Product])
async def wishlist(member: dict = Depends(current_member)):
    ids = await _ids(member["user_id"])
    docs = await db.products.find({"id": {"$in": ids}, "active": True}, {"_id": 0}).to_list(500)
    order = {pid: i for i, pid in enumerate(reversed(ids))}  # newest first
    return [Product(**d) for d in sorted(docs, key=lambda d: order.get(d["id"], 0))]


@router.put("/wishlist/{product_id}", response_model=WishlistIds)
async def add_wishlist(product_id: str, member: dict = Depends(current_member)):
    if not await db.products.find_one({"id": product_id, "active": True}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Product not found")
    await db.wishlists.update_one(
        {"user_id": member["user_id"]}, {"$addToSet": {"product_ids": product_id}}, upsert=True
    )
    return WishlistIds(ids=await _ids(member["user_id"]))


@router.delete("/wishlist/{product_id}", response_model=WishlistIds)
async def remove_wishlist(product_id: str, member: dict = Depends(current_member)):
    await db.wishlists.update_one({"user_id": member["user_id"]}, {"$pull": {"product_ids": product_id}})
    return WishlistIds(ids=await _ids(member["user_id"]))
