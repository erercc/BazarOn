import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Settings } from "@/lib/types";

export type Currency = "USD" | "SYP";
export const DEFAULT_SETTINGS: Settings = { exchange_rate: 110, shipping_fee: 2, free_shipping_over: 50 };

interface CurrencyCtx {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  settings: Settings;
  format: (usd: number, c?: Currency) => string;
  parts: (usd: number, c?: Currency) => PriceParts;
}

export interface PriceParts {
  int: string;
  dec: string;
  prefix: string;
  suffix: string;
}

const Ctx = createContext<CurrencyCtx | null>(null);

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/settings"), staleTime: 60_000 });
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setState] = useState<Currency>(() =>
    localStorage.getItem("souqna-currency") === "USD" ? "USD" : "SYP",
  );
  const { data } = useSettings();
  const settings = data ?? DEFAULT_SETTINGS;
  const { lang } = useI18n();

  const setCurrency = useCallback((c: Currency) => {
    localStorage.setItem("souqna-currency", c);
    setState(c);
  }, []);

  // 13.450,34 style: dot thousands, comma decimals, decimals dropped when zero (400 not 400,00).
  const parts = useCallback(
    (usd: number, c: Currency = currency): PriceParts => {
      const cents = Math.round((c === "USD" ? usd : usd * settings.exchange_rate) * 100);
      const int = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.floor(cents / 100));
      const rest = cents % 100;
      return {
        int,
        dec: rest ? String(rest).padStart(2, "0") : "",
        prefix: c === "USD" ? "$" : "",
        suffix: c === "USD" ? "" : lang === "ar" ? "ل.س" : "SYP",
      };
    },
    [currency, settings.exchange_rate, lang],
  );

  const format = useCallback(
    (usd: number, c: Currency = currency) => {
      const x = parts(usd, c);
      return `${x.prefix}${x.int}${x.dec ? `,${x.dec}` : ""}${x.suffix ? ` ${x.suffix}` : ""}`;
    },
    [currency, parts],
  );

  const value = useMemo(() => ({ currency, setCurrency, settings, format, parts }), [currency, setCurrency, settings, format, parts]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrency outside CurrencyProvider");
  return ctx;
}

// Price with smaller cents ("13.450" + ",34") and a light currency label.
export function Price({ usd, cur, className, testId }: { usd: number; cur?: Currency; className?: string; testId?: string }) {
  const { parts } = useCurrency();
  const x = parts(usd, cur);
  return (
    <span dir="ltr" className={`whitespace-nowrap tabular-nums ${className ?? ""}`} data-testid={testId}>
      {x.prefix}
      {x.int}
      {x.dec && <span className="align-[0.28em] text-[0.68em]">,{x.dec}</span>}
      {x.suffix && <span className="ms-1 text-[0.72em] font-semibold opacity-75">{x.suffix}</span>}
    </span>
  );
}
