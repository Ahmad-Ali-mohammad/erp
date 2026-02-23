import Link from "next/link";
import { notFound } from "next/navigation";

import { financeGuideTopics, getFinanceGuide } from "@/lib/finance-guides";

type GuidePageProps = {
  params: Promise<{ topic: string }>;
};

function GuideList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="guide-card">
      <h4>{title}</h4>
      <ol>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </article>
  );
}

export default async function FinanceGuideTopicPage({ params }: GuidePageProps) {
  const { topic } = await params;
  const guide = getFinanceGuide(topic);
  if (!guide) {
    notFound();
  }

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>{guide.title}</h3>
          <p>{guide.purpose}</p>
        </div>
      </header>

      <div className="hero-actions" style={{ marginTop: "0.8rem" }}>
        {financeGuideTopics.map((guideTopic) => (
          <Link
            key={guideTopic.topic}
            href={guideTopic.href}
            className={`btn ${guideTopic.topic === guide.topic ? "btn-primary" : "btn-outline"}`}
          >
            {guideTopic.label}
          </Link>
        ))}
      </div>

      <article className="guide-card" style={{ marginTop: "0.8rem" }}>
        <h4>متى أستخدم هذا القسم؟</h4>
        <p style={{ margin: 0, color: "var(--text-soft)", lineHeight: 1.7 }}>{guide.when_to_use}</p>
      </article>

      <div className="guide-sections" style={{ marginTop: "0.8rem" }}>
        <GuideList title="أهم الإجراءات (بالترتيب)" items={guide.priority_actions} />
        <GuideList title="سير العمل" items={guide.workflow_steps} />
        <GuideList title="كيفية الإضافة" items={guide.create_steps} />
        <GuideList title="كيفية التعديل" items={guide.update_steps} />
        <GuideList title="كيفية الحذف" items={guide.delete_steps} />
        <GuideList title="ضوابط التحقق قبل الحفظ" items={guide.validation_rules} />
        <GuideList title="أخطاء شائعة" items={guide.common_errors} />
        <GuideList title="أفضل الممارسات" items={guide.best_practices} />
      </div>
    </section>
  );
}
