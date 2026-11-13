"""Public catalog: categories, products, settings (exchange rate)."""

import re
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query

from lib.db import db
from models.shop import Category, Product, ProductPage, RelatedOut, Settings

router = APIRouter()

SORTS = {
    "newest": [("created_at", -1)],
    "price_asc": [("price", 1)],
    "price_desc": [("price", -1)],
    "rating": [("rating", -1), ("reviews_count", -1)],
    "bestseller": [("sold_count", -1)],
}


async def get_settings() -> Settings:
    doc = await db.settings.find_one({"key": "global"}, {"_id": 0, "key": 0})
    return Settings(**(doc or {}))


@router.get("/settings", response_model=Settings)
async def read_settings():
    return await get_settings()


@router.get("/categories", response_model=list[Category])
async def list_categories():
    docs = await db.categories.find({}, {"_id": 0}).sort("sort", 1).to_list(100)
    return [Category(**d) for d in docs]


@router.get("/products", response_model=ProductPage)
async def list_products(
    q: str = "",
    category: str = "",
    sub: str = "",
    seller_id: str = "",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    deals: bool = False,
    in_stock: bool = False,
    sort: Literal["newest", "price_asc", "price_desc", "rating", "bestseller"] = "newest",
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=60),
):
    query: dict = {"active": True}
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"title.ar": rx}, {"title.tr": rx}, {"title.en": rx}, {"store_name": rx}]
    if category:
        cat = await db.categories.find_one({"$or": [{"slug": category}, {"id": category}]}, {"_id": 0, "id": 1})
        query["category_id"] = cat["id"] if cat else "__none__"
    if sub:
        query["subcategory"] = sub
    if seller_id:
        query["seller_id"] = seller_id
    price: dict = {}
    if min_price is not None:
        price["$gte"] = min_price
    if max_price is not None:
        price["$lte"] = max_price
    if price:
        query["price"] = price
    if deals:
        query["old_price"] = {"$ne": None}
    if in_stock:
        query["stock"] = {"$gt": 0}
    total = await db.products.count_documents(query)
    docs = (
        await db.products.find(query, {"_id": 0})
        .sort(SORTS[sort])
        .skip((page - 1) * limit)
        .limit(limit)
        .to_list(limit)
    )
    return ProductPage(items=[Product(**d) for d in docs], total=total)


@router.get("/products/{id}", response_model=Product)
async def get_product(id: str):
    doc = await db.products.find_one({"id": id, "active": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**doc)


# Which category completes a bundle for a given category ("complete the look / combo").
COMPLEMENTS = {
    "electronics": ["electronics", "beauty"], "fashion": ["shoes", "beauty"], "shoes": ["fashion"],
    "home": ["kitchen"], "kitchen": ["food", "home"], "food": ["kitchen"], "beauty": ["beauty", "fashion"],
    "toys": ["toys", "food"],
}


@router.get("/products/{id}/related", response_model=RelatedOut)
async def related(id: str):
    p = await db.products.find_one({"id": id, "active": True}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    base = {"active": True, "id": {"$ne": id}, "stock": {"$gt": 0}}
    others = await db.products.find(
        {**base, "category_id": p["category_id"], "seller_id": {"$ne": p["seller_id"]}}, {"_id": 0}
    ).sort("price", 1).limit(6).to_list(6)
    if len(others) < 3:  # thin category: fill with same-category items from any store
        seen = [id] + [o["id"] for o in others]
        others += await db.products.find(
            {**base, "id": {"$nin": seen}, "category_id": p["category_id"]}, {"_id": 0}
        ).sort("rating", -1).limit(6 - len(others)).to_list(6)
    cat = await db.categories.find_one({"id": p["category_id"]}, {"_id": 0, "slug": 1})
    slugs = COMPLEMENTS.get(cat["slug"] if cat else "", [])
    comp_ids = [c["id"] async for c in db.categories.find({"slug": {"$in": slugs}}, {"_id": 0, "id": 1})]
    used = {id, *[o["id"] for o in others]}
    candidates = await db.products.find(
        {**base, "id": {"$nin": list(used)}, "category_id": {"$in": comp_ids}}, {"_id": 0}
    ).sort([("sold_count", -1), ("rating", -1)]).limit(20).to_list(20)
    combo, titles = [], {p["title"]["en"]}
    for c in candidates:  # one listing per distinct item, never the item itself
        if c["title"]["en"] not in titles:
            titles.add(c["title"]["en"])
            combo.append(c)
        if len(combo) == 2:
            break
    return RelatedOut(other_listings=[Product(**o) for o in others], combo=[Product(**c) for c in combo])
