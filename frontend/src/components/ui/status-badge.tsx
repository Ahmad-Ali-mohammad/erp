import clsx from "clsx";

const statusStyles: Record<string, string> = {
  draft: "status-neutral",
  pending_approval: "status-warning",
  approved: "status-success",
  rejected: "status-danger",
  cancelled: "status-danger",
  completed: "status-success",
  active: "status-info",
  sent: "status-info",
  received: "status-success",
  partially_received: "status-warning",
  issued: "status-info",
  partially_paid: "status-warning",
  paid: "status-success",
  invoiced: "status-info",
  confirmed: "status-success",
  failed: "status-danger",
  posted: "status-success",
  reversed: "status-warning",
  planning: "status-neutral",
  on_hold: "status-warning",
  ordered: "status-info",
  pending: "status-warning",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد",
  rejected: "مرفوض",
  cancelled: "ملغي",
  completed: "مكتمل",
  active: "نشط",
  sent: "مرسل",
  received: "مستلم",
  partially_received: "استلام جزئي",
  issued: "مُصدرة",
  partially_paid: "مدفوعة جزئياً",
  paid: "مدفوعة بالكامل",
  invoiced: "مفوتر",
  confirmed: "مؤكد",
  failed: "فشل",
  posted: "مرحل",
  reversed: "معكوس",
  planning: "تخطيط",
  on_hold: "متوقف مؤقتاً",
  ordered: "تم الطلب",
  pending: "قيد الانتظار",
};

function normalizeLabel(value: string) {
  if (statusLabels[value]) {
    return statusLabels[value];
  }
  return value
    .replaceAll("_", " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <span className="status-badge status-neutral">غير محدد</span>;
  }
  return (
    <span className={clsx("status-badge", statusStyles[status] ?? "status-neutral")}>
      {normalizeLabel(status)}
    </span>
  );
}
