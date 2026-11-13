import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Clock, DollarSign, ImagePlus, Loader2, Pencil, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useCurrency, Price } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { CLOTHING_SIZES, SHOE_SIZES } from "@/lib/types";
import type { Order, OrderStatus, Product, ProductIn, SellerStats } from "@/lib/types";
import { SizePicker } from "@/pages/ProductDetail";
import { Gate, PaymentBadge, StatCard } from "@/components/Shared";
import { useCategories } from "@/components/Header";
import { useDate } from "@/pages/Orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

export function OrderStatusSelect({ value, onChange, testId }: { value: OrderStatus; onChange: (s: OrderStatus) => void; testId: string }) {
  const { t } = useI18n();
  return (
    <Select value={value} onValueChange={(v: string) => onChange(v as OrderStatus)}>
      <SelectTrigger size="sm" className="min-w-32" data-testid={testId}>
        <SelectValue>{(v) => t(`status_${v as OrderStatus}`)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((s) => (
          <SelectItem key={s} value={s} data-testid={`${testId}-option-${s}`}>{t(`status_${s}`)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FormState {
  title_ar: string;
  title_tr: string;
  title_en: string;
  desc_ar: string;
  desc_tr: string;
  desc_en: string;
  category_id: string;
  subcategory: string;
  price: string;
  old_price: string;
  stock: string;
  images: string[];
  sizes: string[];
}

const EMPTY: FormState = { title_ar: "", title_tr: "", title_en: "", desc_ar: "", desc_tr: "", desc_en: "", category_id: "", subcategory: "", price: "", old_price: "", stock: "10", images: [""], sizes: [] };

function toForm(p: Product): FormState {
  return {
    title_ar: p.title.ar, title_tr: p.title.tr, title_en: p.title.en,
    desc_ar: p.description.ar, desc_tr: p.description.tr, desc_en: p.description.en,
    category_id: p.category_id, subcategory: p.subcategory, price: String(p.price), old_price: p.old_price ? String(p.old_price) : "",
    stock: String(p.stock), images: p.images.length ? p.images : [""], sizes: p.sizes,
  };
}

function ProductDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Product | null }) {
  const { t, tx } = useI18n();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [f, setF] = useState<FormState>(editing ? toForm(editing) : EMPTY);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const sizeType = categories?.find((c) => c.id === f.category_id)?.size_type ?? "none";
  const sizeOptions = sizeType === "clothing" ? CLOTHING_SIZES : sizeType === "shoe" ? SHOE_SIZES : [];
  const setImage = (i: number, v: string) => setF((s) => ({ ...s, images: s.images.map((x, j) => (j === i ? v : x)) }));
  const toggleSize = (v: string) =>
    setF((s) => ({ ...s, sizes: s.sizes.includes(v) ? s.sizes.filter((x) => x !== v) : sizeOptions.filter((o) => o === v || s.sizes.includes(o)) }));

  const save = useMutation({
    mutationFn: (body: ProductIn) => (editing ? apiPut<Product>(`/seller/products/${editing.id}`, body) : apiPost<Product>("/seller/products", body)),
    onSuccess: () => {
      toast.success(t("product_saved"));
      qc.invalidateQueries({ queryKey: ["seller"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t("error_generic")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(f.price);
    const stock = Number(f.stock);
    const old = f.old_price ? Number(f.old_price) : null;
    const images = f.images.map((x) => x.trim()).filter((x) => x.startsWith("http"));
    if (!(f.title_ar || f.title_tr || f.title_en) || !f.category_id || !(price > 0) || !(stock >= 0) || images.length === 0 || (sizeOptions.length > 0 && f.sizes.length === 0)) {
      toast.error(t("fill_required"));
      return;
    }
    save.mutate({
      title: { ar: f.title_ar.trim(), tr: f.title_tr.trim(), en: f.title_en.trim() },
      description: { ar: f.desc_ar.trim(), tr: f.desc_tr.trim(), en: f.desc_en.trim() },
      category_id: f.category_id,
      subcategory: f.subcategory,
      price,
      old_price: old && old > price ? old : null,
      stock: Math.floor(stock),
      images,
      sizes: sizeOptions.length ? f.sizes : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? t("edit_product") : t("add_product")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" data-testid="seller-product-form">
          <div className="space-y-1.5"><Label>{t("title_ar")} *</Label><Input dir="rtl" data-testid="seller-product-title-ar-input" value={f.title_ar} onChange={set("title_ar")} /></div>
          <div className="space-y-1.5"><Label>{t("title_tr")}</Label><Input dir="ltr" data-testid="seller-product-title-tr-input" value={f.title_tr} onChange={set("title_tr")} /></div>
          <div className="space-y-1.5"><Label>{t("title_en")}</Label><Input dir="ltr" data-testid="seller-product-title-en-input" value={f.title_en} onChange={set("title_en")} /></div>
          <div className="space-y-1.5">
            <Label>{t("category")} *</Label>
            <Select value={f.category_id} onValueChange={(v: string) => setF((s) => ({ ...s, category_id: v, subcategory: "", sizes: [] }))}>
              <SelectTrigger className="w-full" data-testid="seller-product-category-select">
                <SelectValue>{(v) => { const c = categories?.find((x) => x.id === v); return c ? tx(c.name) : t("select_category"); }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id} data-testid={`seller-product-category-option-${c.slug}`}>{tx(c.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(categories?.find((c) => c.id === f.category_id)?.subcategories.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <Label>{t("subcategory")}</Label>
              <Select value={f.subcategory} onValueChange={(v: string) => setF((s) => ({ ...s, subcategory: v }))}>
                <SelectTrigger className="w-full" data-testid="seller-product-subcategory-select">
                  <SelectValue>
                    {(v) => {
                      const sc = categories?.find((c) => c.id === f.category_id)?.subcategories.find((x) => x.slug === v);
                      return sc ? tx(sc.name) : t("select_subcategory");
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(categories?.find((c) => c.id === f.category_id)?.subcategories ?? []).map((sc) => (
                    <SelectItem key={sc.slug} value={sc.slug} data-testid={`seller-product-subcategory-option-${sc.slug}`}>{tx(sc.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>{t("price_usd")} *</Label><Input type="number" step="0.01" min="0" dir="ltr" data-testid="seller-product-price-input" value={f.price} onChange={set("price")} /></div>
          <div className="space-y-1.5"><Label>{t("old_price_usd")}</Label><Input type="number" step="0.01" min="0" dir="ltr" data-testid="seller-product-old-price-input" value={f.old_price} onChange={set("old_price")} /></div>
          <div className="space-y-1.5"><Label>{t("stock")} *</Label><Input type="number" min="0" dir="ltr" data-testid="seller-product-stock-input" value={f.stock} onChange={set("stock")} /></div>
          {sizeOptions.length > 0 && (
            <div className="space-y-1.5 sm:col-span-2" data-testid="seller-product-sizes">
              <Label>{sizeType === "shoe" ? t("offered_shoe_sizes") : t("offered_sizes")} *</Label>
              <div className="flex flex-wrap gap-1.5">
                {sizeOptions.map((s) => (
                  <SizePicker key={s} sizes={[s]} value={f.sizes.includes(s) ? s : ""} onChange={() => toggleSize(s)} testId="seller-product-size" />
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("images")} * <span className="font-normal text-slate-400">— {t("images_hint")}</span></Label>
            {f.images.map((img, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="size-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {img.startsWith("http") && <img src={img} alt="" className="size-full object-cover" />}
                </span>
                <Input dir="ltr" placeholder="https://..." data-testid={`seller-product-image-input-${i}`} value={img} onChange={(e) => setImage(i, e.target.value)} />
                {f.images.length > 1 && (
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={t("remove")} data-testid={`seller-product-image-remove-${i}`} onClick={() => setF((s) => ({ ...s, images: s.images.filter((_, j) => j !== i) }))}>
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {f.images.length < 8 && (
              <Button type="button" variant="outline" size="sm" data-testid="seller-product-add-image-button" onClick={() => setF((s) => ({ ...s, images: [...s.images, ""] }))}>
                <ImagePlus className="size-4" /> {t("add_image")}
              </Button>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("desc_ar")}</Label><Textarea dir="rtl" rows={2} data-testid="seller-product-desc-ar-input" value={f.desc_ar} onChange={set("desc_ar")} /></div>
          <div className="space-y-1.5"><Label>{t("description")} (TR)</Label><Textarea dir="ltr" rows={2} data-testid="seller-product-desc-tr-input" value={f.desc_tr} onChange={set("desc_tr")} /></div>
          <div className="space-y-1.5"><Label>{t("description")} (EN)</Label><Textarea dir="ltr" rows={2} data-testid="seller-product-desc-en-input" value={f.desc_en} onChange={set("desc_en")} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="seller-product-cancel-button">{t("cancel")}</Button>
            <Button type="submit" disabled={save.isPending} data-testid="seller-product-save-button">
              {save.isPending && <Loader2 className="size-4 animate-spin" />} {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Hub() {
  const { t, tx } = useI18n();
  const { format } = useCurrency();
  const fmtDate = useDate();
  const { me } = useMe();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; editing: Product | null; key: number }>({ open: false, editing: null, key: 0 });

  const stats = useQuery({ queryKey: ["seller", "stats"], queryFn: () => apiGet<SellerStats>("/seller/stats") });
  const products = useQuery({ queryKey: ["seller", "products"], queryFn: () => apiGet<Product[]>("/seller/products") });
  const orders = useQuery({ queryKey: ["seller", "orders"], queryFn: () => apiGet<Order[]>("/seller/orders") });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/seller/products/${id}`),
    onSuccess: () => {
      toast.success(t("product_deleted"));
      qc.invalidateQueries({ queryKey: ["seller"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => apiPatch<Order>(`/seller/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success(t("status_updated"));
      qc.invalidateQueries({ queryKey: ["seller"] });
    },
    onError: () => toast.error(t("error_generic")),
  });

  const s = stats.isError ? undefined : stats.data;
  const open = (editing: Product | null) => setDialog((d) => ({ open: true, editing, key: d.key + 1 }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{t("seller_hub")}</p>
          <h1 className="text-2xl font-black text-slate-900" data-testid="seller-hub-store-name">{me?.store_name || "BazarOn"}</h1>
        </div>
        <Button onClick={() => open(null)} data-testid="seller-add-product-button">
          <Plus className="size-4" /> {t("add_product")}
        </Button>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("stat_products")} value={s?.products ?? "—"} icon={<Boxes className="size-5" />} testId="seller-stat-products" />
        <StatCard label={t("stat_orders")} value={s?.orders ?? "—"} icon={<ShoppingBag className="size-5" />} testId="seller-stat-orders" />
        <StatCard label={t("stat_pending")} value={s?.pending_orders ?? "—"} icon={<Clock className="size-5" />} testId="seller-stat-pending" />
        <StatCard label={t("stat_revenue")} value={s ? <Price usd={s.revenue} /> : "—"} icon={<DollarSign className="size-5" />} testId="seller-stat-revenue" />
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" data-testid="seller-tab-products">{t("my_products")}</TabsTrigger>
          <TabsTrigger value="orders" data-testid="seller-tab-orders">{t("orders")}</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            {(products.data ?? []).length === 0 && !products.isLoading ? (
              <p className="py-12 text-center text-slate-500" data-testid="seller-products-empty">{t("no_products_yet")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("products")}</TableHead>
                    <TableHead className="text-start">{t("price_usd")}</TableHead>
                    <TableHead className="text-start">{t("stock")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(products.data ?? []).map((p) => (
                    <TableRow key={p.id} data-testid={`seller-product-row-${p.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img src={p.images[0]} alt="" className="size-10 rounded-lg object-cover" />
                          <span className="line-clamp-1 max-w-64 font-semibold">{tx(p.title)}</span>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-start font-bold"><Price usd={p.price} cur={"USD"} /></TableCell>
                      <TableCell className={p.stock === 0 ? "font-bold text-red-600" : ""}>{p.stock}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label={t("edit")} onClick={() => open(p)} data-testid={`seller-product-edit-${p.id}`}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("delete")}
                            className="text-red-600 hover:bg-red-50"
                            data-testid={`seller-product-delete-${p.id}`}
                            onClick={() => window.confirm(t("confirm_delete")) && remove.mutate(p.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            {(orders.data ?? []).length === 0 && !orders.isLoading ? (
              <p className="py-12 text-center text-slate-500" data-testid="seller-orders-empty">{t("no_orders")}</p>
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
                    <TableRow key={o.id} data-testid={`seller-order-row-${o.id}`}>
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
                          <p key={i.product_id + i.size} className="line-clamp-1 text-xs">{tx(i.title)}{i.size && <b> ({i.size})</b>} <span dir="ltr">×{i.qty}</span></p>
                        ))}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold" dir="ltr"><Price usd={o.items.reduce((sum, i) => sum + i.price * i.qty, 0)} /></p>
                        <PaymentBadge status={o.payment_status} />
                      </TableCell>
                      <TableCell>
                        <OrderStatusSelect value={o.status} onChange={(status) => setStatus.mutate({ id: o.id, status })} testId={`seller-order-status-${o.id}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <ProductDialog key={dialog.key} open={dialog.open} editing={dialog.editing} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}

export default function SellerDashboard() {
  return (
    <Gate roles={["seller", "admin"]}>
      <Hub />
    </Gate>
  );
}
