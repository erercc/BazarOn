import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Star, Store } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { Price } from "@/lib/currency";
import { useWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export function discountPct(p: Pick<Product, "price" | "old_price">): number {
  return p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
}

export function DiscountBadge({ pct, large }: { pct: number; large?: boolean }) {
  const { t } = useI18n();
  return (
    <span
      dir="ltr"
      data-testid="discount-badge"
      className={
        large
          ? "absolute start-4 top-4 z-10 rounded-xl bg-red-600 px-3 py-1.5 text-lg font-black text-white shadow-lg"
          : "absolute start-2 top-2 rounded-lg bg-red-600 px-2 py-1 text-sm font-black leading-none text-white shadow-md"
      }
    >
      %{pct}
      <span className={large ? "ms-1 text-xs font-bold" : "ms-0.5 text-[10px] font-bold"}>{t("off")}</span>
    </span>
  );
}

// Old price (thin strike) + discount % on top, discounted price below.
export function PriceStack({ price, oldPrice, size = "sm", testId }: { price: number; oldPrice: number | null; size?: "sm" | "lg"; testId?: string }) {
  const pct = discountPct({ price, old_price: oldPrice });
  return (
    <div className="flex flex-col" data-testid={testId}>
      {pct > 0 && oldPrice && (
        <span className="flex items-center gap-1.5">
          <Price usd={oldPrice} className={cn("text-slate-400 line-through decoration-1", size === "lg" ? "text-sm" : "text-[11px]")} />
          <span dir="ltr" className={cn("rounded bg-red-50 px-1 font-black text-red-600", size === "lg" ? "text-xs" : "text-[10px]")}>
            %{pct}
          </span>
        </span>
      )}
      <Price
        usd={price}
        className={cn("font-bold", pct > 0 ? "text-red-600" : "text-slate-900", size === "lg" ? "text-lg" : "text-[12.5px]")}
        testId={testId ? `${testId}-current` : undefined}
      />
    </div>
  );
}

export function WishButton({ productId, className }: { productId: string; className?: string }) {
  const { ids, toggle } = useWishlist();
  const { t } = useI18n();
  const on = ids.has(productId);
  return (
    <button
      type="button"
      aria-label={t("add_to_wishlist")}
      aria-pressed={on}
      data-testid={`wishlist-toggle-${productId}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-white/95 shadow-md transition-transform duration-150 hover:scale-110 active:scale-90",
        className,
      )}
    >
      <Heart className={cn("size-[18px] transition-colors", on ? "fill-red-500 text-red-500" : "text-slate-500")} />
    </button>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={i <= Math.round(value) ? "size-3.5 fill-amber-400 text-amber-400" : "size-3.5 text-slate-300"}
          />
        ))}
      </span>
      <span className="font-semibold text-slate-700" dir="ltr">
        {value.toFixed(1)}
      </span>
      {count !== undefined && <span dir="ltr">({count})</span>}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { tx, t } = useI18n();
  const { add } = useCart();
  const navigate = useNavigate();
  const pct = discountPct(product);
  const soldOut = product.stock <= 0;

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_14px_30px_-16px_rgba(15,23,42,0.35)]"
    >
      <Link to={`/product/${product.id}`} className="relative block aspect-square overflow-hidden bg-slate-100" data-testid={`product-card-link-${product.id}`}>
        <img
          src={product.images[0]}
          alt={tx(product.title)}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {pct > 0 && <DiscountBadge pct={pct} />}
        <WishButton productId={product.id} className="absolute end-2 top-2" />
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/80 py-1 text-center text-xs font-bold text-white">
            {t("out_of_stock")}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700">
          <Store className="size-3" />
          {product.store_name}
        </span>
        <Link to={`/product/${product.id}`} className="line-clamp-2 min-h-10 text-[13px] font-semibold leading-5 text-slate-800 hover:text-primary">
          {tx(product.title)}
        </Link>
        <Rating value={product.rating} count={product.reviews_count} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <PriceStack price={product.price} oldPrice={product.old_price} testId={`product-card-price-${product.id}`} />
          <button
            data-testid={`product-card-add-${product.id}`}
            disabled={soldOut}
            aria-label={t("add_to_cart")}
            onClick={() => {
              if (product.sizes.length) {
                toast(t("select_size_first"));
                navigate(`/product/${product.id}`);
                return;
              }
              add(product);
              toast.success(t("added_to_cart"));
            }}
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary transition-[background-color,color,transform] duration-150 hover:bg-primary hover:text-white active:scale-90 disabled:opacity-40"
          >
            <ShoppingCart className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ n = 10 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="aspect-square animate-pulse bg-slate-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </>
  );
}
