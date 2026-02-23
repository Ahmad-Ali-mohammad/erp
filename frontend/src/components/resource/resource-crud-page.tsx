"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import clsx from "clsx";

import { ApiError, listResource, request, workflowAction } from "@/lib/api-client";
import { hasAnyPermissionClaim, inferAccessAreaFromResourcePath, type AccessArea } from "@/lib/access-control";
import {
  buildActionPermissionCodenames,
  buildCrudPermissionCodenames,
  getResourcePermissionDefinition,
} from "@/lib/permission-map";
import type { ResourceAction, ResourceActionDialogConfig, ResourceActionFormField } from "@/lib/types";
import { useAccessControl } from "@/lib/use-access-control";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkflowTimeline, type WorkflowTimelineStep } from "@/components/ui/workflow-timeline";

type ColumnDefinition<T> = {
  key: keyof T | string;
  title: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
};

type StatusOption = {
  label: string;
  value: string;
};

type DynamicOptionsConfig = {
  resourcePath: string;
  valueField?: string;
  labelField?: string;
  labelFields?: string[];
  ordering?: string;
  filters?: Record<string, string | number | undefined>;
};

type FormDynamicOptionsConfig = DynamicOptionsConfig & {
  dependsOn?: Record<string, string>;
  requireDependsOn?: boolean;
};

type JsonEditorDynamicOptionsConfig = DynamicOptionsConfig & {
  dependsOnForm?: Record<string, string>;
  requireDependsOnForm?: boolean;
  dependsOnRow?: Record<string, string>;
  requireDependsOnRow?: boolean;
};

type JsonEditorColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string;
  min?: number;
  max?: number;
  step?: number;
  dynamicOptions?: JsonEditorDynamicOptionsConfig;
};

type JsonArrayEditorConfig = {
  itemLabel?: string;
  addLabel?: string;
  minItems?: number;
  showComputedTotals?: boolean;
  columns: JsonEditorColumn[];
};

type FormField = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select" | "checkbox" | "json";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  helpText?: string;
  defaultValue?: string | boolean;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  rows?: number;
  jsonEditor?: JsonArrayEditorConfig;
  dynamicOptions?: FormDynamicOptionsConfig;
};

type ResourceRow = {
  id: number | string;
  status?: string;
  [key: string]: unknown;
};

type ResourceWorkflowTimelineStepConfig = {
  key: string;
  label: string;
  description?: string;
  timestampField?: string;
};

type ResourceWorkflowTimelineConfig = {
  title?: string;
  steps: ResourceWorkflowTimelineStepConfig[];
  statusToStep?: Record<string, string>;
  currentStepField?: string;
  className?: string;
};

type ResourceCrudPageProps<T extends ResourceRow> = {
  title: string;
  description: string;
  resourcePath: string;
  accessArea?: AccessArea;
  columns: ColumnDefinition<T>[];
  fields: FormField[];
  actions?: ResourceAction[];
  defaultOrdering?: string;
  searchPlaceholder?: string;
  statusOptions?: StatusOption[];
  showStatus?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  createLabel?: string;
  buildCreatePayload?: (values: Record<string, unknown>) => Record<string, unknown>;
  buildUpdatePayload?: (values: Record<string, unknown>, row: T) => Record<string, unknown>;
  workflowTimeline?: ResourceWorkflowTimelineConfig;
  headerActions?: React.ReactNode;
  toolbarActions?: React.ReactNode;
};

const defaultStatusOptions: StatusOption[] = [
  { label: "الكل", value: "" },
  { label: "مسودة", value: "draft" },
  { label: "بانتظار الاعتماد", value: "pending_approval" },
  { label: "معتمد", value: "approved" },
  { label: "مرفوض", value: "rejected" },
  { label: "مكتمل", value: "completed" },
  { label: "ملغي", value: "cancelled" },
];

type DynamicSelectOption = {
  value: string;
  label: string;
};

type DynamicFieldRuntimeConfig = {
  field: FormField;
  path: string;
  enabled: boolean;
};

type JsonEditorColumnRuntimeConfig = {
  fieldName: string;
  rowIndex: number;
  column: JsonEditorColumn;
  path: string;
  enabled: boolean;
};

type DynamicFieldState = {
  isLoading: boolean;
  isError: boolean;
  isBlocked: boolean;
};

type JsonEditorComputedSummary = {
  subtotal: number;
  tax: number;
  total: number;
  debit: number;
  credit: number;
  contractDelta: number;
  budgetDelta: number;
  hasLineTotals: boolean;
  hasJournalTotals: boolean;
  hasChangeOrderTotals: boolean;
};

type JsonEditorRowFinancials = {
  subtotal: number | null;
  tax: number | null;
  total: number | null;
};

type NormalizedResourceActionDialog = {
  title: string;
  description: string;
  confirmLabel: string;
  fields: ResourceActionFormField[];
};

type PendingResourceAction<T extends ResourceRow> = {
  row: T;
  action: ResourceAction;
  dialog: NormalizedResourceActionDialog;
  values: Record<string, unknown>;
  validationErrors: string[];
  formError: string;
};

function actionClassName(variant: ResourceAction["variant"]) {
  if (variant === "success") {
    return "btn btn-success";
  }
  if (variant === "danger") {
    return "btn btn-danger";
  }
  if (variant === "warning") {
    return "btn btn-warning";
  }
  return "btn btn-outline";
}

function createJsonEditorRow(config: JsonArrayEditorConfig): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  config.columns.forEach((column) => {
    row[column.key] = column.defaultValue ?? "";
  });
  return row;
}

function normalizeJsonEditorRows(value: unknown, config: JsonArrayEditorConfig): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((rawRow) => {
    const sourceRow =
      typeof rawRow === "object" && rawRow !== null ? (rawRow as Record<string, unknown>) : ({} as Record<string, unknown>);
    const normalizedRow: Record<string, unknown> = {};
    config.columns.forEach((column) => {
      const cellValue = sourceRow[column.key];
      normalizedRow[column.key] = cellValue === undefined || cellValue === null ? column.defaultValue ?? "" : String(cellValue);
    });
    return normalizedRow;
  });
}

function parseJsonDefaultRows(field: FormField): Record<string, unknown>[] {
  if (typeof field.defaultValue !== "string" || !field.jsonEditor) {
    return [];
  }
  try {
    const parsedValue = JSON.parse(field.defaultValue);
    return normalizeJsonEditorRows(parsedValue, field.jsonEditor);
  } catch {
    return [];
  }
}

function ensureJsonMinRows(rows: Record<string, unknown>[], config: JsonArrayEditorConfig): Record<string, unknown>[] {
  const minimum = config.minItems ?? 0;
  if (minimum <= 0 || rows.length >= minimum) {
    return rows;
  }
  const nextRows = [...rows];
  while (nextRows.length < minimum) {
    nextRows.push(createJsonEditorRow(config));
  }
  return nextRows;
}

function isJsonRowEmpty(row: Record<string, unknown>, config: JsonArrayEditorConfig): boolean {
  return config.columns.every((column) => !String(row[column.key] ?? "").trim());
}

function normalizeInitialValue(field: FormField, row?: ResourceRow | null) {
  if (field.type === "checkbox") {
    if (row && typeof row[field.name] === "boolean") {
      return row[field.name] as boolean;
    }
    if (typeof field.defaultValue === "boolean") {
      return field.defaultValue;
    }
    return false;
  }

  if (row) {
    const value = row[field.name];
    if (value === undefined || value === null) {
      if (field.type === "json" && field.jsonEditor) {
        return ensureJsonMinRows(parseJsonDefaultRows(field), field.jsonEditor);
      }
      return typeof field.defaultValue === "string" ? field.defaultValue : "";
    }
    if (field.type === "json") {
      if (field.jsonEditor) {
        return ensureJsonMinRows(normalizeJsonEditorRows(value, field.jsonEditor), field.jsonEditor);
      }
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
  if (field.type === "json" && field.jsonEditor) {
    return ensureJsonMinRows(parseJsonDefaultRows(field), field.jsonEditor);
  }
  if (typeof field.defaultValue === "string") {
    return field.defaultValue;
  }
  return "";
}

function toPayload(values: Record<string, unknown>, fields: FormField[]) {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = values[field.name];
    if (field.type === "checkbox") {
      payload[field.name] = Boolean(rawValue);
      continue;
    }

    if (field.type === "json" && field.jsonEditor) {
      const jsonConfig = field.jsonEditor;
      const rows = Array.isArray(rawValue) ? (rawValue as Record<string, unknown>[]) : [];
      payload[field.name] = rows
        .map((row) => {
          const normalizedRow: Record<string, unknown> = {};
          jsonConfig.columns.forEach((column) => {
            const cellValue = String(row[column.key] ?? "").trim();
            if (!cellValue) {
              return;
            }
            normalizedRow[column.key] = cellValue;
          });
          return normalizedRow;
        })
        .filter((row) => Object.keys(row).length > 0);
      continue;
    }

    const textValue = String(rawValue ?? "").trim();
    if (!textValue) {
      continue;
    }

    if (field.type === "json") {
      payload[field.name] = JSON.parse(textValue);
      continue;
    }
    payload[field.name] = textValue;
  }

  return payload;
}

function collectValidationErrors(values: Record<string, unknown>, fields: FormField[]): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    const value = values[field.name];
    if (field.type === "checkbox") {
      if (field.required && value !== true) {
        errors.push(`الحقل ${field.label} مطلوب.`);
      }
      continue;
    }

    if (field.type === "json" && field.jsonEditor) {
      const jsonConfig = field.jsonEditor;
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      const nonEmptyRows = rows.filter((row) => !isJsonRowEmpty(row, jsonConfig));
      if (field.required && nonEmptyRows.length === 0) {
        errors.push(`الحقل ${field.label} مطلوب.`);
        continue;
      }

      nonEmptyRows.forEach((row, rowIndex) => {
        jsonConfig.columns.forEach((column) => {
          const cellText = String(row[column.key] ?? "").trim();
          if (column.required && !cellText) {
            errors.push(`${field.label}: ${column.label} مطلوب (السطر ${rowIndex + 1}).`);
            return;
          }
          if (column.type === "number" && cellText) {
            const parsed = parseFiniteNumber(cellText);
            if (parsed === null) {
              errors.push(`${field.label}: ${column.label} يجب أن يكون رقماً صحيحاً (السطر ${rowIndex + 1}).`);
              return;
            }
            if (column.min !== undefined && parsed < column.min) {
              errors.push(
                `${field.label}: ${column.label} يجب أن يكون أكبر أو يساوي ${column.min} (السطر ${rowIndex + 1}).`,
              );
            }
            if (column.max !== undefined && parsed > column.max) {
              errors.push(
                `${field.label}: ${column.label} يجب أن يكون أقل أو يساوي ${column.max} (السطر ${rowIndex + 1}).`,
              );
            }
          }
        });

        if (hasJsonColumn(jsonConfig, "debit") || hasJsonColumn(jsonConfig, "credit")) {
          const debit = parseFiniteNumber(row.debit) ?? 0;
          const credit = parseFiniteNumber(row.credit) ?? 0;
          if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
            errors.push(`${field.label}: السطر ${rowIndex + 1} يجب أن يحتوي على مدين أو دائن فقط.`);
          }
        }
      });

      if (nonEmptyRows.length > 0 && (hasJsonColumn(jsonConfig, "debit") || hasJsonColumn(jsonConfig, "credit"))) {
        const debitTotal = nonEmptyRows.reduce((sum, row) => sum + (parseFiniteNumber(row.debit) ?? 0), 0);
        const creditTotal = nonEmptyRows.reduce((sum, row) => sum + (parseFiniteNumber(row.credit) ?? 0), 0);
        if (Math.abs(debitTotal - creditTotal) > 0.0001) {
          errors.push(`${field.label}: إجمالي المدين يجب أن يساوي إجمالي الدائن.`);
        }
      }
      continue;
    }

    const textValue = String(value ?? "").trim();
    if (field.required && !textValue) {
      errors.push(`الحقل ${field.label} مطلوب.`);
      continue;
    }
    if (field.type === "number" && textValue) {
      const parsed = parseFiniteNumber(textValue);
      if (parsed === null) {
        errors.push(`الحقل ${field.label} يجب أن يكون رقماً صحيحاً.`);
      }
    }
  }
  return errors;
}

function normalizeActionDialog(action: ResourceAction, row: ResourceRow): NormalizedResourceActionDialog {
  const rawDialogConfig = typeof action.dialog === "function" ? action.dialog(row as Record<string, unknown>) : action.dialog;
  const dialogConfig: ResourceActionDialogConfig = rawDialogConfig ?? {};
  const fields = [...(dialogConfig.fields ?? [])];

  if (action.needsReason && !fields.some((field) => field.name === "reason")) {
    fields.push({
      name: "reason",
      label: "سبب الرفض",
      type: "textarea",
      required: true,
      placeholder: "اكتب سبب الرفض",
      helpText: "يتم إرسال هذا السبب إلى سجل التحقق في النظام.",
    });
  }

  return {
    title: dialogConfig.title ?? `تأكيد ${action.label}`,
    description: dialogConfig.description ?? action.confirmMessage ?? "يرجى تأكيد الإجراء قبل المتابعة.",
    confirmLabel: dialogConfig.confirmLabel ?? action.label,
    fields,
  };
}

function initializeActionDialogValues(fields: ResourceActionFormField[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? ""]));
}

function collectActionDialogValidationErrors(
  values: Record<string, unknown>,
  fields: ResourceActionFormField[],
): string[] {
  const errors: string[] = [];
  fields.forEach((field) => {
    const textValue = String(values[field.name] ?? "").trim();
    if (field.required && !textValue) {
      errors.push(`الحقل ${field.label} مطلوب.`);
      return;
    }
    if (field.type === "number" && textValue) {
      const parsed = parseFiniteNumber(textValue);
      if (parsed === null) {
        errors.push(`الحقل ${field.label} يجب أن يكون رقماً صحيحاً.`);
        return;
      }
      if (field.min !== undefined && parsed < field.min) {
        errors.push(`الحقل ${field.label} يجب أن يكون أكبر أو يساوي ${field.min}.`);
      }
      if (field.max !== undefined && parsed > field.max) {
        errors.push(`الحقل ${field.label} يجب أن يكون أقل أو يساوي ${field.max}.`);
      }
    }
  });
  return errors;
}

function toActionDialogPayload(values: Record<string, unknown>, fields: ResourceActionFormField[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  fields.forEach((field) => {
    const textValue = String(values[field.name] ?? "").trim();
    if (!textValue) {
      return;
    }
    payload[field.name] = textValue;
  });
  return payload;
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function resolveWorkflowTimelineCurrentStep(
  row: ResourceRow | null,
  config?: ResourceWorkflowTimelineConfig,
): string | undefined {
  if (!row || !config) {
    return undefined;
  }

  if (config.currentStepField) {
    const explicitStep = stringifyValue(row[config.currentStepField]).trim();
    if (explicitStep) {
      return explicitStep;
    }
  }

  const statusValue = typeof row.status === "string" ? row.status : "";
  if (!statusValue) {
    return undefined;
  }

  if (config.statusToStep && config.statusToStep[statusValue]) {
    return config.statusToStep[statusValue];
  }

  if (config.steps.some((step) => step.key === statusValue)) {
    return statusValue;
  }

  return undefined;
}

function resolveWorkflowTimelineSteps(
  row: ResourceRow | null,
  config?: ResourceWorkflowTimelineConfig,
): WorkflowTimelineStep[] {
  if (!config) {
    return [];
  }

  return config.steps.map((step) => {
    const rawTimestamp = step.timestampField ? row?.[step.timestampField] : undefined;
    const timestampText = stringifyValue(rawTimestamp).trim();
    return {
      key: step.key,
      label: step.label,
      description: step.description,
      timestamp: timestampText || null,
    };
  });
}

function parseFiniteNumber(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatEditorAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function hasJsonColumn(config: JsonArrayEditorConfig, key: string): boolean {
  return config.columns.some((column) => column.key === key);
}

function resolveRowUnitAmount(row: Record<string, unknown>): number | null {
  const unitPrice = parseFiniteNumber(row.unit_price);
  if (unitPrice !== null) {
    return unitPrice;
  }
  const unitCost = parseFiniteNumber(row.unit_cost);
  if (unitCost !== null) {
    return unitCost;
  }
  const estimatedUnitCost = parseFiniteNumber(row.estimated_unit_cost);
  if (estimatedUnitCost !== null) {
    return estimatedUnitCost;
  }
  return null;
}

function computeJsonEditorSummary(
  rows: Record<string, unknown>[],
  config: JsonArrayEditorConfig,
): JsonEditorComputedSummary | null {
  if (config.showComputedTotals === false || rows.length === 0) {
    return null;
  }

  const hasLineTotals =
    hasJsonColumn(config, "quantity") &&
    (hasJsonColumn(config, "unit_price") || hasJsonColumn(config, "unit_cost") || hasJsonColumn(config, "estimated_unit_cost"));
  const hasJournalTotals = hasJsonColumn(config, "debit") || hasJsonColumn(config, "credit");
  const hasChangeOrderTotals = hasJsonColumn(config, "contract_value_delta") || hasJsonColumn(config, "budget_delta");

  if (!hasLineTotals && !hasJournalTotals && !hasChangeOrderTotals) {
    return null;
  }

  let subtotal = 0;
  let tax = 0;
  let debit = 0;
  let credit = 0;
  let contractDelta = 0;
  let budgetDelta = 0;

  rows.forEach((row) => {
    const quantity = parseFiniteNumber(row.quantity);
    const unitAmount = resolveRowUnitAmount(row);
    const taxRate = parseFiniteNumber(row.tax_rate) ?? 0;
    if (quantity !== null && unitAmount !== null) {
      const lineSubtotal = quantity * unitAmount;
      subtotal += lineSubtotal;
      tax += lineSubtotal * (taxRate / 100);
    }

    debit += parseFiniteNumber(row.debit) ?? 0;
    credit += parseFiniteNumber(row.credit) ?? 0;
    contractDelta += parseFiniteNumber(row.contract_value_delta) ?? 0;
    budgetDelta += parseFiniteNumber(row.budget_delta) ?? 0;
  });

  const roundedSubtotal = roundMoney(subtotal);
  const roundedTax = roundMoney(tax);

  return {
    subtotal: roundedSubtotal,
    tax: roundedTax,
    total: roundMoney(roundedSubtotal + roundedTax),
    debit: roundMoney(debit),
    credit: roundMoney(credit),
    contractDelta: roundMoney(contractDelta),
    budgetDelta: roundMoney(budgetDelta),
    hasLineTotals,
    hasJournalTotals,
    hasChangeOrderTotals,
  };
}

function computeJsonEditorRowFinancials(row: Record<string, unknown>): JsonEditorRowFinancials {
  const quantity = parseFiniteNumber(row.quantity);
  const unitAmount = resolveRowUnitAmount(row);
  const taxRate = parseFiniteNumber(row.tax_rate) ?? 0;
  if (quantity === null || unitAmount === null) {
    return { subtotal: null, tax: null, total: null };
  }
  const subtotal = roundMoney(quantity * unitAmount);
  const tax = roundMoney(subtotal * (taxRate / 100));
  return {
    subtotal,
    tax,
    total: roundMoney(subtotal + tax),
  };
}

function toOptionLabel(
  item: Record<string, unknown>,
  config: DynamicOptionsConfig,
): string {
  if (config.labelFields && config.labelFields.length > 0) {
    const parts = config.labelFields
      .map((fieldName) => stringifyValue(item[fieldName]).trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join(" - ");
    }
  }
  if (config.labelField) {
    const label = stringifyValue(item[config.labelField]).trim();
    if (label) {
      return label;
    }
  }
  const fallbackName = stringifyValue(item.name).trim();
  if (fallbackName) {
    return fallbackName;
  }
  const fallbackCode = stringifyValue(item.code).trim();
  if (fallbackCode) {
    return fallbackCode;
  }
  return stringifyValue(item.id) || "N/A";
}

function buildDynamicOptionsPath(
  config: DynamicOptionsConfig,
  filters?: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  query.set("page_size", "200");
  if (config.ordering) {
    query.set("ordering", config.ordering);
  }
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, String(value));
  });

  const queryString = query.toString();
  return `${config.resourcePath}${queryString ? `?${queryString}` : ""}`;
}

function resolveDynamicOptionFilters(
  config: FormDynamicOptionsConfig,
  values: Record<string, unknown>,
) {
  const resolvedFilters: Record<string, string | number | undefined> = { ...(config.filters ?? {}) };
  const dependencyMap = config.dependsOn ?? {};
  const hasDependencies = Object.keys(dependencyMap).length > 0;
  const requireDependencies = config.requireDependsOn ?? hasDependencies;
  let hasMissingDependencies = false;

  Object.entries(dependencyMap).forEach(([queryParam, fieldName]) => {
    const rawValue = stringifyValue(values[fieldName]).trim();
    if (!rawValue) {
      if (requireDependencies) {
        hasMissingDependencies = true;
      }
      return;
    }
    resolvedFilters[queryParam] = rawValue;
  });

  return { resolvedFilters, hasMissingDependencies };
}

function resolveJsonEditorDynamicOptionFilters(
  config: JsonEditorDynamicOptionsConfig,
  row: Record<string, unknown>,
  formValues: Record<string, unknown>,
) {
  const resolvedFilters: Record<string, string | number | undefined> = { ...(config.filters ?? {}) };

  const formDependencyMap = config.dependsOnForm ?? {};
  const hasFormDependencies = Object.keys(formDependencyMap).length > 0;
  const requireFormDependencies = config.requireDependsOnForm ?? hasFormDependencies;
  let hasMissingFormDependencies = false;
  Object.entries(formDependencyMap).forEach(([queryParam, fieldName]) => {
    const rawValue = stringifyValue(formValues[fieldName]).trim();
    if (!rawValue) {
      if (requireFormDependencies) {
        hasMissingFormDependencies = true;
      }
      return;
    }
    resolvedFilters[queryParam] = rawValue;
  });

  const rowDependencyMap = config.dependsOnRow ?? {};
  const hasRowDependencies = Object.keys(rowDependencyMap).length > 0;
  const requireRowDependencies = config.requireDependsOnRow ?? hasRowDependencies;
  let hasMissingRowDependencies = false;
  Object.entries(rowDependencyMap).forEach(([queryParam, columnKey]) => {
    const rawValue = stringifyValue(row[columnKey]).trim();
    if (!rawValue) {
      if (requireRowDependencies) {
        hasMissingRowDependencies = true;
      }
      return;
    }
    resolvedFilters[queryParam] = rawValue;
  });

  return {
    resolvedFilters,
    hasMissingDependencies: hasMissingFormDependencies || hasMissingRowDependencies,
  };
}

function buildJsonEditorColumnQueryKey(fieldName: string, rowIndex: number, columnKey: string): string {
  return `${fieldName}:${rowIndex}:${columnKey}`;
}

export function ResourceCrudPage<T extends ResourceRow>({
  title,
  description,
  resourcePath,
  accessArea,
  columns,
  fields,
  actions = [],
  defaultOrdering = "-created_at",
  searchPlaceholder = "ابحث...",
  statusOptions = defaultStatusOptions,
  showStatus = true,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  createLabel = "إنشاء جديد",
  buildCreatePayload,
  buildUpdatePayload,
  workflowTimeline,
  headerActions,
  toolbarActions,
}: ResourceCrudPageProps<T>) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeRow, setActiveRow] = useState<T | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [formError, setFormError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingResourceAction<T> | null>(null);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<T | null>(null);
  const [pendingDeleteError, setPendingDeleteError] = useState("");
  const { canViewArea, canManageArea, canApproveArea, permissions } = useAccessControl();
  const resolvedAccessArea = accessArea ?? inferAccessAreaFromResourcePath(resourcePath);
  const canViewAreaLevel = resolvedAccessArea ? canViewArea(resolvedAccessArea) : true;
  const canManageAreaLevel = resolvedAccessArea ? canManageArea(resolvedAccessArea) : true;
  const canApproveAreaLevel = resolvedAccessArea ? canApproveArea(resolvedAccessArea) : true;
  const permissionClaimsActive = permissions.length > 0;
  const resourcePermissionDefinition = useMemo(() => getResourcePermissionDefinition(resourcePath), [resourcePath]);

  const canViewResource = useMemo(() => {
    if (!permissionClaimsActive || !resourcePermissionDefinition) {
      return canViewAreaLevel;
    }
    if (hasAnyPermissionClaim(permissions, buildCrudPermissionCodenames(resourcePermissionDefinition, "view"))) {
      return true;
    }
    return canViewAreaLevel;
  }, [canViewAreaLevel, permissionClaimsActive, permissions, resourcePermissionDefinition]);

  const canCreateResource = useMemo(() => {
    if (!permissionClaimsActive || !resourcePermissionDefinition) {
      return canManageAreaLevel;
    }
    if (hasAnyPermissionClaim(permissions, buildCrudPermissionCodenames(resourcePermissionDefinition, "add"))) {
      return true;
    }
    return canManageAreaLevel;
  }, [canManageAreaLevel, permissionClaimsActive, permissions, resourcePermissionDefinition]);

  const canEditResource = useMemo(() => {
    if (!permissionClaimsActive || !resourcePermissionDefinition) {
      return canManageAreaLevel;
    }
    if (hasAnyPermissionClaim(permissions, buildCrudPermissionCodenames(resourcePermissionDefinition, "change"))) {
      return true;
    }
    return canManageAreaLevel;
  }, [canManageAreaLevel, permissionClaimsActive, permissions, resourcePermissionDefinition]);

  const canDeleteResource = useMemo(() => {
    if (!permissionClaimsActive || !resourcePermissionDefinition) {
      return canManageAreaLevel;
    }
    if (hasAnyPermissionClaim(permissions, buildCrudPermissionCodenames(resourcePermissionDefinition, "delete"))) {
      return true;
    }
    return canManageAreaLevel;
  }, [canManageAreaLevel, permissionClaimsActive, permissions, resourcePermissionDefinition]);

  const canManageAnyResource = canCreateResource || canEditResource || canDeleteResource;

  const [formValues, setFormValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, normalizeInitialValue(field, null)])),
  );

  const fieldMap = useMemo(() => {
    const map: Record<string, FormField> = {};
    fields.forEach((field) => {
      map[field.name] = field;
    });
    return map;
  }, [fields]);

  const dependentFieldsBySource = useMemo(() => {
    const map: Record<string, string[]> = {};
    fields.forEach((field) => {
      const dependencyMap = field.dynamicOptions?.dependsOn ?? {};
      Object.values(dependencyMap).forEach((sourceField) => {
        if (!map[sourceField]) {
          map[sourceField] = [];
        }
        if (!map[sourceField].includes(field.name)) {
          map[sourceField].push(field.name);
        }
      });
    });
    return map;
  }, [fields]);

  const setFormFieldValue = (fieldName: string, value: unknown) => {
    setFormValues((previous) => {
      const next = { ...previous, [fieldName]: value };
      const queue = [...(dependentFieldsBySource[fieldName] ?? [])];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const dependentFieldName = queue.shift();
        if (!dependentFieldName || visited.has(dependentFieldName)) {
          continue;
        }
        visited.add(dependentFieldName);
        const dependentField = fieldMap[dependentFieldName];
        next[dependentFieldName] = dependentField ? normalizeInitialValue(dependentField, null) : "";
        queue.push(...(dependentFieldsBySource[dependentFieldName] ?? []));
      }

      return next;
    });
  };

  const addJsonEditorRow = (field: FormField) => {
    const jsonConfig = field.jsonEditor;
    if (!jsonConfig) {
      return;
    }
    setFormValues((previous) => {
      const currentRows = Array.isArray(previous[field.name]) ? [...(previous[field.name] as Record<string, unknown>[])] : [];
      currentRows.push(createJsonEditorRow(jsonConfig));
      return { ...previous, [field.name]: currentRows };
    });
  };

  const removeJsonEditorRow = (fieldName: string, rowIndex: number) => {
    setFormValues((previous) => {
      const currentRows = Array.isArray(previous[fieldName]) ? [...(previous[fieldName] as Record<string, unknown>[])] : [];
      if (rowIndex < 0 || rowIndex >= currentRows.length) {
        return previous;
      }
      currentRows.splice(rowIndex, 1);
      return { ...previous, [fieldName]: currentRows };
    });
  };

  const updateJsonEditorCell = (fieldName: string, rowIndex: number, key: string, value: string) => {
    setFormValues((previous) => {
      const currentRows = Array.isArray(previous[fieldName]) ? [...(previous[fieldName] as Record<string, unknown>[])] : [];
      const currentRow = currentRows[rowIndex] ?? {};
      currentRows[rowIndex] = { ...currentRow, [key]: value };
      return { ...previous, [fieldName]: currentRows };
    });
  };

  const queryKey = useMemo(
    () => ["resource-crud", resourcePath, searchTerm, statusFilter, defaultOrdering],
    [defaultOrdering, resourcePath, searchTerm, statusFilter],
  );

  const query = useQuery({
    queryKey,
    enabled: canViewResource,
    queryFn: () =>
      listResource<T>(resourcePath, {
        search: searchTerm || undefined,
        status: showStatus ? statusFilter || undefined : undefined,
        ordering: defaultOrdering,
      }),
  });

  const dynamicSelectFields = useMemo(
    () => fields.filter((field) => field.type === "select" && field.dynamicOptions),
    [fields],
  );

  const dynamicFieldRuntimeConfigs = useMemo<DynamicFieldRuntimeConfig[]>(
    () =>
      dynamicSelectFields.map((field) => {
        const config = field.dynamicOptions!;
        const { resolvedFilters, hasMissingDependencies } = resolveDynamicOptionFilters(config, formValues);
        return {
          field,
          path: buildDynamicOptionsPath(config, resolvedFilters),
          enabled: !hasMissingDependencies,
        };
      }),
    [dynamicSelectFields, formValues],
  );

  const dynamicOptionsQueries = useQueries({
    queries: dynamicFieldRuntimeConfigs.map(({ field, path, enabled }) => {
      const config = field.dynamicOptions!;
      return {
        queryKey: ["resource-options", field.name, path, enabled ? "enabled" : "blocked"],
        enabled: enabled && canManageAnyResource,
        queryFn: async () => {
          const response = await request<{
            results?: Record<string, unknown>[];
          }>(path);
          const rows = Array.isArray(response?.results) ? response.results : [];
          return rows.map((row) => {
            const valueField = config.valueField ?? "id";
            const rawValue = stringifyValue(row[valueField]);
            return {
              value: rawValue,
              label: toOptionLabel(row, config),
            } satisfies DynamicSelectOption;
          });
        },
      };
    }),
  });

  const dynamicOptionsByField = useMemo(() => {
    const optionMap: Record<string, DynamicSelectOption[]> = {};
    dynamicFieldRuntimeConfigs.forEach((runtimeConfig, index) => {
      const queryResult = dynamicOptionsQueries[index];
      optionMap[runtimeConfig.field.name] =
        runtimeConfig.enabled && Array.isArray(queryResult?.data) ? queryResult.data : [];
    });
    return optionMap;
  }, [dynamicFieldRuntimeConfigs, dynamicOptionsQueries]);

  const dynamicOptionsStateByField = useMemo(() => {
    const stateMap: Record<string, DynamicFieldState> = {};
    dynamicFieldRuntimeConfigs.forEach((runtimeConfig, index) => {
      const queryResult = dynamicOptionsQueries[index];
      stateMap[runtimeConfig.field.name] = {
        isLoading: runtimeConfig.enabled ? Boolean(queryResult?.isLoading) : false,
        isError: runtimeConfig.enabled ? Boolean(queryResult?.isError) : false,
        isBlocked: !runtimeConfig.enabled,
      };
    });
    return stateMap;
  }, [dynamicFieldRuntimeConfigs, dynamicOptionsQueries]);

  const jsonEditorColumnRuntimeConfigs = useMemo<JsonEditorColumnRuntimeConfig[]>(() => {
    const runtimeConfigs: JsonEditorColumnRuntimeConfig[] = [];
    fields.forEach((field) => {
      if (field.type !== "json" || !field.jsonEditor) {
        return;
      }
      const rows = Array.isArray(formValues[field.name]) ? (formValues[field.name] as Record<string, unknown>[]) : [];
      rows.forEach((row, rowIndex) => {
        field.jsonEditor?.columns.forEach((column) => {
          if (column.type !== "select" || !column.dynamicOptions) {
            return;
          }
          const { resolvedFilters, hasMissingDependencies } = resolveJsonEditorDynamicOptionFilters(
            column.dynamicOptions,
            row,
            formValues,
          );
          runtimeConfigs.push({
            fieldName: field.name,
            rowIndex,
            column,
            path: buildDynamicOptionsPath(column.dynamicOptions, resolvedFilters),
            enabled: !hasMissingDependencies,
          });
        });
      });
    });
    return runtimeConfigs;
  }, [fields, formValues]);

  const jsonEditorDynamicOptionsQueries = useQueries({
    queries: jsonEditorColumnRuntimeConfigs.map((runtimeConfig) => {
      const config = runtimeConfig.column.dynamicOptions!;
      return {
        queryKey: [
          "json-editor-options",
          runtimeConfig.fieldName,
          runtimeConfig.rowIndex,
          runtimeConfig.column.key,
          runtimeConfig.path,
          runtimeConfig.enabled ? "enabled" : "blocked",
        ],
        enabled: runtimeConfig.enabled && canManageAnyResource,
        queryFn: async () => {
          const response = await request<{
            results?: Record<string, unknown>[];
          }>(runtimeConfig.path);
          const rows = Array.isArray(response?.results) ? response.results : [];
          return rows.map((row) => {
            const valueField = config.valueField ?? "id";
            const rawValue = stringifyValue(row[valueField]);
            return {
              value: rawValue,
              label: toOptionLabel(row, config),
            } satisfies DynamicSelectOption;
          });
        },
      };
    }),
  });

  const jsonEditorDynamicOptionsByField = useMemo(() => {
    const optionMap: Record<string, DynamicSelectOption[]> = {};
    jsonEditorColumnRuntimeConfigs.forEach((runtimeConfig, index) => {
      const key = buildJsonEditorColumnQueryKey(runtimeConfig.fieldName, runtimeConfig.rowIndex, runtimeConfig.column.key);
      const queryResult = jsonEditorDynamicOptionsQueries[index];
      optionMap[key] = runtimeConfig.enabled && Array.isArray(queryResult?.data) ? queryResult.data : [];
    });
    return optionMap;
  }, [jsonEditorColumnRuntimeConfigs, jsonEditorDynamicOptionsQueries]);

  const jsonEditorDynamicOptionsStateByField = useMemo(() => {
    const stateMap: Record<string, DynamicFieldState> = {};
    jsonEditorColumnRuntimeConfigs.forEach((runtimeConfig, index) => {
      const key = buildJsonEditorColumnQueryKey(runtimeConfig.fieldName, runtimeConfig.rowIndex, runtimeConfig.column.key);
      const queryResult = jsonEditorDynamicOptionsQueries[index];
      stateMap[key] = {
        isLoading: runtimeConfig.enabled ? Boolean(queryResult?.isLoading) : false,
        isError: runtimeConfig.enabled ? Boolean(queryResult?.isError) : false,
        isBlocked: !runtimeConfig.enabled,
      };
    });
    return stateMap;
  }, [jsonEditorColumnRuntimeConfigs, jsonEditorDynamicOptionsQueries]);

  const refetchResource = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const closeDialog = () => {
    setDialogMode(null);
    setActiveRow(null);
    setFormError("");
    setValidationErrors([]);
    setFormValues(Object.fromEntries(fields.map((field) => [field.name, normalizeInitialValue(field, null)])));
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    setActiveRow(null);
    setFormError("");
    setValidationErrors([]);
    setFormValues(Object.fromEntries(fields.map((field) => [field.name, normalizeInitialValue(field, null)])));
  };

  const openEditDialog = (row: T) => {
    setDialogMode("edit");
    setActiveRow(row);
    setFormError("");
    setValidationErrors([]);
    setFormValues(Object.fromEntries(fields.map((field) => [field.name, normalizeInitialValue(field, row)])));
  };

  const actionMutation = useMutation({
    mutationFn: async (payload: {
      rowId: number | string;
      action: string;
      body?: Record<string, unknown>;
    }) => workflowAction(resourcePath, payload.rowId, payload.action, payload.body),
    onSuccess: refetchResource,
  });

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = toPayload(values, fields);
      const requestPayload = buildCreatePayload ? buildCreatePayload(payload) : payload;
      return request(`${resourcePath}`, "POST", requestPayload);
    },
    onSuccess: async () => {
      closeDialog();
      await refetchResource();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else if (error instanceof SyntaxError) {
        setFormError("صيغة JSON غير صحيحة. راجع الحقول من نوع JSON.");
      } else {
        setFormError("تعذر إنشاء السجل.");
      }
    },
  });

  const editMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!activeRow) {
        throw new Error("Missing active row.");
      }
      const payload = toPayload(values, fields);
      const requestPayload = buildUpdatePayload ? buildUpdatePayload(payload, activeRow) : payload;
      return request(`${resourcePath}${activeRow.id}/`, "PATCH", requestPayload);
    },
    onSuccess: async () => {
      closeDialog();
      await refetchResource();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else if (error instanceof SyntaxError) {
        setFormError("صيغة JSON غير صحيحة. راجع الحقول من نوع JSON.");
      } else {
        setFormError("تعذر تعديل السجل.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (rowId: number | string) => request(`${resourcePath}${rowId}/`, "DELETE"),
    onSuccess: refetchResource,
  });

  const mutationErrorMessage =
    query.error instanceof ApiError
      ? query.error.message
      : actionMutation.error instanceof ApiError
        ? actionMutation.error.message
        : deleteMutation.error instanceof ApiError
          ? deleteMutation.error.message
          : "";

  const visibleActions = useMemo(
    () =>
      actions.filter((action) => {
        const requiredLevel =
          action.requiredPermissionLevel ?? (action.action === "approve" || action.action === "reject" ? "approve" : "manage");

        if (permissionClaimsActive && resourcePermissionDefinition) {
          const actionCandidates = buildActionPermissionCodenames(resourcePermissionDefinition, action.action);
          if (hasAnyPermissionClaim(permissions, actionCandidates)) {
            return true;
          }
        }

        return requiredLevel === "approve" ? canApproveAreaLevel : canManageAreaLevel;
      }),
    [
      actions,
      canApproveAreaLevel,
      canManageAreaLevel,
      permissionClaimsActive,
      permissions,
      resourcePermissionDefinition,
    ],
  );

  const effectiveAllowCreate = allowCreate && canCreateResource;
  const effectiveAllowEdit = allowEdit && canEditResource;
  const effectiveAllowDelete = allowDelete && canDeleteResource;

  const data = query.data?.results ?? [];
  const saving = createMutation.isPending || editMutation.isPending;
  const workflowRow = dialogMode === "edit" && activeRow ? (activeRow as ResourceRow) : null;
  const dialogWorkflowSteps = resolveWorkflowTimelineSteps(workflowRow, workflowTimeline);
  const dialogWorkflowCurrentStep = resolveWorkflowTimelineCurrentStep(workflowRow, workflowTimeline);
  const showDialogWorkflowTimeline = Boolean(
    dialogMode === "edit" && workflowTimeline && workflowRow && dialogWorkflowSteps.length > 0,
  );

  const closePendingActionDialog = () => {
    setPendingAction(null);
  };

  const openActionDialog = (row: T, action: ResourceAction) => {
    const dialog = normalizeActionDialog(action, row);
    setPendingAction({
      row,
      action,
      dialog,
      values: initializeActionDialogValues(dialog.fields),
      validationErrors: [],
      formError: "",
    });
  };

  const updatePendingActionField = (fieldName: string, value: unknown) => {
    setPendingAction((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        values: { ...previous.values, [fieldName]: value },
      };
    });
  };

  const submitPendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    const { action, row, dialog, values } = pendingAction;
    const validation = collectActionDialogValidationErrors(values, dialog.fields);
    if (validation.length > 0) {
      setPendingAction((previous) =>
        previous
          ? {
              ...previous,
              validationErrors: validation,
              formError: "",
            }
          : previous,
      );
      return;
    }

    const dialogPayload = toActionDialogPayload(values, dialog.fields);
    setPendingAction((previous) =>
      previous
        ? {
            ...previous,
            validationErrors: [],
            formError: "",
          }
        : previous,
    );

    try {
      let payload: Record<string, unknown> | undefined =
        Object.keys(dialogPayload).length > 0 ? dialogPayload : undefined;
      if (action.payloadBuilder) {
        const customPayload = await action.payloadBuilder(row as Record<string, unknown>, dialogPayload);
        if (customPayload === null) {
          return;
        }
        payload = customPayload;
      }
      await actionMutation.mutateAsync({ rowId: row.id, action: action.action, body: payload });
      closePendingActionDialog();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "تعذر إكمال إجراء سير العمل.";
      setPendingAction((previous) =>
        previous
          ? {
              ...previous,
              formError: message,
            }
          : previous,
      );
    }
  };

  const openDeleteDialog = (row: T) => {
    setPendingDeleteRow(row);
    setPendingDeleteError("");
  };

  const closeDeleteDialog = () => {
    setPendingDeleteRow(null);
    setPendingDeleteError("");
  };

  const confirmDelete = async () => {
    if (!pendingDeleteRow) {
      return;
    }
    setPendingDeleteError("");
    try {
      await deleteMutation.mutateAsync(pendingDeleteRow.id);
      closeDeleteDialog();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : error instanceof Error ? error.message : "تعذر حذف السجل.";
      setPendingDeleteError(message);
    }
  };

  const submitDialog = async () => {
    setFormError("");
    const currentValidation = collectValidationErrors(formValues, fields);
    if (currentValidation.length > 0) {
      setValidationErrors(currentValidation);
      return;
    }
    setValidationErrors([]);
    try {
      if (dialogMode === "create") {
        await createMutation.mutateAsync(formValues);
      } else if (dialogMode === "edit") {
        await editMutation.mutateAsync(formValues);
      }
    } catch {
      // handled in mutation onError
    }
  };

  if (!canViewResource) {
    return (
      <section className="resource-section">
        <header className="resource-header">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </header>
        <p className="error-banner" data-testid="resource-forbidden">
          لا تملك صلاحية الوصول إلى هذه الوحدة.
        </p>
      </section>
    );
  }

  return (
    <section className="resource-section">
      <header className="resource-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="action-grid">
          <button type="button" className="btn btn-outline" data-testid="toolbar-refresh" onClick={() => query.refetch()}>
            تحديث
          </button>
          {headerActions}
          {effectiveAllowCreate ? (
            <button type="button" className="btn btn-primary" data-testid="toolbar-create" onClick={openCreateDialog}>
              {createLabel}
            </button>
          ) : null}
        </div>
      </header>

      <div className="resource-toolbar">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={searchPlaceholder}
          className="field-control"
          data-testid="toolbar-search"
        />
        {showStatus ? (
          <select
            className="field-control select-control"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            data-testid="toolbar-status"
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        {toolbarActions ? <div className="resource-toolbar-actions">{toolbarActions}</div> : null}
      </div>

      {mutationErrorMessage ? <p className="error-banner">{mutationErrorMessage}</p> : null}

      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.title}</th>
              ))}
              {showStatus ? <th>الحالة</th> : null}
              {effectiveAllowEdit || effectiveAllowDelete || visibleActions.length > 0 ? <th>الإجراءات</th> : null}
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (showStatus ? 1 : 0) +
                    (effectiveAllowEdit || effectiveAllowDelete || visibleActions.length > 0 ? 1 : 0)
                  }
                  className="table-empty"
                >
                  جاري تحميل البيانات...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (showStatus ? 1 : 0) +
                    (effectiveAllowEdit || effectiveAllowDelete || visibleActions.length > 0 ? 1 : 0)
                  }
                  className="table-empty"
                >
                  لا توجد نتائج مطابقة.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={String(row.id)}>
                  {columns.map((column) => (
                    <td key={`${row.id}-${String(column.key)}`} className={column.className}>
                      {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "-")}
                    </td>
                  ))}
                  {showStatus ? (
                    <td>
                      <StatusBadge status={typeof row.status === "string" ? row.status : undefined} />
                    </td>
                  ) : null}
                  {effectiveAllowEdit || effectiveAllowDelete || visibleActions.length > 0 ? (
                    <td>
                      <div className="action-grid">
                        {visibleActions.map((action) => (
                          <button
                            key={`${row.id}-${action.action}`}
                            type="button"
                            className={clsx(actionClassName(action.variant))}
                            data-testid={`row-action-${action.action}-${row.id}`}
                            onClick={() => openActionDialog(row, action)}
                            disabled={actionMutation.isPending}
                          >
                            {action.label}
                          </button>
                        ))}
                        {effectiveAllowEdit ? (
                          <button
                            type="button"
                            className="btn btn-outline"
                            data-testid={`row-edit-${row.id}`}
                            onClick={() => openEditDialog(row)}
                          >
                            تعديل
                          </button>
                        ) : null}
                        {effectiveAllowDelete ? (
                          <button
                            type="button"
                            className="btn btn-danger"
                            data-testid={`row-delete-${row.id}`}
                            onClick={() => openDeleteDialog(row)}
                            disabled={deleteMutation.isPending}
                          >
                            حذف
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {dialogMode ? (
        <div className="dialog-overlay" role="presentation" onClick={closeDialog}>
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            data-testid="crud-dialog"
            data-dialog-mode={dialogMode}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="dialog-header">
              <h4>{dialogMode === "create" ? `إنشاء ${title}` : `تعديل ${title}`}</h4>
              <button type="button" className="btn btn-outline" data-testid="crud-dialog-close" onClick={closeDialog}>
                إغلاق
              </button>
            </header>

            {showDialogWorkflowTimeline ? (
              <WorkflowTimeline
                title={workflowTimeline?.title ?? "Workflow"}
                steps={dialogWorkflowSteps}
                currentStepKey={dialogWorkflowCurrentStep}
                className={clsx("resource-dialog-workflow", workflowTimeline?.className)}
              />
            ) : null}

            <div className="dialog-form">
              {fields.map((field) => {
                const currentValue = formValues[field.name];
                const jsonRows = Array.isArray(currentValue) ? (currentValue as Record<string, unknown>[]) : [];
                const jsonEditorConfig = field.jsonEditor;
                const jsonSummary = jsonEditorConfig ? computeJsonEditorSummary(jsonRows, jsonEditorConfig) : null;
                const dynamicFieldOptions = dynamicOptionsByField[field.name] ?? [];
                const dynamicFieldState = dynamicOptionsStateByField[field.name];
                const mergedSelectOptionsMap = new Map<string, { label: string; value: string }>();

                (field.options ?? []).forEach((option) => {
                  mergedSelectOptionsMap.set(option.value, option);
                });
                dynamicFieldOptions.forEach((option) => {
                  if (!mergedSelectOptionsMap.has(option.value)) {
                    mergedSelectOptionsMap.set(option.value, option);
                  }
                });
                const mergedSelectOptions = Array.from(mergedSelectOptionsMap.values());

                return (
                  <label key={field.name} className="dialog-field">
                    <span>
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>

                    {field.type === "json" && jsonEditorConfig ? (
                      <div className="json-editor">
                        <div className="json-editor-toolbar">
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={field.readOnly}
                            onClick={() => addJsonEditorRow(field)}
                          >
                            {jsonEditorConfig.addLabel ?? "إضافة سطر"}
                          </button>
                        </div>
                        <div className="json-editor-rows">
                          {jsonRows.length === 0 ? (
                            <p className="field-help">لا توجد أسطر بعد.</p>
                          ) : (
                            jsonRows.map((row, rowIndex) => {
                              const rowFinancials = computeJsonEditorRowFinancials(row);
                              return (
                                <article key={`${field.name}-${rowIndex}`} className="json-editor-row">
                                  <header className="json-editor-row-head">
                                    <strong>{`${jsonEditorConfig.itemLabel ?? "Row"} #${rowIndex + 1}`}</strong>
                                    <div className="json-editor-row-head-meta">
                                      {rowFinancials.total !== null ? (
                                        <span className="json-editor-chip">إجمالي السطر: {formatEditorAmount(rowFinancials.total)}</span>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="btn btn-danger"
                                        disabled={field.readOnly}
                                        onClick={() => removeJsonEditorRow(field.name, rowIndex)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </header>

                                  <div className="json-editor-grid">
                                    {jsonEditorConfig.columns.map((column) => {
                                      const jsonColumnKey = buildJsonEditorColumnQueryKey(field.name, rowIndex, column.key);
                                      const dynamicColumnOptions = jsonEditorDynamicOptionsByField[jsonColumnKey] ?? [];
                                      const dynamicColumnState = jsonEditorDynamicOptionsStateByField[jsonColumnKey];
                                      const mergedColumnOptionsMap = new Map<string, { label: string; value: string }>();
                                      (column.options ?? []).forEach((option) => {
                                        mergedColumnOptionsMap.set(option.value, option);
                                      });
                                      dynamicColumnOptions.forEach((option) => {
                                        if (!mergedColumnOptionsMap.has(option.value)) {
                                          mergedColumnOptionsMap.set(option.value, option);
                                        }
                                      });
                                      const mergedColumnOptions = Array.from(mergedColumnOptionsMap.values());

                                      return (
                                        <label key={`${field.name}-${rowIndex}-${column.key}`} className="json-editor-field">
                                          <span>
                                            {column.label}
                                            {column.required ? " *" : ""}
                                          </span>
                                          {column.type === "select" ? (
                                            <select
                                              className="field-control"
                                              value={String(row[column.key] ?? "")}
                                              disabled={Boolean(field.readOnly || dynamicColumnState?.isBlocked)}
                                              onChange={(event) =>
                                                updateJsonEditorCell(field.name, rowIndex, column.key, event.target.value)
                                              }
                                            >
                                              <option value="">
                                                {dynamicColumnState?.isBlocked
                                                  ? "اختر الحقول المطلوبة أولاً..."
                                                  : dynamicColumnState?.isLoading
                                                    ? "جاري تحميل الخيارات..."
                                                    : "اختر..."}
                                              </option>
                                              {mergedColumnOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                  {option.label}
                                                </option>
                                              ))}
                                            </select>
                                          ) : (
                                            <input
                                              type={column.type === "date" ? "date" : column.type === "number" ? "number" : "text"}
                                              className="field-control"
                                              placeholder={column.placeholder}
                                              value={String(row[column.key] ?? "")}
                                              min={column.type === "number" ? column.min : undefined}
                                              max={column.type === "number" ? column.max : undefined}
                                              step={column.type === "number" ? column.step : undefined}
                                              readOnly={field.readOnly}
                                              onChange={(event) =>
                                                updateJsonEditorCell(field.name, rowIndex, column.key, event.target.value)
                                              }
                                            />
                                          )}
                                          {dynamicColumnState?.isBlocked ? (
                                            <small className="field-help">اختر القيم المرتبطة أولاً.</small>
                                          ) : null}
                                          {dynamicColumnState?.isError ? (
                                            <small className="field-help">تعذر تحميل الخيارات.</small>
                                          ) : null}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </article>
                              );
                            })
                          )}
                        </div>
                        {jsonSummary ? (
                          <div className="json-editor-summary">
                            {jsonSummary.hasLineTotals ? (
                              <>
                                <span className="json-editor-chip">الإجمالي قبل الضريبة: {formatEditorAmount(jsonSummary.subtotal)}</span>
                                <span className="json-editor-chip">الضريبة: {formatEditorAmount(jsonSummary.tax)}</span>
                                <span className="json-editor-chip">الإجمالي: {formatEditorAmount(jsonSummary.total)}</span>
                              </>
                            ) : null}
                            {jsonSummary.hasJournalTotals ? (
                              <>
                                <span className="json-editor-chip">مدين: {formatEditorAmount(jsonSummary.debit)}</span>
                                <span className="json-editor-chip">دائن: {formatEditorAmount(jsonSummary.credit)}</span>
                              </>
                            ) : null}
                            {jsonSummary.hasChangeOrderTotals ? (
                              <>
                                <span className="json-editor-chip">
                                  فرق العقد: {formatEditorAmount(jsonSummary.contractDelta)}
                                </span>
                                <span className="json-editor-chip">فرق الميزانية: {formatEditorAmount(jsonSummary.budgetDelta)}</span>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : field.type === "textarea" || field.type === "json" ? (
                      <textarea
                        className="field-control dialog-textarea"
                        rows={field.type === "json" ? field.rows ?? 6 : field.rows ?? 3}
                        placeholder={field.placeholder}
                        value={String(currentValue ?? "")}
                        readOnly={field.readOnly}
                        data-testid={`crud-field-${field.name}`}
                        onChange={(event) => setFormFieldValue(field.name, event.target.value)}
                      />
                    ) : field.type === "select" ? (
                      <select
                        className="field-control"
                        value={String(currentValue ?? "")}
                        disabled={Boolean(field.readOnly || dynamicFieldState?.isBlocked)}
                        data-testid={`crud-field-${field.name}`}
                        onChange={(event) => setFormFieldValue(field.name, event.target.value)}
                      >
                        <option value="">
                          {dynamicFieldState?.isBlocked
                            ? "اختر الحقول المطلوبة أولاً..."
                            : dynamicFieldState?.isLoading
                              ? "جاري تحميل الخيارات..."
                              : "اختر..."}
                        </option>
                        {mergedSelectOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(currentValue)}
                        disabled={field.readOnly}
                        data-testid={`crud-field-${field.name}`}
                        onChange={(event) => setFormFieldValue(field.name, event.target.checked)}
                      />
                    ) : (
                      <input
                        type={field.type}
                        className="field-control"
                        placeholder={field.placeholder}
                        value={String(currentValue ?? "")}
                        min={field.type === "number" ? field.min : undefined}
                        max={field.type === "number" ? field.max : undefined}
                        step={field.type === "number" ? field.step : undefined}
                        readOnly={field.readOnly}
                        data-testid={`crud-field-${field.name}`}
                        onChange={(event) => setFormFieldValue(field.name, event.target.value)}
                      />
                    )}

                    {field.helpText ? <small className="field-help">{field.helpText}</small> : null}
                    {dynamicFieldState?.isBlocked ? (
                      <small className="field-help">اختر الحقل المرتبط أولاً لتحميل الخيارات.</small>
                    ) : null}
                    {dynamicFieldState?.isError ? (
                      <small className="field-help">تعذر تحميل الخيارات. Try refreshing this page.</small>
                    ) : null}
                  </label>
                );
              })}
            </div>

            {validationErrors.length > 0 ? (
              <ul className="validation-list">
                {validationErrors.map((errorItem) => (
                  <li key={errorItem}>{errorItem}</li>
                ))}
              </ul>
            ) : null}

            {formError ? <p className="error-banner">{formError}</p> : null}

            <footer className="dialog-footer">
              <button type="button" className="btn btn-outline" data-testid="crud-dialog-cancel" onClick={closeDialog}>
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="crud-dialog-submit"
                disabled={saving}
                onClick={submitDialog}
              >
                {saving ? "جاري الحفظ..." : dialogMode === "create" ? "إنشاء" : "حفظ التعديلات"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {pendingAction ? (
        <div className="dialog-overlay" role="presentation" onClick={closePendingActionDialog}>
          <div
            className="dialog-card dialog-card-compact"
            role="dialog"
            aria-modal="true"
            data-testid="action-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="dialog-header">
              <h4>{pendingAction.dialog.title}</h4>
              <button type="button" className="btn btn-outline" onClick={closePendingActionDialog}>
                إغلاق
              </button>
            </header>

            <p className="dialog-description">{pendingAction.dialog.description}</p>

            {pendingAction.dialog.fields.length > 0 ? (
              <div className="dialog-form action-dialog-form">
                {pendingAction.dialog.fields.map((field) => {
                  const value = pendingAction.values[field.name];
                  return (
                    <label key={`action-${field.name}`} className="dialog-field">
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      {field.type === "textarea" ? (
                        <textarea
                          className="field-control dialog-textarea"
                          rows={3}
                          placeholder={field.placeholder}
                          value={String(value ?? "")}
                          data-testid={`action-field-${field.name}`}
                          onChange={(event) => updatePendingActionField(field.name, event.target.value)}
                        />
                      ) : field.type === "select" ? (
                        <select
                          className="field-control"
                          value={String(value ?? "")}
                          data-testid={`action-field-${field.name}`}
                          onChange={(event) => updatePendingActionField(field.name, event.target.value)}
                        >
                          <option value="">اختر...</option>
                          {(field.options ?? []).map((option) => (
                            <option key={`${field.name}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          className="field-control"
                          placeholder={field.placeholder}
                          value={String(value ?? "")}
                          data-testid={`action-field-${field.name}`}
                          min={field.type === "number" ? field.min : undefined}
                          max={field.type === "number" ? field.max : undefined}
                          step={field.type === "number" ? field.step : undefined}
                          onChange={(event) => updatePendingActionField(field.name, event.target.value)}
                        />
                      )}
                      {field.helpText ? <small className="field-help">{field.helpText}</small> : null}
                    </label>
                  );
                })}
              </div>
            ) : null}

            {pendingAction.validationErrors.length > 0 ? (
              <ul className="validation-list">
                {pendingAction.validationErrors.map((errorItem) => (
                  <li key={errorItem}>{errorItem}</li>
                ))}
              </ul>
            ) : null}

            {pendingAction.formError ? <p className="error-banner">{pendingAction.formError}</p> : null}

            <footer className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={closePendingActionDialog}>
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="action-dialog-confirm"
                disabled={actionMutation.isPending}
                onClick={submitPendingAction}
              >
                {actionMutation.isPending ? "جاري الإرسال..." : pendingAction.dialog.confirmLabel}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {pendingDeleteRow ? (
        <div className="dialog-overlay" role="presentation" onClick={closeDeleteDialog}>
          <div
            className="dialog-card dialog-card-compact"
            role="dialog"
            aria-modal="true"
            data-testid="delete-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="dialog-header">
              <h4>حذف السجل</h4>
              <button type="button" className="btn btn-outline" data-testid="delete-dialog-close" onClick={closeDeleteDialog}>
                إغلاق
              </button>
            </header>

            <p className="dialog-description">هل أنت متأكد من حذف هذا السجل (#{pendingDeleteRow.id})؟</p>
            {pendingDeleteError ? <p className="error-banner">{pendingDeleteError}</p> : null}

            <footer className="dialog-footer">
              <button type="button" className="btn btn-outline" data-testid="delete-dialog-cancel" onClick={closeDeleteDialog}>
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-danger"
                data-testid="delete-dialog-confirm"
                disabled={deleteMutation.isPending}
                onClick={confirmDelete}
              >
                {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}


