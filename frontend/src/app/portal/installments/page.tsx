"use client";

import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ApiError, createPaymentIntent, listResource } from "@/lib/api-client";
import type { PortalInstallment } from "@/lib/portal-types";

function formatUnit(row: PortalInstallment) {
  const building = row.unit_building_code ?? row.building_name ?? "";
  const unit = row.unit_code ?? "";
  const base = [building, unit].filter(Boolean).join(" / ") || unit;
  const floor = row.unit_floor != null ? `الدور ${row.unit_floor}` : "";
  return [base, floor].filter(Boolean).join(" • ");
}

export default function PortalInstallmentsPage() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["portal-installments"],
    queryFn: () => listResource<PortalInstallment>("/v1/real-estate/portal/installments/"),
  });
  const payMutation = useMutation({
    mutationFn: (installmentId: number) => createPaymentIntent({ installment: installmentId }),
    onSuccess: (intent) => {
      router.push(`/portal/pay?intent=${intent.id}`);
    },
  });
  const errorMessage = payMutation.error instanceof ApiError ? payMutation.error.message : "";

  return (
    <section className="portal-panel">
      <h2>الأقساط</h2>
      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              <th>رقم القسط</th>
              <th>العقد</th>
              <th>الوحدة</th>
              <th>المساحة</th>
              <th>تاريخ الاستحقاق</th>
              <th>القيمة</th>
              <th>العملة</th>
              <th>المدفوع</th>
              <th>الحالة</th>
              <th>الدفع</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.results ?? []).map((row) => {
              const isPaid = row.status === "PAID" || row.status === "paid";
              return (
                <tr key={row.id}>
                  <td><Link href={`/portal/installments/${row.id}`}>{row.installment_number}</Link></td>
                  <td>{row.contract_number ?? "-"}</td>
                  <td>{formatUnit(row)}</td>
                  <td>{row.unit_area_sqm ?? "-"}</td>
                  <td>{row.due_date}</td>
                  <td>{formatMoney(row.amount, row.currency ?? "KWD")}</td>
                  <td>{row.currency ?? "KWD"}</td>
                  <td>{formatMoney(row.paid_amount, row.currency ?? "KWD")}</td>
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
            {!query.data?.results?.length ? (
              <tr>
                <td className="table-empty" colSpan={10}>
                  لا توجد أقساط حالياً.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
