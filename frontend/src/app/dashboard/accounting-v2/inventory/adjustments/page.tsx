"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type InventoryAdjustmentRow = {
  id: number;
  adjustment_number: string;
  location: number;
  item: number;
  adjustment_date: string;
  quantity: string;
  unit_cost: string;
  direction: string;
};

export default function AccountingV2InventoryAdjustmentsPage() {
  return (
    <ResourceCrudPage<InventoryAdjustmentRow>
      title="تسويات المخزون"
      description="تسجيل الزيادة أو العجز في المخزون مع ترحيل محاسبي تلقائي."
      resourcePath="/v2/inventory/adjustments/"
      searchPlaceholder="ابحث عن تسوية"
      columns={[
        { key: "adjustment_number", title: "رقم التسوية" },
        { key: "adjustment_date", title: "التاريخ" },
        { key: "item", title: "الصنف" },
        { key: "location", title: "الموقع" },
        { key: "direction", title: "الاتجاه" },
        { key: "quantity", title: "الكمية" },
      ]}
      fields={[
        { name: "adjustment_number", label: "رقم التسوية", type: "text", placeholder: "تلقائي" },
        {
          name: "location",
          label: "الموقع المخزني",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v2/inventory/locations/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        {
          name: "item",
          label: "الصنف",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v2/masters/items/",
            valueField: "id",
            labelFields: ["sku", "name"],
            ordering: "sku",
          },
        },
        { name: "adjustment_date", label: "تاريخ التسوية", type: "date", required: true },
        { name: "quantity", label: "الكمية", type: "number", required: true, min: 0.001, step: 0.001, defaultValue: "1.000" },
        { name: "unit_cost", label: "تكلفة الوحدة", type: "number", min: 0, step: 0.01, defaultValue: "0.00" },
        {
          name: "direction",
          label: "الاتجاه",
          type: "select",
          required: true,
          options: [
            { label: "زيادة", value: "increase" },
            { label: "نقص", value: "decrease" },
          ],
          defaultValue: "increase",
        },
        { name: "reason", label: "السبب", type: "text" },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
