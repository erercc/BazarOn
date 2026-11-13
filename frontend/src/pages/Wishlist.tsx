import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";
import { Gate } from "@/components/Shared";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { buttonVariants } from "@/components/ui/button";

function List() {
  const { t } = useI18n();
  const { data, isLoading, isError } = useQuery({ queryKey: ["me", "wishlist", "items"], queryFn: () => apiGet<Product[]>("/wishlist") });
  const items = isError ? [] : (data ?? []);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-2xl font-black text-slate-900" data-testid="wishlist-page-title">{t("wishlist")}</h1>
      {!isLoading && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center" data-testid="wishlist-empty-state">
          <Heart className="size-10 text-slate-300" />
          <p className="font-bold text-slate-700">{isError ? t("load_failed") : t("wishlist_empty")}</p>
          <p className="text-sm text-slate-500">{t("wishlist_empty_sub")}</p>
          <Link to="/products" className={buttonVariants()}>{t("start_shopping")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5" data-testid="wishlist-grid">
          {isLoading ? <ProductGridSkeleton n={5} /> : items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

export default function Wishlist() {
  return (
    <Gate>
      <List />
    </Gate>
  );
}
