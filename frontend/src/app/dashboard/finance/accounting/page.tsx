import Link from "next/link";

export default function AccountingIndexPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>نظرة عامة عن المحاسبة</h3>
          <p>ابدأ من القيد الفردي ثم راجع التوازن والترحيل قبل الانتقال للتقارير والإقفال.</p>
        </div>
      </header>

      <section className="priority-grid" style={{ marginTop: "0.8rem" }}>
        <article className="priority-card">
          <div className="priority-chip tier-primary">كيف تبدأ</div>
          <p>أنشئ قيدًا يوميًا متوازنًا (مدين = دائن) مع وصف واضح وربط بالمصدر إن وجد.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/dashboard/accounting-v2/gl/journal-entries">
              إضافة قيد فردي (v2)
            </Link>
            <Link className="btn btn-outline" href="/dashboard/finance/journal-entries">
              القيود اليومية (v1)
            </Link>
          </div>
        </article>

        <article className="priority-card">
          <div className="priority-chip tier-primary">نقاط الضبط</div>
          <p>قبل الاعتماد النهائي تأكد من: التوازن، صلاحية الفترة، وصلاحيات maker-checker.</p>
          <div className="hero-actions">
            <Link className="btn btn-outline" href="/dashboard/finance/accounting/trial-balance">
              مراجعة التوازن
            </Link>
            <Link className="btn btn-outline" href="/dashboard/finance/accounting/period-close">
              إدارة الإقفال
            </Link>
          </div>
        </article>

        <article className="priority-card">
          <div className="priority-chip tier-primary">المخرجات</div>
          <p>بعد الترحيل، انتقل إلى قائمة الدخل والميزانية العمومية لتقييم الأداء والمركز المالي.</p>
          <div className="hero-actions">
            <Link className="btn btn-outline" href="/dashboard/finance/accounting/income-statement">
              قائمة الدخل
            </Link>
            <Link className="btn btn-outline" href="/dashboard/finance/accounting/balance-sheet">
              الميزانية العمومية
            </Link>
          </div>
        </article>
      </section>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        <Link className="btn btn-outline" href="/dashboard/finance/guides/accounting">
          تعليمات الاستخدام
        </Link>
      </div>
    </section>
  );
}
