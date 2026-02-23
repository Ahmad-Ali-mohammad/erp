"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type PurchaseInvoiceRow = {
  id: number;
  invoice_number: string;
  vendor: number;
  invoice_date: string;
  total_amount: string;
  status: string;
};

export default function AccountingV2PurchaseInvoicesPage() {
  return (
    <ResourceCrudPage<PurchaseInvoiceRow>
      title="فواتير المشتريات"
      description="تسجيل فواتير الموردين وترحيل القيود المحاسبية للمخزون والذمم الدائنة."
      resourcePath="/v2/purchase/invoices/"
      searchPlaceholder="ابحث عن فاتورة مشتريات"
      columns={[
        { key: "invoice_number", title: "الفاتورة" },
        { key: "vendor", title: "المورد" },
        { key: "invoice_date", title: "التاريخ" },
        { key: "total_amount", title: "الإجمالي" },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        { name: "invoice_number", label: "رقم الفاتورة", type: "text", placeholder: "تلقائي" },
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
              { key: "unit_cost", label: "تكلفة الوحدة", type: "number", required: true, defaultValue: "0.00", min: 0, step: 0.01 },
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
