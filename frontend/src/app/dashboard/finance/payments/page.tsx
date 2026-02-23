"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payment } from "@/lib/entities";

export default function PaymentsPage() {
  return (
    <ResourceCrudPage<Payment>
      title="المدفوعات"
      description="ترتيب الإدخال الصحيح: (1) حقول أساسية إلزامية، (2) حقول مالية، (3) حقول مرجعية. راجع أثر السداد على حالة الفاتورة قبل الاعتماد."
      resourcePath="/v1/finance/payments/"
      searchPlaceholder="ابحث برقم الفاتورة المرجعي"
      columns={[
        { key: "invoice", title: "الفاتورة" },
        { key: "payment_date", title: "التاريخ", render: (row) => formatDate(row.payment_date) },
        { key: "amount", title: "المبلغ", render: (row) => formatCurrency(row.amount) },
        { key: "method", title: "طريقة الدفع" },
      ]}
      fields={[
        {
          name: "invoice",
          label: "1) الفاتورة",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/finance/invoices/",
            valueField: "id",
            labelFields: ["invoice_number", "partner_name"],
            ordering: "-issue_date",
          },
          helpText: "إلزامي لربط السداد وتحديث حالة الفاتورة.",
        },
        { name: "payment_date", label: "1) تاريخ الدفع", type: "date", required: true },
        { name: "amount", label: "2) المبلغ", type: "number", required: true, helpText: "تأكد من عدم تجاوز الرصيد المستحق." },
        {
          name: "method",
          label: "2) طريقة الدفع",
          type: "select",
          required: true,
          options: [
            { label: "نقدي", value: "cash" },
            { label: "تحويل بنكي", value: "bank_transfer" },
            { label: "بطاقة", value: "card" },
            { label: "شيك", value: "cheque" },
          ],
        },
        { name: "reference_no", label: "3) رقم المرجع", type: "text", helpText: "مرجع التحويل/الشيك للمطابقة البنكية." },
      ]}
      workflowTimeline={{
        title: "مسار المدفوعات",
        steps: [
          { key: "pending", label: "قيد الانتظار", description: "الدفعة بانتظار الاعتماد.", timestampField: "submitted_at" },
          {
            key: "confirmed",
            label: "مؤكدة",
            description: "تم اعتماد الدفعة وتأكيدها.",
            timestampField: "approved_at",
          },
          {
            key: "failed",
            label: "مرفوضة",
            description: "تم رفض الدفعة أو فشلت المعالجة.",
            timestampField: "rejected_at",
          },
        ],
      }}
      actions={[
        { label: "إرسال", action: "submit", variant: "default" },
        { label: "اعتماد", action: "approve", variant: "success" },
        { label: "رفض", action: "reject", variant: "danger", needsReason: true },
      ]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "قيد الانتظار", value: "pending" },
        { label: "مؤكدة", value: "confirmed" },
        { label: "مرفوضة", value: "failed" },
      ]}
    />
  );
}
