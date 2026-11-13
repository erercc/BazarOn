"""Checkout (cash on delivery or Stripe card), customer orders, payment status + webhook."""

import os
import random
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from lib.auth import current_member
from lib.db import db
from models.shop import Order, OrderCreate, OrderCreated, OrderItem, PaymentStatusOut
from routers.catalog import get_settings

router = APIRouter()
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
TAX_MODE = "calc_only"  # physical goods -> Stripe calculates tax at checkout


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _release_stock(lines: list[tuple[str, int]]) -> None:
    for pid, qty in lines:
        await db.products.update_one({"id": pid}, {"$inc": {"stock": qty, "sold_count": -qty}})


def _create_session(order: Order, origin_url: str):
    line_items = [
        {
            "price_data": {
                "currency": "usd",
                "unit_amount": int(round(i.price * 100)),
                "product_data": {"name": (i.title.en or i.title.ar or i.title.tr) + (f" ({i.size})" if i.size else ""),
                                 "tax_code": "txcd_99999999"},
            },
            "quantity": i.qty,
        }
        for i in order.items
    ]
    if order.shipping_fee > 0:
        line_items.append({
            "price_data": {"currency": "usd", "unit_amount": int(round(order.shipping_fee * 100)),
                           "product_data": {"name": "Shipping", "tax_code": "txcd_92010001"}},
            "quantity": 1,
        })
    kwargs = dict(
        mode="payment",
        line_items=line_items,
        success_url=f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin_url}/payment/cancel?order_id={order.id}",
        metadata={"order_id": order.id, "user_id": order.user_id},
        customer_email=order.customer_email or None,
    )
    if TAX_MODE == "calc_only":
        return stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True}, billing_address_collection="required")
    return stripe.checkout.Session.create(**kwargs)


@router.post("/orders", response_model=OrderCreated)
async def create_order(body: OrderCreate, member: dict = Depends(current_member)):
    settings = await get_settings()
    lines: dict[tuple[str, str], int] = {}
    for line in body.items:
        key = (line.product_id, line.size.strip())
        lines[key] = lines.get(key, 0) + line.qty
    per_product: dict[str, int] = {}
    for (pid, _), qty in lines.items():
        per_product[pid] = per_product.get(pid, 0) + qty

    docs: dict[str, dict] = {}
    reserved: list[tuple[str, int]] = []
    for pid, qty in per_product.items():
        doc = await db.products.find_one({"id": pid, "active": True}, {"_id": 0})
        sizes_ok = doc and all(
            (size in doc.get("sizes", [])) if doc.get("sizes") else size == "" for (p, size) in lines if p == pid
        )
        if doc and not sizes_ok:
            await _release_stock(reserved)
            raise HTTPException(status_code=422, detail={"code": "invalid_size", "product_id": pid})
        doc = await db.products.find_one_and_update(
            {"id": pid, "active": True, "stock": {"$gte": qty}},
            {"$inc": {"stock": -qty, "sold_count": qty}},
            projection={"_id": 0},
        )
        if not doc:
            await _release_stock(reserved)
            raise HTTPException(status_code=409, detail={"code": "out_of_stock", "product_id": pid})
        reserved.append((pid, qty))
        docs[pid] = doc

    items = [
        OrderItem(
            product_id=pid, title=docs[pid]["title"], image=docs[pid]["images"][0], price=docs[pid]["price"],
            qty=qty, size=size, seller_id=docs[pid]["seller_id"], store_name=docs[pid]["store_name"],
        )
        for (pid, size), qty in lines.items()
    ]

    subtotal = round(sum(i.price * i.qty for i in items), 2)
    shipping_fee = 0.0 if subtotal >= settings.free_shipping_over else settings.shipping_fee
    count = await db.orders.estimated_document_count()
    order = Order(
        number=f"SQ{100000 + count + 1}{random.randint(10, 99)}",
        user_id=member["user_id"],
        customer_email=member.get("email", ""),
        items=items,
        shipping=body.shipping,
        payment_method=body.payment_method,
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total=round(subtotal + shipping_fee, 2),
        exchange_rate=settings.exchange_rate,
    )

    checkout_url = None
    if body.payment_method == "card":
        try:
            session = await run_in_threadpool(_create_session, order, body.origin_url.rstrip("/"))
        except stripe.error.StripeError as e:
            await _release_stock(reserved)
            raise HTTPException(status_code=502, detail=f"Payment provider error: {e.user_message or 'unavailable'}")
        await db.payment_transactions.insert_one({
            "session_id": session.id, "order_id": order.id, "user_id": order.user_id,
            "amount": order.total, "currency": "usd", "status": "initiated", "payment_status": "pending",
            "created_at": _now(), "updated_at": _now(),
        })
        checkout_url = session.url

    await db.orders.insert_one(order.model_dump())
    return OrderCreated(order=order, checkout_url=checkout_url)


@router.get("/orders/mine", response_model=list[Order])
async def my_orders(member: dict = Depends(current_member)):
    docs = await db.orders.find({"user_id": member["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Order(**d) for d in docs]


@router.get("/orders/{id}", response_model=Order)
async def get_order(id: str, member: dict = Depends(current_member)):
    scope = {} if member["role"] == "admin" else {"user_id": member["user_id"]}
    doc = await db.orders.find_one({"id": id, **scope}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return Order(**doc)


async def _mark_paid(session_id: str, payment_intent) -> None:
    res = await db.payment_transactions.find_one_and_update(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid", "stripe_payment_intent_id": payment_intent,
                  "updated_at": _now()}},
    )
    if res:
        await db.orders.update_one({"id": res["order_id"]}, {"$set": {"payment_status": "paid", "status": "processing"}})


@router.get("/payments/status/{session_id}", response_model=PaymentStatusOut)
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            s = await run_in_threadpool(stripe.checkout.Session.retrieve, session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await _mark_paid(session_id, s.payment_intent)
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    return PaymentStatusOut(session_id=record["session_id"], status=record["status"],
                            payment_status=record["payment_status"], order_id=record.get("order_id", ""))


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except (stripe.error.SignatureVerificationError, ValueError):
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        if obj.get("payment_status") == "paid" or t.endswith("succeeded"):
            await _mark_paid(obj["id"], obj.get("payment_intent"))
    elif t in ("checkout.session.async_payment_failed", "checkout.session.expired"):
        rec = await db.payment_transactions.find_one_and_update(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "failed", "payment_status": "failed", "updated_at": _now()}},
        )
        if rec:
            await db.orders.update_one({"id": rec["order_id"]}, {"$set": {"payment_status": "failed"}})
    return {"status": "ok"}
