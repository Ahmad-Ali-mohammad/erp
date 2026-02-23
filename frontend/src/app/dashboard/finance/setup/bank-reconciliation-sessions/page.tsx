"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type BankReconciliationSessionRow = {
  id: number;
  bank_account: number;
  period?: number | null;
  status: string;
  notes?: string | null;
};

export default function BankReconciliationSessionsPage() {
  return (
    <ResourceCrudPage<BankReconciliationSessionRow>
      title="جلسات التسويات البنكية"
      description="إدارة جلسات المطابقة البنكية وربطها بالفترة المالية."
      resourcePath="/v1/finance/bank-reconciliation-sessions/"
      searchPlaceholder="ابحث بملاحظات الجلسة"
      columns={[
        { key: "bank_account", title: "الحساب البنكي" },
        { key: "period", title: "الفترة" },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        {
          name: "bank_account",
          label: "الحساب البنكي",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/finance/bank-accounts/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        {
          name: "period",
          label: "الفترة المالية",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/finance/periods/",
            valueField: "id",
            labelFields: ["year", "month"],
            ordering: "-year",
          },
        },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "مفتوحة", value: "open" },
            { label: "مغلقة", value: "closed" },
          ],
          defaultValue: "open",
        },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
      actions={[]}
      showStatus={false}
    />
  );
}
