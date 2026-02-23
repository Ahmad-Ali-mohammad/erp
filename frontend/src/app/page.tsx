import Link from "next/link";

import { getHealthStatus } from "@/lib/api";

const moduleHighlights = [
  "إدارة المشاريع، المراحل، BOQ، Cost Codes، Budget/Cost Records",
  "دورة أوامر التغيير: Draft -> Submit -> Approve/Reject",
  "المشتريات: PR/PO مع Send/Receive/Cancel وتزامن الالتزامات",
  "المالية: Invoices/Payments مع workflows واعتماد متعدد",
  "Progress Billing + Generate Invoice + Revenue Recognition",
  "ضبط صلاحيات ودعم سجل التدقيق والتكامل مع JWT",
];

export default async function LandingPage() {
  const health = await getHealthStatus();

  return (
    <div className="landing-root">
      <section className="landing-grid">
        <article className="panel hero-panel">
          <p className="hero-eyebrow">Project-Based ERP</p>
          <h1 className="hero-title">منصة محاسبة ومشاريع متخصصة لشركات المقاولات</h1>
          <p className="hero-desc">
            واجهة تشغيل احترافية تربط كل ما تم بناؤه في الباك إند: المشاريع، التكاليف، المشتريات،
            الفواتير، المستخلصات، والاعتراف بالإيراد.
          </p>

          <div className="hero-actions">
            <Link className="btn btn-primary" href="/login">
              دخول النظام
            </Link>
            <Link className="btn btn-outline" href="/dashboard">
              فتح لوحة التحكم
            </Link>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <p className="metric-label">Backend Status</p>
              <p className="metric-value">{health?.status ?? "unreachable"}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Service</p>
              <p className="metric-value">{health?.service ?? "n/a"}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Time</p>
              <p className="metric-value">{health?.timestamp ? "Live" : "Unknown"}</p>
            </div>
          </div>
        </article>

        <aside className="panel">
          <h2 style={{ marginTop: 0 }}>الوحدات المفعلة حالياً</h2>
          <ul style={{ margin: "0.8rem 0 0", padding: "0 1rem 0 0", display: "grid", gap: "0.55rem" }}>
            {moduleHighlights.map((item) => (
              <li key={item} style={{ color: "var(--text-soft)" }}>
                {item}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: "0.9rem", color: "var(--text-soft)" }}>
            الانتقال إلى لوحة التحكم يفتح شاشات التشغيل المتصلة فعلياً بالـ API.
          </p>
        </aside>
      </section>
    </div>
  );
}
