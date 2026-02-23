"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type GLEntryRow = {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  status: string;
};

export default function AccountingV2JournalEntriesPage() {
  return (
    <ResourceCrudPage<GLEntryRow>
      title="القيود اليومية"
      description="قيود يدوية متوازنة مع ضوابط الترحيل."
      resourcePath="/v2/gl/journal-entries/"
      searchPlaceholder="ابحث عن قيد يومية"
      columns={[
        { key: "entry_number", title: "القيد" },
        { key: "entry_date", title: "التاريخ" },
        { key: "description", title: "البيان" },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        { name: "entry_number", label: "رقم القيد", type: "text", placeholder: "تلقائي" },
        { name: "entry_date", label: "تاريخ القيد", type: "date", required: true },
        { name: "description", label: "البيان", type: "textarea", rows: 2 },
        {
          name: "lines",
          label: "سطور القيد",
          type: "json",
          defaultValue: "[]",
          jsonEditor: {
            minItems: 2,
            addLabel: "إضافة سطر",
            showComputedTotals: true,
            columns: [
              {
                key: "account",
                label: "الحساب",
                type: "select",
                required: true,
                dynamicOptions: {
                  resourcePath: "/v2/finance/accounts/",
                  valueField: "id",
                  labelFields: ["code", "name"],
                  ordering: "code",
                },
              },
              {
                key: "cost_center",
                label: "مركز التكلفة",
                type: "select",
                dynamicOptions: {
                  resourcePath: "/v2/finance/cost-centers/",
                  valueField: "id",
                  labelFields: ["code", "name"],
                  ordering: "code",
                },
              },
              { key: "debit", label: "مدين", type: "number", defaultValue: "0.00", min: 0, step: 0.01 },
              { key: "credit", label: "دائن", type: "number", defaultValue: "0.00", min: 0, step: 0.01 },
            ],
          },
        },
      ]}
      actions={[{ label: "ترحيل", action: "post", variant: "success" }]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "مرحل", value: "posted" },
      ]}
    />
  );
}
