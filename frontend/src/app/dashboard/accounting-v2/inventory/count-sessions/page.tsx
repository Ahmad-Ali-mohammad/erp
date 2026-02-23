"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type InventoryCountSessionRow = {
  id: number;
  session_number: string;
  location: number;
  count_date: string;
  status: string;
};

export default function AccountingV2InventoryCountSessionsPage() {
  return (
    <ResourceCrudPage<InventoryCountSessionRow>
      title="جلسات الجرد"
      description="جلسات جرد فعلي للتحقق الدوري من رصيد المخزون."
      resourcePath="/v2/inventory/count-sessions/"
      searchPlaceholder="ابحث عن جلسة جرد"
      columns={[
        { key: "session_number", title: "الجلسة" },
        { key: "location", title: "الموقع" },
        { key: "count_date", title: "التاريخ" },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        { name: "session_number", label: "رقم الجلسة", type: "text", placeholder: "تلقائي" },
        {
          name: "location",
          label: "الموقع",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v2/inventory/locations/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "count_date", label: "تاريخ الجرد", type: "date", required: true },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "مسودة", value: "draft" },
            { label: "مكتملة", value: "completed" },
          ],
          defaultValue: "draft",
        },
        { name: "notes", label: "ملاحظات", type: "textarea", rows: 2 },
      ]}
      actions={[]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "مكتملة", value: "completed" },
      ]}
    />
  );
}
