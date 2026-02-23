"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type VendorRow = {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
};

export default function AccountingV2VendorsPage() {
  return (
    <ResourceCrudPage<VendorRow>
      title="الموردون"
      description="بيانات الموردين الأساسية للذمم الدائنة والمشتريات والمدفوعات."
      resourcePath="/v2/masters/vendors/"
      searchPlaceholder="ابحث عن مورد"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "phone", title: "الهاتف" },
        { key: "email", title: "البريد الإلكتروني" },
      ]}
      fields={[
        { name: "code", label: "الكود", type: "text", required: true, placeholder: "V-0001" },
        { name: "name", label: "الاسم", type: "text", required: true },
        { name: "phone", label: "الهاتف", type: "text" },
        { name: "email", label: "البريد الإلكتروني", type: "text" },
        { name: "address", label: "العنوان", type: "textarea", rows: 2 },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
