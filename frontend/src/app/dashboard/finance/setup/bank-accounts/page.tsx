"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
type BankAccountRow = {
  id: number;
  code: string;
  name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  gl_account?: number | null;
  is_active?: boolean;
};

export default function BankAccountsPage() {
  return (
    <ResourceCrudPage<BankAccountRow>
      title="الحسابات البنكية"
      description="إدارة الحسابات البنكية وربطها بحساب الأستاذ العام."
      resourcePath="/v1/finance/bank-accounts/"
      searchPlaceholder="ابحث بالكود أو اسم البنك"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "bank_name", title: "البنك" },
        { key: "currency", title: "العملة" },
        { key: "is_active", title: "نشط", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "code", label: "الكود", type: "text", required: true, placeholder: "BANK-001" },
        { name: "name", label: "اسم الحساب", type: "text", required: true },
        { name: "bank_name", label: "اسم البنك", type: "text", required: true },
        { name: "account_number", label: "رقم الحساب", type: "text", required: true },
        {
          name: "currency",
          label: "العملة",
          type: "select",
          options: [
            { label: "KWD", value: "KWD" },
            { label: "USD", value: "USD" },
          ],
          defaultValue: "KWD",
        },
        {
          name: "gl_account",
          label: "حساب الأستاذ العام",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/finance/accounts/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      actions={[]}
      showStatus={false}
    />
  );
}
