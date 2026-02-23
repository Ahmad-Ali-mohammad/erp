"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type PurchaseOrderRow = {
  id: number;
  order_number: string;
  vendor: number;
  order_date: string;
  status: string;
};

export default function AccountingV2PurchaseOrdersPage() {
  return (
    <ResourceCrudPage<PurchaseOrderRow>
      title="أوامر الشراء"
      description="إنشاء أوامر الشراء ومتابعة دورة الإرسال والاستلام."
      resourcePath="/v2/purchase/orders/"
      searchPlaceholder="ابحث عن أمر شراء"
      columns={[
        { key: "order_number", title: "الرقم" },
        { key: "vendor", title: "المورد" },
        { key: "order_date", title: "التاريخ" },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        { name: "order_number", label: "رقم الأمر", type: "text", placeholder: "تلقائي" },
        {
          name: "vendor",
          label: "المورد",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v2/masters/vendors/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "order_date", label: "تاريخ الأمر", type: "date", required: true },
        {
          name: "lines",
          label: "البنود",
          type: "json",
          defaultValue: "[]",
          jsonEditor: {
            minItems: 1,
            addLabel: "إضافة بند",
            columns: [
              {
                key: "item",
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
              { key: "quantity", label: "الكمية", type: "number", required: true, defaultValue: "1.000", min: 0.001, step: 0.001 },
              { key: "unit_cost", label: "تكلفة الوحدة", type: "number", required: true, defaultValue: "0.00", min: 0, step: 0.01 },
            ],
          },
        },
      ]}
      actions={[{ label: "إرسال", action: "send", variant: "default" }]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "مرسل", value: "sent" },
        { label: "مستلم", value: "received" },
      ]}
    />
  );
}
