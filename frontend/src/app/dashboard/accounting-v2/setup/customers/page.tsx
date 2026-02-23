"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";

type CustomerRow = {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  credit_limit: string;
};

export default function AccountingV2CustomersPage() {
  return (
    <ResourceCrudPage<CustomerRow>
      title="العملاء"
      description="بيانات العملاء الأساسية للذمم المدينة والفواتير والمطابقة مع سندات القبض."
      resourcePath="/v2/masters/customers/"
      searchPlaceholder="ابحث عن عميل"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "الاسم" },
        { key: "phone", title: "الهاتف" },
        { key: "email", title: "البريد الإلكتروني" },
        { key: "credit_limit", title: "الحد الائتماني" },
      ]}
      fields={[
        { name: "code", label: "الكود", type: "text", required: true, placeholder: "C-0001" },
        { name: "name", label: "الاسم", type: "text", required: true },
        { name: "phone", label: "الهاتف", type: "text" },
        { name: "email", label: "البريد الإلكتروني", type: "text" },
        { name: "address", label: "العنوان", type: "textarea", rows: 2 },
        { name: "credit_limit", label: "الحد الائتماني", type: "number", defaultValue: "0.00", step: 0.01, min: 0 },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
