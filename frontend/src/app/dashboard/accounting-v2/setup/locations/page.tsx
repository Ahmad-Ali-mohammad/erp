"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type LocationRow = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
};

export default function AccountingV2LocationsPage() {
  return (
    <ResourceCrudPage<LocationRow>
      title="المواقع المخزنية"
      description="إعداد المستودعات والمواقع للتحكم المخزني المعتمد على الحركات."
      resourcePath="/v2/inventory/locations/"
      searchPlaceholder="ابحث عن موقع"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "is_active", title: "نشط", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "code", label: "الكود", type: "text", required: true, placeholder: "MAIN" },
        { name: "name", label: "الاسم", type: "text", required: true, placeholder: "المستودع الرئيسي" },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
