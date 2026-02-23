"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type InventoryMovementRow = {
  id: number;
  item: number;
  location: number;
  movement_type: string;
  quantity: string;
  unit_cost: string;
  movement_date: string;
  reference_type: string;
};

export default function AccountingV2InventoryMovementsPage() {
  return (
    <ResourceCrudPage<InventoryMovementRow>
      title="حركات المخزون"
      description="سجل حركات للقراءة فقط يتم إنشاؤه من المبيعات والاستلامات والتسويات."
      resourcePath="/v2/inventory/movements/"
      searchPlaceholder="ابحث بالمرجع"
      columns={[
        { key: "movement_date", title: "التاريخ" },
        { key: "item", title: "الصنف" },
        { key: "location", title: "الموقع" },
        { key: "movement_type", title: "النوع" },
        { key: "quantity", title: "الكمية" },
        { key: "reference_type", title: "نوع المرجع" },
      ]}
      fields={[]}
      actions={[]}
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
