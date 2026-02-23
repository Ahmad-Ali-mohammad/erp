"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type SalesOrderRow = {
  id: number;
  order_number: string;
  customer: number;
  order_date: string;
  status: string;
};

export default function AccountingV2SalesOrdersPage() {
  return (
    <ResourceCrudPage<SalesOrderRow>
      title="أوامر البيع"
      description="إدارة أوامر بيع العملاء وتحويلها إلى فواتير بيع."
      resourcePath="/v2/sales/orders/"
      searchPlaceholder="ابحث عن أمر بيع"
      columns={[
        { key: "order_number", title: "الرقم" },
        { key: "customer", title: "العميل" },
        { key: "order_date", title: "التاريخ" },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        { name: "order_number", label: "رقم الأمر", type: "text", placeholder: "تلقائي" },
        {
          name: "customer",
          label: "العميل",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v2/masters/customers/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        {
          name: "quotation",
          label: "عرض السعر",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v2/sales/quotations/",
            valueField: "id",
            labelFields: ["quotation_number"],
            ordering: "-quotation_date",
          },
        },
        { name: "order_date", label: "التاريخ", type: "date", required: true },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "مسودة", value: "draft" },
            { label: "مؤكد", value: "confirmed" },
            { label: "مفوتر", value: "invoiced" },
          ],
          defaultValue: "draft",
        },
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
              { key: "unit_price", label: "سعر الوحدة", type: "number", required: true, defaultValue: "0.00", min: 0, step: 0.01 },
            ],
          },
        },
      ]}
      actions={[{ label: "تحويل إلى فاتورة", action: "convert-to-invoice", variant: "success" }]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "مؤكد", value: "confirmed" },
        { label: "مفوتر", value: "invoiced" },
      ]}
    />
  );
}
