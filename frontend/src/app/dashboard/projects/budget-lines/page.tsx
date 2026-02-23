"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency } from "@/lib/format";
import type { BudgetLine } from "@/lib/entities";

export default function BudgetLinesPage() {
  return (
    <ResourceCrudPage<BudgetLine>
      title="بنود الميزانية"
      description="خط الأساس والقيمة المعدّلة لكل كود تكلفة."
      resourcePath="/v1/projects/budget-lines/"
      searchPlaceholder="ابحث بالمشروع أو كود التكلفة"
      columns={[
        { key: "project", title: "المشروع" },
        { key: "cost_code", title: "كود التكلفة" },
        {
          key: "baseline_amount",
          title: "خط الأساس",
          render: (row) => formatCurrency(row.baseline_amount),
        },
        {
          key: "revised_amount",
          title: "القيمة المعدّلة",
          render: (row) => formatCurrency(row.revised_amount),
        },
      ]}
      fields={[
        { name: "project", label: "معرّف المشروع", type: "number", required: true },
        { name: "cost_code", label: "معرّف كود التكلفة", type: "number", required: true },
        { name: "baseline_amount", label: "خط الأساس", type: "number", defaultValue: "0.00" },
        { name: "revised_amount", label: "القيمة المعدّلة", type: "number" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
