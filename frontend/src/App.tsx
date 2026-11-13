import { Routes, Route } from "react-router-dom";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import { AuthBridge } from "@/lib/auth";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Orders, { OrderDetail } from "@/pages/Orders";
import { PaymentCancel, PaymentSuccess } from "@/pages/Payment";
import SellerApply from "@/pages/SellerApply";
import SellerDashboard from "@/pages/SellerDashboard";
import Admin from "@/pages/Admin";
import Wishlist from "@/pages/Wishlist";
import { SignInPage, SignUpPage } from "@/pages/AuthPages";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <ClerkAuthProvider>
      <AuthBridge />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/seller/apply" element={<SellerApply />} />
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </ClerkAuthProvider>
  );
}
