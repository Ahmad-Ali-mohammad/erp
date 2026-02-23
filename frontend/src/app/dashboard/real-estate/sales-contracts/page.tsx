"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency } from "@/lib/format";
import type { SalesContract } from "@/lib/entities";

export default function SalesContractsPage() {
  return (
    <ResourceCrudPage<SalesContract>
      title="عقود البيع"
      description="تحويل الحجز إلى عقد بيع وجدولة الدفعات."
      resourcePath="/v1/real-estate/sales-contracts/"
      searchPlaceholder="ابحث برقم العقد أو الوحدة أو العميل"
      columns={[
        { key: "contract_number", title: "رقم العقد" },
        { key: "unit_code", title: "الوحدة" },
        { key: "project_code", title: "المشروع" },
        { key: "customer_name", title: "العميل" },
        { key: "status", title: "الحالة" },
        { key: "contract_date", title: "تاريخ العقد" },
        { key: "total_price", title: "السعر الإجمالي", render: (row) => formatCurrency(row.total_price, row.currency) },
      ]}
      fields={[
        { name: "contract_number", label: "رقم العقد", type: "text", placeholder: "SC-00001" },
        {
          name: "unit",
          label: "الوحدة",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/real-estate/units/",
            valueField: "id",
            labelFields: ["code"],
            ordering: "code",
          },
        },
        {
          name: "customer",
          label: "العميل",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/core/customers/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "name",
          },
        },
        {
          name: "reservation",
          label: "الحجز المرتبط",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/real-estate/reservations/",
            valueField: "id",
            labelFields: ["reservation_number", "unit_code"],
            ordering: "-created_at",
          },
        },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "مسودة", value: "draft" },
            { label: "نشط", value: "active" },
            { label: "ملغي", value: "cancelled" },
            { label: "مكتمل", value: "completed" },
          ],
          defaultValue: "draft",
        },
        { name: "contract_date", label: "تاريخ العقد", type: "date", required: true },
        { name: "total_price", label: "السعر الإجمالي", type: "number", required: true, defaultValue: "0.00" },
        { name: "down_payment", label: "الدفعة المقدمة", type: "number", defaultValue: "0.00" },
        { name: "currency", label: "العملة", type: "text", defaultValue: "KWD" },
        { name: "signed_by", label: "الموقع", type: "text" },
      ]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "نشط", value: "active" },
        { label: "ملغي", value: "cancelled" },
        { label: "مكتمل", value: "completed" },
      ]}
    />
  );
}
