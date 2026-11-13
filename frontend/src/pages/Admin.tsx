import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, DollarSign, Loader2, ShoppingBag, Store, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPatch, apiPut } from "@/lib/api";
import { useCurrency, Price } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import type { AdminStats, Order, OrderStatus, Role, SellerApplication, Settings, UsersOut } from "@/lib/types";
import { Gate, PaymentBadge, StatCard } from "@/components/Shared";
import { OrderStatusSelect } from "@/pages/SellerDashboard";
import { useDate } from "@/pages/Orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function SettingsForm({ initial }: { initial: Settings }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState({ exchange_rate: String(initial.exchange_rate), shipping_fee: String(initial.shipping_fee), free_shipping_over: String(initial.free_shipping_over) });
  const save = useMutation({
    mutationFn: (body: Settings) => apiPut<Settings>("/admin/settings", body),
    onSuccess: () => {
      toast.success(t("settings_saved"));
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => toast.error(t("error_generic")),
  });
  return (
    <form
      className="grid max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3"
      data-testid="admin-settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        const body = { exchange_rate: Number(f.exchange_rate), shipping_fee: Number(f.shipping_fee), free_shipping_over: Number(f.free_shipping_over) };
        if (!(body.exchange_rate > 0) || body.shipping_fee < 0 || body.free_shipping_over < 0) return toast.error(t("fill_required"));
        save.mutate(body);
      }}
    >
      <div className="space-y-1.5 sm:col-span-3">
        <Label>{t("exchange_rate")}</Label>
        <Input type="number" min="1" dir="ltr" data-testid="admin-exchange-rate-input" value={f.exchange_rate} onChange={(e) => setF({ ...f, exchange_rate: e.target.value })} />
        <p className="text-xs text-slate-500" dir="ltr">1 USD = {Number(f.exchange_rate || 0).toLocaleString("en-US")} SYP</p>
      </div>
      <div className="space-y-1.5">
        <Label>{t("shipping_fee_usd")}</Label>
        <Input type="number" min="0" step="0.5" dir="ltr" data-testid="admin-shipping-fee-input" value={f.shipping_fee} onChange={(e) => setF({ ...f, shipping_fee: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("free_shipping_threshold")}</Label>
        <Input type="number" min="0" dir="ltr" data-testid="admin-free-shipping-input" value={f.free_shipping_over} onChange={(e) => setF({ ...f, free_shipping_over: e.target.value })} />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full" disabled={save.isPending} data-testid="admin-settings-save-button">
          {save.isPending && <Loader2 className="size-4 animate-spin" />} {t("save")}
        </Button>
      </div>
    </form>
  );
}

function Console() {
  const { t, tx } = useI18n();
  const { format } = useCurrency();
  const fmtDate = useDate();
  const qc = useQueryClient();

  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => apiGet<AdminStats>("/admin/stats") });
  const apps = useQuery({ queryKey: ["admin", "applications"], queryFn: () => apiGet<SellerApplication[]>("/admin/applications") });
  const orders = useQuery({ queryKey: ["admin", "orders"], queryFn: () => apiGet<Order[]>("/admin/orders") });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => apiGet<UsersOut>("/users") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/settings") });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) => apiPatch<SellerApplication>(`/admin/applications/${id}`, { status }),
    onSuccess: () => { toast.success(t("status_updated")); invalidate(); },
    onError: () => toast.error(t("error_generic")),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => apiPatch<Order>(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => { toast.success(t("status_updated")); invalidate(); },
    onError: () => toast.error(t("error_generic")),
  });
  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => apiPatch<{ user_id: string; role: Role }>(`/users/${id}/role`, { role }),
    onSuccess: () => { toast.success(t("role_updated")); invalidate(); },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? "Keep at least one admin" : t("error_generic")),
  });

  const s = stats.isError ? undefined : stats.data;
  const pendingApps = (apps.data ?? []).filter((a) => a.status === "pending").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-black text-slate-900" data-testid="admin-page-title">{t("admin_panel")}</h1>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("stat_users")} value={s?.users ?? "—"} icon={<Users className="size-5" />} testId="admin-stat-users" />
        <StatCard label={t("stat_sellers")} value={s?.sellers ?? "—"} icon={<Store className="size-5" />} testId="admin-stat-sellers" />
        <StatCard label={t("stat_products")} value={s?.products ?? "—"} icon={<Boxes className="size-5" />} testId="admin-stat-products" />
        <StatCard label={t("stat_orders")} value={s?.orders ?? "—"} icon={<ShoppingBag className="size-5" />} testId="admin-stat-orders" />
        <StatCard label={t("stat_applications")} value={s?.pending_applications ?? "—"} icon={<UserPlus className="size-5" />} testId="admin-stat-applications" />
        <StatCard label={t("stat_revenue")} value={s ? <Price usd={s.revenue} /> : "—"} icon={<DollarSign className="size-5" />} testId="admin-stat-revenue" />
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="flex-wrap">
          <TabsTrigger value="orders" data-testid="admin-tab-orders">{t("orders")}</TabsTrigger>
          <TabsTrigger value="applications" data-testid="admin-tab-applications">
            {t("applications")}
            {pendingApps > 0 && <span className="ms-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{pendingApps}</span>}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">{t("users")}</TabsTrigger>
          <TabsTrigger value="settings" data-testid="admin-tab-settings">{t("settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            {(orders.data ?? []).length === 0 && !orders.isLoading ? (
              <p className="py-12 text-center text-slate-500" data-testid="admin-orders-empty">{t("no_orders")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("order_no")}</TableHead>
                    <TableHead className="text-start">{t("customer")}</TableHead>
                    <TableHead className="text-start">{t("products")}</TableHead>
                    <TableHead className="text-start">{t("total")}</TableHead>
                    <TableHead className="text-start">{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(orders.data ?? []).map((o) => (
                    <TableRow key={o.id} data-testid={`admin-order-row-${o.id}`}>
                      <TableCell>
                        <p className="font-bold" dir="ltr">#{o.number}</p>
                        <p className="text-xs text-slate-500">{fmtDate(o.created_at)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{o.shipping.full_name}</p>
                        <p className="text-xs text-slate-500">{o.shipping.city} · <span dir="ltr">{o.shipping.phone}</span></p>
                      </TableCell>
                      <TableCell className="max-w-56">
                        {o.items.map((i) => (
                          <p key={i.product_id + i.size} className="line-clamp-1 text-xs">{tx(i.title)}{i.size && <b> ({i.size})</b>} <span className="text-slate-400">· {i.store_name}</span></p>
                        ))}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold" dir="ltr"><Price usd={o.total} /></p>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">{o.payment_method === "cod" ? t("pay_cod") : t("pay_card")}</span>
                          <PaymentBadge status={o.payment_status} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderStatusSelect value={o.status} onChange={(status) => setStatus.mutate({ id: o.id, status })} testId={`admin-order-status-${o.id}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            {(apps.data ?? []).length === 0 && !apps.isLoading ? (
              <p className="py-12 text-center text-slate-500" data-testid="admin-applications-empty">{t("no_applications")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("store_name")}</TableHead>
                    <TableHead className="text-start">{t("phone")}</TableHead>
                    <TableHead className="text-start">{t("city")}</TableHead>
                    <TableHead className="text-start">{t("status")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(apps.data ?? []).map((a) => (
                    <TableRow key={a.id} data-testid={`admin-application-row-${a.id}`}>
                      <TableCell>
                        <p className="font-bold">{a.store_name}</p>
                        <p className="text-xs text-slate-500">{a.email}</p>
                        {a.description && <p className="line-clamp-2 max-w-64 text-xs text-slate-500">{a.description}</p>}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">{a.phone}</TableCell>
                      <TableCell>{a.city}</TableCell>
                      <TableCell>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", a.status === "approved" ? "bg-green-50 text-green-700" : a.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
                          {t(`app_status_${a.status}`)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {a.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => decide.mutate({ id: a.id, status: "approved" })} data-testid={`admin-application-approve-${a.id}`}>{t("approve")}</Button>
                            <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, status: "rejected" })} data-testid={`admin-application-reject-${a.id}`}>{t("reject")}</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("full_name")}</TableHead>
                  <TableHead className="text-start">E-mail</TableHead>
                  <TableHead className="text-start">{t("store_name")}</TableHead>
                  <TableHead className="text-start">{t("role")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users.data?.users ?? []).map((u) => (
                  <TableRow key={u.user_id} data-testid={`admin-user-row-${u.user_id}`}>
                    <TableCell className="font-semibold">{u.name || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-start">{u.email}</TableCell>
                    <TableCell>{u.store_name || "—"}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v: string) => setRole.mutate({ id: u.user_id, role: v as Role })}>
                        <SelectTrigger size="sm" className="min-w-28" data-testid={`admin-user-role-${u.user_id}`}>
                          <SelectValue>{(v) => t(`role_${v as Role}`)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(users.data?.roles ?? []).map((r) => (
                            <SelectItem key={r} value={r}>{t(`role_${r}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {settings.data ? <SettingsForm initial={settings.data} /> : <Loader2 className="size-6 animate-spin text-primary" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Admin() {
  return (
    <Gate roles={["admin"]}>
      <Console />
    </Gate>
  );
}
