"use client";

import { useQuery } from "@tanstack/react-query";

import { ChartCard, LineChart } from "@/components/charts/chart-kit";
import { listAllResource, listResource } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type ProjectRow = {
  id: number;
  contract_value?: string | null;
};

type InvoiceRow = {
  id: number;
  total_amount?: string | null;
  issue_date?: string | null;
};

type PaymentRow = {
  id: number;
  amount?: string | null;
  payment_date?: string | null;
};

function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildLastMonths(count: number) {
  const months: Array<{ key: string; label: string }> = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label });
  }
  return months;
}

function groupTotalsByMonth<T extends { [key: string]: string | number | null | undefined }>(
  rows: T[],
  dateKey: keyof T,
  amountKey: keyof T,
  months: Array<{ key: string }>,
) {
  const bucket = new Map<string, number>();
  months.forEach((month) => bucket.set(month.key, 0));

  rows.forEach((row) => {
    const dateValue = row[dateKey];
    if (!dateValue) {
      return;
    }
    const monthKey = String(dateValue).slice(0, 7);
    if (!bucket.has(monthKey)) {
      return;
    }
    const amount = parseAmount(row[amountKey] as string | number | null | undefined);
    bucket.set(monthKey, (bucket.get(monthKey) ?? 0) + amount);
  });

  return months.map((month) => bucket.get(month.key) ?? 0);
}

async function getDashboardStats() {
  const [
    projects,
    purchaseOrders,
    invoices,
    progressBillings,
    allProjects,
    allInvoices,
    allConfirmedPayments,
  ] = await Promise.all([
    listResource<ProjectRow>("/v1/projects/projects/"),
    listResource<{ id: number }>("/v1/procurement/purchase-orders/"),
    listResource<InvoiceRow>("/v1/finance/invoices/"),
    listResource<{ id: number }>("/v1/finance/progress-billings/"),
    listAllResource<ProjectRow>("/v1/projects/projects/", { ordering: "code" }),
    listAllResource<InvoiceRow>("/v1/finance/invoices/", { ordering: "-issue_date" }),
    listAllResource<PaymentRow>("/v1/finance/payments/", { ordering: "-payment_date", status: "confirmed" }),
  ]);

  const projectContractTotal = allProjects.reduce((sum, project) => sum + parseAmount(project.contract_value), 0);
  const invoiceTotal = allInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.total_amount), 0);
  const confirmedPaymentsTotal = allConfirmedPayments.reduce((sum, payment) => sum + parseAmount(payment.amount), 0);
  const openBalanceTotal = Math.max(invoiceTotal - confirmedPaymentsTotal, 0);

  const months = buildLastMonths(6);
  const invoicesSeries = groupTotalsByMonth(allInvoices, "issue_date", "total_amount", months);
  const paymentsSeries = groupTotalsByMonth(allConfirmedPayments, "payment_date", "amount", months);

  return {
    projectsCount: projects.count,
    purchaseOrdersCount: purchaseOrders.count,
    invoicesCount: invoices.count,
    progressBillingsCount: progressBillings.count,
    projectContractTotal,
    invoiceTotal,
    confirmedPaymentsTotal,
    openBalanceTotal,
    chart: {
      labels: months.map((month) => month.label),
      invoicesSeries,
      paymentsSeries,
    },
  };
}

export default function DashboardHomePage() {
  const query = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: getDashboardStats,
  });
  const errorMessage = query.error instanceof Error ? query.error.message : "";

  const chartData = {
    labels: query.data?.chart.labels ?? [],
    datasets: [
      {
        label: "الفواتير",
        data: query.data?.chart.invoicesSeries ?? [],
        borderColor: "#1a5bb8",
        backgroundColor: "rgba(26, 91, 184, 0.15)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "المدفوعات",
        data: query.data?.chart.paymentsSeries ?? [],
        borderColor: "#1e8e5a",
        backgroundColor: "rgba(30, 142, 90, 0.15)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <>
      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
      <section className="dashboard-grid">
        <article className="kpi-card">
          <p className="kpi-label">إجمالي المشاريع</p>
          <p className="kpi-value" data-testid="kpi-projects-count">
            {query.data?.projectsCount ?? 0}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">أوامر الشراء</p>
          <p className="kpi-value" data-testid="kpi-purchase-orders-count">
            {query.data?.purchaseOrdersCount ?? 0}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">فواتير النظام</p>
          <p className="kpi-value" data-testid="kpi-invoices-count">
            {query.data?.invoicesCount ?? 0}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">مستخلصات التقدم</p>
          <p className="kpi-value" data-testid="kpi-progress-billings-count">
            {query.data?.progressBillingsCount ?? 0}
          </p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="kpi-card">
          <p className="kpi-label">إجمالي قيمة العقود</p>
          <p className="kpi-value" data-testid="kpi-project-contract-total">
            {formatCurrency(query.data?.projectContractTotal ?? 0)}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">إجمالي الفواتير</p>
          <p className="kpi-value" data-testid="kpi-invoice-total">
            {formatCurrency(query.data?.invoiceTotal ?? 0)}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">المدفوعات المؤكدة</p>
          <p className="kpi-value" data-testid="kpi-confirmed-payments-total">
            {formatCurrency(query.data?.confirmedPaymentsTotal ?? 0)}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">الرصيد المفتوح</p>
          <p className="kpi-value" data-testid="kpi-open-balance-total">
            {formatCurrency(query.data?.openBalanceTotal ?? 0)}
          </p>
        </article>
      </section>

      <section className="chart-grid" style={{ marginTop: "0.8rem" }}>
        <ChartCard title="الفواتير والمدفوعات" subtitle="آخر 6 أشهر">
          <LineChart data={chartData} />
        </ChartCard>
      </section>
    </>
  );
}
