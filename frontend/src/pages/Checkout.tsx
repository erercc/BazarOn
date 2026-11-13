import { useNavigate, Navigate } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Banknote, CreditCard, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiPost } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useCurrency, Price } from "@/lib/currency";
import { SYRIAN_CITIES, useI18n } from "@/lib/i18n";
import type { OrderCreate, OrderCreated, PaymentMethod, ShippingAddress } from "@/lib/types";
import { Gate } from "@/components/Shared";
import { OrderTotals } from "@/pages/Cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function CheckoutForm() {
  const { t, tx } = useI18n();
  const { format } = useCurrency();
  const { items, subtotal, clear } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [form, setForm] = useState<ShippingAddress>({
    full_name: user?.fullName ?? "",
    phone: "+963 ",
    city: "",
    address: "",
    note: "",
  });
  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const place = useMutation({
    mutationFn: (body: OrderCreate) => apiPost<OrderCreated>("/orders", body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["me", "orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      if (res.checkout_url) {
        clear();
        window.location.href = res.checkout_url;
        return;
      }
      clear();
      toast.success(t("order_placed"));
      navigate(`/orders/${res.order.id}?new=1`);
    },
    onError: (e) => {
      const detail = e instanceof ApiError ? (e.body as { detail?: { code?: string } } | null)?.detail : undefined;
      toast.error(detail?.code === "out_of_stock" ? t("stock_changed") : detail?.code === "invalid_size" ? t("select_size_first") : t("order_failed"));
    },
  });

  if (items.length === 0 && !place.isPending && !place.isSuccess) return <Navigate to="/cart" replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.full_name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 6 || !form.city || form.address.trim().length < 4) {
      toast.error(t("fill_required"));
      return;
    }
    place.mutate({
      items: items.map((i) => ({ product_id: i.product_id, qty: i.qty, size: i.size })),
      shipping: { ...form, phone: form.phone.trim() },
      payment_method: method,
      origin_url: window.location.origin,
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8" data-testid="checkout-form">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-white">1</span>
            {t("shipping_address")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">{t("full_name")} *</Label>
              <Input id="full_name" data-testid="checkout-full-name-input" value={form.full_name} onChange={set("full_name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("phone")} *</Label>
              <Input id="phone" data-testid="checkout-phone-input" dir="ltr" inputMode="tel" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("city")} *</Label>
              <Select value={form.city} onValueChange={(v: string) => setForm((f) => ({ ...f, city: v }))}>
                <SelectTrigger className="w-full" data-testid="checkout-city-select">
                  <SelectValue>{(v) => (v ? (v as string) : t("select_city"))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SYRIAN_CITIES.map((c) => (
                    <SelectItem key={c.en} value={tx(c)} data-testid={`checkout-city-option-${c.en.toLowerCase().replace(/\s+/g, "-")}`}>
                      {tx(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">{t("address")} *</Label>
              <Textarea id="address" data-testid="checkout-address-input" placeholder={t("address_ph")} value={form.address} onChange={set("address")} rows={2} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="note">{t("note")}</Label>
              <Input id="note" data-testid="checkout-note-input" value={form.note} onChange={set("note")} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-white">2</span>
            {t("payment_method")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            {([
              { id: "cod", icon: Banknote, title: t("pay_cod"), sub: t("pay_cod_sub") },
              { id: "card", icon: CreditCard, title: t("pay_card"), sub: t("pay_card_sub") },
            ] as const).map((m) => (
              <button
                type="button"
                role="radio"
                aria-checked={method === m.id}
                key={m.id}
                data-testid={`checkout-payment-${m.id}`}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border-2 p-4 text-start transition-[border-color,background-color] duration-150",
                  method === m.id ? "border-primary bg-teal-50" : "border-slate-200 hover:border-slate-300",
                )}
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", method === m.id ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>
                  <m.icon className="size-5" />
                </span>
                <span>
                  <span className="block font-bold text-slate-900">{m.title}</span>
                  <span className="block text-xs text-slate-500">{m.sub}</span>
                </span>
              </button>
            ))}
          </div>
          {method === "card" && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800" data-testid="checkout-test-card-hint">
              <Lock className="size-3.5" /> {t("test_card_hint")}
            </p>
          )}
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-40">
        <h2 className="text-lg font-black text-slate-900">{t("order_summary")}</h2>
        <ul className="max-h-60 space-y-3 overflow-y-auto">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-3 text-sm">
              <img src={i.image} alt="" className="size-12 rounded-lg object-cover" />
              <span className="line-clamp-2 flex-1 text-slate-700">
                {tx(i.title)} {i.size && <b className="text-slate-600">({i.size})</b>} <span className="text-slate-400" dir="ltr">×{i.qty}</span>
              </span>
              <span className="font-bold" dir="ltr"><Price usd={i.price * i.qty} /></span>
            </li>
          ))}
        </ul>
        <OrderTotals subtotal={subtotal} testPrefix="checkout" />
        <Button type="submit" size="lg" className="h-12 w-full text-base font-bold" disabled={place.isPending} data-testid="checkout-submit-button">
          {place.isPending ? <Loader2 className="size-5 animate-spin" /> : null}
          {place.isPending ? t("placing") : method === "card" ? t("pay_and_order") : t("place_order")}
        </Button>
      </aside>
    </form>
  );
}

export default function Checkout() {
  return (
    <Gate>
      <CheckoutForm />
    </Gate>
  );
}
