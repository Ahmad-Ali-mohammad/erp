"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Warehouse } from "@/lib/entities";

export default function WarehousesPage() {
  return (
    <ResourceCrudPage<Warehouse>
      title="المستودعات"
      description="تعريف المستودعات ومواقعها وحالة التشغيل."
      resourcePath="/v1/procurement/warehouses/"
      searchPlaceholder="ابحث بالكود أو اسم المستودع"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "location", title: "الموقع" },
        { key: "is_active", title: "نشط", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "code", label: "كود المستودع", type: "text", required: true, placeholder: "WH-001" },
        { name: "name", label: "اسم المستودع", type: "text", required: true, placeholder: "Main Warehouse" },
        { name: "location", label: "الموقع", type: "text" },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
