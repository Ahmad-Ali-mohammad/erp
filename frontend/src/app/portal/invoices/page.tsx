"use client";

import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ApiError, createPaymentIntent, listResource } from "@/lib/api-client";
import type { PortalInvoice } from "@/lib/portal-types";

export default function PortalInvoicesPage() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: () => listResource<PortalInvoice>("/v1/finance/portal/invoices/"),
  });
  const payMutation = useMutation({
    mutationFn: (invoiceId: number) => createPaymentIntent({ invoice: invoiceId }),
    onSuccess: (intent) => {
      router.push(`/portal/pay?intent=${intent.id}`);
    },
  });
  const errorMessage = payMutation.error instanceof ApiError ? payMutation.error.message : "";

  return (
    <section className="portal-panel">
      <h2>الفواتير</h2>
      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>التاريخ</th>
              <th>تاريخ الاستحقاق</th>
              <th>القيمة</th>
              <th>العملة</th>
              <th>الحالة</th>
              <th>الدفع</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.results ?? []).map((row) => {
              const isPaid = row.status === "PAID" || row.status === "paid";
              return (
                <tr key={row.id}>
                  <td><Link href={`/portal/invoices/${row.id}`}>{row.invoice_number}</Link></td>
                  <td>{row.issue_date}</td>
                  <td>{row.due_date ?? "-"}</td>
                  <td>{formatMoney(row.total_amount, row.currency)}</td>
                  <td>{row.currency}</td>
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
                <td className="table-empty" colSpan={7}>
                  لا توجد فواتير حالياً.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
