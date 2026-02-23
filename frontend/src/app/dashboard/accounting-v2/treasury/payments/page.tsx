"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type TreasuryPaymentRow = {
  id: number;
  payment_number: string;
  payment_date: string;
  vendor: number;
  purchase_invoice: number;
  amount: string;
  channel: string;
};

export default function AccountingV2TreasuryPaymentsPage() {
  return (
    <ResourceCrudPage<TreasuryPaymentRow>
      title="سندات الدفع"
      description="مدفوعات الموردين مع تسوية الذمم الدائنة والترحيل التلقائي."
      resourcePath="/v2/treasury/payments/"
      searchPlaceholder="ابحث عن سند دفع"
      columns={[
        { key: "payment_number", title: "السند" },
        { key: "payment_date", title: "التاريخ" },
        { key: "vendor", title: "المورد" },
        { key: "purchase_invoice", title: "الفاتورة" },
        { key: "amount", title: "المبلغ" },
        { key: "channel", title: "القناة" },
      ]}
      fields={[
        { name: "payment_number", label: "رقم السند", type: "text", placeholder: "تلقائي" },
        { name: "payment_date", label: "تاريخ السند", type: "date", required: true },
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
        {
          name: "purchase_invoice",
          label: "فاتورة المشتريات",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v2/purchase/invoices/",
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
