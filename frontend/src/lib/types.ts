// Hand-written mirrors of backend/models/shop.py — keep in sync with the Pydantic models.

export type Lang = "ar" | "tr" | "en";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "cod" | "card";
export type PaymentStatus = "pending" | "paid" | "failed";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type Role = "admin" | "seller" | "customer";
export type SizeType = "none" | "clothing" | "shoe";

export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
export const SHOE_SIZES = Array.from({ length: 12 }, (_, i) => String(35 + i));

export interface I18nText {
  ar: string;
  tr: string;
  en: string;
}

export interface SubCategory {
  slug: string;
  name: I18nText;
}

export interface Category {
  id: string;
  slug: string;
  name: I18nText;
  icon: string;
  image: string;
  sort: number;
  size_type: SizeType;
  subcategories: SubCategory[];
}

export interface ProductIn {
  title: I18nText;
  description: I18nText;
  category_id: string;
  subcategory: string;
  price: number;
  old_price: number | null;
  stock: number;
  images: string[];
  sizes: string[];
}

export interface Product extends ProductIn {
  id: string;
  seller_id: string;
  store_name: string;
  city: string;
  rating: number;
  reviews_count: number;
  sold_count: number;
  active: boolean;
  created_at: string;
}

export interface ProductPage {
  items: Product[];
  total: number;
}

export interface RelatedOut {
  other_listings: Product[];
  combo: Product[];
}

export interface CartLine {
  product_id: string;
  qty: number;
  size: string;
}

export interface ShippingAddress {
  full_name: string;
  phone: string;
  city: string;
  address: string;
  note: string;
}

export interface OrderCreate {
  items: CartLine[];
  shipping: ShippingAddress;
  payment_method: PaymentMethod;
  origin_url: string;
}

export interface OrderItem {
  product_id: string;
  title: I18nText;
  image: string;
  price: number;
  qty: number;
  size: string;
  seller_id: string;
  store_name: string;
}

export interface Order {
  id: string;
  number: string;
  user_id: string;
  customer_email: string;
  items: OrderItem[];
  shipping: ShippingAddress;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  exchange_rate: number;
  created_at: string;
}

export interface OrderCreated {
  order: Order;
  checkout_url: string | null;
}

export interface StatusUpdate {
  status: OrderStatus;
}

export interface PaymentStatusOut {
  session_id: string;
  status: string;
  payment_status: string;
  order_id: string;
}

export interface Settings {
  exchange_rate: number;
  shipping_fee: number;
  free_shipping_over: number;
}

export interface SellerApplicationIn {
  store_name: string;
  phone: string;
  city: string;
  description: string;
}

export interface SellerApplication extends SellerApplicationIn {
  id: string;
  user_id: string;
  email: string;
  status: ApplicationStatus;
  created_at: string;
}

export interface Me {
  user_id: string;
  role: Role;
  email: string;
  name: string;
  store_name: string;
  application_status: ApplicationStatus | null;
}

export interface SellerStats {
  products: number;
  orders: number;
  pending_orders: number;
  revenue: number;
}

export interface AdminStats {
  users: number;
  sellers: number;
  products: number;
  orders: number;
  pending_applications: number;
  revenue: number;
}

export interface UserRow {
  user_id: string;
  role: Role;
  email: string;
  name: string;
  store_name: string;
}

export interface UsersOut {
  roles: Role[];
  users: UserRow[];
}

export interface ReviewIn {
  rating: number;
  comment: string;
  images: string[];
}

export interface Review extends ReviewIn {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface ReviewEligibility {
  can_review: boolean;
  has_reviewed: boolean;
}

export interface UploadOut {
  path: string;
  url: string;
}

export interface WishlistIds {
  ids: string[];
}
