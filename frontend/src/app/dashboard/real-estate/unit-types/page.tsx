"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { UnitType } from "@/lib/entities";

export default function UnitTypesPage() {
  return (
    <ResourceCrudPage<UnitType>
      title="أنواع الوحدات"
      description="تعريف نماذج الوحدات ومساحاتها وأسعارها الأساسية."
      resourcePath="/v1/real-estate/unit-types/"
      searchPlaceholder="ابحث بالكود أو المشروع"
      columns={[
        { key: "project", title: "المشروع" },
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "bedrooms", title: "غرف النوم" },
        { key: "bathrooms", title: "الحمامات" },
        { key: "area_sqm", title: "المساحة م٢" },
        { key: "base_price", title: "السعر الأساسي" },
      ]}
      fields={[
        {
          name: "project",
          label: "المشروع",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/real-estate/projects/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "code", label: "كود النوع", type: "text", required: true },
        { name: "name", label: "اسم النوع", type: "text", required: true },
        { name: "bedrooms", label: "غرف النوم", type: "number", defaultValue: "0" },
        { name: "bathrooms", label: "الحمامات", type: "number", defaultValue: "0" },
        { name: "area_sqm", label: "المساحة م٢", type: "number", defaultValue: "0.00" },
        { name: "base_price", label: "السعر الأساسي", type: "number", defaultValue: "0.00" },
      ]}
    />
  );
}
