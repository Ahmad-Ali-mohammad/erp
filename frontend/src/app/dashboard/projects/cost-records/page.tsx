"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CostRecord } from "@/lib/entities";

export default function CostRecordsPage() {
  return (
    <ResourceCrudPage<CostRecord>
      title="سجلات التكلفة"
      description="الالتزامات وتكاليف فعلية مرتبطة بالمصادر التشغيلية."
      resourcePath="/v1/projects/cost-records/"
      searchPlaceholder="ابحث بالمصدر أو المرجع"
      columns={[
        { key: "project", title: "المشروع" },
        { key: "cost_code", title: "كود التكلفة" },
        { key: "record_type", title: "نوع السجل" },
        { key: "amount", title: "المبلغ", render: (row) => formatCurrency(row.amount) },
        { key: "record_date", title: "التاريخ", render: (row) => formatDate(row.record_date) },
      ]}
      fields={[
        { name: "project", label: "معرّف المشروع", type: "number", required: true },
        { name: "cost_code", label: "معرّف كود التكلفة", type: "number", required: true },
        {
          name: "record_type",
          label: "نوع السجل",
          type: "select",
          required: true,
          options: [
            { label: "Commitment", value: "commitment" },
            { label: "Actual", value: "actual" },
          ],
        },
        { name: "amount", label: "المبلغ", type: "number", required: true },
        { name: "record_date", label: "التاريخ", type: "date", required: true },
        { name: "source_module", label: "المصدر", type: "text" },
        { name: "source_reference", label: "المرجع", type: "text" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "Commitment", value: "commitment" },
        { label: "Actual", value: "actual" },
      ]}
    />
  );
}
