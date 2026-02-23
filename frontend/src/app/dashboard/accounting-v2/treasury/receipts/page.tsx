"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type TreasuryReceiptRow = {
  id: number;
  receipt_number: string;
  receipt_date: string;
  customer: number;
  sales_invoice: number;
  amount: string;
  channel: string;
};

export default function AccountingV2TreasuryReceiptsPage() {
  return (
    <ResourceCrudPage<TreasuryReceiptRow>
      title="سندات القبض"
      description="تحصيلات العملاء مع تسوية الذمم المدينة والترحيل التلقائي."
      resourcePath="/v2/treasury/receipts/"
      searchPlaceholder="ابحث عن سند قبض"
      columns={[
        { key: "receipt_number", title: "السند" },
        { key: "receipt_date", title: "التاريخ" },
        { key: "customer", title: "العميل" },
        { key: "sales_invoice", title: "الفاتورة" },
        { key: "amount", title: "المبلغ" },
        { key: "channel", title: "القناة" },
      ]}
      fields={[
        { name: "receipt_number", label: "رقم السند", type: "text", placeholder: "تلقائي" },
        { name: "receipt_date", label: "تاريخ السند", type: "date", required: true },
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
          name: "sales_invoice",
          label: "فاتورة البيع",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v2/sales/invoices/",
            valueField: "id",
            labelFields: ["invoice_number"],
            ordering: "-invoice_date",
          },
        },
        { name: "amount", label: "المبلغ", type: "number", required: true, min: 0.01, step: 0.01 },
        {
          name: "channel",
          label: "القناة",
          type: "select",
          required: true,
          options: [
            { label: "نقدي", value: "cash" },
            { label: "بنك", value: "bank" },
          ],
          defaultValue: "cash",
        },
        { name: "notes", label: "ملاحظات", type: "textarea", rows: 2 },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
