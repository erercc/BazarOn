import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin, Minus, Plus, ShieldCheck, ShoppingCart, Store, Truck, Wallet, Check, Plus as PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useCurrency, Price } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import type { Product, ProductPage, RelatedOut } from "@/lib/types";
import { ProductCard, Rating, DiscountBadge, PriceStack, WishButton, discountPct } from "@/components/ProductCard";
import { Reviews } from "@/components/Reviews";
import { ProductGallery } from "@/components/ProductGallery";
import { useCategories } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QtyStepper({ value, max, onChange, testId }: { value: number; max: number; onChange: (n: number) => void; testId: string }) {
  return (
    <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white" dir="ltr">
      <button data-testid={`${testId}-decrease`} onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className="grid size-10 place-items-center text-slate-600 transition-colors hover:text-primary disabled:opacity-30">
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center font-bold tabular-nums" data-testid={`${testId}-value`}>
        {value}
      </span>
      <button data-testid={`${testId}-increase`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="grid size-10 place-items-center text-slate-600 transition-colors hover:text-primary disabled:opacity-30">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function SizePicker({ sizes, value, onChange, testId, compact }: { sizes: string[]; value: string; onChange: (s: string) => void; testId: string; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {sizes.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          data-testid={`${testId}-${s}`}
          onClick={() => onChange(value === s ? "" : s)}
          className={cn(
            "rounded-lg border-2 font-bold transition-[border-color,background-color,color] duration-150",
            compact ? "min-w-9 px-1.5 py-0.5 text-[11px]" : "min-w-12 px-3 py-1.5 text-sm",
            value === s ? "border-primary bg-teal-50 text-primary" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400",
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function OtherSellers({ items }: { items: Product[] }) {
  const { t, tx } = useI18n();
  const { format } = useCurrency();
  const { add } = useCart();
  const navigate = useNavigate();
  if (items.length === 0) return null;
  return (
    <section className="mt-12" data-testid="product-other-sellers">
      <h2 className="text-xl font-black text-slate-900">{t("other_sellers")}</h2>
      <p className="mb-4 text-sm text-slate-500">{t("other_sellers_sub")}</p>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {items.map((o) => (
          <div key={o.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4" data-testid={`other-seller-row-${o.id}`}>
            <Link to={`/product/${o.id}`} className="shrink-0">
              <img src={o.images[0]} alt="" className="size-16 rounded-xl object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/product/${o.id}`} className="line-clamp-1 text-sm font-semibold text-slate-800 hover:text-primary">{tx(o.title)}</Link>
              <p className="flex items-center gap-1 text-xs font-bold text-sky-700"><Store className="size-3" /> {o.store_name}</p>
              <Rating value={o.rating} count={o.reviews_count} />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-sm font-bold text-slate-900" dir="ltr"><Price usd={o.price} /></span>
              <Button
                size="sm"
                variant="outline"
                data-testid={`other-seller-add-${o.id}`}
                onClick={() => {
                  if (o.sizes.length) return navigate(`/product/${o.id}`);
                  add(o);
                  toast.success(t("added_to_cart"));
                }}
              >
                {o.sizes.length ? t("view") : <><ShoppingCart className="size-3.5" /> {t("add_to_cart")}</>}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Combo({ main, mainSize, items }: { main: Product; mainSize: string; items: Product[] }) {
  const { t, tx } = useI18n();
  const { format } = useCurrency();
  const { add } = useCart();
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, true])));
  const [sizes, setSizes] = useState<Record<string, string>>({});
  if (items.length === 0 || main.stock <= 0) return null;

  const chosen = items.filter((i) => picked[i.id]);
  const total = main.price + chosen.reduce((s, i) => s + i.price, 0);

  const addAll = () => {
    if (main.sizes.length && !mainSize) return toast.error(t("select_size_first"));
    if (chosen.some((i) => i.sizes.length && !sizes[i.id])) return toast.error(t("select_size_first"));
    add(main, 1, mainSize);
    chosen.forEach((i) => add(i, 1, sizes[i.id] ?? ""));
    toast.success(t("combo_added"));
  };

  const all = [main, ...items];
  return (
    <section className="mt-12 rounded-3xl border border-teal-100 bg-teal-50/50 p-4 sm:p-6" data-testid="product-combo">
      <h2 className="text-xl font-black text-slate-900">{t("combo_title")}</h2>
      <p className="mb-4 text-sm text-slate-500">{t("combo_sub")}</p>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap items-stretch gap-2 sm:flex-nowrap">
          {all.map((p, idx) => {
            const isMain = idx === 0;
            const on = isMain || picked[p.id];
            return (
              <div key={p.id} className="flex items-center gap-2">
                {idx > 0 && <PlusIcon className="size-5 shrink-0 text-slate-400" />}
                <div className={cn("relative flex w-40 flex-col gap-1.5 rounded-2xl border-2 bg-white p-2.5 transition-[border-color,opacity] duration-150", on ? "border-primary" : "border-slate-200 opacity-60")} data-testid={`combo-item-${p.id}`}>
                  {!isMain && (
                    <button
                      aria-label="toggle"
                      data-testid={`combo-toggle-${p.id}`}
                      onClick={() => setPicked((s) => ({ ...s, [p.id]: !s[p.id] }))}
                      className={cn("absolute end-2 top-2 z-10 grid size-6 place-items-center rounded-md border-2 transition-colors", on ? "border-primary bg-primary text-white" : "border-slate-300 bg-white")}
                    >
                      {on && <Check className="size-4" />}
                    </button>
                  )}
                  <Link to={`/product/${p.id}`}>
                    <img src={p.images[0]} alt="" className="aspect-square w-full rounded-xl object-cover" />
                  </Link>
                  <span className="line-clamp-2 min-h-8 text-[12px] font-semibold leading-4 text-slate-700">{isMain ? `${t("this_item")}: ` : ""}{tx(p.title)}</span>
                  {!isMain && p.sizes.length > 0 && on && (
                    <SizePicker compact sizes={p.sizes} value={sizes[p.id] ?? ""} onChange={(v) => setSizes((s) => ({ ...s, [p.id]: v }))} testId={`combo-size-${p.id}`} />
                  )}
                  {isMain && mainSize && <span className="text-[11px] font-bold text-primary">{t("size")}: {mainSize}</span>}
                  <span className="text-[13px] font-bold text-slate-900" dir="ltr"><Price usd={p.price} /></span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 lg:w-64">
          <span className="text-sm text-slate-500">{t("combo_total", { n: chosen.length + 1 })}</span>
          <span className="text-xl font-black text-slate-900" dir="ltr" data-testid="combo-total"><Price usd={total} /></span>
          <Button className="h-11 font-bold" onClick={addAll} data-testid="combo-add-button">
            <ShoppingCart className="size-4" /> {t("combo_add")}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function ProductDetailRoute() {
  const { id = "" } = useParams();
  return <ProductDetail key={id} id={id} />; // fresh size/qty state per product
}

function ProductDetail({ id }: { id: string }) {
  const { t, tx } = useI18n();
  const { format, currency } = useCurrency();
  const { add } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("");
  const { data: categories } = useCategories();

  const { data: p, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiGet<Product>(`/products/${id}`),
  });
  const related = useQuery({
    queryKey: ["product", id, "related"],
    queryFn: () => apiGet<RelatedOut>(`/products/${id}/related`),
    enabled: !!p,
  });
  const similar = useQuery({
    queryKey: ["products", "similar", p?.category_id],
    queryFn: () => apiGet<ProductPage>(`/products?category=${p?.category_id}&limit=8&sort=bestseller`),
    enabled: !!p,
  });

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 lg:px-8">
        <div className="aspect-square animate-pulse rounded-3xl bg-slate-200" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }
  if (isError || !p) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center text-slate-500" data-testid="product-not-found">
        {t("no_results")}
        <div className="mt-4">
          <Link to="/products" className="font-bold text-primary">{t("continue_shopping")}</Link>
        </div>
      </div>
    );
  }

  const pct = discountPct(p);
  const cat = categories?.find((c) => c.id === p.category_id);
  const soldOut = p.stock <= 0;
  const needsSize = p.sizes.length > 0;
  const addToCart = (thenCart = false) => {
    if (needsSize && !size) {
      toast.error(t("select_size_first"));
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    add(p, qty, size);
    if (thenCart) navigate("/cart");
    else toast.success(t("added_to_cart"));
  };
  const rel = related.isError ? undefined : related.data;
  const hidden = new Set([p.id, ...(rel?.other_listings ?? []).map((o) => o.id), ...(rel?.combo ?? []).map((o) => o.id)]);
  const similarItems = (similar.isError ? [] : (similar.data?.items ?? [])).filter((s) => !hidden.has(s.id)).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 md:pb-6 lg:px-8">
      <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-primary">{t("home")}</Link>
        <span>/</span>
        {cat && (
          <>
            <Link to={`/products?category=${cat.slug}`} className="hover:text-primary">{tx(cat.name)}</Link>
            <span>/</span>
          </>
        )}
        <span className="line-clamp-1 text-slate-700">{tx(p.title)}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery
          key={p.id}
          images={p.images}
          alt={tx(p.title)}
          badge={pct > 0 ? <DiscountBadge pct={pct} large /> : undefined}
        />

        <div className="flex flex-col gap-4">
          <Link to={`/products?q=${encodeURIComponent(p.store_name)}`} className="flex w-fit items-center gap-1.5 text-sm font-bold text-sky-700 hover:underline" data-testid="product-detail-store-link">
            <Store className="size-4" /> {p.store_name}
            <BadgeCheck className="size-4 text-sky-500" />
          </Link>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-black leading-snug text-slate-900" data-testid="product-detail-title">
              {tx(p.title)}
            </h1>
            <WishButton productId={p.id} className="size-11 shrink-0 border border-slate-200 shadow-none" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Rating value={p.rating} count={p.reviews_count} />
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">{t("sold_n", { n: p.sold_count })}</span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-y border-slate-200 py-3">
            <PriceStack price={p.price} oldPrice={p.old_price} size="lg" testId="product-detail-price" />
            <span className="text-xs text-slate-500" dir="ltr" data-testid="product-detail-alt-price">
              ≈ <Price usd={p.price} cur={currency === "USD" ? "SYP" : "USD"} />
            </span>
          </div>

          {needsSize && (
            <div id="size-picker" className="space-y-2" data-testid="product-size-picker">
              <p className="text-sm font-bold text-slate-800">
                {cat?.size_type === "shoe" ? t("shoe_size") : t("size")}:{" "}
                <span className={size ? "text-primary" : "font-semibold text-slate-400"} data-testid="product-selected-size">{size || t("select_size")}</span>
              </p>
              <SizePicker sizes={p.sizes} value={size} onChange={setSize} testId="product-size" />
            </div>
          )}

          <p className={soldOut ? "text-sm font-bold text-red-600" : "text-sm font-semibold text-green-700"} data-testid="product-detail-stock">
            {soldOut ? t("out_of_stock") : t("in_stock_n", { n: p.stock })}
          </p>

          <div className="hidden items-center gap-3 md:flex">
            <QtyStepper value={qty} max={Math.max(1, p.stock)} onChange={setQty} testId="product-detail-qty" />
            <Button size="lg" className="h-12 flex-1 text-base font-bold" disabled={soldOut} onClick={() => addToCart()} data-testid="add-to-cart-button">
              <ShoppingCart className="size-5" /> {t("add_to_cart")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-primary px-6 text-base font-bold text-primary hover:bg-teal-50"
              disabled={soldOut}
              data-testid="buy-now-button"
              onClick={() => addToCart(true)}
            >
              {t("buy_now")}
            </Button>
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="flex items-center gap-2 text-slate-700"><Truck className="size-4 text-primary" /> {t("delivery_estimate")}</p>
            {p.city && <p className="flex items-center gap-2 text-slate-700"><MapPin className="size-4 text-primary" /> {p.city}</p>}
            <p className="flex items-center gap-2 text-slate-700"><Wallet className="size-4 text-primary" /> {t("trust_cod")}</p>
            <p className="flex items-center gap-2 text-slate-700"><ShieldCheck className="size-4 text-primary" /> {t("trust_returns")}</p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-slate-900">{t("description")}</h2>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-600" data-testid="product-detail-description">
              {tx(p.description)}
            </p>
          </div>
        </div>
      </div>

      <OtherSellers items={rel?.other_listings ?? []} />
      {rel && <Combo key={p.id} main={p} mainSize={size} items={rel.combo} />}

      <Reviews productId={p.id} rating={p.rating} count={p.reviews_count} />

      {similarItems.length > 0 && (
        <section className="mt-12" data-testid="product-detail-similar">
          <h2 className="mb-4 text-xl font-black text-slate-900">{t("similar_products")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {similarItems.map((s) => <ProductCard key={s.id} product={s} />)}
          </div>
        </section>
      )}

      {/* mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <span className="text-base font-bold text-slate-900" dir="ltr"><Price usd={p.price} /></span>
        <Button size="lg" className="h-12 flex-1 text-base font-bold" disabled={soldOut} onClick={() => addToCart()} data-testid="mobile-add-to-cart-button">
          <ShoppingCart className="size-5" /> {t("add_to_cart")}
        </Button>
      </div>
    </div>
  );
}
