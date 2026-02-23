"use client";

import { useQuery } from "@tanstack/react-query";

import { listResource } from "@/lib/api-client";
import type { PortalHandover } from "@/lib/portal-types";

function formatUnit(row: PortalHandover) {
  const building = row.unit_building_code ?? row.building_name ?? "";
  const unit = row.unit_code ?? "";
  const base = [building, unit].filter(Boolean).join(" / ") || unit;
  const floor = row.unit_floor != null ? `الدور ${row.unit_floor}` : "";
  return [base, floor].filter(Boolean).join(" • ");
}

export default function PortalHandoversPage() {
  const query = useQuery({
    queryKey: ["portal-handovers"],
    queryFn: () => listResource<PortalHandover>("/v1/real-estate/portal/handovers/"),
  });

  return (
    <section className="portal-panel">
      <h2>التسليم</h2>
      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              <th>العقد</th>
              <th>المشروع</th>
              <th>الوحدة</th>
              <th>المساحة</th>
              <th>الحالة</th>
              <th>تاريخ التسليم</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.results ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.contract_number ?? row.contract}</td>
                <td>{row.project_name ?? row.project_code ?? "-"}</td>
                <td>{formatUnit(row)}</td>
                <td>{row.unit_area_sqm ?? "-"}</td>
                <td>{row.status}</td>
                <td>{row.handover_date ?? "-"}</td>
                <td>{row.notes || "-"}</td>
              </tr>
            ))}
            {!query.data?.results?.length ? (
              <tr>
                <td className="table-empty" colSpan={7}>
                  لا توجد عمليات تسليم حالياً.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
