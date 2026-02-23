"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Handover } from "@/lib/entities";

export default function HandoversPage() {
  return (
    <ResourceCrudPage<Handover>
      title="التسليم"
      description="توثيق تسليم الوحدات للعملاء وتحديث الحالة."
      resourcePath="/v1/real-estate/handovers/"
      searchPlaceholder="ابحث برقم العقد أو الوحدة"
      columns={[
        { key: "contract_number", title: "رقم العقد" },
        { key: "unit_code", title: "الوحدة" },
        { key: "project_code", title: "المشروع" },
        { key: "status", title: "الحالة" },
        { key: "handover_date", title: "تاريخ التسليم" },
      ]}
      fields={[
        {
          name: "contract",
          label: "العقد",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/real-estate/sales-contracts/",
            valueField: "id",
            labelFields: ["contract_number", "customer_name"],
            ordering: "-contract_date",
          },
        },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "قيد التسليم", value: "pending" },
            { label: "مسلم", value: "handed_over" },
            { label: "ملغي", value: "cancelled" },
          ],
          defaultValue: "pending",
        },
        { name: "handover_date", label: "تاريخ التسليم", type: "date" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
      actions={[{ label: "تسليم", action: "handover", variant: "success" }]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "قيد التسليم", value: "pending" },
        { label: "مسلم", value: "handed_over" },
        { label: "ملغي", value: "cancelled" },
      ]}
    />
  );
}
