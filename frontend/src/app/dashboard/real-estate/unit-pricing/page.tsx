"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { UnitPricing } from "@/lib/entities";

export default function UnitPricingPage() {
  return (
    <ResourceCrudPage<UnitPricing>
      title="تسعير الوحدات"
      description="إدارة أسعار الوحدات وتواريخ السريان."
      resourcePath="/v1/real-estate/unit-pricing/"
      searchPlaceholder="ابحث بكود الوحدة"
      columns={[
        { key: "unit", title: "الوحدة" },
        { key: "price", title: "السعر" },
        { key: "currency", title: "العملة" },
        { key: "effective_date", title: "تاريخ السريان" },
        { key: "is_active", title: "نشط؟", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        {
          name: "unit",
          label: "الوحدة",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/real-estate/units/",
            valueField: "id",
            labelFields: ["code"],
            ordering: "code",
          },
        },
        { name: "price", label: "السعر", type: "number", required: true },
        { name: "currency", label: "العملة", type: "text", defaultValue: "KWD" },
        { name: "effective_date", label: "تاريخ السريان", type: "date", required: true },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
