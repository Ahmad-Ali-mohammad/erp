"use client";

import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError, createPaymentIntent, request } from "@/lib/api-client";
import type { PortalInvoiceDetail, PortalPayment } from "@/lib/portal-types";

export default function PortalInvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = String(params?.id ?? "");

  const invoiceQuery = useQuery({
    queryKey: ["portal-invoice", invoiceId],
    queryFn: () => request<PortalInvoiceDetail>(`/v1/finance/portal/invoices/${invoiceId}/`),
    enabled: Boolean(invoiceId),
  });

  const paymentsQuery = useQuery({
    queryKey: ["portal-invoice-payments", invoiceId],
    queryFn: () => request<PortalPayment[]>(`/v1/finance/portal/invoices/${invoiceId}/payments/`),
    enabled: Boolean(invoiceId),
  });

  const payMutation = useMutation({
    mutationFn: () => createPaymentIntent({ invoice: Number(invoiceId) }),
    onSuccess: (intent) => {
      router.push(`/portal/pay?intent=${intent.id}`);
    },
  });

  const errorMessage = payMutation.error instanceof ApiError ? payMutation.error.message : "";

  if (!invoiceId) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل الفاتورة</h2>
        <p>لم يتم تحديد فاتورة للعرض.</p>
        <Link className="btn btn-outline" href="/portal/invoices">
          العودة إلى الفواتير
        </Link>
      </section>
    );
  }

  if (invoiceQuery.isLoading) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل الفاتورة</h2>
        <p>جارٍ تحميل البيانات...</p>
      </section>
    );
  }

  if (invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <section className="portal-panel">
        <h2>تفاصيل الفاتورة</h2>
        <p className="error-banner">تعذر تحميل بيانات الفاتورة.</p>
        <Link className="btn btn-outline" href="/portal/invoices">
          العودة إلى الفواتير
        </Link>
      </section>
    );
  }

  const invoice = invoiceQuery.data;
  const isPaid = invoice.status === "PAID" || invoice.status === "paid";

  return (
    <div className="portal-overview">
      <section className="portal-panel">
        <div className="section-header">
          <h3>تفاصيل الفاتورة</h3>
          <p>رقم الفاتورة: {invoice.invoice_number}</p>
        </div>
        <div className="section-grid">
          <div className="section-card">
            <strong>المستفيد</strong>
            <p>{invoice.partner_name}</p>
          </div>
          <div className="section-card">
            <strong>الحالة</strong>
            <p>{invoice.status}</p>
          </div>
          <div className="section-card">
            <strong>تاريخ الإصدار</strong>
            <p>{invoice.issue_date}</p>
          </div>
          <div className="section-card">
            <strong>تاريخ الاستحقاق</strong>
            <p>{invoice.due_date ?? "-"}</p>
          </div>
          <div className="section-card">
            <strong>الإجمالي</strong>
            <p>
              {formatMoney(invoice.total_amount ?? "-", invoice.currency)}
            </p>
          </div>
          <div className="section-card">
            <strong>الضريبة</strong>
            <p>
              {formatMoney(invoice.tax_amount ?? "-", invoice.currency)}
            </p>
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
              ادفع الفاتورة
            </button>
          </div>
        ) : null}
      </section>

      <section className="portal-panel">
        <div className="section-header">
          <h3>بنود الفاتورة</h3>
          <p>تفاصيل الخدمات والمواد.</p>
        </div>
        <div className="table-scroll">
          <table className="resource-table">
            <thead>
              <tr>
                <th>البند</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الضريبة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unit_price, invoice.currency)}</td>
                  <td>{item.tax_rate}</td>
                  <td>{item.line_subtotal ? formatMoney(item.line_subtotal, invoice.currency) : "-"}</td>
                </tr>
              ))}
              {!invoice.items?.length ? (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    لا توجد بنود مسجلة لهذه الفاتورة.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="portal-panel">
        <div className="section-header">
          <h3>المدفوعات</h3>
          <p>قائمة الحركات المرتبطة بهذه الفاتورة.</p>
        </div>
        <div className="table-scroll">
          <table className="resource-table">
            <thead>
              <tr>
                <th>المرجع</th>
                <th>التاريخ</th>
                <th>القيمة</th>
                <th>العملة</th>
                <th>الطريقة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(paymentsQuery.data ?? []).map((row) => (
                <tr key={row.id}>
                  <td>{row.reference_no || row.id}</td>
                  <td>{row.payment_date}</td>
                  <td>{formatMoney(row.amount, row.currency ?? invoice.currency)}</td>
                  <td>{row.currency ?? invoice.currency}</td>
                  <td>{row.method}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
              {!paymentsQuery.data?.length ? (
                <tr>
                  <td className="table-empty" colSpan={6}>
                    لا توجد مدفوعات مسجلة لهذه الفاتورة.
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
