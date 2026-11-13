import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useRef, useState } from "react";
import { Show, UserButton } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgePercent, Heart, Search, ShoppingCart, Store, Truck, User, Package, ShieldCheck, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { LANGS, useI18n } from "@/lib/i18n";
import type { Category } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/Flag";
import { useWishlist } from "@/lib/wishlist";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => apiGet<Category[]>("/categories"), staleTime: 300_000 });
}

function Logo() {
  return (
    <Link to="/" data-testid="header-logo-link" className="flex shrink-0 items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-lg font-black text-white shadow-[0_6px_16px_-6px_rgba(10,147,150,0.8)]">
        B
      </span>
      <span className="leading-none">
        <span className="block text-xl font-black tracking-tight text-slate-900">Bazar<span className="text-primary">On</span></span>
        <span className="hidden text-[11px] font-semibold text-slate-500 sm:block">بازار أون</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { t, lang, setLang, tx, dir } = useI18n();
  const { data: categories } = useCategories();
  const { count: wishCount } = useWishlist();
  const [hover, setHover] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu = (slug: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHover(slug);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHover(null), 120);
  };
  const hovered = categories?.find((c) => c.slug === hover && c.subcategories.length > 0);
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const { currency, setCurrency, format, settings } = useCurrency();
  const { count } = useCart();
  const { me } = useMe();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : "/products");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      {/* utility bar */}
      <div className="bg-slate-900 text-[12px] text-slate-200">
        <div className="mx-auto flex h-8 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <span className="hidden items-center gap-1.5 sm:flex" data-testid="header-free-shipping-note">
            <Truck className="size-3.5 text-teal-400" />
            {t("free_shipping_over", { v: format(settings.free_shipping_over) })}
          </span>
          <span className="hidden text-slate-500 md:inline">•</span>
          <span className="hidden md:inline">{t("cod_available")}</span>
          <div className="ms-auto flex items-center gap-3">
            <div className="flex overflow-hidden rounded-full border border-slate-700" role="group" aria-label={t("currency")}>
              {(["SYP", "USD"] as const).map((c) => (
                <button
                  key={c}
                  data-testid={`currency-toggle-${c.toLowerCase()}`}
                  onClick={() => {
                    setCurrency(c);
                    toast(`${t("currency")}: ${c}`);
                  }}
                  className={cn(
                    "px-2.5 py-0.5 font-bold transition-colors duration-150",
                    currency === c ? "bg-primary text-white" : "text-slate-300 hover:text-white",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                data-testid="language-switcher-trigger"
                className="flex items-center gap-1 font-semibold text-slate-200 transition-colors hover:text-white"
              >
                <Flag lang={lang} />
                {LANGS.find((l) => l.code === lang)?.label}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LANGS.map((l) => (
                  <DropdownMenuItem key={l.code} data-testid={`language-switcher-${l.code}`} onClick={() => setLang(l.code)} className="gap-2">
                    <Flag lang={l.code} />
                    {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {me?.role !== "seller" && me?.role !== "admin" && (
              <Link to="/seller/apply" data-testid="header-become-seller-link" className="hidden items-center gap-1 font-semibold text-teal-300 hover:text-teal-200 sm:flex">
                <Store className="size-3.5" />
                {t("become_seller")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6 lg:px-8">
        <Logo />
        <form onSubmit={submit} className="order-last w-full sm:order-none sm:flex-1" role="search">
          <div className="group relative flex items-center">
            <input
              data-testid="header-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search_placeholder")}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pe-12 ps-4 text-sm outline-none transition-[border-color,background-color] duration-150 placeholder:text-slate-400 focus:border-primary focus:bg-white"
            />
            <button
              type="submit"
              data-testid="header-search-submit-button"
              aria-label={t("search")}
              className="absolute end-1.5 grid size-8 place-items-center rounded-lg bg-primary text-white transition-transform duration-150 hover:scale-105 active:scale-95"
            >
              <Search className="size-4" />
            </button>
          </div>
        </form>

        <nav className="ms-auto flex items-center gap-1 sm:ms-0 sm:gap-2">
          <Show when="signed-out">
            <Link
              to="/sign-in"
              data-testid="header-sign-in-link"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-primary"
            >
              <User className="size-5" />
              <span className="hidden md:inline">{t("sign_in")}</span>
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              to="/orders"
              data-testid="header-orders-link"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-primary"
            >
              <Package className="size-5" />
              <span className="hidden lg:inline">{t("my_orders")}</span>
            </Link>
            {(me?.role === "seller" || me?.role === "admin") && (
              <Link
                to="/seller"
                data-testid="header-seller-hub-link"
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-primary"
              >
                <Store className="size-5" />
                <span className="hidden lg:inline">{t("seller_hub")}</span>
              </Link>
            )}
            {me?.role === "admin" && (
              <Link
                to="/admin"
                data-testid="header-admin-link"
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-primary"
              >
                <ShieldCheck className="size-5" />
                <span className="hidden lg:inline">{t("admin_panel")}</span>
              </Link>
            )}
          </Show>
          <Link
            to="/wishlist"
            data-testid="header-wishlist-link"
            aria-label={t("wishlist")}
            className="relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-primary"
          >
            <Heart className="size-5" />
            <span className="hidden xl:inline">{t("wishlist")}</span>
            {wishCount > 0 && (
              <span data-testid="header-wishlist-count" className="absolute -top-0.5 start-6 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                {wishCount}
              </span>
            )}
          </Link>
          <Link
            to="/cart"
            data-testid="header-cart-link"
            className="relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-primary"
          >
            <ShoppingCart className="size-5" />
            <span className="hidden md:inline">{t("cart")}</span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  data-testid="header-cart-count"
                  className="absolute -top-0.5 start-6 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white ring-2 ring-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <Show when="signed-in">
            <div className="ps-1" data-testid="header-user-button">
              <UserButton />
            </div>
          </Show>
        </nav>
      </div>

      {/* category strip + mega menu */}
      <div className="relative border-t border-slate-100" onMouseLeave={scheduleClose}>
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-0.5 overflow-x-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/products"
            data-testid="category-strip-all"
            onMouseEnter={scheduleClose}
            className="flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-bold text-slate-900 transition-colors hover:text-primary"
          >
            <LayoutGrid className="size-4" />
            {t("all_categories")}
          </Link>
          <Link
            to="/products?deals=true"
            data-testid="category-strip-deals"
            onMouseEnter={scheduleClose}
            className="flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-black text-red-600 transition-colors hover:text-red-700"
          >
            <BadgePercent className="size-4" />
            {t("deals_nav")}
          </Link>
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to={`/products?category=${c.slug}`}
              data-testid={`category-strip-${c.slug}`}
              onMouseEnter={() => openMenu(c.slug)}
              onClick={() => setHover(null)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-[color,border-color] duration-150",
                hover === c.slug ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-primary",
              )}
            >
              <CategoryIcon name={c.icon} className="size-4" />
              {tx(c.name)}
            </Link>
          ))}
        </div>
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="mega"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              onMouseEnter={() => openMenu(hovered.slug)}
              className="absolute inset-x-0 top-full z-50 hidden border-t border-slate-200 bg-white shadow-[0_24px_40px_-24px_rgba(15,23,42,0.35)] md:block"
              data-testid={`mega-menu-${hovered.slug}`}
            >
              <div className="mx-auto grid max-w-7xl grid-cols-[1fr_260px] gap-8 px-4 py-6 sm:px-6 lg:px-8">
                <div>
                  <Link
                    to={`/products?category=${hovered.slug}`}
                    onClick={() => setHover(null)}
                    data-testid={`mega-menu-all-${hovered.slug}`}
                    className="mb-4 inline-flex items-center gap-1.5 text-base font-black text-slate-900 hover:text-primary"
                  >
                    {t("view_all_in", { c: tx(hovered.name) })} <Arrow className="size-4" />
                  </Link>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                    {hovered.subcategories.map((sc) => (
                      <Link
                        key={sc.slug}
                        to={`/products?category=${hovered.slug}&sub=${sc.slug}`}
                        onClick={() => setHover(null)}
                        data-testid={`mega-menu-link-${hovered.slug}-${sc.slug}`}
                        className="rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-teal-50 hover:text-primary"
                      >
                        {tx(sc.name)}
                      </Link>
                    ))}
                  </div>
                </div>
                <Link
                  to={`/products?category=${hovered.slug}`}
                  onClick={() => setHover(null)}
                  className="group relative block h-44 overflow-hidden rounded-2xl"
                >
                  <img src={hovered.image} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                  <span className="absolute bottom-3 start-3 text-lg font-black text-white">{tx(hovered.name)}</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
