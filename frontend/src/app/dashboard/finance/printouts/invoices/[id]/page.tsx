"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { request } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceDetail } from "@/lib/entities";
import { PrintLayout } from "@/components/print/print-layout";
import { usePrintAssets } from "@/components/print/use-print-assets";

type PageProps = {
  params: { id: string };
};

function parseNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function InvoicePrintPage({ params }: PageProps) {
  const invoiceId = params.id;
  const { settings, profile, isLoading: assetsLoading, errorMessage: assetsError } = usePrintAssets();

  const invoiceQuery = useQuery({
    queryKey: ["invoice-print", invoiceId],
    queryFn: () => request<InvoiceDetail>(`/v1/finance/invoices/${invoiceId}/`),
  });

  if (assetsLoading || invoiceQuery.isLoading) {
    return <p>جاري تجهيز بيانات الطباعة...</p>;
  }

  if (assetsError || invoiceQuery.error || !settings || !invoiceQuery.data) {
    return <p className="error-banner">تعذر تحميل بيانات الطباعة.</p>;
  }

  const invoice = invoiceQuery.data;
  const items = invoice.items ?? [];
  const subtotal = parseNumber(invoice.subtotal);
  const taxAmount = parseNumber(invoice.tax_amount);
  const totalAmount = parseNumber(invoice.total_amount);

  return (
    <div>
      <div className="hero-actions no-print" style={{ marginBottom: "0.8rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          طباعة
        </button>
        <Link className="btn btn-outline" href="/dashboard/finance/printouts">
          رجوع لقسم المطبوعات
        </Link>
      </div>

      <PrintLayout
        settings={settings}
        profile={profile}
        title="فاتورة"
        subtitle={`رقم ${invoice.invoice_number}`}
        meta={
          <>
            <div>تاريخ الإصدار: {formatDate(invoice.issue_date)}</div>
            <div>تاريخ الاستحقاق: {invoice.due_date ? formatDate(invoice.due_date) : "-"}</div>
            <div>الحالة: {invoice.status}</div>
          </>
        }
      >
        <section className="resource-section" style={{ boxShadow: "none" }}>
          <h4 style={{ margin: 0 }}>بيانات العميل / المورد</h4>
          <p style={{ marginTop: "0.35rem", color: "var(--text-soft)" }}>{invoice.partner_name}</p>
          {invoice.notes ? <p style={{ marginTop: "0.35rem" }}>{invoice.notes}</p> : null}
        </section>

        <section>
          <table className="print-table">
            <thead>
              <tr>
                <th>الوصف</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الضريبة %</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    لا توجد بنود.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const lineSubtotal = parseNumber(item.line_subtotal) || parseNumber(item.quantity) * parseNumber(item.unit_price);
                  const lineTax = parseNumber(item.line_tax) || lineSubtotal * (parseNumber(item.tax_rate) / 100);
                  return (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>{item.tax_rate}</td>
                      <td>{formatCurrency(lineSubtotal + lineTax)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <section className="print-summary">
          <div className="print-summary-card">
            <strong>الإجمالي قبل الضريبة</strong>
            <p>{formatCurrency(subtotal)}</p>
          </div>
          <div className="print-summary-card">
            <strong>إجمالي الضريبة</strong>
            <p>{formatCurrency(taxAmount)}</p>
          </div>
          <div className="print-summary-card">
            <strong>الإجمالي المستحق</strong>
            <p>{formatCurrency(totalAmount)}</p>
          </div>
        </section>
      </PrintLayout>
    </div>
  );
}
