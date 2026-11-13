import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useCurrency, Price } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import type { Order, OrderStatus } from "@/lib/types";
import { Gate, PaymentBadge, StatusBadge } from "@/components/Shared";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];

export function useDate() {
  const { lang } = useI18n();
  return (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SY" : lang === "tr" ? "tr-TR" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
}

function Tracker({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  if (status === "cancelled") return <StatusBadge status="cancelled" />;
  const idx = STEPS.indexOf(status);
  return (
    <ol className="flex items-center gap-1" data-testid="order-tracker">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1.5">
          <span className={cn("h-1.5 rounded-full transition-colors", i <= idx ? "bg-primary" : "bg-slate-200")} />
          <span className={cn("text-[11px] font-semibold", i <= idx ? "text-slate-800" : "text-slate-400")}>{t(`status_${s}`)}</span>
        </li>
      ))}
    </ol>
  );
}

function OrdersList() {
  const { t, tx, dir } = useI18n();
  const { format } = useCurrency();
  const fmtDate = useDate();
  const { data, isLoading, isError } = useQuery({ queryKey: ["me", "orders"], queryFn: () => apiGet<Order[]>("/orders/mine") });
  const orders = isError ? [] : (data ?? []);
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="mb-5 text-2xl font-black text-slate-900">{t("my_orders")}</h1>
      {isLoading && <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />}
      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center" data-testid="orders-empty-state">
          <Package className="size-10 text-slate-300" />
          <p className="font-semibold text-slate-500">{isError ? t("load_failed") : t("no_orders")}</p>
          <Link to="/products" className={buttonVariants()}>{t("start_shopping")}</Link>
        </div>
      )}
      <div className="space-y-4">
        {orders.map((o) => (
          <Link
            to={`/orders/${o.id}`}
            key={o.id}
            data-testid={`order-row-${o.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-black text-slate-900" dir="ltr">#{o.number}</span>
                <span className="text-slate-500">{fmtDate(o.created_at)}</span>
                <span className="text-slate-500">{t("items_n", { n: o.items.reduce((s, i) => s + i.qty, 0) })}</span>
              </div>
              <div className="flex items-center gap-2">
                <PaymentBadge status={o.payment_status} />
                <span className="font-black text-primary" dir="ltr"><Price usd={o.total} /></span>
                <Chevron className="size-4 text-slate-400" />
              </div>
            </div>
            <div className="mb-3 flex gap-2 overflow-hidden">
              {o.items.slice(0, 5).map((i) => (
                <img key={i.product_id + i.size} src={i.image} alt={tx(i.title)} className="size-12 rounded-lg object-cover" />
              ))}
            </div>
            <Tracker status={o.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function OrderView() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const { t, tx } = useI18n();
  const { format } = useCurrency();
  const fmtDate = useDate();
  const { data: o, isLoading, isError } = useQuery({ queryKey: ["me", "orders", id], queryFn: () => apiGet<Order>(`/orders/${id}`) });

  if (isLoading) return <div className="mx-auto mt-8 h-64 max-w-4xl animate-pulse rounded-2xl bg-slate-200" />;
  if (isError || !o) return <p className="py-24 text-center text-slate-500">{t("load_failed")}</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6">
      {params.get("new") && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5" data-testid="order-success-banner">
          <CheckCircle2 className="size-8 shrink-0 text-green-600" />
          <div>
            <p className="text-lg font-black text-green-800">{o.payment_method === "card" && o.payment_status === "paid" ? t("payment_success") : t("order_placed")}</p>
            <p className="text-sm text-green-700">
              {t("order_placed_sub")} <b dir="ltr" data-testid="order-success-number">#{o.number}</b>
            </p>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">{t("order_no")}</p>
            <p className="text-xl font-black text-slate-900" dir="ltr" data-testid="order-detail-number">#{o.number}</p>
            <p className="text-sm text-slate-500">{fmtDate(o.created_at)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={o.status} testId="order-detail-status" />
            <PaymentBadge status={o.payment_status} testId="order-detail-payment-status" />
          </div>
        </div>
        <Tracker status={o.status} />
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {o.items.map((i) => (
            <div key={i.product_id + i.size} className="flex items-center gap-3 p-4 text-sm">
              <img src={i.image} alt="" className="size-14 rounded-lg object-cover" />
              <div className="flex-1">
                <Link to={`/product/${i.product_id}`} className="line-clamp-2 font-semibold text-slate-800 hover:text-primary">{tx(i.title)}</Link>
                <p className="text-xs text-slate-500">{t("sold_by")}: {i.store_name}{i.size && <> · <b className="text-slate-700">{t("size")}: {i.size}</b></>}</p>
              </div>
              <span className="text-slate-500" dir="ltr">×{i.qty}</span>
              <span className="font-bold" dir="ltr"><Price usd={i.price * i.qty} /></span>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{t("subtotal")}</span><span dir="ltr"><Price usd={o.subtotal} /></span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t("shipping")}</span><span dir="ltr">{o.shipping_fee ? <Price usd={o.shipping_fee} /> : t("free")}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-black"><span>{t("total")}</span><span className="text-primary" dir="ltr" data-testid="order-detail-total"><Price usd={o.total} /></span></div>
            <div className="flex justify-between pt-1"><span className="text-slate-500">{t("payment")}</span><span className="font-semibold">{o.payment_method === "cod" ? t("pay_cod") : t("pay_card")}</span></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="mb-1 font-black text-slate-900">{t("shipping_address")}</p>
            <p className="text-slate-700">{o.shipping.full_name}</p>
            <p className="text-slate-500" dir="ltr">{o.shipping.phone}</p>
            <p className="text-slate-500">{o.shipping.city} — {o.shipping.address}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Link to="/orders" className={buttonVariants({ variant: "outline" })} data-testid="order-back-to-orders">{t("back_to_orders")}</Link>
        <Link to="/products" className={buttonVariants()} data-testid="order-continue-shopping">{t("continue_shopping")}</Link>
      </div>
    </div>
  );
}

export default function Orders() {
  return (
    <Gate>
      <OrdersList />
    </Gate>
  );
}

export function OrderDetail() {
  return (
    <Gate>
      <OrderView />
    </Gate>
  );
}
