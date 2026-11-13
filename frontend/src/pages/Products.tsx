import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { ProductPage } from "@/lib/types";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { useCategories } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const SORTS = ["newest", "bestseller", "rating", "price_asc", "price_desc"] as const;
const LIMIT = 20;

function Filters({ onDone }: { onDone?: () => void }) {
  const { t, tx } = useI18n();
  const [params, setParams] = useSearchParams();
  const { data: categories } = useCategories();
  const [min, setMin] = useState(params.get("min_price") ?? "");
  const [max, setMax] = useState(params.get("max_price") ?? "");
  const active = params.get("category") ?? "";

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    setParams(next);
    onDone?.();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-black text-slate-900">{t("categories")}</h3>
        <div className="flex flex-col gap-0.5">
          <button
            data-testid="filter-category-all"
            onClick={() => update({ category: null, sub: null })}
            className={cn("rounded-lg px-2 py-1.5 text-start text-sm transition-colors", !active ? "bg-teal-50 font-bold text-primary" : "text-slate-600 hover:bg-slate-50")}
          >
            {t("all_categories")}
          </button>
          {(categories ?? []).map((c) => (
            <div key={c.id}>
            <button
              data-testid={`filter-category-${c.slug}`}
              onClick={() => update({ category: c.slug, sub: null })}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm transition-colors",
                active === c.slug ? "bg-teal-50 font-bold text-primary" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <CategoryIcon name={c.icon} className="size-4" />
              {tx(c.name)}
            </button>
            {active === c.slug && c.subcategories.length > 0 && (
              <div className="ms-6 mt-0.5 flex flex-col border-s border-slate-200 ps-2">
                {c.subcategories.map((sc) => (
                  <button
                    key={sc.slug}
                    data-testid={`filter-sub-${sc.slug}`}
                    onClick={() => update({ category: c.slug, sub: params.get("sub") === sc.slug ? null : sc.slug })}
                    className={cn(
                      "rounded-md px-2 py-1 text-start text-[13px] transition-colors",
                      params.get("sub") === sc.slug ? "font-bold text-primary" : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {tx(sc.name)}
                  </button>
                ))}
              </div>
            )}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-black text-slate-900">{t("price_range")}</h3>
        <div className="flex items-center gap-2">
          <Input data-testid="filter-min-price-input" type="number" min={0} placeholder={t("min")} value={min} onChange={(e) => setMin(e.target.value)} dir="ltr" />
          <span className="text-slate-400">—</span>
          <Input data-testid="filter-max-price-input" type="number" min={0} placeholder={t("max")} value={max} onChange={(e) => setMax(e.target.value)} dir="ltr" />
        </div>
        <Button data-testid="filter-price-apply-button" variant="outline" size="sm" className="mt-2 w-full" onClick={() => update({ min_price: min || null, max_price: max || null })}>
          {t("apply")}
        </Button>
      </div>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <Checkbox data-testid="filter-in-stock-checkbox" checked={params.get("in_stock") === "true"} onCheckedChange={(v) => update({ in_stock: v ? "true" : null })} />
          {t("only_in_stock")}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <Checkbox data-testid="filter-deals-checkbox" checked={params.get("deals") === "true"} onCheckedChange={(v) => update({ deals: v ? "true" : null })} />
          {t("only_deals")}
        </label>
      </div>
      <Button
        data-testid="filter-clear-button"
        variant="ghost"
        size="sm"
        className="w-full text-slate-500"
        onClick={() => {
          setMin("");
          setMax("");
          const q = params.get("q");
          setParams(q ? { q } : {});
          onDone?.();
        }}
      >
        <X className="size-4" /> {t("clear_filters")}
      </Button>
    </div>
  );
}

export default function Products() {
  const { t, tx } = useI18n();
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: categories } = useCategories();
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const sort = (SORTS as readonly string[]).includes(params.get("sort") ?? "") ? (params.get("sort") as (typeof SORTS)[number]) : "newest";
  const q = params.get("q") ?? "";
  const category = categories?.find((c) => c.slug === params.get("category"));
  const subcat = category?.subcategories.find((x) => x.slug === params.get("sub"));

  const api = new URLSearchParams();
  for (const k of ["q", "category", "sub", "min_price", "max_price", "deals", "in_stock"]) {
    const v = params.get(k);
    if (v) api.set(k, v);
  }
  api.set("sort", sort);
  api.set("page", String(page));
  api.set("limit", String(LIMIT));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", api.toString()],
    queryFn: () => apiGet<ProductPage>(`/products?${api.toString()}`),
    placeholderData: keepPreviousData,
  });
  const items = isError ? [] : (data?.items ?? []);
  const total = isError ? 0 : (data?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next);
  };

  const labels: Record<string, string> = {
    newest: t("sort_newest"),
    bestseller: t("sort_bestseller"),
    rating: t("sort_rating"),
    price_asc: t("sort_price_asc"),
    price_desc: t("sort_price_desc"),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900" data-testid="products-page-title">
            {q ? t("results_for", { q }) : category ? `${tx(category.name)}${subcat ? ` › ${tx(subcat.name)}` : ""}` : params.get("deals") ? t("deals_nav") : t("products")}
          </h1>
          <p className="text-sm text-slate-500" data-testid="products-result-count">
            {t("results_n", { n: total })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger render={<Button variant="outline" className="lg:hidden" data-testid="products-filters-open-button" />}>
              <SlidersHorizontal className="size-4" /> {t("filters")}
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t("filters")}</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">
                <Filters onDone={() => setSheetOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <Select value={sort} onValueChange={(v: string) => setParam("sort", v)}>
            <SelectTrigger className="min-w-44 bg-white" data-testid="products-sort-select">
              <SelectValue>{(v) => labels[v as string]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s} value={s} data-testid={`products-sort-option-${s}`}>
                  {labels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden h-fit rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-40 lg:block" data-testid="products-filters-sidebar">
          <Filters />
        </aside>
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {isLoading ? <ProductGridSkeleton n={8} /> : items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {!isLoading && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500" data-testid="products-empty-state">
              {isError ? t("load_failed") : t("no_results")}
            </div>
          )}
          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))} data-testid="products-prev-page-button">
                {t("prev")}
              </Button>
              <span className="text-sm font-semibold text-slate-600">{t("page_n", { n: `${page}/${pages}` })}</span>
              <Button variant="outline" disabled={page >= pages} onClick={() => setParam("page", String(page + 1))} data-testid="products-next-page-button">
                {t("next")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
