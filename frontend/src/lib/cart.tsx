import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { I18nText, Product } from "@/lib/types";

export interface CartItem {
  key: string; // product_id::size
  product_id: string;
  size: string;
  qty: number;
  title: I18nText;
  price: number;
  image: string;
  store_name: string;
  stock: number;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (p: Product, qty?: number, size?: string) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "bazaron-cart";
export const lineKey = (productId: string, size: string) => `${productId}::${size}`;

function load(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? (raw as CartItem[]).filter((i) => typeof i.key === "string") : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((p: Product, qty = 1, size = "") => {
    const key = lineKey(p.id, size);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, qty: Math.min(i.qty + qty, p.stock, 99), stock: p.stock, price: p.price } : i,
        );
      }
      return [
        ...prev,
        {
          key,
          product_id: p.id,
          size,
          qty: Math.min(qty, p.stock),
          title: p.title,
          price: p.price,
          image: p.images[0] ?? "",
          store_name: p.store_name,
          stock: p.stock,
        },
      ];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(qty, i.stock || 99, 99)) } : i)));
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = Math.round(items.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100;
    return { items, count, subtotal, add, setQty, remove, clear };
  }, [items, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
}
