"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RevenueRecognition } from "@/lib/entities";

export default function RevenueRecognitionPage() {
  return (
    <ResourceCrudPage<RevenueRecognition>
      title="الاعتراف بالإيراد"
      description="متابعة قيود الاعتراف بالإيراد بنسب الإنجاز أو العقد المكتمل."
      resourcePath="/v1/finance/revenue-recognition/"
      searchPlaceholder="ابحث برقم القيد أو المشروع"
      columns={[
        { key: "entry_number", title: "رقم القيد" },
        { key: "method", title: "الطريقة" },
        { key: "recognition_date", title: "تاريخ الاعتراف", render: (row) => formatDate(row.recognition_date) },
        { key: "recognized_amount", title: "القيمة", render: (row) => formatCurrency(row.recognized_amount) },
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
        { name: "entry_number", label: "رقم القيد", type: "text", required: true, placeholder: "REV-001" },
        {
          name: "method",
          label: "الطريقة",
          type: "select",
          required: true,
          options: [
            { label: "نسبة الإنجاز", value: "percentage_of_completion" },
            { label: "العقد المكتمل", value: "completed_contract" },
          ],
          defaultValue: "percentage_of_completion",
        },
        { name: "recognition_date", label: "تاريخ الاعتراف", type: "date", required: true },
        {
          name: "progress_billing",
          label: "معرّف المستخلص",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/finance/progress-billings/",
            valueField: "id",
            labelFields: ["billing_number"],
            ordering: "-billing_date",
            dependsOn: { project: "project" },
          },
        },
        { name: "recognized_percentage", label: "نسبة الاعتراف", type: "number", defaultValue: "0.00" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
      workflowTimeline={{
        title: "مسار الاعتراف بالإيراد",
        steps: [
          { key: "draft", label: "مسودة", description: "قيد الاعتراف قابل للتعديل.", timestampField: "created_at" },
          {
            key: "pending_approval",
            label: "بانتظار الاعتماد",
            description: "تم إرسال القيد للاعتماد.",
            timestampField: "submitted_at",
          },
          {
            key: "approved",
            label: "معتمد",
            description: "تم اعتماد القيد للترحيل.",
            timestampField: "approved_at",
          },
          {
            key: "rejected",
            label: "مرفوض",
            description: "تم رفض القيد.",
            timestampField: "rejected_at",
          },
        ],
      }}
      actions={[
        { label: "إرسال", action: "submit", variant: "default" },
        { label: "اعتماد", action: "approve", variant: "success" },
        { label: "رفض", action: "reject", variant: "danger", needsReason: true },
      ]}
    />
  );
}



