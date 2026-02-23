"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Reservation } from "@/lib/entities";

export default function ReservationsPage() {
  return (
    <ResourceCrudPage<Reservation>
      title="الحجوزات"
      description="إدارة حجوزات الوحدات وتأكيدها أو إلغائها."
      resourcePath="/v1/real-estate/reservations/"
      searchPlaceholder="ابحث برقم الحجز أو الوحدة أو العميل"
      columns={[
        { key: "reservation_number", title: "رقم الحجز" },
        { key: "unit_code", title: "الوحدة" },
        { key: "project_code", title: "المشروع" },
        { key: "customer_name", title: "العميل" },
        { key: "status", title: "الحالة" },
        { key: "reserved_at", title: "تاريخ الحجز" },
        { key: "expires_at", title: "تاريخ الانتهاء" },
      ]}
      fields={[
        { name: "reservation_number", label: "رقم الحجز", type: "text", placeholder: "RSV-00001" },
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
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "مسودة", value: "draft" },
            { label: "محجوز", value: "reserved" },
            { label: "ملغي", value: "cancelled" },
            { label: "منتهي", value: "expired" },
            { label: "محول لعقد", value: "converted" },
          ],
          defaultValue: "draft",
        },
        { name: "reserved_at", label: "تاريخ الحجز", type: "text", placeholder: "ISO datetime" },
        { name: "expires_at", label: "تاريخ الانتهاء", type: "text", placeholder: "ISO datetime" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
      actions={[
        { label: "تأكيد الحجز", action: "reserve", variant: "success" },
        { label: "إلغاء", action: "cancel", variant: "danger" },
      ]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "محجوز", value: "reserved" },
        { label: "ملغي", value: "cancelled" },
        { label: "منتهي", value: "expired" },
        { label: "محول لعقد", value: "converted" },
      ]}
    />
  );
}
