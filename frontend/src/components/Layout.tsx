import { Outlet } from "react-router-dom";
import { CreditCard, RotateCcw, Truck, Wallet } from "lucide-react";
import { Header } from "@/components/Header";
import { useI18n } from "@/lib/i18n";

export default function Layout() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-16 bg-slate-900 text-slate-300" data-testid="site-footer">
        <div className="mx-auto grid max-w-7xl gap-6 border-b border-slate-800 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { icon: Truck, k: "trust_delivery" as const },
            { icon: Wallet, k: "trust_cod" as const },
            { icon: CreditCard, k: "trust_card" as const },
            { icon: RotateCcw, k: "trust_returns" as const },
          ].map(({ icon: Icon, k }) => (
            <div key={k} className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-slate-800 text-teal-400">
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-semibold text-white">{t(k)}</span>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{t("footer_about")}</p>
          <p className="text-slate-500">
            © {new Date().getFullYear()} BazarOn — {t("footer_rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
