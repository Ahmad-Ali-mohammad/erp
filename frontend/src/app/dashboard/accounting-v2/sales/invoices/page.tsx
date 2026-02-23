"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type SalesInvoiceRow = {
  id: number;
  invoice_number: string;
  customer: number;
  invoice_type: string;
  invoice_date: string;
  total_amount: string;
  status: string;
};

export default function AccountingV2SalesInvoicesPage() {
  return (
    <ResourceCrudPage<SalesInvoiceRow>
      title="فواتير البيع"
      description="إصدار فواتير نقدية أو آجلة مع إنشاء القيود المحاسبية تلقائيًا."
      resourcePath="/v2/sales/invoices/"
      searchPlaceholder="ابحث عن فاتورة"
      columns={[
        { key: "invoice_number", title: "الفاتورة" },
        { key: "customer", title: "العميل" },
        { key: "invoice_type", title: "النوع" },
        { key: "invoice_date", title: "التاريخ" },
        { key: "total_amount", title: "الإجمالي" },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        { name: "invoice_number", label: "رقم الفاتورة", type: "text", placeholder: "تلقائي" },
        {
          name: "invoice_type",
          label: "نوع الفاتورة",
          type: "select",
          required: true,
          options: [
            { label: "آجل", value: "credit" },
            { label: "نقدي", value: "cash" },
          ],
          defaultValue: "credit",
        },
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
        { name: "invoice_date", label: "تاريخ الفاتورة", type: "date", required: true },
        { name: "due_date", label: "تاريخ الاستحقاق", type: "date" },
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
      actions={[{ label: "ترحيل", action: "post", variant: "success" }]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "مرحل", value: "posted" },
        { label: "مدفوع جزئيًا", value: "partially_paid" },
        { label: "مدفوع", value: "paid" },
      ]}
    />
  );
}
