"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency } from "@/lib/format";
import type { Installment } from "@/lib/entities";

export default function InstallmentsPage() {
  return (
    <ResourceCrudPage<Installment>
      title="الأقساط"
      description="متابعة أقساط العقود وحالة السداد والربط بالفواتير."
      resourcePath="/v1/real-estate/installments/"
      searchPlaceholder="ابحث برقم القسط أو العقد"
      columns={[
        { key: "installment_number", title: "رقم القسط" },
        { key: "contract_number", title: "العقد" },
        { key: "unit_code", title: "الوحدة" },
        { key: "due_date", title: "تاريخ الاستحقاق" },
        { key: "amount", title: "المبلغ", render: (row) => formatCurrency(row.amount, row.currency) },
        { key: "paid_amount", title: "المدفوع", render: (row) => formatCurrency(row.paid_amount, row.currency) },
        { key: "status", title: "الحالة" },
      ]}
      fields={[
        {
          name: "schedule",
          label: "جدول السداد",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/real-estate/payment-schedules/",
            valueField: "id",
            labelFields: ["name"],
            ordering: "contract",
          },
        },
        { name: "installment_number", label: "رقم القسط", type: "text", placeholder: "INST-00001" },
        { name: "due_date", label: "تاريخ الاستحقاق", type: "date", required: true },
        { name: "amount", label: "المبلغ", type: "number", required: true, defaultValue: "0.00" },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "قيد الانتظار", value: "pending" },
            { label: "مدفوع", value: "paid" },
            { label: "متأخر", value: "overdue" },
            { label: "ملغي", value: "cancelled" },
          ],
          defaultValue: "pending",
        },
        { name: "paid_amount", label: "المبلغ المدفوع", type: "number", defaultValue: "0.00" },
        { name: "paid_at", label: "تاريخ الدفع", type: "text", placeholder: "ISO datetime" },
        { name: "linked_invoice", label: "فاتورة مرتبطة", type: "text", placeholder: "ID" },
      ]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "قيد الانتظار", value: "pending" },
        { label: "مدفوع", value: "paid" },
        { label: "متأخر", value: "overdue" },
        { label: "ملغي", value: "cancelled" },
      ]}
    />
  );
}
