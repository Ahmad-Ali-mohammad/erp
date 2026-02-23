"use client";

import { ResourceTablePage } from "@/components/resource/resource-table-page";
import { formatDate } from "@/lib/format";
import type { AuditLog } from "@/lib/entities";

export default function AuditLogsPage() {
  return (
    <ResourceTablePage<AuditLog>
      title="سجل التدقيق"
      description="متابعة عمليات الإنشاء والتعديل والحذف على مستوى النظام."
      resourcePath="/v1/core/audit-logs/"
      searchPlaceholder="ابحث بالنموذج أو معرّف الكائن"
      columns={[
        { key: "action", title: "الإجراء" },
        { key: "model_name", title: "النموذج" },
        { key: "object_id", title: "المعرّف" },
        { key: "created_at", title: "التاريخ", render: (row) => formatDate(row.created_at) },
      ]}
      actions={[]}
      showStatus={false}
      statusOptions={[{ label: "الكل", value: "" }]}
    />
  );
}

