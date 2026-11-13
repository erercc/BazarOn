import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Flame, Sparkles, Zap } from "lucide-react";
import { useCurrency, Price } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";
import { DiscountBadge, discountPct } from "@/components/ProductCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HERO_IMG = "https://images.unsplash.com/photo-1664455340023-214c33a9d0bd?w=1400&q=80&auto=format&fit=crop";
const INTERVAL = 5000;

interface Slide {
  id: string;
  kicker: string;
  title: string;
  sub: string;
  to: string;
  bg: string;
  icon?: React.ReactNode;
  products?: Product[];
}

function ProductTile({ p, i }: { p: Product; i: number }) {
  const { tx } = useI18n();
  const { format } = useCurrency();
  const pct = discountPct(p);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}>
      <Link
        to={`/product/${p.id}`}
        data-testid={`hero-slide-product-${p.id}`}
        className={cn(
          "group relative flex w-32 flex-col overflow-hidden rounded-2xl bg-white shadow-xl transition-transform duration-200 hover:-translate-y-1 sm:w-40",
          i === 1 && "sm:-translate-y-4 sm:hover:-translate-y-5",
        )}
      >
        <span className="relative aspect-square overflow-hidden">
          <img src={p.images[0]} alt={tx(p.title)} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {pct > 0 && <DiscountBadge pct={pct} />}
        </span>
        <span className="space-y-0.5 p-2">
          <span className="line-clamp-1 block text-[11px] font-semibold text-slate-700">{tx(p.title)}</span>
          <span className="block text-[12px] font-bold text-slate-900" dir="ltr"><Price usd={p.price} /></span>
        </span>
      </Link>
    </motion.div>
  );
}

export function HeroCarousel({ deals, best, fresh }: { deals: Product[]; best: Product[]; fresh: Product[] }) {
  const { t, dir } = useI18n();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides: Slide[] = [
    { id: "promo", kicker: t("hero_kicker"), title: t("hero_title"), sub: t("hero_sub"), to: "/products", bg: "bg-slate-800" },
    { id: "deals", kicker: t("slide_deals_kicker"), title: t("slide_deals_title"), sub: t("slide_deals_sub"), to: "/products?deals=true", bg: "bg-gradient-to-br from-red-700 via-rose-700 to-slate-900", icon: <Zap className="size-4 fill-current" />, products: deals.slice(0, 3) },
    { id: "best", kicker: t("slide_best_kicker"), title: t("slide_best_title"), sub: t("slide_best_sub"), to: "/products?sort=bestseller", bg: "bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900", icon: <Flame className="size-4" />, products: best.slice(0, 3) },
    { id: "new", kicker: t("slide_new_kicker"), title: t("slide_new_title"), sub: t("slide_new_sub"), to: "/products?sort=newest", bg: "bg-gradient-to-br from-sky-700 via-cyan-800 to-slate-900", icon: <Sparkles className="size-4" />, products: fresh.slice(0, 3) },
  ].filter((s) => s.id === "promo" || (s.products && s.products.length > 0));
  const n = slides.length;
  const current = slides[idx % n];

  useEffect(() => {
    if (paused || n < 2) return;
    const id = setTimeout(() => setIdx((i) => (i + 1) % n), INTERVAL);
    return () => clearTimeout(id);
  }, [idx, paused, n]);

  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <section
      className="relative min-h-[340px] overflow-hidden rounded-3xl md:col-span-8"
      data-testid="home-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: dir === "rtl" ? -60 : 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir === "rtl" ? 60 : -60 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={cn("absolute inset-0", current.bg)}
          data-testid={`hero-slide-${current.id}`}
        >
          {current.id === "promo" && (
            <>
              <img src={HERO_IMG} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />
            </>
          )}
          <div className="relative flex h-full flex-col justify-end gap-4 p-6 pb-12 sm:flex-row sm:items-center sm:justify-between sm:p-10 sm:pb-12">
            <div className="flex max-w-xl flex-col gap-3">
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white ring-1 ring-white/25 backdrop-blur">
                {current.icon}
                {current.kicker}
              </span>
              <h1 className={cn("font-black leading-tight text-white", current.products ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-5xl")}>{current.title}</h1>
              <p className="max-w-md text-sm text-white/80 sm:text-base">{current.sub}</p>
              <Link to={current.to} data-testid={`hero-slide-cta-${current.id}`} className={cn(buttonVariants({ size: "lg" }), "h-11 w-fit bg-white px-6 text-base font-bold text-slate-900 hover:bg-white/90")}>
                {current.id === "promo" ? t("shop_now") : t("see_all")} <Arrow className="size-4" />
              </Link>
            </div>
            {current.products && (
              <div className="hidden shrink-0 items-end gap-3 md:flex">
                {current.products.map((p, i) => (
                  <ProductTile key={p.id} p={p} i={i} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {n > 1 && (
        <>
          <button aria-label={t("prev")} data-testid="hero-carousel-prev" onClick={() => setIdx((i) => (i - 1 + n) % n)} className="absolute start-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition-[background-color,transform] hover:scale-110 hover:bg-white/35 sm:grid">
            <Prev className="size-5" />
          </button>
          <button aria-label={t("next")} data-testid="hero-carousel-next" onClick={() => setIdx((i) => (i + 1) % n)} className="absolute end-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition-[background-color,transform] hover:scale-110 hover:bg-white/35 sm:grid">
            <Next className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2" data-testid="hero-carousel-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                aria-label={t("go_to_slide", { n: i + 1 })}
                data-testid={`hero-carousel-dot-${i}`}
                onClick={() => setIdx(i)}
                className="relative h-2 overflow-hidden rounded-full bg-white/35 transition-[width] duration-300"
                style={{ width: i === idx % n ? 32 : 8 }}
              >
                {i === idx % n && !paused && (
                  <motion.span
                    key={idx}
                    className="absolute inset-y-0 start-0 bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: INTERVAL / 1000, ease: "linear" }}
                  />
                )}
                {i === idx % n && paused && <span className="absolute inset-0 bg-white" />}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
