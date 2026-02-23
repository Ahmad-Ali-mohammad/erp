"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { PostingRule } from "@/lib/entities";

export default function PostingRulesPage() {
  return (
    <ResourceCrudPage<PostingRule>
      title="قواعد الترحيل"
      description="تعريف قواعد الترحيل الآلي للأحداث التشغيلية إلى قيود محاسبية."
      resourcePath="/v1/finance/posting-rules/"
      searchPlaceholder="ابحث باسم القاعدة أو المصدر"
      columns={[
        { key: "name", title: "اسم القاعدة" },
        { key: "source_module", title: "المصدر" },
        { key: "source_event", title: "الحدث" },
        { key: "entry_class", title: "نوع القيد" },
        { key: "is_active", title: "نشطة", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "name", label: "اسم القاعدة", type: "text", required: true },
        { name: "source_module", label: "المصدر", type: "text", required: true, placeholder: "finance.invoice" },
        { name: "source_event", label: "الحدث", type: "text", required: true, placeholder: "approved" },
        { name: "description", label: "الوصف", type: "textarea" },
        {
          name: "posting_policy",
          label: "سياسة الترحيل",
          type: "select",
          options: [
            { label: "فوري", value: "immediate" },
            { label: "يدوي", value: "manual" },
          ],
          defaultValue: "immediate",
        },
        {
          name: "entry_class",
          label: "نوع القيد",
          type: "select",
          options: [
            { label: "تشغيلي آلي", value: "operational_auto" },
            { label: "يدوي", value: "manual" },
            { label: "تسوية", value: "adjusting" },
            { label: "إقفال", value: "closing" },
          ],
          defaultValue: "operational_auto",
        },
        { name: "is_active", label: "نشطة", type: "checkbox", defaultValue: true },
        {
          name: "lines",
          label: "سطور القاعدة",
          type: "json",
          required: true,
          defaultValue:
            "[\n  {\n    \"line_order\": \"1\",\n    \"account\": \"1\",\n    \"side\": \"debit\",\n    \"amount_source\": \"amount\",\n    \"fixed_amount\": \"\",\n    \"description_template\": \"قيد آلي\"\n  },\n  {\n    \"line_order\": \"2\",\n    \"account\": \"2\",\n    \"side\": \"credit\",\n    \"amount_source\": \"amount\",\n    \"fixed_amount\": \"\",\n    \"description_template\": \"قيد آلي\"\n  }\n]",
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
              { key: "amount_source", label: "مصدر المبلغ", type: "text", placeholder: "amount" },
              { key: "fixed_amount", label: "مبلغ ثابت", type: "number", step: 0.01 },
              { key: "description_template", label: "وصف السطر", type: "text" },
            ],
          },
        },
      ]}
      actions={[]}
      showStatus={false}
    />
  );
}
