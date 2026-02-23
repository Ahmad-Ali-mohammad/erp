"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import clsx from "clsx";

import { ApiError, listResource, workflowAction } from "@/lib/api-client";
import { hasAnyPermissionClaim, inferAccessAreaFromResourcePath, type AccessArea } from "@/lib/access-control";
import { buildActionPermissionCodenames, buildCrudPermissionCodenames, getResourcePermissionDefinition } from "@/lib/permission-map";
import type { ResourceAction, ResourceActionDialogConfig, ResourceActionFormField } from "@/lib/types";
import { useAccessControl } from "@/lib/use-access-control";
import { StatusBadge } from "@/components/ui/status-badge";

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

type ResourceRow = {
  id: number | string;
  status?: string;
  [key: string]: unknown;
};

type ResourceTablePageProps<T extends ResourceRow> = {
  title: string;
  description: string;
  resourcePath: string;
  accessArea?: AccessArea;
  columns: ColumnDefinition<T>[];
  actions?: ResourceAction[];
  defaultOrdering?: string;
  searchPlaceholder?: string;
  statusOptions?: StatusOption[];
  showStatus?: boolean;
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

const defaultStatusOptions: StatusOption[] = [
  { label: "الكل", value: "" },
  { label: "مسودة", value: "draft" },
  { label: "بانتظار الاعتماد", value: "pending_approval" },
  { label: "معتمد", value: "approved" },
  { label: "مرفوض", value: "rejected" },
  { label: "مكتمل", value: "completed" },
  { label: "ملغي", value: "cancelled" },
];

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

function parseFiniteNumber(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
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

export function ResourceTablePage<T extends ResourceRow>({
  title,
  description,
  resourcePath,
  accessArea,
  columns,
  actions = [],
  defaultOrdering = "-created_at",
  searchPlaceholder = "ابحث...",
  statusOptions = defaultStatusOptions,
  showStatus = true,
}: ResourceTablePageProps<T>) {
  const queryClient = useQueryClient();
  const { canViewArea, canManageArea, canApproveArea, permissions } = useAccessControl();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingResourceAction<T> | null>(null);
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

  const queryKey = useMemo(
    () => ["resource", resourcePath, searchTerm, statusFilter, defaultOrdering],
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

  const actionMutation = useMutation({
    mutationFn: async (payload: {
      rowId: number | string;
      action: string;
      body?: Record<string, unknown>;
    }) =>
      workflowAction(resourcePath, payload.rowId, payload.action, payload.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const data = query.data?.results ?? [];
  const errorMessage =
    query.error instanceof ApiError
      ? query.error.message
      : actionMutation.error instanceof ApiError
        ? actionMutation.error.message
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
        <button type="button" className="btn btn-outline" onClick={() => query.refetch()}>
          تحديث
        </button>
      </header>

      <div className="resource-toolbar">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={searchPlaceholder}
          className="field-control"
        />
        {showStatus ? (
          <select
            className="field-control select-control"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.title}</th>
              ))}
              {showStatus ? <th>الحالة</th> : null}
              {visibleActions.length > 0 ? <th>الإجراءات</th> : null}
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (showStatus ? 1 : 0) + (visibleActions.length ? 1 : 0)}
                  className="table-empty"
                >
                  جاري تحميل البيانات...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showStatus ? 1 : 0) + (visibleActions.length ? 1 : 0)}
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
                  {visibleActions.length > 0 ? (
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
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
    </section>
  );
}
