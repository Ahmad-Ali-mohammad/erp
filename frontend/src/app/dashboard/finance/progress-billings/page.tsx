"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { ProgressBilling } from "@/lib/entities";

export default function ProgressBillingsPage() {
  return (
    <ResourceCrudPage<ProgressBilling>
      title="مستخلصات التقدم"
      description="إدارة المستخلصات الدورية مع التوليد التلقائي لفاتورة العميل."
      resourcePath="/v1/finance/progress-billings/"
      searchPlaceholder="ابحث برقم المستخلص أو المشروع"
      columns={[
        { key: "billing_number", title: "رقم المستخلص" },
        { key: "billing_date", title: "تاريخ المستخلص", render: (row) => formatDate(row.billing_date) },
        {
          key: "completion_percentage",
          title: "نسبة الإنجاز",
          render: (row) => `${formatNumber(row.completion_percentage)}%`,
        },
        { key: "total_amount", title: "الإجمالي", render: (row) => formatCurrency(row.total_amount) },
        { key: "linked_invoice", title: "الفاتورة", render: (row) => (row.linked_invoice ? `#${row.linked_invoice}` : "-") },
      ]}
      fields={[
        {
          name: "project",
          label: "معرّف المشروع",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/projects/projects/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "billing_number", label: "رقم المستخلص", type: "text", required: true, placeholder: "PB-001" },
        { name: "billing_date", label: "تاريخ المستخلص", type: "date", required: true },
        { name: "period_start", label: "بداية الفترة", type: "date" },
        { name: "period_end", label: "نهاية الفترة", type: "date" },
        { name: "completion_percentage", label: "نسبة الإنجاز", type: "number", required: true, defaultValue: "10.00" },
        { name: "tax_rate", label: "نسبة الضريبة", type: "number", defaultValue: "15.00" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
      workflowTimeline={{
        title: "مسار المستخلصات",
        steps: [
          { key: "draft", label: "مسودة", description: "يتم إعداد المستخلص.", timestampField: "created_at" },
          {
            key: "pending_approval",
            label: "بانتظار الاعتماد",
            description: "تم إرسال المستخلص للاعتماد.",
            timestampField: "submitted_at",
          },
          {
            key: "approved",
            label: "معتمد",
            description: "تم اعتماد المستخلص وأصبح جاهزًا لإصدار فاتورة.",
            timestampField: "approved_at",
          },
          { key: "invoiced", label: "مفوتر", description: "تم توليد فاتورة عميل من هذا المستخلص." },
          {
            key: "rejected",
            label: "مرفوض",
            description: "تم رفض طلب المستخلص.",
            timestampField: "rejected_at",
          },
        ],
      }}
      actions={[
        { label: "إرسال", action: "submit", variant: "default" },
        { label: "اعتماد", action: "approve", variant: "success" },
        { label: "رفض", action: "reject", variant: "danger", needsReason: true },
        { label: "توليد فاتورة", action: "generate-invoice", variant: "warning" },
      ]}
    />
  );
}

