"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Material } from "@/lib/entities";

export default function MaterialsPage() {
  return (
    <ResourceCrudPage<Material>
      title="المواد"
      description="تعريف المواد والوحدات وحدود إعادة الطلب."
      resourcePath="/v1/procurement/materials/"
      searchPlaceholder="ابحث بالكود SKU أو اسم المادة"
      columns={[
        { key: "sku", title: "SKU" },
        { key: "name", title: "الاسم" },
        { key: "unit", title: "الوحدة" },
        { key: "reorder_level", title: "حد إعادة الطلب" },
        {
          key: "preferred_supplier",
          title: "المورد المفضّل",
          render: (row) => (row.preferred_supplier ? `#${row.preferred_supplier}` : "-"),
        },
      ]}
      fields={[
        { name: "sku", label: "SKU", type: "text", required: true, placeholder: "MAT-001" },
        { name: "name", label: "اسم المادة", type: "text", required: true, placeholder: "Cement" },
        { name: "unit", label: "الوحدة", type: "text", defaultValue: "unit" },
        { name: "reorder_level", label: "حد إعادة الطلب", type: "number", defaultValue: "0.000" },
        {
          name: "preferred_supplier",
          label: "معرّف المورد المفضّل",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/procurement/suppliers/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
