"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ApiError, listResource } from "@/lib/api-client";

type ProjectSummary = {
  id: number;
  code: string;
  name: string;
};

export default function ProjectDetailsShortcutPage() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["projects-details-shortcut"],
    queryFn: () =>
      listResource<ProjectSummary>("/v1/projects/projects/", {
        ordering: "code",
      }),
  });

  const firstProject = query.data?.results?.[0];

  useEffect(() => {
    if (firstProject) {
      router.replace(`/dashboard/projects/${firstProject.id}`);
    }
  }, [firstProject, router]);

  const errorMessage =
    query.error instanceof ApiError
      ? query.error.message
      : query.error instanceof Error
        ? query.error.message
        : "";

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>تفاصيل المشروع</h3>
          <p>اختيار أول مشروع متاح وتحويلك مباشرة إلى شاشة التفاصيل.</p>
        </div>
      </header>

      {query.isLoading ? <p>جاري تحميل المشاريع...</p> : null}
      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
      {firstProject ? <p>جاري التحويل إلى {firstProject.code} - {firstProject.name}...</p> : null}

      {!query.isLoading && !errorMessage && !firstProject ? (
        <div className="panel">
          <p>لا توجد مشاريع حالياً. أنشئ مشروعاً أولاً ثم افتح صفحة التفاصيل.</p>
          <Link href="/dashboard/projects" className="btn btn-outline">
            الانتقال إلى قائمة المشاريع
          </Link>
        </div>
      ) : null}
    </section>
  );
}
