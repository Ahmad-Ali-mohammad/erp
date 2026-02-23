"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { CostCode } from "@/lib/entities";

export default function CostCodesPage() {
  return (
    <ResourceCrudPage<CostCode>
      title="أكواد التكلفة"
      description="هيكل تكاليف المشروع وربط المصروفات والالتزامات."
      resourcePath="/v1/projects/cost-codes/"
      searchPlaceholder="ابحث بالكود أو اسم الكود"
      columns={[
        { key: "project", title: "المشروع" },
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "is_active", title: "نشط", render: (row) => (row.is_active ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "project", label: "معرّف المشروع", type: "number", required: true },
        { name: "parent", label: "معرّف الكود الأب", type: "number" },
        { name: "code", label: "كود التكلفة", type: "text", required: true, placeholder: "CC-001" },
        { name: "name", label: "اسم الكود", type: "text", required: true, placeholder: "Concrete Works" },
        { name: "description", label: "الوصف", type: "textarea" },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}

