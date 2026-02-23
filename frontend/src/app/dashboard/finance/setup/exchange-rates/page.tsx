"use client";

import { ResourceCrudPage } from "@/components/resource/resource-crud-page";
import { formatDate } from "@/lib/format";
import type { ExchangeRate } from "@/lib/entities";

export default function ExchangeRatesPage() {
  return (
    <ResourceCrudPage<ExchangeRate>
      title="أسعار الصرف"
      description="إدارة أسعار الصرف اليومية للعمليات بعملة USD وربطها بدفتر الأساس KWD."
      resourcePath="/v1/finance/exchange-rates/"
      searchPlaceholder="ابحث بالعملة أو التاريخ"
      columns={[
        { key: "from_currency", title: "من" },
        { key: "to_currency", title: "إلى" },
        { key: "rate_date", title: "التاريخ", render: (row) => formatDate(row.rate_date) },
        { key: "rate", title: "سعر الصرف" },
      ]}
      fields={[
        { name: "from_currency", label: "من عملة", type: "text", required: true, defaultValue: "USD" },
        { name: "to_currency", label: "إلى عملة", type: "text", required: true, defaultValue: "KWD" },
        { name: "rate_date", label: "تاريخ السعر", type: "date", required: true },
        { name: "rate", label: "سعر الصرف", type: "number", required: true, defaultValue: "1.00000000" },
        { name: "notes", label: "ملاحظات", type: "textarea" },
      ]}
      actions={[]}
      showStatus={false}
    />
  );
}
