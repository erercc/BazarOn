"""Marketplace models. Each has a hand-written TS mirror in frontend/src/lib/types.ts."""

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

OrderStatus = Literal["pending", "processing", "shipped", "delivered", "cancelled"]
PaymentMethod = Literal["cod", "card"]
PaymentStatus = Literal["pending", "paid", "failed"]
ApplicationStatus = Literal["pending", "approved", "rejected"]
SizeType = Literal["none", "clothing", "shoe"]

CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]
SHOE_SIZES = [str(n) for n in range(35, 47)]


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class I18nText(BaseModel):
    ar: str = ""
    tr: str = ""
    en: str = ""


class SubCategory(BaseModel):
    slug: str
    name: I18nText


class Category(BaseModel):
    id: str = Field(default_factory=_id)
    slug: str
    name: I18nText
    icon: str = "Package"
    image: str = ""
    sort: int = 0
    size_type: SizeType = "none"
    subcategories: list[SubCategory] = Field(default_factory=list)


class ProductIn(BaseModel):
    title: I18nText
    description: I18nText = Field(default_factory=I18nText)
    category_id: str
    subcategory: str = ""  # SubCategory.slug within category
    price: float = Field(gt=0)  # USD
    old_price: Optional[float] = Field(default=None, gt=0)
    stock: int = Field(ge=0)
    images: list[str] = Field(min_length=1, max_length=8)
    sizes: list[str] = Field(default_factory=list)  # offered sizes, e.g. ["S","M","L"] or ["40","41"]


class Product(ProductIn):
    id: str = Field(default_factory=_id)
    seller_id: str
    store_name: str
    city: str = ""
    rating: float = 0
    reviews_count: int = 0
    sold_count: int = 0
    active: bool = True
    created_at: datetime = Field(default_factory=_now)


class ProductPage(BaseModel):
    items: list[Product]
    total: int


class RelatedOut(BaseModel):
    other_listings: list[Product]  # same category, other stores
    combo: list[Product]  # complementary items to bundle


class CartLine(BaseModel):
    product_id: str
    qty: int = Field(ge=1, le=99)
    size: str = ""


class ShippingAddress(BaseModel):
    full_name: str = Field(min_length=2)
    phone: str = Field(min_length=6)
    city: str = Field(min_length=2)
    address: str = Field(min_length=4)
    note: str = ""


class OrderCreate(BaseModel):
    items: list[CartLine] = Field(min_length=1)
    shipping: ShippingAddress
    payment_method: PaymentMethod
    origin_url: str


class OrderItem(BaseModel):
    product_id: str
    title: I18nText
    image: str
    price: float
    qty: int
    size: str = ""
    seller_id: str
    store_name: str


class Order(BaseModel):
    id: str = Field(default_factory=_id)
    number: str
    user_id: str
    customer_email: str = ""
    items: list[OrderItem]
    shipping: ShippingAddress
    payment_method: PaymentMethod
    payment_status: PaymentStatus = "pending"
    status: OrderStatus = "pending"
    subtotal: float
    shipping_fee: float
    total: float
    exchange_rate: float
    created_at: datetime = Field(default_factory=_now)


class OrderCreated(BaseModel):
    order: Order
    checkout_url: Optional[str] = None


class StatusUpdate(BaseModel):
    status: OrderStatus


class PaymentStatusOut(BaseModel):
    session_id: str
    status: str
    payment_status: str
    order_id: str = ""


class Settings(BaseModel):
    exchange_rate: float = Field(default=110, gt=0)  # new SYP (two zeros removed) per 1 USD
    shipping_fee: float = Field(default=2.0, ge=0)  # USD
    free_shipping_over: float = Field(default=50.0, ge=0)  # USD


class SellerApplicationIn(BaseModel):
    store_name: str = Field(min_length=2, max_length=60)
    phone: str = Field(min_length=6)
    city: str = Field(min_length=2)
    description: str = ""


class SellerApplication(SellerApplicationIn):
    id: str = Field(default_factory=_id)
    user_id: str
    email: str = ""
    status: ApplicationStatus = "pending"
    created_at: datetime = Field(default_factory=_now)


class ApplicationDecision(BaseModel):
    status: Literal["approved", "rejected"]


class Me(BaseModel):
    user_id: str
    role: str
    email: str = ""
    name: str = ""
    store_name: str = ""
    application_status: Optional[ApplicationStatus] = None


class SellerStats(BaseModel):
    products: int
    orders: int
    pending_orders: int
    revenue: float


class AdminStats(BaseModel):
    users: int
    sellers: int
    products: int
    orders: int
    pending_applications: int
    revenue: float


class UserRow(BaseModel):
    user_id: str
    role: str
    email: str = ""
    name: str = ""
    store_name: str = ""


class UsersOut(BaseModel):
    roles: list[str]
    users: list[UserRow]


class RoleIn(BaseModel):
    role: str


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)
    images: list[str] = Field(default_factory=list, max_length=4)  # /api/files/... urls from POST /uploads


class Review(ReviewIn):
    id: str = Field(default_factory=_id)
    product_id: str
    user_id: str
    user_name: str = ""
    created_at: datetime = Field(default_factory=_now)


class ReviewEligibility(BaseModel):
    can_review: bool
    has_reviewed: bool


class UploadOut(BaseModel):
    path: str
    url: str


class WishlistIds(BaseModel):
    ids: list[str]
