"use client";

import { formatMoney } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { listResource } from "@/lib/api-client";
import type { PortalContract } from "@/lib/portal-types";

function formatUnit(row: PortalContract) {
  const building = row.unit_building_code ?? row.building_name ?? "";
  const unit = row.unit_code ?? String(row.unit ?? "");
  const base = [building, unit].filter(Boolean).join(" / ") || unit;
  const floor = row.unit_floor != null ? `الدور ${row.unit_floor}` : "";
  return [base, floor].filter(Boolean).join(" • ");
}

export default function PortalContractsPage() {
  const query = useQuery({
    queryKey: ["portal-contracts"],
    queryFn: () => listResource<PortalContract>("/v1/real-estate/portal/contracts/"),
  });

  return (
    <section className="portal-panel">
      <h2>عقود البيع</h2>
      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              <th>رقم العقد</th>
              <th>المشروع</th>
              <th>الوحدة</th>
              <th>المساحة</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>السعر</th>
              <th>الدفعة المقدمة</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.results ?? []).map((row) => (
              <tr key={row.id}>
                <td><Link href={`/portal/contracts/${row.id}`}>{row.contract_number}</Link></td>
                <td>{row.project_name ?? row.project_code ?? "-"}</td>
                <td>{formatUnit(row)}</td>
                <td>{row.unit_area_sqm ?? "-"}</td>
                <td>{row.status}</td>
                <td>{row.contract_date}</td>
                <td>{formatMoney(row.total_price, row.currency ?? "KWD")}</td>
                <td>{formatMoney(row.down_payment, row.currency ?? "KWD")}</td>
              </tr>
            ))}
            {!query.data?.results?.length ? (
              <tr>
                <td className="table-empty" colSpan={8}>
                  لا توجد عقود حالياً.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
