"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency } from "@/lib/format";
import type { BoqItem } from "@/lib/entities";

export default function BoqItemsPage() {
  return (
    <ResourceCrudPage<BoqItem>
      title="بنود BOQ"
      description="مقارنة التكلفة المخططة مقابل الفعلية لكل بند."
      resourcePath="/v1/projects/boq-items/"
      searchPlaceholder="ابحث برمز البند أو الوصف"
      columns={[
        { key: "project", title: "المشروع" },
        { key: "item_code", title: "رمز البند" },
        { key: "description", title: "الوصف" },
        {
          key: "planned_total_cost",
          title: "التكلفة المخططة",
          render: (row) => formatCurrency(row.planned_total_cost),
        },
        {
          key: "actual_total_cost",
          title: "التكلفة الفعلية",
          render: (row) => formatCurrency(row.actual_total_cost),
        },
      ]}
      fields={[
        { name: "project", label: "معرّف المشروع", type: "number", required: true },
        { name: "phase", label: "معرّف المرحلة", type: "number" },
        { name: "item_code", label: "رمز البند", type: "text", required: true, placeholder: "BOQ-001" },
        { name: "description", label: "الوصف", type: "textarea", required: true },
        { name: "unit", label: "الوحدة", type: "text", defaultValue: "unit" },
        { name: "planned_quantity", label: "الكمية المخططة", type: "number", defaultValue: "0.000" },
        { name: "planned_unit_cost", label: "تكلفة الوحدة المخططة", type: "number", defaultValue: "0.00" },
        { name: "actual_quantity", label: "الكمية الفعلية", type: "number", defaultValue: "0.000" },
        { name: "actual_unit_cost", label: "تكلفة الوحدة الفعلية", type: "number", defaultValue: "0.00" },
        { name: "vendor_name", label: "المورد", type: "text" },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
