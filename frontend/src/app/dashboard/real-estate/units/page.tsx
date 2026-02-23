"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Unit } from "@/lib/entities";

export default function UnitsPage() {
  return (
    <ResourceCrudPage<Unit>
      title="الوحدات"
      description="سجل الوحدات وحالة التوفر وربطها بالمباني والأنواع."
      resourcePath="/v1/real-estate/units/"
      searchPlaceholder="ابحث بالكود أو المبنى"
      columns={[
        { key: "building", title: "المبنى" },
        { key: "code", title: "كود الوحدة" },
        { key: "floor", title: "الدور" },
        { key: "area_sqm", title: "المساحة م٢" },
        { key: "status", title: "الحالة" },
        { key: "is_active", title: "نشط؟", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        {
          name: "building",
          label: "المبنى",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/real-estate/buildings/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        {
          name: "unit_type",
          label: "نوع الوحدة",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/real-estate/unit-types/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "code", label: "كود الوحدة", type: "text", required: true },
        { name: "floor", label: "الدور", type: "number", defaultValue: "0" },
        { name: "area_sqm", label: "المساحة م٢", type: "number", defaultValue: "0.00" },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "متاحة", value: "available" },
            { label: "محجوزة", value: "reserved" },
            { label: "مباعة", value: "sold" },
            { label: "مسلمة", value: "handed_over" },
          ],
          defaultValue: "available",
        },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "متاحة", value: "available" },
        { label: "محجوزة", value: "reserved" },
        { label: "مباعة", value: "sold" },
        { label: "مسلمة", value: "handed_over" },
      ]}
    />
  );
}
