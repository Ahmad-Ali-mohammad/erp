"use client";

import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError, createPaymentIntent, request } from "@/lib/api-client";
import type { PortalInstallment, PortalInstallmentPayment } from "@/lib/portal-types";

function formatUnit(installment?: PortalInstallment | null) {
  if (!installment) {
    return "-";
  }
  const building = installment.unit_building_code ?? installment.building_name ?? "";
  const unit = installment.unit_code ?? "";
  const base = [building, unit].filter(Boolean).join(" / ") || unit;
  const typeName = installment.unit_type_name ?? "";
  const floor = installment.unit_floor != null ? `الدور ${installment.unit_floor}` : "";
  return [base, typeName, floor].filter(Boolean).join(" • ");
}

export default function PortalInstallmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const installmentId = String(params?.id ?? "");

  const installmentQuery = useQuery({
    queryKey: ["portal-installment", installmentId],
    queryFn: () => request<PortalInstallment>(`/v1/real-estate/portal/installments/${installmentId}/`),
    enabled: Boolean(installmentId),
  });

  const paymentsQuery = useQuery({
    queryKey: ["portal-installment-payments", installmentId],
    queryFn: () =>
      request<PortalInstallmentPayment[]>(`/v1/real-estate/portal/installments/${installmentId}/payments/`),
    enabled: Boolean(installmentId),
  });

  const payMutation = useMutation({
    mutationFn: () => createPaymentIntent({ installment: Number(installmentId) }),
    onSuccess: (intent) => {
      router.push(`/portal/pay?intent=${intent.id}`);
    },
  });

  const errorMessage = payMutation.error instanceof ApiError ? payMutation.error.message : "";

  if (!installmentId) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل القسط</h2>
        <p>لم يتم تحديد قسط للعرض.</p>
        <Link className="btn btn-outline" href="/portal/installments">
          العودة إلى الأقساط
        </Link>
      </section>
    );
  }

  if (installmentQuery.isLoading) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل القسط</h2>
        <p>جارٍ تحميل البيانات...</p>
      </section>
    );
  }

  if (installmentQuery.isError || !installmentQuery.data) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل القسط</h2>
        <p className="error-banner">تعذر تحميل بيانات القسط.</p>
        <Link className="btn btn-outline" href="/portal/installments">
          العودة إلى الأقساط
        </Link>
      </section>
    );
  }

  const installment = installmentQuery.data;
  const isPaid = installment.status === "PAID" || installment.status === "paid";

  return (
    <div className="portal-overview">
      <section className="portal-panel">
        <div className="section-header">
          <h3>تفاصيل القسط</h3>
          <p>رقم القسط: {installment.installment_number}</p>
        </div>
        <div className="section-grid">
          <div className="section-card">
            <strong>العقد</strong>
            <p>{installment.contract_number ?? "-"}</p>
          </div>
          <div className="section-card">
            <strong>المشروع</strong>
            <p>{installment.project_name ?? installment.project_code ?? "-"}</p>
          </div>
          <div className="section-card">
            <strong>الوحدة</strong>
            <p>{formatUnit(installment)}</p>
          </div>
          <div className="section-card">
            <strong>تاريخ الاستحقاق</strong>
            <p>{installment.due_date}</p>
          </div>
          <div className="section-card">
            <strong>المبلغ</strong>
            <p>
              {formatMoney(installment.amount, installment.currency ?? "KWD")}
            </p>
          </div>
          <div className="section-card">
            <strong>المدفوع</strong>
            <p>
              {formatMoney(installment.paid_amount, installment.currency ?? "KWD")}
            </p>
          </div>
          <div className="section-card">
            <strong>الحالة</strong>
            <p>{installment.status}</p>
          </div>
        </div>
        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {!isPaid ? (
          <div className="resource-toolbar-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={payMutation.isPending}
              onClick={() => payMutation.mutate()}
            >
              ادفع القسط
            </button>
          </div>
        ) : null}
      </section>

      <section className="portal-panel">
        <div className="section-header">
          <h3>سجل المدفوعات</h3>
          <p>الحركات المرتبطة بهذا القسط.</p>
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
              {(paymentsQuery.data ?? []).map((row) => (
                <tr key={row.id}>
                <td>{row.payment_reference ?? row.payment ?? row.id}</td>
                <td>{row.payment_date ?? "-"}</td>
                <td>{formatMoney(row.amount, row.currency ?? installment.currency ?? "KWD")}</td>
                <td>{formatMoney(row.payment_amount ?? row.amount, row.currency ?? installment.currency ?? "KWD")}</td>
                <td>{row.currency ?? installment.currency ?? "KWD"}</td>
                  <td>{row.payment_method ?? "-"}</td>
                  <td>{row.payment_status ?? "-"}</td>
                </tr>
              ))}
              {!paymentsQuery.data?.length ? (
                <tr>
                  <td className="table-empty" colSpan={7}>
                    لا توجد مدفوعات مسجلة لهذا القسط.
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
