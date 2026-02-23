"use client";

import { useQuery } from "@tanstack/react-query";

import { listResource } from "@/lib/api-client";
import type { PortalReservation } from "@/lib/portal-types";

function formatUnit(row: PortalReservation) {
  const building = row.unit_building_code ?? row.building_name ?? "";
  const unit = row.unit_code ?? String(row.unit ?? "");
  const base = [building, unit].filter(Boolean).join(" / ") || unit;
  const floor = row.unit_floor != null ? `الدور ${row.unit_floor}` : "";
  return [base, floor].filter(Boolean).join(" • ");
}

export default function PortalReservationsPage() {
  const query = useQuery({
    queryKey: ["portal-reservations"],
    queryFn: () => listResource<PortalReservation>("/v1/real-estate/portal/reservations/"),
  });

  return (
    <section className="portal-panel">
      <h2>الحجوزات</h2>
      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              <th>رقم الحجز</th>
              <th>المشروع</th>
              <th>الوحدة</th>
              <th>المساحة</th>
              <th>الحالة</th>
              <th>تاريخ الحجز</th>
              <th>تاريخ الانتهاء</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.results ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.reservation_number}</td>
                <td>{row.project_name ?? row.project_code ?? "-"}</td>
                <td>{formatUnit(row)}</td>
                <td>{row.unit_area_sqm ?? "-"}</td>
                <td>{row.status}</td>
                <td>{row.reserved_at ?? "-"}</td>
                <td>{row.expires_at ?? "-"}</td>
              </tr>
            ))}
            {!query.data?.results?.length ? (
              <tr>
                <td className="table-empty" colSpan={7}>
                  لا توجد حجوزات حالياً.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
