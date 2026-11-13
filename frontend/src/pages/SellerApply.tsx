import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { SYRIAN_CITIES, useI18n } from "@/lib/i18n";
import type { SellerApplication, SellerApplicationIn } from "@/lib/types";
import { Gate } from "@/components/Shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ApplyForm() {
  const { t, tx } = useI18n();
  const { me, isLoading } = useMe();
  const qc = useQueryClient();
  const [form, setForm] = useState<SellerApplicationIn>({ store_name: "", phone: "+963 ", city: "", description: "" });

  const apply = useMutation({
    mutationFn: (body: SellerApplicationIn) => apiPost<SellerApplication>("/seller/apply", body),
    onSuccess: () => {
      toast.success(t("application_sent"));
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toast.error(t("error_generic")),
  });

  if (isLoading || !me) return <Loader2 className="mx-auto mt-24 size-8 animate-spin text-primary" />;
  if (me.role === "seller" || me.role === "admin") return <Navigate to="/seller" replace />;

  if (me.application_status === "pending") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" data-testid="seller-application-pending">
        <Clock className="size-12 text-amber-500" />
        <h2 className="text-xl font-black text-slate-900">{t("application_pending")}</h2>
        <p className="text-slate-500">{t("application_pending_sub")}</p>
        <Link to="/" className={buttonVariants({ variant: "outline" })}>{t("continue_shopping")}</Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.store_name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 6 || !form.city) {
      toast.error(t("fill_required"));
      return;
    }
    apply.mutate({ ...form, store_name: form.store_name.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="seller-apply-form">
      {me.application_status === "rejected" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("application_rejected")}</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="store_name">{t("store_name")} *</Label>
        <Input id="store_name" data-testid="seller-apply-store-name-input" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sphone">{t("phone")} *</Label>
          <Input id="sphone" dir="ltr" data-testid="seller-apply-phone-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("city")} *</Label>
          <Select value={form.city} onValueChange={(v: string) => setForm({ ...form, city: v })}>
            <SelectTrigger className="w-full" data-testid="seller-apply-city-select">
              <SelectValue>{(v) => (v ? (v as string) : t("select_city"))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SYRIAN_CITIES.map((c) => (
                <SelectItem key={c.en} value={tx(c)}>{tx(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sdesc">{t("store_description")}</Label>
        <Textarea id="sdesc" rows={3} data-testid="seller-apply-description-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <Button type="submit" size="lg" className="h-12 w-full text-base font-bold" disabled={apply.isPending} data-testid="seller-apply-button">
        {apply.isPending && <Loader2 className="size-5 animate-spin" />}
        {t("submit_application")}
      </Button>
    </form>
  );
}

export default function SellerApply() {
  const { t } = useI18n();
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_480px] lg:px-8">
      <div className="flex flex-col justify-center gap-5">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-white">
          <Store className="size-7" />
        </span>
        <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">{t("seller_cta_title")}</h1>
        <p className="text-slate-600">{t("seller_apply_sub")}</p>
        <ul className="space-y-3">
          {(["why_sell_1", "why_sell_2", "why_sell_3"] as const).map((k) => (
            <li key={k} className="flex items-center gap-2 font-semibold text-slate-700">
              <CheckCircle2 className="size-5 text-green-600" /> {t(k)}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.4)]">
        <h2 className="mb-4 text-xl font-black text-slate-900">{t("seller_apply_title")}</h2>
        <Gate>
          <ApplyForm />
        </Gate>
      </div>
    </div>
  );
}
