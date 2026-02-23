"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type GLAccountRow = {
  id: number;
  code: string;
  name: string;
  account_type: string;
  parent: number | null;
  level: number;
  is_postable: boolean;
  is_active: boolean;
};

export default function AccountingV2AccountsPage() {
  return (
    <ResourceCrudPage<GLAccountRow>
      title="حسابات الأستاذ العام"
      description="دليل حسابات هرمي معتمد لمحرك الترحيل في المحاسبة v2."
      resourcePath="/v2/finance/accounts/"
      searchPlaceholder="ابحث بالكود أو اسم الحساب"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "account_type", title: "النوع" },
        { key: "level", title: "المستوى" },
        { key: "is_postable", title: "قابل للترحيل", render: (row) => (row.is_postable ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "code", label: "الكود", type: "text", required: true, placeholder: "1100" },
        { name: "name", label: "الاسم", type: "text", required: true, placeholder: "الذمم المدينة" },
        {
          name: "account_type",
          label: "نوع الحساب",
          type: "select",
          required: true,
          options: [
            { label: "أصل", value: "asset" },
            { label: "التزام", value: "liability" },
            { label: "حقوق ملكية", value: "equity" },
            { label: "إيراد", value: "revenue" },
            { label: "مصروف", value: "expense" },
          ],
        },
        {
          name: "parent",
          label: "الحساب الأب",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v2/finance/accounts/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "level", label: "المستوى", type: "number", defaultValue: "1" },
        { name: "is_postable", label: "قابل للترحيل", type: "checkbox", defaultValue: true },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
