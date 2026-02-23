"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type TreasuryChequeRow = {
  id: number;
  cheque_number: string;
  direction: string;
  status: string;
  cheque_date: string;
  amount: string;
};

export default function AccountingV2TreasuryChequesPage() {
  return (
    <ResourceCrudPage<TreasuryChequeRow>
      title="الشيكات"
      description="إدارة الشيكات الواردة والصادرة وإجراءات دورة حياتها."
      resourcePath="/v2/treasury/cheques/"
      searchPlaceholder="ابحث عن شيك"
      columns={[
        { key: "cheque_number", title: "الشيك" },
        { key: "direction", title: "الاتجاه" },
        { key: "status", title: "الحالة" },
        { key: "cheque_date", title: "التاريخ" },
        { key: "amount", title: "المبلغ" },
      ]}
      fields={[
        { name: "cheque_number", label: "رقم الشيك", type: "text", required: true },
        {
          name: "direction",
          label: "الاتجاه",
          type: "select",
          required: true,
          options: [
            { label: "وارد", value: "incoming" },
            { label: "صادر", value: "outgoing" },
          ],
        },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "مستلم", value: "received" },
            { label: "مُودع", value: "deposited" },
            { label: "مرتجع", value: "returned" },
            { label: "محصل", value: "cleared" },
          ],
          defaultValue: "received",
        },
        { name: "cheque_date", label: "تاريخ الشيك", type: "date", required: true },
        { name: "amount", label: "المبلغ", type: "number", required: true, min: 0.01, step: 0.01 },
      ]}
      actions={[
        { label: "إيداع", action: "deposit", variant: "default" },
        { label: "إرجاع", action: "return", variant: "warning" },
        { label: "تحصيل", action: "clear", variant: "success" },
      ]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مستلم", value: "received" },
        { label: "مُودع", value: "deposited" },
        { label: "مرتجع", value: "returned" },
        { label: "محصل", value: "cleared" },
      ]}
    />
  );
}
