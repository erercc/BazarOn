import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, Store, Timer, Zap } from "lucide-react";
import { HeroCarousel } from "@/components/HeroCarousel";
import { apiGet } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { ProductPage } from "@/lib/types";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { useCategories } from "@/components/Header";
import { CategoryIcon } from "@/components/CategoryIcon";

function useRail(key: string, qs: string) {
  return useQuery({ queryKey: ["products", key], queryFn: () => apiGet<ProductPage>(`/products?${qs}`) });
}

function Countdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const s = Math.max(0, Math.floor((end.getTime() - now) / 1000));
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0"));
  return (
    <span className="flex items-center gap-1" dir="ltr" data-testid="flash-deals-countdown">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="rounded-md bg-teal-600 px-1.5 py-0.5 font-mono text-sm font-bold text-white tabular-nums">{p}</span>
          {i < 2 && <span className="font-bold text-teal-700">:</span>}
        </span>
      ))}
    </span>
  );
}

function Rail({ title, to, query, testId, icon }: { title: string; to: string; query: ReturnType<typeof useRail>; testId: string; icon?: React.ReactNode }) {
  const { t, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const items = query.isError ? [] : (query.data?.items ?? []);
  return (
    <section className="mt-10" data-testid={testId}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          {icon}
          {title}
        </h2>
        <Link to={to} data-testid={`${testId}-see-all`} className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          {t("see_all")} <Arrow className="size-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {query.isLoading ? <ProductGridSkeleton n={5} /> : items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {query.isError && <p className="py-6 text-sm text-slate-500">{t("load_failed")}</p>}
    </section>
  );
}

export default function Home() {
  const { t, tx, dir } = useI18n();
  const { data: categories } = useCategories();
  const deals = useRail("deals", "deals=true&limit=5&sort=bestseller");
  const best = useRail("best", "sort=bestseller&limit=10");
  const fresh = useRail("new", "sort=newest&limit=10");
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
      {/* hero bento */}
      <div className="grid gap-4 md:grid-cols-12">
        <HeroCarousel
          deals={deals.isError ? [] : (deals.data?.items ?? [])}
          best={best.isError ? [] : (best.data?.items ?? [])}
          fresh={fresh.isError ? [] : (fresh.data?.items ?? [])}
        />
        <div className="grid gap-4 md:col-span-4">
          <Link
            to="/seller/apply"
            data-testid="home-seller-cta"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-primary p-6 text-white transition-transform duration-200 hover:-translate-y-0.5"
          >
            <Store className="absolute -bottom-4 end-[-12px] size-36 text-white/15 transition-transform duration-300 group-hover:rotate-[-8deg]" />
            <div>
              <h3 className="text-2xl font-black leading-tight">{t("seller_cta_title")}</h3>
              <p className="mt-2 text-sm text-teal-50">{t("seller_cta_sub")}</p>
            </div>
            <span className="mt-4 flex w-fit items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-black text-primary">
              {t("apply_now")} <Arrow className="size-4" />
            </span>
          </Link>
          <div className="flex items-center gap-4 rounded-3xl border border-teal-200 bg-teal-50 p-5">
            <BadgeCheck className="size-10 shrink-0 text-teal-600" />
            <div className="text-sm">
              <p className="font-black text-teal-900">{t("trust_cod")} • {t("trust_card")}</p>
              <p className="text-teal-800">{t("trust_delivery")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* categories */}
      <section className="mt-8" data-testid="home-categories">
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 lg:grid-cols-8">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to={`/products?category=${c.slug}`}
              data-testid={`home-category-${c.slug}`}
              className="group flex w-24 shrink-0 flex-col items-center gap-2 sm:w-auto"
            >
              <span className="relative size-20 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200 transition-transform duration-200 group-hover:scale-105 group-hover:ring-primary">
                <img src={c.image} alt="" className="size-full object-cover" loading="lazy" />
                <span className="absolute bottom-0 end-0 grid size-7 place-items-center rounded-full bg-white text-primary shadow">
                  <CategoryIcon name={c.icon} className="size-4" />
                </span>
              </span>
              <span className="text-center text-xs font-bold text-slate-700 group-hover:text-primary">{tx(c.name)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* flash deals */}
      <section className="mt-8 rounded-3xl bg-teal-50 p-4 ring-1 ring-teal-100 sm:p-6" data-testid="home-flash-deals">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black text-teal-900 sm:text-2xl">
            <Zap className="size-6 fill-teal-500 text-teal-500" />
            {t("flash_deals")}
          </h2>
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-800">
            <Timer className="size-4" /> {t("ends_in")} <Countdown />
            <Link to="/products?deals=true" data-testid="flash-deals-see-all" className="ms-2 font-bold text-teal-700 hover:underline">
              {t("see_all")}
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {deals.isLoading ? <ProductGridSkeleton n={5} /> : (deals.isError ? [] : (deals.data?.items ?? [])).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <Rail title={t("bestsellers")} to="/products?sort=bestseller" query={best} testId="home-bestsellers" />
      <Rail title={t("new_arrivals")} to="/products?sort=newest" query={fresh} testId="home-new-arrivals" />
    </div>
  );
}
