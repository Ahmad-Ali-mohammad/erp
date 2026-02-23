"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Role } from "@/lib/entities";

export default function RolesPage() {
  return (
    <ResourceCrudPage<Role>
      title="الأدوار"
      description="إدارة أدوار المستخدمين والصلاحيات التنظيمية."
      resourcePath="/v1/core/roles/"
      searchPlaceholder="ابحث باسم الدور أو الـ slug"
      columns={[
        { key: "name", title: "اسم الدور" },
        { key: "slug", title: "Slug" },
      ]}
      fields={[
        { name: "name", label: "اسم الدور", type: "text", required: true, placeholder: "Project Manager" },
        { name: "slug", label: "Slug", type: "text", required: true, placeholder: "project-manager" },
        { name: "description", label: "الوصف", type: "textarea" },
        { name: "is_system", label: "Role System", type: "checkbox", defaultValue: false },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}

