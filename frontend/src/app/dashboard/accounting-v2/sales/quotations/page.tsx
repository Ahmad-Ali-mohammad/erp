"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type QuotationRow = {
  id: number;
  quotation_number: string;
  customer: number;
  quotation_date: string;
  status: string;
};

export default function AccountingV2QuotationsPage() {
  return (
    <ResourceCrudPage<QuotationRow>
      title="عروض أسعار المبيعات"
      description="إعداد عروض أسعار العملاء ومتابعتها قبل تحويلها إلى أوامر بيع."
      resourcePath="/v2/sales/quotations/"
      searchPlaceholder="ابحث عن عرض سعر"
      columns={[
        { key: "quotation_number", title: "الرقم" },
        { key: "customer", title: "العميل" },
        { key: "quotation_date", title: "التاريخ" },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        { name: "quotation_number", label: "رقم العرض", type: "text", placeholder: "تلقائي" },
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
        { name: "quotation_date", label: "التاريخ", type: "date", required: true },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "مسودة", value: "draft" },
            { label: "معتمد", value: "approved" },
            { label: "محوّل", value: "converted" },
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
      actions={[]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "معتمد", value: "approved" },
        { label: "محوّل", value: "converted" },
      ]}
    />
  );
}
