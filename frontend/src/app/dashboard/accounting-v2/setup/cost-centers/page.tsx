"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type CostCenterRow = {
  id: number;
  code: string;
  name: string;
  parent: number | null;
  is_active: boolean;
};

export default function AccountingV2CostCentersPage() {
  return (
    <ResourceCrudPage<CostCenterRow>
      title="مراكز التكلفة"
      description="متابعة الربحية حسب الفرع أو الإدارة أو المشروع."
      resourcePath="/v2/finance/cost-centers/"
      searchPlaceholder="ابحث عن مركز تكلفة"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "parent", title: "الأب" },
        { key: "is_active", title: "نشط", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "code", label: "الكود", type: "text", required: true, placeholder: "CC-RYD" },
        { name: "name", label: "الاسم", type: "text", required: true, placeholder: "فرع الرياض" },
        {
          name: "parent",
          label: "مركز التكلفة الأب",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v2/finance/cost-centers/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
