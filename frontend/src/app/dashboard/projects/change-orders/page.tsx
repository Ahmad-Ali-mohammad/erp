"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency } from "@/lib/format";
import type { ChangeOrder } from "@/lib/entities";

export default function ChangeOrdersPage() {
  return (
    <ResourceCrudPage<ChangeOrder>
      title="أوامر التغيير"
      description="متابعة دورة التعديل على العقد والميزانية من المسودة حتى الاعتماد."
      resourcePath="/v1/projects/change-orders/"
      searchPlaceholder="ابحث برقم أمر التغيير أو عنوانه"
      columns={[
        { key: "order_number", title: "رقم الأمر" },
        { key: "title", title: "العنوان" },
        { key: "project", title: "المشروع" },
        {
          key: "total_contract_value_delta",
          title: "تغير العقد",
          render: (row) => formatCurrency(row.total_contract_value_delta),
        },
        {
          key: "total_budget_delta",
          title: "تغير الميزانية",
          render: (row) => formatCurrency(row.total_budget_delta),
        },
      ]}
      fields={[
        {
          name: "project",
          label: "معرّف المشروع",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/projects/projects/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "order_number", label: "رقم أمر التغيير", type: "text", required: true, placeholder: "CO-001" },
        { name: "title", label: "العنوان", type: "text", required: true, placeholder: "Extra Works" },
        { name: "description", label: "الوصف", type: "textarea" },
        {
          name: "lines",
          label: "بنود التغيير (JSON)",
          type: "json",
          defaultValue: "[\n  {\n    \"cost_code\": 1,\n    \"description\": \"Extra scope\",\n    \"contract_value_delta\": \"1000.00\",\n    \"budget_delta\": \"500.00\"\n  }\n]",
          jsonEditor: {
            itemLabel: "Line",
            addLabel: "Add Line",
            minItems: 1,
            columns: [
              {
                key: "cost_code",
                label: "Cost Code",
                type: "select",
                dynamicOptions: {
                  resourcePath: "/v1/projects/cost-codes/",
                  valueField: "id",
                  labelFields: ["code", "name"],
                  ordering: "code",
                  dependsOnForm: { project: "project" },
                },
              },
              { key: "description", label: "Description", type: "text", required: true },
              { key: "contract_value_delta", label: "Contract Delta", type: "number", defaultValue: "0.00", step: 0.01 },
              { key: "budget_delta", label: "Budget Delta", type: "number", defaultValue: "0.00", step: 0.01 },
            ],
          },
          helpText: "مطلوب عند الإرسال للاعتماد. أدخل مصفوفة lines بنفس صيغة API.",
        },
      ]}
      workflowTimeline={{
        title: "Change Order Workflow",
        steps: [
          { key: "draft", label: "Draft", description: "Change request is editable.", timestampField: "created_at" },
          {
            key: "pending_approval",
            label: "Pending Approval",
            description: "Submitted for commercial and technical review.",
            timestampField: "submitted_at",
          },
          {
            key: "approved",
            label: "Approved",
            description: "Approved and applied to project budget/contract.",
            timestampField: "approved_at",
          },
          {
            key: "rejected",
            label: "Rejected",
            description: "Rejected after review.",
            timestampField: "rejected_at",
          },
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


