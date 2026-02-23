import Link from "next/link";

export default function AccountingV2GlPage() {
  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>الأستاذ العام</h3>
          <p>إدارة القيود اليومية اليدوية وضوابط الترحيل والمراجعة.</p>
        </div>
      </header>
      <div>
        <Link href="/dashboard/accounting-v2/gl/journal-entries" className="btn btn-outline">
          فتح القيود اليومية
        </Link>
      </div>
    </section>
  );
}
