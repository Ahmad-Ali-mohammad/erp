"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { RecurringTemplate } from "@/lib/entities";

export default function RecurringEntriesPage() {
  return (
    <ResourceCrudPage<RecurringTemplate>
      title="القيود اليومية المتكررة"
      description="تعريف قوالب قيود متكررة (يومي/أسبوعي/شهري/ربع سنوي) لتوليد قيود تلقائياً."
      resourcePath="/v1/finance/recurring-templates/"
      searchPlaceholder="ابحث برمز القالب أو اسم القيد"
      columns={[
        { key: "template_code", title: "الرمز" },
        { key: "name", title: "اسم القيد" },
        { key: "frequency", title: "التكرار" },
        { key: "next_run_date", title: "التشغيل القادم" },
        { key: "is_active", title: "نشط", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "template_code", label: "رمز القالب", type: "text", required: true, placeholder: "REC-001" },
        { name: "name", label: "اسم القيد", type: "text", required: true },
        { name: "description", label: "الوصف", type: "textarea" },
        {
          name: "frequency",
          label: "التكرار",
          type: "select",
          required: true,
          options: [
            { label: "يومي", value: "daily" },
            { label: "أسبوعي", value: "weekly" },
            { label: "شهري", value: "monthly" },
            { label: "ربع سنوي", value: "quarterly" },
          ],
        },
        { name: "start_date", label: "تاريخ البداية", type: "date", required: true },
        { name: "next_run_date", label: "تاريخ التشغيل القادم", type: "date", required: true },
        { name: "end_date", label: "تاريخ النهاية", type: "date" },
        {
          name: "currency",
          label: "العملة",
          type: "select",
          required: true,
          options: [
            { label: "KWD", value: "KWD" },
            { label: "USD", value: "USD" },
          ],
          defaultValue: "KWD",
        },
        {
          name: "project",
          label: "المشروع (اختياري)",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/projects/projects/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "auto_post", label: "ترحيل تلقائي", type: "checkbox", defaultValue: true },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
        {
          name: "lines",
          label: "سطور القيد",
          type: "json",
          required: true,
          defaultValue:
            "[\n  {\n    \"line_order\": \"1\",\n    \"account\": \"1\",\n    \"side\": \"debit\",\n    \"amount\": \"100.00\",\n    \"description\": \"طرف مدين\"\n  },\n  {\n    \"line_order\": \"2\",\n    \"account\": \"2\",\n    \"side\": \"credit\",\n    \"amount\": \"100.00\",\n    \"description\": \"طرف دائن\"\n  }\n]",
          jsonEditor: {
            itemLabel: "سطر",
            addLabel: "إضافة سطر",
            minItems: 2,
            columns: [
              { key: "line_order", label: "الترتيب", type: "number", required: true, defaultValue: "1" },
              {
                key: "account",
                label: "الحساب",
                type: "select",
                required: true,
                dynamicOptions: {
                  resourcePath: "/v1/finance/accounts/",
                  valueField: "id",
                  labelFields: ["code", "name"],
                  ordering: "code",
                },
              },
              {
                key: "side",
                label: "الطرف",
                type: "select",
                required: true,
                options: [
                  { label: "مدين", value: "debit" },
                  { label: "دائن", value: "credit" },
                ],
              },
              { key: "amount", label: "المبلغ", type: "number", required: true, defaultValue: "0.00", min: 0.01, step: 0.01 },
              { key: "description", label: "الوصف", type: "text" },
            ],
          },
        },
      ]}
      actions={[]}
      showStatus={false}
    />
  );
}
