"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type ItemRow = {
  id: number;
  sku: string;
  name: string;
  uom: string;
  standard_cost: string;
  sales_price: string;
  track_inventory: boolean;
};

export default function AccountingV2ItemsPage() {
  return (
    <ResourceCrudPage<ItemRow>
      title="الأصناف"
      description="تعريف الأصناف وأسعارها وضوابط تتبع المخزون."
      resourcePath="/v2/masters/items/"
      searchPlaceholder="ابحث بالرمز أو اسم الصنف"
      columns={[
        { key: "sku", title: "الرمز" },
        { key: "name", title: "الاسم" },
        { key: "uom", title: "وحدة القياس" },
        { key: "standard_cost", title: "التكلفة" },
        { key: "sales_price", title: "سعر البيع" },
        { key: "track_inventory", title: "متابع مخزنيًا", render: (row) => (row.track_inventory ? "نعم" : "لا") },
      ]}
      fields={[
        { name: "sku", label: "رمز الصنف", type: "text", required: true, placeholder: "SKU-001" },
        { name: "name", label: "اسم الصنف", type: "text", required: true },
        { name: "uom", label: "وحدة القياس", type: "text", defaultValue: "وحدة" },
        { name: "standard_cost", label: "التكلفة القياسية", type: "number", defaultValue: "0.00", step: 0.01, min: 0 },
        { name: "sales_price", label: "سعر البيع", type: "number", defaultValue: "0.00", step: 0.01, min: 0 },
        { name: "min_reorder_qty", label: "حد إعادة الطلب الأدنى", type: "number", defaultValue: "0.000", step: 0.001, min: 0 },
        { name: "track_inventory", label: "تتبع المخزون", type: "checkbox", defaultValue: true },
        { name: "is_active", label: "نشط", type: "checkbox", defaultValue: true },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
