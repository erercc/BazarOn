import { Link } from "react-router-dom";
import { Show } from "@clerk/react";
import { Loader2, LogIn, ShieldAlert } from "lucide-react";
import { useMe } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { OrderStatus, PaymentStatus, Role } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  processing: "bg-sky-50 text-sky-700 ring-sky-200",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  delivered: "bg-green-50 text-green-700 ring-green-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function StatusBadge({ status, testId }: { status: OrderStatus; testId?: string }) {
  const { t } = useI18n();
  return (
    <span data-testid={testId} className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1", STATUS_STYLE[status])}>
      {t(`status_${status}`)}
    </span>
  );
}

export function PaymentBadge({ status, testId }: { status: PaymentStatus; testId?: string }) {
  const { t } = useI18n();
  const style =
    status === "paid" ? "text-green-700 bg-green-50" : status === "failed" ? "text-red-700 bg-red-50" : "text-slate-600 bg-slate-100";
  return (
    <span data-testid={testId} className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold", style)}>
      {t(`pay_status_${status}`)}
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">{children}</div>;
}

// Signed-out visitors get a sign-in prompt; optional role gate (server still enforces).
export function Gate({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { t } = useI18n();
  const { me, isLoading } = useMe();
  return (
    <>
      <Show when="signed-out">
        <Centered>
          <LogIn className="size-10 text-primary" />
          <p className="text-lg font-bold text-slate-800" data-testid="gate-sign-in-message">{t("sign_in_first")}</p>
          <Link to="/sign-in" data-testid="gate-sign-in-button" className={buttonVariants({ size: "lg" })}>
            {t("sign_in")}
          </Link>
        </Centered>
      </Show>
      <Show when="signed-in">
        {!roles ? (
          children
        ) : isLoading || !me ? (
          <Centered>
            <Loader2 className="size-8 animate-spin text-primary" />
          </Centered>
        ) : roles.includes(me.role) ? (
          children
        ) : (
          <Centered>
            <ShieldAlert className="size-10 text-slate-400" />
            <p className="font-semibold text-slate-700" data-testid="gate-not-allowed-message">{t("not_allowed")}</p>
          </Centered>
        )}
      </Show>
    </>
  );
}

export function StatCard({ label, value, icon, testId }: { label: string; value: React.ReactNode; icon: React.ReactNode; testId: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-primary">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-xl font-black text-slate-900" dir="ltr" data-testid={testId}>
          {value}
        </p>
      </div>
    </div>
  );
}
