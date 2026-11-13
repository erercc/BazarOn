"""Seller hub: own products CRUD, own orders, stats. Admins may sell too."""

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from lib.auth import require_role
from lib.db import db
from models.shop import Order, Product, ProductIn, SellerStats, StatusUpdate

router = APIRouter(prefix="/seller")
seller_only = require_role("seller", "admin")


async def _assert_category(category_id: str, subcategory: str = "") -> None:
    cat = await db.categories.find_one({"id": category_id}, {"_id": 0, "subcategories": 1})
    if not cat:
        raise HTTPException(status_code=422, detail="Unknown category")
    if subcategory and subcategory not in {s["slug"] for s in cat.get("subcategories", [])}:
        raise HTTPException(status_code=422, detail="Unknown subcategory")


@router.get("/products", response_model=list[Product])
async def my_products(member: dict = Depends(seller_only)):
    docs = await db.products.find({"seller_id": member["user_id"], "active": True}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Product(**d) for d in docs]


@router.post("/products", response_model=Product)
async def create_product(body: ProductIn, member: dict = Depends(seller_only)):
    await _assert_category(body.category_id, body.subcategory)
    product = Product(
        **body.model_dump(),
        seller_id=member["user_id"],
        store_name=member.get("store_name") or "BazarOn",
        city=member.get("city", ""),
    )
    await db.products.insert_one(product.model_dump())
    return product


@router.put("/products/{id}", response_model=Product)
async def update_product(id: str, body: ProductIn, member: dict = Depends(seller_only)):
    await _assert_category(body.category_id, body.subcategory)
    res = await db.products.find_one_and_update(
        {"id": id, "seller_id": member["user_id"], "active": True}, {"$set": body.model_dump()},
        projection={"_id": 0}, return_document=ReturnDocument.AFTER,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Not found")
    return Product(**res)


@router.delete("/products/{id}")
async def delete_product(id: str, member: dict = Depends(seller_only)):
    # Soft delete: past orders keep their snapshot, the product just leaves the catalog.
    res = await db.products.update_one({"id": id, "seller_id": member["user_id"]}, {"$set": {"active": False}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@router.get("/orders", response_model=list[Order])
async def my_orders(member: dict = Depends(seller_only)):
    uid = member["user_id"]
    docs = await db.orders.find({"items.seller_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # A seller only sees their own lines of a multi-seller order.
    return [Order(**{**d, "items": [i for i in d["items"] if i["seller_id"] == uid]}) for d in docs]


@router.patch("/orders/{id}/status", response_model=Order)
async def set_order_status(id: str, body: StatusUpdate, member: dict = Depends(seller_only)):
    update: dict = {"status": body.status}
    doc = await db.orders.find_one({"id": id, "items.seller_id": member["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if body.status == "delivered" and doc["payment_method"] == "cod":
        update["payment_status"] = "paid"
    await db.orders.update_one({"id": id}, {"$set": update})
    return Order(**{**doc, **update})


@router.get("/stats", response_model=SellerStats)
async def stats(member: dict = Depends(seller_only)):
    uid = member["user_id"]
    products = await db.products.count_documents({"seller_id": uid})
    orders = await db.orders.find({"items.seller_id": uid}, {"_id": 0, "items": 1, "status": 1}).to_list(5000)
    revenue = sum(
        i["price"] * i["qty"] for o in orders if o["status"] != "cancelled" for i in o["items"] if i["seller_id"] == uid
    )
    return SellerStats(
        products=products,
        orders=len(orders),
        pending_orders=sum(1 for o in orders if o["status"] in ("pending", "processing")),
        revenue=round(revenue, 2),
    )
