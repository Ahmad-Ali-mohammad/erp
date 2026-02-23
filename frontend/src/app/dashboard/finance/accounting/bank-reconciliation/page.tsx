"use client";

import Link from "next/link";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatCurrency, formatDate } from "@/lib/format";
import type { BankStatement } from "@/lib/entities";

export default function BankReconciliationPage() {
  return (
    <ResourceCrudPage<BankStatement>
      title="التسويات البنكية"
      description="إدارة كشوف الحساب البنكي ومطابقتها مع سجلات الشركة بشكل دوري."
      resourcePath="/v1/finance/bank-statements/"
      searchPlaceholder="ابحث بكشف البنك أو بالتاريخ"
      columns={[
        { key: "bank_account", title: "الحساب البنكي" },
        { key: "statement_date", title: "التاريخ", render: (row) => formatDate(row.statement_date) },
        { key: "opening_balance", title: "رصيد أول المدة", render: (row) => formatCurrency(row.opening_balance) },
        { key: "closing_balance", title: "رصيد آخر المدة", render: (row) => formatCurrency(row.closing_balance) },
        { key: "status", title: "الحالة" },
        {
          key: "print",
          title: "",
          render: (row) => (
            <Link className="btn btn-outline" href={`/dashboard/finance/printouts/bank-statements/${row.id}`} target="_blank">
              طباعة
            </Link>
          ),
        },
      ]}
      fields={[
        {
          name: "bank_account",
          label: "الحساب البنكي",
          type: "select",
          required: true,
          dynamicOptions: {
            resourcePath: "/v1/finance/bank-accounts/",
            valueField: "id",
            labelFields: ["code", "name"],
            ordering: "code",
          },
        },
        { name: "statement_date", label: "تاريخ الكشف", type: "date", required: true },
        { name: "opening_balance", label: "رصيد أول المدة", type: "number", required: true },
        { name: "closing_balance", label: "رصيد آخر المدة", type: "number", required: true },
        {
          name: "status",
          label: "الحالة",
          type: "select",
          options: [
            { label: "مسودة", value: "draft" },
            { label: "مستوردة", value: "imported" },
            { label: "مُسواة", value: "reconciled" },
          ],
          defaultValue: "draft",
        },
        { name: "notes", label: "ملاحظات", type: "textarea" },
        {
          name: "lines",
          label: "سطور كشف البنك",
          type: "json",
          defaultValue:
            "[\n  {\n    \"line_date\": \"2026-01-01\",\n    \"description\": \"رسوم بنكية\",\n    \"reference\": \"BANK-FEE\",\n    \"amount\": \"-5.00\"\n  }\n]",
          jsonEditor: {
            itemLabel: "سطر",
            addLabel: "إضافة سطر",
            columns: [
              { key: "line_date", label: "التاريخ", type: "date", required: true },
              { key: "description", label: "الوصف", type: "text" },
              { key: "reference", label: "المرجع", type: "text" },
              { key: "amount", label: "المبلغ", type: "number", required: true, defaultValue: "0.00", step: 0.01 },
            ],
          },
        },
      ]}
      actions={[]}
      statusOptions={[
        { label: "الكل", value: "" },
        { label: "مسودة", value: "draft" },
        { label: "مستوردة", value: "imported" },
        { label: "مُسواة", value: "reconciled" },
      ]}
    />
  );
}
