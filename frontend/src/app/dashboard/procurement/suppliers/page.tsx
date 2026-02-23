"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Supplier } from "@/lib/entities";

export default function SuppliersPage() {
  return (
    <ResourceCrudPage<Supplier>
      title="الموردون"
      description="إدارة بيانات الموردين وربطها بعمليات الشراء."
      resourcePath="/v1/procurement/suppliers/"
      searchPlaceholder="ابحث بالكود أو اسم المورد أو الرقم الضريبي"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "tax_number", title: "الرقم الضريبي" },
        {
          key: "is_active",
          title: "نشط",
          render: (row) => (row.is_active ? "نعم" : "لا"),
        },
      ]}
      fields={[
        { name: "code", label: "كود المورد", type: "text", required: true, placeholder: "SUP-001" },
        { name: "name", label: "اسم المورد", type: "text", required: true, placeholder: "Supplier A" },
        { name: "tax_number", label: "الرقم الضريبي", type: "text" },
        { name: "phone", label: "الهاتف", type: "text" },
        { name: "email", label: "البريد الإلكتروني", type: "text" },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
