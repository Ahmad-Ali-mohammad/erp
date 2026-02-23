"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice } from "@/lib/entities";

export default function InvoicesPage() {
  return (
    <ResourceCrudPage<Invoice>
      title="الفواتير"
      description="ترتيب الإدخال الصحيح: (1) الحقول الأساسية، (2) الحقول المالية، (3) الحقول المرجعية. عند الحاجة للتراجع بعد الاعتماد استخدم إجراءات الحالة بدل الحذف."
      resourcePath="/v1/finance/invoices/"
      searchPlaceholder="ابحث برقم الفاتورة أو الطرف أو المشروع"
      columns={[
        { key: "invoice_number", title: "رقم الفاتورة" },
        { key: "invoice_type", title: "النوع" },
        { key: "partner_name", title: "الطرف" },
        { key: "issue_date", title: "تاريخ الإصدار", render: (row) => formatDate(row.issue_date) },
        { key: "total_amount", title: "الإجمالي", render: (row) => formatCurrency(row.total_amount) },
      ]}
      fields={[
        {
          name: "invoice_number",
          label: "1) رقم الفاتورة",
          type: "text",
          placeholder: "يُولد تلقائيًا عند الإنشاء",
          helpText: "اتركه فارغًا ليتم الترقيم تلقائيًا.",
        },
        {
          name: "invoice_type",
          label: "1) نوع الفاتورة",
          type: "select",
          required: true,
          options: [
            { label: "عميل", value: "customer" },
            { label: "مورد", value: "supplier" },
            { label: "مقاول باطن", value: "subcontractor" },
          ],
        },
        { name: "partner_name", label: "1) اسم الطرف", type: "text", required: true, helpText: "إلزامي للربط مع التحصيل/السداد." },
        { name: "issue_date", label: "1) تاريخ الإصدار", type: "date", required: true },
        { name: "due_date", label: "2) تاريخ الاستحقاق", type: "date" },
        { name: "currency", label: "2) العملة", type: "text", defaultValue: "KWD" },
        { name: "notes", label: "2) ملاحظات", type: "textarea", helpText: "يُفضل توضيح نطاق الفاتورة أو المرفقات." },
        {
          name: "project",
          label: "3) المشروع (مرجعي)",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/projects/projects/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        {
          name: "cost_code",
          label: "3) كود التكلفة (مرجعي)",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/projects/cost-codes/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
            dependsOn: { project: "project" },
          },
        },
        {
          name: "items",
          label: "2) عناصر الفاتورة",
          type: "json",
          defaultValue:
            "[\n  {\n    \"description\": \"بند فاتورة\",\n    \"quantity\": \"1.000\",\n    \"unit_price\": \"100.00\",\n    \"tax_rate\": \"15.00\"\n  }\n]",
          jsonEditor: {
            itemLabel: "بند",
            addLabel: "إضافة بند",
            minItems: 1,
            columns: [
              {
                key: "cost_code",
                label: "كود التكلفة",
                type: "select",
                dynamicOptions: {
                  resourcePath: "/v1/projects/cost-codes/",
                  valueField: "id",
                  labelFields: ["code", "name"],
                  ordering: "code",
                  dependsOnForm: { project: "project" },
                },
              },
              {
                key: "project_phase",
                label: "مرحلة المشروع",
                type: "select",
                dynamicOptions: {
                  resourcePath: "/v1/projects/phases/",
                  valueField: "id",
                  labelFields: ["sequence", "name"],
                  ordering: "sequence",
                  dependsOnForm: { project: "project" },
                },
              },
              { key: "description", label: "الوصف", type: "text", required: true },
              {
                key: "quantity",
                label: "الكمية",
                type: "number",
                defaultValue: "1.000",
                min: 0.001,
                step: 0.001,
              },
              {
                key: "unit_price",
                label: "سعر الوحدة",
                type: "number",
                defaultValue: "0.00",
                min: 0,
                step: 0.01,
              },
              {
                key: "tax_rate",
                label: "نسبة الضريبة (%)",
                type: "number",
                defaultValue: "15.00",
                min: 0,
                max: 100,
                step: 0.01,
              },
            ],
          },
          helpText: "أضف بندًا واحدًا على الأقل قبل الإرسال.",
        },
      ]}
      workflowTimeline={{
        title: "مسار الفاتورة",
        steps: [
          { key: "draft", label: "مسودة", description: "يتم إعداد الفاتورة.", timestampField: "created_at" },
          {
            key: "pending_approval",
            label: "بانتظار الاعتماد",
            description: "تم إرسال الفاتورة للمراجعة.",
            timestampField: "submitted_at",
          },
          {
            key: "issued",
            label: "مُصدرة",
            description: "تم اعتماد الفاتورة وإصدارها.",
            timestampField: "approved_at",
          },
          { key: "partially_paid", label: "مدفوعة جزئيًا", description: "تم تحصيل جزء من قيمة الفاتورة." },
          { key: "paid", label: "مدفوعة بالكامل", description: "تم تحصيل كامل قيمة الفاتورة." },
          { key: "rejected", label: "مرفوضة", description: "تم رفض الفاتورة.", timestampField: "rejected_at" },
          { key: "cancelled", label: "ملغاة", description: "تم إلغاء الفاتورة." },
        ],
      }}
      actions={[
        { label: "إرسال", action: "submit", variant: "default" },
        { label: "اعتماد", action: "approve", variant: "success" },
        { label: "رفض", action: "reject", variant: "danger", needsReason: true },
      ]}
    />
  );
}
