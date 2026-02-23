"use client";

import clsx from "clsx";

export type WorkflowTimelineStep = {
  key: string;
  label: string;
  timestamp?: string | null;
  description?: string;
};

type WorkflowTimelineProps = {
  title?: string;
  steps: WorkflowTimelineStep[];
  currentStepKey?: string | null;
  className?: string;
};

function formatTimelineDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function WorkflowTimeline({ title = "مسار العمل", steps, currentStepKey, className }: WorkflowTimelineProps) {
  const currentIndex = currentStepKey ? steps.findIndex((step) => step.key === currentStepKey) : -1;

  return (
    <section className={clsx("workflow-timeline", className)}>
      <h4 className="workflow-timeline-title">{title}</h4>
      <ol className="workflow-timeline-list">
        {steps.map((step, index) => {
          let state: "completed" | "current" | "upcoming" = "upcoming";
          if (currentIndex >= 0) {
            if (index < currentIndex) {
              state = "completed";
            } else if (index === currentIndex) {
              state = "current";
            }
          } else if (step.timestamp) {
            state = "completed";
          }

          const formattedTimestamp = formatTimelineDate(step.timestamp);

          return (
            <li key={step.key} className={clsx("workflow-step", `workflow-step-${state}`)}>
              <span className="workflow-step-marker" aria-hidden />
              <div className="workflow-step-content">
                <p className="workflow-step-title">{step.label}</p>
                {step.description ? <p className="workflow-step-description">{step.description}</p> : null}
                {formattedTimestamp ? <p className="workflow-step-meta">{formattedTimestamp}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
