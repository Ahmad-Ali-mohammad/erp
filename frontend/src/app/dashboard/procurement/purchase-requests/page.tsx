"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatDate } from "@/lib/format";
import type { PurchaseRequest } from "@/lib/entities";

export default function PurchaseRequestsPage() {
  return (
    <ResourceCrudPage<PurchaseRequest>
      title="طلبات الشراء"
      description="دورة طلب الشراء من المسودة حتى الاعتماد/الرفض."
      resourcePath="/v1/procurement/purchase-requests/"
      searchPlaceholder="ابحث برقم الطلب أو كود المشروع"
      columns={[
        { key: "request_number", title: "رقم الطلب" },
        { key: "project", title: "المشروع" },
        { key: "needed_by", title: "تاريخ الاحتياج", render: (row) => formatDate(row.needed_by) },
        { key: "created_at", title: "تاريخ الإنشاء", render: (row) => formatDate(row.created_at) },
      ]}
      fields={[
        { name: "request_number", label: "رقم الطلب", type: "text", required: true, placeholder: "PR-001" },
        {
          name: "project",
          label: "معرّف المشروع",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/projects/projects/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "needed_by", label: "تاريخ الاحتياج", type: "date" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
        {
          name: "items",
          label: "بنود الطلب (JSON)",
          type: "json",
          defaultValue:
            "[\n  {\n    \"material\": 1,\n    \"description\": \"Required material\",\n    \"quantity\": \"5.000\",\n    \"estimated_unit_cost\": \"20.00\"\n  }\n]",
          jsonEditor: {
            itemLabel: "Item",
            addLabel: "Add Item",
            minItems: 1,
            columns: [
              {
                key: "material",
                label: "Material",
                type: "select",
                dynamicOptions: {
                  resourcePath: "/v1/procurement/materials/",
                  valueField: "id",
                  labelFields: ["sku", "name"],
                  ordering: "sku",
                },
              },
              { key: "description", label: "Description", type: "text", required: true },
              {
                key: "quantity",
                label: "Quantity",
                type: "number",
                required: true,
                defaultValue: "1.000",
                min: 0.001,
                step: 0.001,
              },
              {
                key: "estimated_unit_cost",
                label: "Estimated Unit Cost",
                type: "number",
                defaultValue: "0.00",
                min: 0,
                step: 0.01,
              },
            ],
          },
          helpText: "مطلوب قبل إرسال الطلب. أدخل مصفوفة العناصر بنفس صيغة API.",
        },
      ]}
      workflowTimeline={{
        title: "Request Workflow",
        steps: [
          { key: "draft", label: "Draft", description: "Request is still editable.", timestampField: "created_at" },
          {
            key: "pending_approval",
            label: "Pending Approval",
            description: "Request submitted for review.",
            timestampField: "submitted_at",
          },
          {
            key: "approved",
            label: "Approved",
            description: "Request approved and ready for procurement.",
            timestampField: "approved_at",
          },
          {
            key: "rejected",
            label: "Rejected",
            description: "Request was rejected and returned.",
            timestampField: "rejected_at",
          },
          {
            key: "ordered",
            label: "Ordered",
            description: "Converted into purchase order.",
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


