import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, XCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { PaymentStatusOut } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";

const MAX_POLLS = 20;

export function PaymentSuccess() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const polls = useRef(0);
  const { data, isError } = useQuery({
    queryKey: ["payment", sessionId],
    queryFn: () => {
      polls.current += 1;
      return apiGet<PaymentStatusOut>(`/payments/status/${sessionId}`);
    },
    enabled: !!sessionId,
    refetchInterval: (q) => (q.state.data?.payment_status === "paid" || polls.current >= MAX_POLLS ? false : 2000),
  });

  if (data?.payment_status === "paid" && data.order_id) return <Navigate to={`/orders/${data.order_id}?new=1`} replace />;
  const gaveUp = isError || !sessionId || polls.current >= MAX_POLLS || data?.payment_status === "failed";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center" data-testid="payment-success-page">
      {gaveUp ? (
        <>
          <p className="text-slate-600" data-testid="payment-timeout-message">{t("payment_timeout")}</p>
          <Link to="/orders" className={buttonVariants()}>{t("my_orders")}</Link>
        </>
      ) : (
        <>
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="font-semibold text-slate-700" data-testid="payment-verifying-message">{t("verifying_payment")}</p>
        </>
      )}
    </div>
  );
}

export function PaymentCancel() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center" data-testid="payment-cancel-page">
      <XCircle className="size-12 text-slate-400" />
      <h1 className="text-2xl font-black text-slate-900">{t("payment_cancelled")}</h1>
      <p className="text-slate-500">{t("payment_cancelled_sub")}</p>
      <div className="flex gap-3">
        <Link to="/orders" className={buttonVariants({ variant: "outline" })} data-testid="payment-cancel-orders-link">{t("my_orders")}</Link>
        <Link to="/products" className={buttonVariants()}>{t("continue_shopping")}</Link>
      </div>
    </div>
  );
}
