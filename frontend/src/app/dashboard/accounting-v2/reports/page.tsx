"use client";

import { useQuery } from "@tanstack/react-query";

import { request } from "@/lib/api-client";

type ReportDefinition = {
  title: string;
  endpoint: string;
  description: string;
  readingGuide: string[];
  emptyHint?: string;
};

const reportDefinitions: ReportDefinition[] = [
  {
    title: "ميزان المراجعة",
    endpoint: "/v2/reports/trial-balance/",
    description: "يعرض أرصدة الحسابات بعد الترحيل للتحقق من توازن النظام المحاسبي.",
    readingGuide: [
      "قارن totals.debit مع totals.credit؛ يجب أن يكونا متساويين.",
      "is_balanced = true تعني أن القيود متوازنة.",
      "rows تعرض تفصيل كل حساب (إن وجدت حركات).",
    ],
    emptyHint: "إذا كانت rows فارغة فهذا يعني عدم وجود قيود مرحلة ضمن الفترة المحددة.",
  },
  {
    title: "قائمة الدخل",
    endpoint: "/v2/reports/income-statement/",
    description: "توضح الإيرادات والمصروفات وصافي الربح أو الخسارة للفترة.",
    readingGuide: [
      "total_revenue = إجمالي الإيرادات.",
      "total_expense = إجمالي المصروفات.",
      "net_profit_or_loss = صافي النتيجة المالية للفترة.",
    ],
  },
  {
    title: "الميزانية العمومية",
    endpoint: "/v2/reports/balance-sheet/",
    description: "تعرض المركز المالي: الأصول والخصوم وحقوق الملكية.",
    readingGuide: [
      "assets = إجمالي الأصول.",
      "liabilities = إجمالي الخصوم.",
      "equity = إجمالي حقوق الملكية.",
      "equation_gap يجب أن يكون 0، و is_balanced = true.",
    ],
  },
  {
    title: "أعمار الذمم المدينة",
    endpoint: "/v2/reports/ar-aging/",
    description: "تحليل فواتير العملاء غير المسددة حسب العمر الزمني.",
    readingGuide: [
      "buckets تقسم الأرصدة إلى شرائح أيام (0-30، 31-60، ...).",
      "ارتفاع الشرائح القديمة يدل على تأخر التحصيل.",
      "rows تعرض تفاصيل العملاء/الفواتير عند توفر البيانات.",
    ],
    emptyHint: "عند عدم وجود rows أو قيم buckets، غالبًا لا توجد فواتير عملاء آجلة مفتوحة.",
  },
  {
    title: "أعمار الذمم الدائنة",
    endpoint: "/v2/reports/ap-aging/",
    description: "تحليل فواتير الموردين غير المسددة حسب العمر الزمني.",
    readingGuide: [
      "buckets تعرض الالتزامات حسب مدة الاستحقاق.",
      "تساعد على ترتيب أولويات السداد وإدارة السيولة.",
      "rows تعرض تفاصيل الموردين/الفواتير عند توفر البيانات.",
    ],
    emptyHint: "عند عدم وجود rows أو قيم buckets، غالبًا لا توجد فواتير موردين آجلة مفتوحة.",
  },
  {
    title: "ربحية العملاء",
    endpoint: "/v2/reports/profitability/customers/",
    description: "قياس ربحية كل عميل بناءً على المبيعات وتكلفة المبيعات.",
    readingGuide: [
      "rows تعرض صافي الربح والهامش لكل عميل.",
      "تستخدم لتحديد العملاء الأعلى مساهمة في الربح.",
    ],
    emptyHint: "rows فارغة تعني عدم توفر بيانات مبيعات مرحلة كافية للتحليل.",
  },
  {
    title: "ربحية الأصناف",
    endpoint: "/v2/reports/profitability/items/",
    description: "قياس ربحية كل صنف حسب الإيراد والتكلفة.",
    readingGuide: [
      "rows تعرض أداء كل صنف بشكل منفصل.",
      "تفيد في تحسين التسعير واتخاذ قرارات الشراء.",
    ],
    emptyHint: "rows فارغة تعني عدم توفر بيانات مبيعات/تكلفة مرحلة للأصناف.",
  },
  {
    title: "ربحية مراكز التكلفة",
    endpoint: "/v2/reports/profitability/cost-centers/",
    description: "قياس الأداء المالي لكل مركز تكلفة (فرع/مشروع/إدارة).",
    readingGuide: [
      "rows تعرض الإيراد والتكلفة والنتيجة لكل مركز تكلفة.",
      "تفيد في تقييم الوحدات الأعلى كفاءة أو الأعلى عبئًا.",
    ],
    emptyHint: "rows فارغة تعني عدم ربط العمليات بمراكز تكلفة أو عدم وجود بيانات مرحلة كافية.",
  },
];

function ReportCard({ definition }: { definition: ReportDefinition }) {
  const report = useQuery({
    queryKey: ["v2-report", definition.endpoint],
    queryFn: () => request<Record<string, unknown>>(definition.endpoint),
    staleTime: 60_000,
  });

  return (
    <article className="kpi-card">
      <p className="kpi-label">{definition.title}</p>
      <p style={{ marginTop: "0.35rem", color: "var(--text-soft)", lineHeight: 1.7 }}>{definition.description}</p>

      <div style={{ marginTop: "0.4rem" }}>
        <strong style={{ fontSize: "0.86rem" }}>كيف تقرأ هذا التقرير؟</strong>
        <ul style={{ margin: "0.35rem 0 0", paddingInlineStart: "1rem" }}>
          {definition.readingGuide.map((point) => (
            <li key={point} style={{ marginBottom: "0.2rem", color: "var(--text-soft)" }}>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {definition.emptyHint ? (
        <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--text-soft)" }}>{definition.emptyHint}</p>
      ) : null}

      {report.isLoading ? <p style={{ marginTop: "0.5rem" }}>جاري التحميل...</p> : null}
      {report.isError ? <p className="error-banner">تعذر تحميل التقرير.</p> : null}
      {report.data ? (
        <pre style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.78rem" }}>
          {JSON.stringify(report.data, null, 2)}
        </pre>
      ) : null}
    </article>
  );
}

export default function AccountingV2ReportsPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>التقارير</h3>
          <p>تقارير مالية وتشغيلية أساسية مبنية على القيود المرحلة في المحاسبة v2.</p>
        </div>
      </header>

      <div className="guide-card" style={{ marginTop: "0.8rem" }}>
        <h4>قبل قراءة النتائج</h4>
        <ol style={{ margin: 0, paddingInlineStart: "1rem" }}>
          <li>تأكد من ترحيل المعاملات خلال الفترة المطلوبة.</li>
          <li>تحقق من الفلاتر الزمنية أو المرجعية إن وجدت.</li>
          <li>ابدأ بميزان المراجعة ثم انتقل لباقي التقارير.</li>
        </ol>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.8rem" }}>
        {reportDefinitions.map((definition) => (
          <ReportCard key={definition.endpoint} definition={definition} />
        ))}
      </div>
    </section>
  );
}
