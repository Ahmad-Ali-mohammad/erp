"use client";

import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError, createPaymentIntent, request } from "@/lib/api-client";
import type { PortalContract, PortalInstallment } from "@/lib/portal-types";

function formatUnit(contract?: PortalContract | null) {
  if (!contract) {
    return "-";
  }
  const building = contract.unit_building_code ?? contract.building_name ?? "";
  const unit = contract.unit_code ?? String(contract.unit ?? "");
  const base = [building, unit].filter(Boolean).join(" / ") || unit;
  const floor = contract.unit_floor != null ? `الدور ${contract.unit_floor}` : "";
  const typeName = contract.unit_type_name ?? "";
  return [base, typeName, floor].filter(Boolean).join(" • ");
}

export default function PortalContractDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = String(params?.id ?? "");

  const contractQuery = useQuery({
    queryKey: ["portal-contract", contractId],
    queryFn: () => request<PortalContract>(`/v1/real-estate/portal/contracts/${contractId}/`),
    enabled: Boolean(contractId),
  });

  const installmentsQuery = useQuery({
    queryKey: ["portal-contract-installments", contractId],
    queryFn: () =>
      request<PortalInstallment[]>(`/v1/real-estate/portal/contracts/${contractId}/installments/`),
    enabled: Boolean(contractId),
  });

  const payMutation = useMutation({
    mutationFn: (installmentId: number) => createPaymentIntent({ installment: installmentId }),
    onSuccess: (intent) => {
      router.push(`/portal/pay?intent=${intent.id}`);
    },
  });

  const errorMessage = payMutation.error instanceof ApiError ? payMutation.error.message : "";
  const contract = contractQuery.data ?? null;

  if (!contractId) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل العقد</h2>
        <p>لم يتم تحديد عقد للعرض.</p>
        <Link className="btn btn-outline" href="/portal/contracts">
          العودة إلى العقود
        </Link>
      </section>
    );
  }

  if (contractQuery.isLoading) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل العقد</h2>
        <p>جارٍ تحميل البيانات...</p>
      </section>
    );
  }

  if (contractQuery.isError || !contract) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل العقد</h2>
        <p className="error-banner">تعذر تحميل بيانات العقد.</p>
        <Link className="btn btn-outline" href="/portal/contracts">
          العودة إلى العقود
        </Link>
      </section>
    );
  }

  return (
    <div className="portal-overview">
      <section className="portal-panel">
        <div className="section-header">
          <h3>تفاصيل العقد</h3>
          <p>رقم العقد: {contract.contract_number}</p>
        </div>
        <div className="section-grid">
          <div className="section-card">
            <strong>المشروع</strong>
            <p>{contract.project_name ?? contract.project_code ?? "-"}</p>
          </div>
          <div className="section-card">
            <strong>الوحدة</strong>
            <p>{formatUnit(contract)}</p>
          </div>
          <div className="section-card">
            <strong>المساحة</strong>
            <p>{contract.unit_area_sqm ?? "-"}</p>
          </div>
          <div className="section-card">
            <strong>الحالة</strong>
            <p>{contract.status}</p>
          </div>
          <div className="section-card">
            <strong>تاريخ العقد</strong>
            <p>{contract.contract_date}</p>
          </div>
          <div className="section-card">
            <strong>القيمة الإجمالية</strong>
            <p>{formatMoney(contract.total_price, contract.currency ?? "KWD")}</p>
          </div>
          <div className="section-card">
            <strong>الدفعة المقدمة</strong>
            <p>{formatMoney(contract.down_payment, contract.currency ?? "KWD")}</p>
          </div>
        </div>
      </section>

      <section className="portal-panel">
        <div className="section-header">
          <h3>جدول الأقساط</h3>
          <p>أدر الدفعات واعرف حالة الاستحقاق.</p>
        </div>
        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        <div className="table-scroll">
          <table className="resource-table">
            <thead>
              <tr>
                <th>رقم القسط</th>
                <th>تاريخ الاستحقاق</th>
                <th>القيمة</th>
                <th>العملة</th>
                <th>المدفوع</th>
                <th>الحالة</th>
                <th>الدفع</th>
              </tr>
            </thead>
            <tbody>
              {(installmentsQuery.data ?? []).map((row) => {
                const isPaid = row.status === "PAID" || row.status === "paid";
                return (
                  <tr key={row.id}>
                    <td><Link href={`/portal/installments/${row.id}`}>{row.installment_number}</Link></td>
                    <td>{row.due_date}</td>
                    <td>{formatMoney(row.amount, row.currency ?? contract.currency ?? "KWD")}</td>
                    <td>{row.currency ?? contract.currency ?? "KWD"}</td>
                    <td>{formatMoney(row.paid_amount, row.currency ?? contract.currency ?? "KWD")}</td>
                    <td>{row.status}</td>
                    <td>
                      {isPaid ? (
                        <span className="status-badge status-success">مدفوع</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={payMutation.isPending}
                          onClick={() => payMutation.mutate(row.id)}
                        >
                          ادفع
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!installmentsQuery.data?.length ? (
                <tr>
                  <td className="table-empty" colSpan={7}>
                    لا توجد أقساط مسجلة لهذا العقد.
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
