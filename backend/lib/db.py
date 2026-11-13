"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True),
              IndexModel([("role", ASCENDING)], name="role")],
    "categories": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                   IndexModel([("slug", ASCENDING)], name="slug", unique=True)],
    "products": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                 IndexModel([("active", ASCENDING), ("category_id", ASCENDING), ("created_at", DESCENDING)], name="cat_created"),
                 IndexModel([("seller_id", ASCENDING), ("created_at", DESCENDING)], name="seller_created")],
    "orders": [IndexModel([("id", ASCENDING)], name="id", unique=True),
               IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created"),
               IndexModel([("items.seller_id", ASCENDING), ("created_at", DESCENDING)], name="seller_created")],
    "seller_applications": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                            IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "payment_transactions": [IndexModel([("session_id", ASCENDING)], name="session_id", unique=True)],
    "settings": [IndexModel([("key", ASCENDING)], name="key", unique=True)],
    "reviews": [IndexModel([("product_id", ASCENDING), ("user_id", ASCENDING)], name="product_user", unique=True),
                IndexModel([("product_id", ASCENDING), ("created_at", DESCENDING)], name="product_created")],
    "wishlists": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "files": [IndexModel([("storage_path", ASCENDING)], name="storage_path", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
