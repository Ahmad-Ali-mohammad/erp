"use client";

import Link from "next/link";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency } from "@/lib/format";
import type { Project } from "@/lib/entities";

export default function ProjectsPage() {
  return (
    <ResourceCrudPage<Project>
      title="المشاريع"
      description="إدارة المشاريع وربط الحالة المالية مع دورة الإقفال."
      resourcePath="/v1/projects/projects/"
      searchPlaceholder="ابحث بالكود أو اسم المشروع أو العميل"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "اسم المشروع" },
        { key: "client_name", title: "العميل" },
        { key: "contract_value", title: "قيمة العقد", render: (row) => formatCurrency(row.contract_value) },
        { key: "budget", title: "الميزانية", render: (row) => formatCurrency(row.budget) },
        {
          key: "details",
          title: "التفاصيل",
          render: (row) => (
            <Link href={`/dashboard/projects/${row.id}`} className="btn btn-outline">
              استعراض
            </Link>
          ),
        },
      ]}
      fields={[
        { name: "code", label: "كود المشروع", type: "text", required: true, placeholder: "PRJ-001" },
        { name: "name", label: "اسم المشروع", type: "text", required: true, placeholder: "Tower A" },
        { name: "client_name", label: "اسم العميل", type: "text", required: true, placeholder: "ACME" },
        { name: "description", label: "وصف", type: "textarea" },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "تخطيط", value: "planning" },
            { label: "نشط", value: "active" },
            { label: "متوقف مؤقتاً", value: "on_hold" },
            { label: "مكتمل", value: "completed" },
            { label: "ملغي", value: "cancelled" },
          ],
          defaultValue: "planning",
        },
        { name: "contract_value", label: "قيمة العقد", type: "number", defaultValue: "0.00" },
        { name: "budget", label: "الميزانية", type: "number", defaultValue: "0.00" },
        { name: "currency", label: "العملة", type: "text", defaultValue: "SAR" },
        { name: "start_date", label: "تاريخ البداية", type: "date" },
        { name: "expected_end_date", label: "تاريخ النهاية المتوقع", type: "date" },
      ]}
      actions={[{ label: "إقفال المشروع", action: "close", variant: "warning" }]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "تخطيط", value: "planning" },
        { label: "نشط", value: "active" },
        { label: "متوقف مؤقتاً", value: "on_hold" },
        { label: "مكتمل", value: "completed" },
        { label: "ملغي", value: "cancelled" },
      ]}
    />
  );
}

