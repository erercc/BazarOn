"""Emergent Object Storage client (review photos). Sync calls — run them in a threadpool."""

import logging
import os

import requests

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "bazaron"
logger = logging.getLogger(__name__)
_storage_key: str | None = None


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _with_key(fn):
    """Run fn(key); on 404 from a dead session key, re-init once and retry."""
    resp = fn(init_storage())
    if resp.status_code == 404 and "storage" in resp.text.lower() and "key" in resp.text.lower():
        resp = fn(init_storage(force=True))
    resp.raise_for_status()
    return resp


def put_object(path: str, data: bytes, content_type: str) -> dict:
    resp = _with_key(lambda key: requests.put(
        f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    ))
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    resp = _with_key(lambda key: requests.get(
        f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60,
    ))
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
