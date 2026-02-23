export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiErrorPayload = {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
};

export type ResourceActionFormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
};

export type ResourceActionDialogConfig = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  fields?: ResourceActionFormField[];
};

export type ResourceAction = {
  label: string;
  action: string;
  variant?: "default" | "success" | "danger" | "warning";
  needsReason?: boolean;
  requiredPermissionLevel?: "manage" | "approve";
  confirmMessage?: string;
  dialog?: ResourceActionDialogConfig | ((row: Record<string, unknown>) => ResourceActionDialogConfig | null);
  payloadBuilder?: (
    row: Record<string, unknown>,
    dialogPayload?: Record<string, unknown>,
  ) => Record<string, unknown> | null | Promise<Record<string, unknown> | null>;
};
