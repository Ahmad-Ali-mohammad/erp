"use client";

import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getPaymentIntent } from "@/lib/api-client";
import type { PortalPaymentIntent } from "@/lib/portal-types";
import { StripePaymentForm } from "@/components/payments/stripe-payment-form";

export default function PortalPayPage() {
  const searchParams = useSearchParams();
  const intentId = searchParams.get("intent");

  const intentQuery = useQuery<PortalPaymentIntent>({
    queryKey: ["payment-intent", intentId],
    queryFn: () => getPaymentIntent(intentId as string) as Promise<PortalPaymentIntent>,
    enabled: Boolean(intentId),
  });

  if (!intentId) {
    return (
      <section className="portal-panel payment-panel">
        <h2>الدفع الإلكتروني</h2>
        <p>يرجى اختيار دفعة أو فاتورة قبل المتابعة.</p>
        <Link className="btn btn-outline" href="/portal">
          العودة إلى البوابة
        </Link>
      </section>
    );
  }

  if (intentQuery.isLoading) {
    return (
      <section className="portal-panel payment-panel">
        <h2>الدفع الإلكتروني</h2>
        <p>جارٍ تحميل تفاصيل الدفع...</p>
      </section>
    );
  }

  if (intentQuery.isError || !intentQuery.data) {
    return (
      <section className="portal-panel payment-panel">
        <h2>الدفع الإلكتروني</h2>
        <p className="error-banner">تعذر تحميل تفاصيل الدفع. حاول مرة أخرى.</p>
        <Link className="btn btn-outline" href="/portal">
          العودة إلى البوابة
        </Link>
      </section>
    );
  }

  const intent = intentQuery.data;
  const isPaid = intent.status === "succeeded";

  return (
    <section className="portal-panel payment-panel">
      <h2>الدفع الإلكتروني</h2>
      <div className="payment-summary">
        <div className="payment-summary-card">
          <p>المبلغ</p>
          <strong>
            {formatMoney(intent.amount, intent.currency)}
          </strong>
        </div>
        <div className="payment-summary-card">
          <p>الحالة</p>
          <strong>{intent.status}</strong>
        </div>
      </div>

      {isPaid ? (
        <p className="status-chip status-success">تم إتمام الدفع لهذه العملية.</p>
      ) : (
        <StripePaymentForm clientSecret={intent.client_secret} returnPath="/portal/payments" />
      )}
    </section>
  );
}
