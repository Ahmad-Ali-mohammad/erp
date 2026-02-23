"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { StatusBadge } from "@/components/ui/status-badge";
import { WorkflowTimeline, type WorkflowTimelineStep } from "@/components/ui/workflow-timeline";
import { ApiError, request } from "@/lib/api-client";
import type { ChangeOrder, CostRecord, ProjectPhase } from "@/lib/entities";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { PaginatedResponse } from "@/lib/types";

type ProjectDetails = {
  id: number;
  code: string;
  name: string;
  client_name: string;
  description: string;
  status: string;
  contract_value: string;
  budget: string;
  currency: string;
  start_date: string | null;
  expected_end_date: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectCostSummaryLine = {
  cost_code_id: number;
  cost_code: string;
  cost_code_name: string;
  budget: string;
  commitments: string;
  actual: string;
  available: string;
  variance: string;
};

type ProjectCostSummary = {
  project_id: number;
  project_code: string;
  totals: {
    budget: string;
    commitments: string;
    actual: string;
    available: string;
    variance: string;
  };
  lines: ProjectCostSummaryLine[];
};

type DetailTab = "overview" | "cost_summary" | "activity";

const projectStatusToWorkflowStep: Record<string, string> = {
  planning: "planning",
  active: "execution",
  on_hold: "execution",
  completed: "completed",
  cancelled: "cancelled",
};

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "نظرة عامة" },
  { id: "cost_summary", label: "ملخص التكاليف" },
  { id: "activity", label: "آخر الحركات" },
];

function buildPath(path: string, params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

async function fetchList<T>(path: string) {
  const response = await request<PaginatedResponse<T>>(path);
  return response.results ?? [];
}

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const projectId = typeof params.id === "string" ? params.id : "";

  const projectQuery = useQuery({
    queryKey: ["project-details", projectId],
    enabled: Boolean(projectId),
    queryFn: () => request<ProjectDetails>(`/v1/projects/projects/${projectId}/`),
  });

  const costSummaryQuery = useQuery({
    queryKey: ["project-cost-summary", projectId],
    enabled: Boolean(projectId),
    queryFn: () => request<ProjectCostSummary>(`/v1/projects/projects/${projectId}/cost-summary/`),
  });

  const phasesQuery = useQuery({
    queryKey: ["project-phases", projectId],
    enabled: Boolean(projectId),
    queryFn: () =>
      fetchList<ProjectPhase>(
        buildPath("/v1/projects/phases/", {
          project: projectId,
          ordering: "sequence",
          page_size: 200,
        }),
      ),
  });

  const costRecordsQuery = useQuery({
    queryKey: ["project-cost-records", projectId],
    enabled: Boolean(projectId),
    queryFn: () =>
      fetchList<CostRecord>(
        buildPath("/v1/projects/cost-records/", {
          project: projectId,
          ordering: "-record_date",
          page_size: 10,
        }),
      ),
  });

  const changeOrdersQuery = useQuery({
    queryKey: ["project-change-orders", projectId],
    enabled: Boolean(projectId),
    queryFn: () =>
      fetchList<ChangeOrder>(
        buildPath("/v1/projects/change-orders/", {
          project: projectId,
          ordering: "-created_at",
          page_size: 10,
        }),
      ),
  });

  if (!projectId) {
    return <p className="error-banner">معرّف المشروع غير صالح.</p>;
  }

  const projectError = projectQuery.error instanceof ApiError ? projectQuery.error.message : "";
  const summaryError = costSummaryQuery.error instanceof ApiError ? costSummaryQuery.error.message : "";
  const activityError =
    costRecordsQuery.error instanceof ApiError
      ? costRecordsQuery.error.message
      : changeOrdersQuery.error instanceof ApiError
        ? changeOrdersQuery.error.message
        : "";

  const project = projectQuery.data;
  const summary = costSummaryQuery.data;
  const phases = phasesQuery.data ?? [];
  const costRecords = costRecordsQuery.data ?? [];
  const changeOrders = changeOrdersQuery.data ?? [];
  const projectWorkflowSteps: WorkflowTimelineStep[] = project
    ? [
        {
          key: "planning",
          label: "التخطيط",
          description: "إعداد المشروع وتجهيز خط الأساس.",
          timestamp: project.created_at,
        },
        {
          key: "execution",
          label: project.status === "on_hold" ? "التنفيذ (متوقف مؤقتاً)" : "التنفيذ",
          description:
            project.status === "on_hold"
              ? "تم إيقاف تنفيذ المشروع مؤقتاً."
              : "تنفيذ المشروع وتتبع التكلفة مستمران.",
          timestamp: project.start_date,
        },
        {
          key: "completed",
          label: "مكتمل",
          description: "تم إغلاق المشروع بعد التسليم والتسوية النهائية.",
          timestamp: project.status === "completed" ? project.closed_at : null,
        },
        {
          key: "cancelled",
          label: "ملغي",
          description: "تم إيقاف المشروع وإغلاقه قبل الاكتمال.",
          timestamp: project.status === "cancelled" ? project.closed_at : null,
        },
      ]
    : [];
  const currentWorkflowStep = project ? projectStatusToWorkflowStep[project.status] : undefined;

  return (
    <section className="resource-section project-details">
      <header className="project-details-head">
        <div className="project-details-title">
          <p className="header-eyebrow">تفاصيل المشروع</p>
          <h3 data-testid="project-details-title">{project ? `${project.code} - ${project.name}` : "جاري التحميل..."}</h3>
          {project ? <p>العميل: {project.client_name}</p> : null}
        </div>
        <div className="action-grid">
          <Link href="/dashboard/projects" className="btn btn-outline">
            رجوع إلى المشاريع
          </Link>
          {project ? <StatusBadge status={project.status} /> : null}
        </div>
      </header>

      {projectError ? <p className="error-banner">{projectError}</p> : null}

      <div className="project-kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">قيمة العقد</p>
          <p className="kpi-value" data-testid="project-kpi-contract-value">
            {project ? formatCurrency(project.contract_value) : "-"}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">ميزانية المشروع</p>
          <p className="kpi-value" data-testid="project-kpi-budget-value">
            {project ? formatCurrency(project.budget) : "-"}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">التكلفة الفعلية</p>
          <p className="kpi-value" data-testid="project-kpi-actual-value">
            {summary ? formatCurrency(summary.totals.actual) : "-"}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">المتاح</p>
          <p className="kpi-value" data-testid="project-kpi-available-value">
            {summary ? formatCurrency(summary.totals.available) : "-"}
          </p>
        </article>
      </div>

      <div className="project-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={clsx("btn", activeTab === tab.id ? "btn-primary" : "btn-outline")}
            data-testid={`project-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="project-overview-grid">
          <article className="panel">
            <h4 className="project-panel-title">بيانات المشروع</h4>
            {project ? (
              <WorkflowTimeline
                title="دورة حياة المشروع"
                steps={projectWorkflowSteps}
                currentStepKey={currentWorkflowStep}
                className="project-workflow"
              />
            ) : null}
            <dl className="project-meta-list">
              <div className="project-meta-item">
                <dt>تاريخ البداية</dt>
                <dd>{project?.start_date ? formatDate(project.start_date) : "-"}</dd>
              </div>
              <div className="project-meta-item">
                <dt>النهاية المتوقعة</dt>
                <dd>{project?.expected_end_date ? formatDate(project.expected_end_date) : "-"}</dd>
              </div>
              <div className="project-meta-item">
                <dt>تاريخ الإغلاق</dt>
                <dd>{project?.closed_at ? formatDate(project.closed_at) : "-"}</dd>
              </div>
              <div className="project-meta-item">
                <dt>آخر تحديث</dt>
                <dd>{project?.updated_at ? formatDate(project.updated_at) : "-"}</dd>
              </div>
            </dl>
            {project?.description ? <p>{project.description}</p> : null}
          </article>

          <article className="panel">
            <h4 className="project-panel-title">مراحل المشروع</h4>
            {phasesQuery.isLoading ? (
              <p>جاري تحميل المراحل...</p>
            ) : phases.length === 0 ? (
              <p>لا توجد مراحل مسجلة.</p>
            ) : (
              <ul className="simple-list">
                {phases.slice(0, 8).map((phase) => (
                  <li key={phase.id}>
                    <span>
                      <strong>{phase.name}</strong>
                      <br />
                      <small>ترتيب #{phase.sequence}</small>
                    </span>
                    <span>{formatNumber(phase.actual_progress)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      ) : null}

      {activeTab === "cost_summary" ? (
        <article className="panel">
          <h4 className="project-panel-title">تكاليف المشروع حسب كود التكلفة</h4>
          {summaryError ? <p className="error-banner">{summaryError}</p> : null}
          {costSummaryQuery.isLoading ? (
            <p>جاري تحميل ملخص التكاليف...</p>
          ) : summary ? (
            <>
              <div className="project-kpi-grid">
                <article className="kpi-card">
                  <p className="kpi-label">الميزانية</p>
                  <p className="kpi-value" data-testid="project-cost-summary-budget">
                    {formatCurrency(summary.totals.budget)}
                  </p>
                </article>
                <article className="kpi-card">
                  <p className="kpi-label">الالتزامات</p>
                  <p className="kpi-value" data-testid="project-cost-summary-commitments">
                    {formatCurrency(summary.totals.commitments)}
                  </p>
                </article>
                <article className="kpi-card">
                  <p className="kpi-label">الفعلي</p>
                  <p className="kpi-value" data-testid="project-cost-summary-actual">
                    {formatCurrency(summary.totals.actual)}
                  </p>
                </article>
                <article className="kpi-card">
                  <p className="kpi-label">الانحراف</p>
                  <p className="kpi-value" data-testid="project-cost-summary-variance">
                    {formatCurrency(summary.totals.variance)}
                  </p>
                </article>
              </div>

              <div className="table-scroll">
                <table className="resource-table">
                  <thead>
                    <tr>
                      <th>كود التكلفة</th>
                      <th>الاسم</th>
                      <th>الميزانية</th>
                      <th>الالتزامات</th>
                      <th>الفعلي</th>
                      <th>المتاح</th>
                      <th>الانحراف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.lines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="table-empty">
                          لا توجد بيانات تكلفة.
                        </td>
                      </tr>
                    ) : (
                      summary.lines.map((line) => (
                        <tr key={line.cost_code_id}>
                          <td>{line.cost_code}</td>
                          <td>{line.cost_code_name}</td>
                          <td>{formatCurrency(line.budget)}</td>
                          <td>{formatCurrency(line.commitments)}</td>
                          <td>{formatCurrency(line.actual)}</td>
                          <td>{formatCurrency(line.available)}</td>
                          <td>{formatCurrency(line.variance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>لا تتوفر بيانات للعرض حالياً.</p>
          )}
        </article>
      ) : null}

      {activeTab === "activity" ? (
        <div className="activity-grid">
          <article className="panel">
            <h4 className="project-panel-title">آخر سجلات التكلفة</h4>
            {costRecordsQuery.isLoading ? (
              <p>جاري التحميل...</p>
            ) : costRecords.length === 0 ? (
              <p>لا توجد سجلات تكلفة.</p>
            ) : (
              <div className="table-scroll">
                <table className="resource-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>النوع</th>
                      <th>المبلغ</th>
                      <th>المصدر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{formatDate(record.record_date)}</td>
                        <td>{record.record_type}</td>
                        <td>{formatCurrency(record.amount)}</td>
                        <td>{record.source_module || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="panel">
            <h4 className="project-panel-title">آخر أوامر التغيير</h4>
            {changeOrdersQuery.isLoading ? (
              <p>جاري التحميل...</p>
            ) : changeOrders.length === 0 ? (
              <p>لا توجد أوامر تغيير.</p>
            ) : (
              <div className="table-scroll">
                <table className="resource-table">
                  <thead>
                    <tr>
                      <th>الرقم</th>
                      <th>العنوان</th>
                      <th>الحالة</th>
                      <th>تغير الميزانية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeOrders.map((changeOrder) => (
                      <tr key={changeOrder.id}>
                        <td>{changeOrder.order_number}</td>
                        <td>{changeOrder.title}</td>
                        <td>
                          <StatusBadge status={changeOrder.status} />
                        </td>
                        <td>{formatCurrency(changeOrder.total_budget_delta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      ) : null}

      {activityError && activeTab === "activity" ? <p className="error-banner">{activityError}</p> : null}
    </section>
  );
}
