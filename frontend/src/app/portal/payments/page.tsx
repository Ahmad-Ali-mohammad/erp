"use client";

import { formatMoney } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { listResource } from "@/lib/api-client";
import type { PortalPayment } from "@/lib/portal-types";

export default function PortalPaymentsPage() {
  const query = useQuery({
    queryKey: ["portal-payments"],
    queryFn: () => listResource<PortalPayment>("/v1/finance/portal/payments/"),
  });

  return (
    <section className="portal-panel">
      <h2>المدفوعات</h2>
      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              <th>رقم المرجع</th>
              <th>الفاتورة</th>
              <th>التاريخ</th>
              <th>القيمة</th>
              <th>العملة</th>
              <th>الطريقة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.results ?? []).map((row) => (
              <tr key={row.id}>
                <td><Link href={`/portal/payments/${row.id}`}>{row.reference_no || row.id}</Link></td>
                <td>{row.invoice_number ?? row.invoice}</td>
                <td>{row.payment_date}</td>
                <td>{formatMoney(row.amount, row.currency ?? "KWD")}</td>
                <td>{row.currency ?? "KWD"}</td>
                <td>{row.method}</td>
                <td>{row.status}</td>
              </tr>
            ))}
            {!query.data?.results?.length ? (
              <tr>
                <td className="table-empty" colSpan={7}>
                  لا توجد مدفوعات حالياً.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
