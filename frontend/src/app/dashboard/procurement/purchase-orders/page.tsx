"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PurchaseOrder } from "@/lib/entities";

function parseQuantityValue(rawValue: unknown): number {
  const parsed = Number.parseFloat(String(rawValue ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQuantityValue(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export default function PurchaseOrdersPage() {
  return (
    <ResourceCrudPage<PurchaseOrder>
      title="أوامر الشراء"
      description="متابعة الإرسال والاستلام والإلغاء مع قيود الالتزامات."
      resourcePath="/v1/procurement/purchase-orders/"
      searchPlaceholder="ابحث برقم أمر الشراء أو المشروع أو المورد"
      columns={[
        { key: "order_number", title: "رقم الأمر" },
        { key: "project", title: "المشروع" },
        { key: "supplier", title: "المورد" },
        { key: "order_date", title: "تاريخ الأمر", render: (row) => formatDate(row.order_date) },
        { key: "total_amount", title: "الإجمالي", render: (row) => formatCurrency(row.total_amount) },
      ]}
      fields={[
        { name: "order_number", label: "رقم أمر الشراء", type: "text", required: true, placeholder: "PO-001" },
        {
          name: "purchase_request",
          label: "معرّف طلب الشراء",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/procurement/purchase-requests/",
            valueField: "id",
            labelFields: ["request_number"],
            ordering: "-created_at",
            dependsOn: { project: "project" },
            requireDependsOn: false,
          },
        },
        {
          name: "supplier",
          label: "معرّف المورد",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/procurement/suppliers/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
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
        {
          name: "cost_code",
          label: "معرّف كود التكلفة",
          type: "select",
          dynamicOptions: {
            resourcePath: "/v1/projects/cost-codes/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
            dependsOn: { project: "project" },
          },
        },
        { name: "order_date", label: "تاريخ الأمر", type: "date", required: true },
        { name: "expected_date", label: "تاريخ التوريد المتوقع", type: "date" },
        { name: "currency", label: "العملة", type: "text", defaultValue: "SAR" },
        {
          name: "items",
          label: "عناصر أمر الشراء (JSON)",
          type: "json",
          defaultValue:
            "[\n  {\n    \"material\": 1,\n    \"description\": \"Material\",\n    \"quantity\": \"5.000\",\n    \"unit_cost\": \"20.00\"\n  }\n]",
          jsonEditor: {
            itemLabel: "Item",
            addLabel: "Add Item",
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
                key: "unit_cost",
                label: "Unit Cost",
                type: "number",
                defaultValue: "0.00",
                min: 0,
                step: 0.01,
              },
            ],
          },
          helpText: "مطلوب قبل إرسال أمر الشراء. أدخل مصفوفة items بنفس صيغة API.",
        },
      ]}
      workflowTimeline={{
        title: "Purchase Order Workflow",
        steps: [
          { key: "draft", label: "Draft", description: "Order is editable before sending.", timestampField: "created_at" },
          { key: "sent", label: "Sent", description: "Order sent to supplier." },
          {
            key: "partially_received",
            label: "Partially Received",
            description: "Part of ordered quantities was received.",
          },
          { key: "received", label: "Received", description: "All order lines fully received." },
          { key: "cancelled", label: "Cancelled", description: "Order was cancelled." },
        ],
      }}
      actions={[
        { label: "إرسال", action: "send", variant: "default" },
        {
          label: "استلام",
          action: "receive",
          variant: "success",
          dialog: (rawRow) => {
            const row = rawRow as unknown as PurchaseOrder;
            const items = Array.isArray(row.items) ? row.items : [];
            return {
              title: "Receive Purchase Order Items",
              description: "Enter received quantity for each line. Leave empty or zero to skip that line.",
              confirmLabel: "Receive",
              fields: items.map((item) => {
                const ordered = parseQuantityValue(item.quantity);
                const received = parseQuantityValue(item.received_quantity);
                const remaining = Math.max(ordered - received, 0);
                return {
                  name: `receive_${item.id}`,
                  label: `Item #${item.id} (Remaining ${formatQuantityValue(remaining)})`,
                  type: "number",
                  min: 0,
                  max: remaining,
                  step: 0.001,
                  placeholder: "0.000",
                };
              }),
            };
          },
          payloadBuilder: (rawRow, dialogPayload) => {
            const row = rawRow as unknown as PurchaseOrder;
            const items = Array.isArray(row.items) ? row.items : [];
            if (items.length === 0) {
              throw new Error("This purchase order has no lines to receive.");
            }
            const payloadValues = dialogPayload ?? {};
            const receiptLines: Array<{ item_id: number; quantity: string }> = [];

            items.forEach((item) => {
              const ordered = parseQuantityValue(item.quantity);
              const received = parseQuantityValue(item.received_quantity);
              const remaining = Math.max(ordered - received, 0);
              const valueKey = `receive_${item.id}`;
              const receiveQuantity = parseQuantityValue(payloadValues[valueKey]);
              if (receiveQuantity <= 0) {
                return;
              }
              if (receiveQuantity > remaining) {
                throw new Error(`Quantity for item #${item.id} exceeds remaining amount (${formatQuantityValue(remaining)}).`);
              }
              receiptLines.push({
                item_id: item.id,
                quantity: receiveQuantity.toFixed(3),
              });
            });

            if (receiptLines.length === 0) {
              throw new Error("Enter at least one received quantity greater than zero.");
            }

            return { items: receiptLines };
          },
        },
        { label: "إلغاء", action: "cancel", variant: "danger" },
      ]}
    />
  );
}





