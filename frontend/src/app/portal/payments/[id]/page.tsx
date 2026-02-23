"use client";

import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { request } from "@/lib/api-client";
import type { PortalPayment, PortalPaymentAllocation } from "@/lib/portal-types";

export default function PortalPaymentDetailsPage() {
  const params = useParams();
  const paymentId = String(params?.id ?? "");

  const paymentQuery = useQuery({
    queryKey: ["portal-payment", paymentId],
    queryFn: () => request<PortalPayment>(`/v1/finance/portal/payments/${paymentId}/`),
    enabled: Boolean(paymentId),
  });

  const allocationsQuery = useQuery({
    queryKey: ["portal-payment-allocations", paymentId],
    queryFn: () => request<PortalPaymentAllocation[]>(`/v1/finance/portal/payments/${paymentId}/allocations/`),
    enabled: Boolean(paymentId),
  });

  if (!paymentId) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل الدفع</h2>
        <p>لم يتم تحديد عملية الدفع.</p>
        <Link className="btn btn-outline" href="/portal/payments">
          العودة إلى المدفوعات
        </Link>
      </section>
    );
  }

  if (paymentQuery.isLoading) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل الدفع</h2>
        <p>جارٍ تحميل البيانات...</p>
      </section>
    );
  }

  if (paymentQuery.isError || !paymentQuery.data) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل الدفع</h2>
        <p className="error-banner">تعذر تحميل بيانات الدفع.</p>
        <Link className="btn btn-outline" href="/portal/payments">
          العودة إلى المدفوعات
        </Link>
      </section>
    );
  }

  const payment = paymentQuery.data;

  return (
    <div className="portal-overview">
      <section className="portal-panel">
        <div className="section-header">
          <h3>تفاصيل الدفع</h3>
          <p>المرجع: {payment.reference_no || payment.id}</p>
        </div>
        <div className="section-grid">
          <div className="section-card">
            <strong>الفاتورة</strong>
            <p>
              {payment.invoice_number ? (
                <Link href={`/portal/invoices/${payment.invoice}`}>{payment.invoice_number}</Link>
              ) : (
                payment.invoice ?? "-"
              )}
            </p>
          </div>
          <div className="section-card">
            <strong>التاريخ</strong>
            <p>{payment.payment_date}</p>
          </div>
          <div className="section-card">
            <strong>المبلغ</strong>
            <p>
              {formatMoney(payment.amount, payment.currency ?? "KWD")}
            </p>
          </div>
          <div className="section-card">
            <strong>الطريقة</strong>
            <p>{payment.method}</p>
          </div>
          <div className="section-card">
            <strong>الحالة</strong>
            <p>{payment.status}</p>
          </div>
        </div>
      </section>

      <section className="portal-panel">
        <div className="section-header">
          <h3>تخصيص الدفع</h3>
          <p>الفواتير/الأقساط المغطاة بهذا الدفع.</p>
        </div>
        <div className="table-scroll">
          <table className="resource-table">
            <thead>
              <tr>
                <th>المرجع</th>
                <th>التاريخ</th>
                <th>مبلغ التخصيص</th>
                <th>المبلغ المسدد</th>
                <th>العملة</th>
                <th>الطريقة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(allocationsQuery.data ?? []).map((row) => (
                <tr key={row.id}>
                <td>{row.payment_reference ?? payment.reference_no ?? payment.id}</td>
                <td>{row.payment_date ?? payment.payment_date}</td>
                <td>{formatMoney(row.amount, row.currency ?? payment.currency ?? "KWD")}</td>
                <td>{formatMoney(row.payment_amount ?? row.amount, row.currency ?? payment.currency ?? "KWD")}</td>
                <td>{row.currency ?? payment.currency ?? "KWD"}</td>
                <td>{row.payment_method ?? payment.method}</td>
                <td>{row.payment_status ?? payment.status}</td>
                </tr>
              ))}
              {!allocationsQuery.data?.length ? (
                <tr>
                  <td className="table-empty" colSpan={7}>
                    لا يوجد تخصيص مسجل لهذا الدفع.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
