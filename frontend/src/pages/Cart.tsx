import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Store, Trash2, Truck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCurrency, Price } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { QtyStepper } from "@/pages/ProductDetail";
import { Button, buttonVariants } from "@/components/ui/button";

export function OrderTotals({ subtotal, testPrefix }: { subtotal: number; testPrefix: string }) {
  const { t } = useI18n();
  const { format, settings, currency } = useCurrency();
  const shipping = subtotal >= settings.free_shipping_over ? 0 : settings.shipping_fee;
  const total = subtotal + shipping;
  const remaining = settings.free_shipping_over - subtotal;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-slate-600">
        <span>{t("subtotal")}</span>
        <span dir="ltr" data-testid={`${testPrefix}-subtotal`}><Price usd={subtotal} /></span>
      </div>
      <div className="flex justify-between text-slate-600">
        <span>{t("shipping")}</span>
        <span dir="ltr" className={shipping === 0 ? "font-bold text-green-600" : ""} data-testid={`${testPrefix}-shipping`}>
          {shipping === 0 ? t("free") : <Price usd={shipping} />}
        </span>
      </div>
      {remaining > 0 && (
        <p className="flex items-center gap-1.5 rounded-lg bg-teal-50 px-2 py-1.5 text-xs font-semibold text-teal-700">
          <Truck className="size-3.5" /> {t("add_more_for_free", { v: format(remaining) })}
        </p>
      )}
      <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
        <span className="font-black text-slate-900">{t("total")}</span>
        <span className="text-lg font-black text-slate-900" dir="ltr" data-testid={`${testPrefix}-total`}><Price usd={total} /></span>
      </div>
      <p className="text-end text-xs text-slate-400" dir="ltr">≈ <Price usd={total} cur={currency === "USD" ? "SYP" : "USD"} /></p>
    </div>
  );
}

export default function Cart() {
  const { t, tx } = useI18n();
  const { format } = useCurrency();
  const { items, setQty, remove, subtotal, count } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center" data-testid="cart-empty-state">
        <span className="grid size-20 place-items-center rounded-full bg-teal-50 text-primary">
          <ShoppingBag className="size-9" />
        </span>
        <h1 className="text-2xl font-black text-slate-900">{t("cart_empty")}</h1>
        <p className="text-slate-500">{t("cart_empty_sub")}</p>
        <Link to="/products" className={buttonVariants({ size: "lg" })} data-testid="cart-start-shopping-button">
          {t("start_shopping")}
        </Link>
      </div>
    );
  }

  const groups = items.reduce<Record<string, typeof items>>((acc, i) => {
    (acc[i.store_name] ||= []).push(i);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-2xl font-black text-slate-900">
        {t("cart")} <span className="text-base font-semibold text-slate-500">({t("items_n", { n: count })})</span>
      </h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {Object.entries(groups).map(([store, lines]) => (
            <section key={store} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700">
                <Store className="size-4 text-sky-600" /> {t("sold_by")}: {store}
              </header>
              {lines.map((i) => (
                <div key={i.key} className="flex gap-4 border-b border-slate-100 p-4 last:border-0" data-testid={`cart-line-${i.product_id}${i.size ? `-${i.size}` : ""}`}>
                  <Link to={`/product/${i.product_id}`} className="shrink-0">
                    <img src={i.image} alt="" className="size-20 rounded-xl object-cover sm:size-24" />
                  </Link>
                  <div className="flex flex-1 flex-col gap-2">
                    <Link to={`/product/${i.product_id}`} className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-primary">
                      {tx(i.title)}
                    </Link>
                    {i.size && (
                      <span className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700" data-testid={`cart-line-size-${i.product_id}-${i.size}`}>
                        {t("size")}: {i.size}
                      </span>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                      <QtyStepper value={i.qty} max={Math.max(1, i.stock)} onChange={(n) => setQty(i.key, n)} testId={`cart-line-qty-${i.product_id}${i.size ? `-${i.size}` : ""}`} />
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-900" dir="ltr"><Price usd={i.price * i.qty} /></span>
                        <button onClick={() => remove(i.key)} aria-label={t("remove")} data-testid={`cart-line-remove-${i.product_id}${i.size ? `-${i.size}` : ""}`} className="grid size-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-40" data-testid="cart-summary">
          <h2 className="text-lg font-black text-slate-900">{t("order_summary")}</h2>
          <OrderTotals subtotal={subtotal} testPrefix="cart" />
          <Button size="lg" className="h-12 w-full text-base font-bold" onClick={() => navigate("/checkout")} data-testid="cart-checkout-button">
            {t("checkout")}
          </Button>
        </aside>
      </div>
    </div>
  );
}
