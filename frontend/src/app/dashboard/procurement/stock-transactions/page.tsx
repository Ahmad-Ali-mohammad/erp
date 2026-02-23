"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatDate, formatNumber } from "@/lib/format";
import type { StockTransaction } from "@/lib/entities";

export default function StockTransactionsPage() {
  return (
    <ResourceCrudPage<StockTransaction>
      title="حركات المخزون"
      description="سجل حركات الإدخال والإخراج المرتبط بالمستودعات والوثائق."
      resourcePath="/v1/procurement/stock-transactions/"
      searchPlaceholder="ابحث بالمرجع أو نوع الحركة"
      columns={[
        { key: "transaction_type", title: "النوع" },
        { key: "quantity", title: "الكمية", render: (row) => formatNumber(row.quantity) },
        { key: "transaction_date", title: "التاريخ", render: (row) => formatDate(row.transaction_date) },
        { key: "reference_type", title: "نوع المرجع" },
        { key: "reference_id", title: "رقم المرجع" },
      ]}
      fields={[
        {
          name: "material",
          label: "معرّف المادة",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/procurement/materials/",
            valueField: "id",
            labelFields: ["sku", "name"],
            ordering: "sku",
          },
        },
        {
          name: "warehouse",
          label: "معرّف المستودع",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/procurement/warehouses/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        {
          name: "project",
          label: "معرّف المشروع",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/projects/projects/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        {
          name: "transaction_type",
          label: "نوع الحركة",
          type: "select",
          required: true,
          options: [
            { label: "In", value: "in" },
            { label: "Out", value: "out" },
            { label: "Adjustment", value: "adjustment" },
          ],
          defaultValue: "in",
        },
        { name: "quantity", label: "الكمية", type: "number", required: true },
        { name: "unit_cost", label: "تكلفة الوحدة", type: "number", defaultValue: "0.00" },
        { name: "transaction_date", label: "تاريخ الحركة", type: "date", required: true },
        { name: "reference_type", label: "نوع المرجع", type: "text" },
        { name: "reference_id", label: "رقم المرجع", type: "text" },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
