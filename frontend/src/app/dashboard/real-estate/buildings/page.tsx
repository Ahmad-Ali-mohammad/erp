"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Building } from "@/lib/entities";

export default function BuildingsPage() {
  return (
    <ResourceCrudPage<Building>
      title="المباني"
      description="إدارة المباني التابعة لكل مشروع."
      resourcePath="/v1/real-estate/buildings/"
      searchPlaceholder="ابحث بالكود أو المشروع"
      columns={[
        { key: "project", title: "المشروع" },
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "floors", title: "عدد الأدوار" },
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
        { name: "code", label: "كود المبنى", type: "text", required: true },
        { name: "name", label: "اسم المبنى", type: "text", required: true },
        { name: "floors", label: "عدد الأدوار", type: "number", defaultValue: "1" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
    />
  );
}
