"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { UserRecord } from "@/lib/entities";

export default function UsersPage() {
  return (
    <ResourceCrudPage<UserRecord>
      title="المستخدمون"
      description="عرض المستخدمين الحاليين في النظام."
      resourcePath="/v1/core/users/"
      searchPlaceholder="ابحث باسم المستخدم أو البريد"
      columns={[
        { key: "username", title: "اسم المستخدم" },
        { key: "email", title: "البريد الإلكتروني" },
        { key: "first_name", title: "الاسم الأول" },
        { key: "last_name", title: "اسم العائلة" },
      ]}
      fields={[
        { name: "username", label: "اسم المستخدم", type: "text", required: true },
        { name: "first_name", label: "الاسم الأول", type: "text" },
        { name: "last_name", label: "اسم العائلة", type: "text" },
        { name: "email", label: "البريد الإلكتروني", type: "text" },
        { name: "phone_number", label: "رقم الهاتف", type: "text" },
        { name: "job_title", label: "المسمى الوظيفي", type: "text" },
        { name: "is_field_staff", label: "ميداني", type: "checkbox", defaultValue: false },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
        {
          name: "role_id",
          label: "معرّف الدور",
          type: "select",
          helpText: "اختياري: role_id",
          dynamicOptions: {
            resourcePath: "/v1/core/roles/",
            valueField: "id",
            labelFields: ["name", "slug"],
            ordering: "name",
          },
        },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}


