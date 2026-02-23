"use client";

import { formatMoney } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";

import { listResource } from "@/lib/api-client";
import type {
  PortalContract,
  PortalHandover,
  PortalInstallment,
  PortalInvoice,
  PortalPayment,
  PortalReservation,
} from "@/lib/portal-types";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="portal-stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function formatUnitLabel(unitCode?: string, buildingCode?: string) {
  if (!unitCode && !buildingCode) {
    return "-";
  }
  return [buildingCode, unitCode].filter(Boolean).join(" / ");
}

export default function PortalHomePage() {
  const contractsQuery = useQuery({
    queryKey: ["portal-contracts"],
    queryFn: () => listResource<PortalContract>("/v1/real-estate/portal/contracts/", { pageSize: 5 }),
  });
  const reservationsQuery = useQuery({
    queryKey: ["portal-reservations"],
    queryFn: () => listResource<PortalReservation>("/v1/real-estate/portal/reservations/", { pageSize: 5 }),
  });
  const handoversQuery = useQuery({
    queryKey: ["portal-handovers"],
    queryFn: () => listResource<PortalHandover>("/v1/real-estate/portal/handovers/", { pageSize: 5 }),
  });
  const installmentsQuery = useQuery({
    queryKey: ["portal-installments"],
    queryFn: () => listResource<PortalInstallment>("/v1/real-estate/portal/installments/", { pageSize: 5 }),
  });
  const invoicesQuery = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: () => listResource<PortalInvoice>("/v1/finance/portal/invoices/", { pageSize: 5 }),
  });
  const paymentsQuery = useQuery({
    queryKey: ["portal-payments"],
    queryFn: () => listResource<PortalPayment>("/v1/finance/portal/payments/", { pageSize: 5 }),
  });

  return (
    <div className="portal-overview">
      <section className="portal-panel">
        <h2>ملخص الحساب</h2>
        <div className="portal-stats">
          <StatCard label="عقود البيع" value={contractsQuery.data?.count ?? 0} />
          <StatCard label="الحجوزات" value={reservationsQuery.data?.count ?? 0} />
          <StatCard label="التسليم" value={handoversQuery.data?.count ?? 0} />
          <StatCard label="الأقساط" value={installmentsQuery.data?.count ?? 0} />
          <StatCard label="الفواتير" value={invoicesQuery.data?.count ?? 0} />
          <StatCard label="المدفوعات" value={paymentsQuery.data?.count ?? 0} />
        </div>
      </section>

      <section className="portal-panel">
        <h2>آخر الأقساط</h2>
        <div className="table-scroll">
          <table className="resource-table">
            <thead>
              <tr>
                <th>القسط</th>
                <th>العقد</th>
                <th>الوحدة</th>
                <th>تاريخ الاستحقاق</th>
                <th>القيمة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(installmentsQuery.data?.results ?? []).map((row) => (
                <tr key={row.id}>
                  <td>{row.installment_number}</td>
                  <td>{row.contract_number ?? "-"}</td>
                <td>{formatUnitLabel(row.unit_code, row.unit_building_code)}</td>
                <td>{row.due_date}</td>
                <td>{formatMoney(row.amount, row.currency ?? "KWD")}</td>
                <td>{row.status}</td>
              </tr>
              ))}
              {!installmentsQuery.data?.results?.length ? (
                <tr>
                  <td className="table-empty" colSpan={6}>
                    لا توجد أقساط حالياً.
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
