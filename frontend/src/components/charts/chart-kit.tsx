"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h4>{title}</h4>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: { usePointStyle: true, boxWidth: 10 },
    },
  },
};

export function LineChart({
  data,
  options,
}: {
  data: ChartData<"line", (number | null)[], string>;
  options?: ChartOptions<"line">;
}) {
  return <Line data={data} options={{ ...baseOptions, ...options }} />;
}

export function BarChart({
  data,
  options,
}: {
  data: ChartData<"bar", (number | null)[], string>;
  options?: ChartOptions<"bar">;
}) {
  return <Bar data={data} options={{ ...baseOptions, ...options }} />;
}

export function DoughnutChart({
  data,
  options,
}: {
  data: ChartData<"doughnut", number[], string>;
  options?: ChartOptions<"doughnut">;
}) {
  return <Doughnut data={data} options={{ ...baseOptions, ...options }} />;
}
