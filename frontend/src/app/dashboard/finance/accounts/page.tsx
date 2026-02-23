"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import type { Account } from "@/lib/entities";

export default function AccountsPage() {
  return (
    <ResourceCrudPage<Account>
      title="دليل الحسابات"
      description="ترتيب الإدخال الصحيح: (1) الحقول الأساسية الإلزامية، (2) الحقول المالية، (3) الحقول المرجعية. للحذف استخدمه فقط للحسابات غير المرتبطة بقيود."
      resourcePath="/v1/finance/accounts/"
      searchPlaceholder="ابحث بالكود أو اسم الحساب"
      columns={[
        { key: "code", title: "الكود" },
        { key: "name", title: "اسم الحساب" },
        { key: "account_type", title: "النوع" },
        {
          key: "is_active",
          title: "نشط",
          render: (row) => (row.is_active ? "نعم" : "لا"),
        },
      ]}
      fields={[
        { name: "code", label: "1) كود الحساب", type: "text", required: true, placeholder: "1110", helpText: "إلزامي ويجب أن يكون فريدًا." },
        { name: "name", label: "1) اسم الحساب", type: "text", required: true, placeholder: "الصندوق", helpText: "إلزامي ويستخدم في التقارير." },
        {
          name: "account_type",
          label: "2) نوع الحساب",
          type: "select",
          required: true,
          options: [
            { label: "أصل", value: "asset" },
            { label: "التزام", value: "liability" },
            { label: "حقوق ملكية", value: "equity" },
            { label: "إيراد", value: "revenue" },
            { label: "مصروف", value: "expense" },
          ],
          helpText: "اختيار النوع الصحيح ضروري لتجميع القوائم المالية.",
        },
        {
          name: "parent",
          label: "3) الحساب الأب (مرجعي)",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/finance/accounts/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
          helpText: "اختياري لاستخدام البنية الهرمية للحسابات.",
        },
        { name: "is_active", label: "3) الحساب نشط", type: "checkbox", defaultValue: true, helpText: "استخدم التعطيل بدل الحذف متى أمكن." },
        { name: "is_control_account", label: "3) حساب تحكم", type: "checkbox", defaultValue: false, helpText: "فعّلها للحسابات التي تمنع القيود المباشرة." },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}
