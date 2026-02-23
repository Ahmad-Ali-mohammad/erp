"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { RealEstateProject } from "@/lib/entities";

export default function RealEstateProjectsPage() {
  return (
    <ResourceCrudPage<RealEstateProject>
      title="المشروعات العقارية"
      description="تعريف المشروعات والوضع التنفيذي والعملة."
      resourcePath="/v1/real-estate/projects/"
      searchPlaceholder="ابحث بالكود أو الاسم أو الموقع"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "location", title: "الموقع" },
        { key: "status", title: "الحالة" },
        { key: "currency", title: "العملة" },
        { key: "start_date", title: "تاريخ البداية" },
        { key: "expected_end_date", title: "تاريخ الانتهاء المتوقع" },
      ]}
      fields={[
        { name: "code", label: "كود المشروع", type: "text", placeholder: "RE-0001" },
        { name: "name", label: "اسم المشروع", type: "text", required: true },
        { name: "description", label: "الوصف", type: "textarea" },
        { name: "location", label: "الموقع", type: "text" },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "تخطيط", value: "planning" },
            { label: "نشط", value: "active" },
            { label: "إيقاف مؤقت", value: "on_hold" },
            { label: "مكتمل", value: "completed" },
            { label: "ملغي", value: "cancelled" },
          ],
          defaultValue: "planning",
        },
        { name: "currency", label: "العملة", type: "text", defaultValue: "KWD" },
        { name: "start_date", label: "تاريخ البداية", type: "date" },
        { name: "expected_end_date", label: "تاريخ الانتهاء المتوقع", type: "date" },
      ]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "تخطيط", value: "planning" },
        { label: "نشط", value: "active" },
        { label: "إيقاف مؤقت", value: "on_hold" },
        { label: "مكتمل", value: "completed" },
        { label: "ملغي", value: "cancelled" },
      ]}
    />
  );
}
