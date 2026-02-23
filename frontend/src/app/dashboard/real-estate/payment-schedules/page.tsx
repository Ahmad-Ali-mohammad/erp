"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { PaymentSchedule } from "@/lib/entities";

export default function PaymentSchedulesPage() {
  return (
    <ResourceCrudPage<PaymentSchedule>
      title="جداول السداد"
      description="توزيع إجمالي قيمة العقد على جداول دفع."
      resourcePath="/v1/real-estate/payment-schedules/"
      searchPlaceholder="ابحث برقم العقد أو اسم الجدول"
      columns={[
        { key: "contract", title: "العقد" },
        { key: "name", title: "الاسم" },
        { key: "total_amount", title: "الإجمالي" },
        { key: "start_date", title: "بداية السداد" },
        { key: "end_date", title: "نهاية السداد" },
      ]}
      fields={[
        {
          name: "contract",
          label: "العقد",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/real-estate/sales-contracts/",
            valueField: "id",
            labelFields: ["contract_number", "customer_name"],
            ordering: "-contract_date",
          },
        },
        { name: "name", label: "اسم الجدول", type: "text", required: true, defaultValue: "Main" },
        { name: "total_amount", label: "الإجمالي", type: "number", required: true, defaultValue: "0.00" },
        { name: "start_date", label: "بداية السداد", type: "date" },
        { name: "end_date", label: "نهاية السداد", type: "date" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
    />
  );
}
