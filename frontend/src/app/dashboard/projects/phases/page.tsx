"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatNumber } from "@/lib/format";
import type { ProjectPhase } from "@/lib/entities";

export default function PhasesPage() {
  return (
    <ResourceCrudPage<ProjectPhase>
      title="مراحل المشاريع"
      description="عرض مراحل التنفيذ ونسب التقدم المخططة والفعلية."
      resourcePath="/v1/projects/phases/"
      searchPlaceholder="ابحث باسم المرحلة أو كود المشروع"
      columns={[
        { key: "project", title: "المشروع" },
        { key: "name", title: "المرحلة" },
        { key: "sequence", title: "الترتيب" },
        {
          key: "planned_progress",
          title: "التقدم المخطط",
          render: (row) => `${formatNumber(row.planned_progress)}%`,
        },
        {
          key: "actual_progress",
          title: "التقدم الفعلي",
          render: (row) => `${formatNumber(row.actual_progress)}%`,
        },
      ]}
      fields={[
        { name: "project", label: "معرّف المشروع", type: "number", required: true },
        { name: "name", label: "اسم المرحلة", type: "text", required: true, placeholder: "Foundation" },
        { name: "sequence", label: "الترتيب", type: "number", required: true, defaultValue: "1" },
        { name: "budget", label: "ميزانية المرحلة", type: "number", defaultValue: "0.00" },
        { name: "planned_progress", label: "التقدم المخطط", type: "number", defaultValue: "0.00" },
        { name: "actual_progress", label: "التقدم الفعلي", type: "number", defaultValue: "0.00" },
        { name: "start_date", label: "تاريخ البداية", type: "date" },
        { name: "end_date", label: "تاريخ النهاية", type: "date" },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
