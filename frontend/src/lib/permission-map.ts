import type { AccessArea } from "@/lib/access-control";

export type ResourcePermissionDefinition = {
  resourcePath: string;
  area: AccessArea;
  model: string;
  actionCodenames?: Record<string, string[]>;
};

const resourcePermissionMap: ResourcePermissionDefinition[] = [
  { resourcePath: "/v1/core/roles/", area: "admin", model: "role" },
  { resourcePath: "/v1/core/users/", area: "admin", model: "user" },
  { resourcePath: "/v1/core/audit-logs/", area: "admin", model: "auditlog" },
  { resourcePath: "/v1/core/company-profile/", area: "finance", model: "companyprofile" },
  { resourcePath: "/v1/core/customers/", area: "admin", model: "customer" },

  // v2 finance/master data
  { resourcePath: "/v2/finance/accounts/", area: "finance", model: "glaccount" },
  { resourcePath: "/v2/finance/cost-centers/", area: "finance", model: "costcenter" },
  { resourcePath: "/v2/masters/customers/", area: "finance", model: "customer" },
  { resourcePath: "/v2/masters/vendors/", area: "finance", model: "vendor" },
  { resourcePath: "/v2/masters/items/", area: "finance", model: "item" },
  { resourcePath: "/v2/inventory/locations/", area: "procurement", model: "inventorylocation" },
  { resourcePath: "/v2/inventory/movements/", area: "procurement", model: "inventorymovement" },
  { resourcePath: "/v2/inventory/adjustments/", area: "procurement", model: "inventoryadjustment" },
  { resourcePath: "/v2/inventory/count-sessions/", area: "procurement", model: "inventorycountsession" },
  { resourcePath: "/v2/sales/quotations/", area: "finance", model: "salesquotation" },
  { resourcePath: "/v2/sales/orders/", area: "finance", model: "salesorder" },
  { resourcePath: "/v2/sales/invoices/", area: "finance", model: "salesinvoice" },
  { resourcePath: "/v2/purchase/orders/", area: "procurement", model: "purchaseorder" },
  { resourcePath: "/v2/purchase/receipts/", area: "procurement", model: "purchasereceipt" },
  { resourcePath: "/v2/purchase/invoices/", area: "procurement", model: "purchaseinvoice" },
  { resourcePath: "/v2/treasury/receipts/", area: "finance", model: "treasuryreceipt" },
  { resourcePath: "/v2/treasury/payments/", area: "finance", model: "treasurypayment" },
  { resourcePath: "/v2/treasury/cheques/", area: "finance", model: "treasurycheque" },
  { resourcePath: "/v2/banking/statements/", area: "finance", model: "bankstatement" },
  { resourcePath: "/v2/banking/reconciliations/", area: "finance", model: "bankreconciliation" },
  { resourcePath: "/v2/gl/journal-entries/", area: "finance", model: "glentry" },
  { resourcePath: "/v2/finance/posting-rules/", area: "finance", model: "postingrule" },

  { resourcePath: "/v1/projects/projects/", area: "projects", model: "project", actionCodenames: { close: ["projects.close_project"] } },
  { resourcePath: "/v1/projects/phases/", area: "projects", model: "phase" },
  { resourcePath: "/v1/projects/boq-items/", area: "projects", model: "boqitem" },
  { resourcePath: "/v1/projects/cost-codes/", area: "projects", model: "costcode" },
  { resourcePath: "/v1/projects/budget-lines/", area: "projects", model: "budgetline" },
  { resourcePath: "/v1/projects/cost-records/", area: "projects", model: "costrecord" },
  {
    resourcePath: "/v1/projects/change-orders/",
    area: "projects",
    model: "changeorder",
    actionCodenames: {
      submit: ["projects.submit_changeorder"],
      approve: ["projects.approve_changeorder"],
      reject: ["projects.reject_changeorder"],
    },
  },

  { resourcePath: "/v1/procurement/suppliers/", area: "procurement", model: "supplier" },
  { resourcePath: "/v1/procurement/warehouses/", area: "procurement", model: "warehouse" },
  { resourcePath: "/v1/procurement/materials/", area: "procurement", model: "material" },
  {
    resourcePath: "/v1/procurement/purchase-requests/",
    area: "procurement",
    model: "purchaserequest",
    actionCodenames: {
      submit: ["procurement.submit_purchaserequest"],
      approve: ["procurement.approve_purchaserequest"],
      reject: ["procurement.reject_purchaserequest"],
    },
  },
  {
    resourcePath: "/v1/procurement/purchase-orders/",
    area: "procurement",
    model: "purchaseorder",
    actionCodenames: {
      send: ["procurement.send_purchaseorder"],
      receive: ["procurement.receive_purchaseorder"],
      cancel: ["procurement.cancel_purchaseorder"],
    },
  },
  { resourcePath: "/v1/procurement/stock-transactions/", area: "procurement", model: "stocktransaction" },

  { resourcePath: "/v1/finance/accounts/", area: "finance", model: "account" },
  {
    resourcePath: "/v1/finance/journal-entries/",
    area: "finance",
    model: "journalentry",
    actionCodenames: {
      post: ["finance.post_journalentry"],
      reverse: ["finance.reverse_journalentry"],
      correct: ["finance.correct_journalentry"],
    },
  },
  { resourcePath: "/v1/finance/journal-entries/export/", area: "finance", model: "journalentry" },
  { resourcePath: "/v1/finance/journal-entries/import/", area: "finance", model: "journalentry" },
  { resourcePath: "/v1/finance/journal-entries/import-template/", area: "finance", model: "journalentry" },
  {
    resourcePath: "/v1/finance/invoices/",
    area: "finance",
    model: "invoice",
    actionCodenames: {
      submit: ["finance.submit_invoice"],
      approve: ["finance.approve_invoice"],
      reject: ["finance.reject_invoice"],
    },
  },
  {
    resourcePath: "/v1/finance/payments/",
    area: "finance",
    model: "payment",
    actionCodenames: {
      submit: ["finance.submit_payment"],
      approve: ["finance.approve_payment"],
      reject: ["finance.reject_payment"],
    },
  },
  {
    resourcePath: "/v1/finance/progress-billings/",
    area: "finance",
    model: "progressbilling",
    actionCodenames: {
      submit: ["finance.submit_progressbilling"],
      approve: ["finance.approve_progressbilling"],
      reject: ["finance.reject_progressbilling"],
      "generate-invoice": ["finance.generate_invoice_progressbilling"],
    },
  },
  {
    resourcePath: "/v1/finance/revenue-recognition/",
    area: "finance",
    model: "revenuerecognition",
    actionCodenames: {
      submit: ["finance.submit_revenuerecognition"],
      approve: ["finance.approve_revenuerecognition"],
      reject: ["finance.reject_revenuerecognition"],
    },
  },
  {
    resourcePath: "/v1/finance/periods/",
    area: "finance",
    model: "fiscalperiod",
    actionCodenames: {
      "soft-close": ["finance.soft_close_fiscalperiod"],
      "hard-close": ["finance.hard_close_fiscalperiod"],
    },
  },
  { resourcePath: "/v1/finance/exchange-rates/", area: "finance", model: "exchangerate" },
  { resourcePath: "/v1/finance/print-settings/", area: "finance", model: "printsettings" },
  { resourcePath: "/v1/finance/posting-rules/", area: "finance", model: "postingrule" },
  { resourcePath: "/v1/finance/recurring-templates/", area: "finance", model: "recurringentrytemplate" },
  { resourcePath: "/v1/finance/bank-accounts/", area: "finance", model: "bankaccount" },
  { resourcePath: "/v1/finance/bank-statements/", area: "finance", model: "bankstatement" },
  {
    resourcePath: "/v1/finance/bank-reconciliation-sessions/",
    area: "finance",
    model: "bankreconciliationsession",
  },
  { resourcePath: "/v1/finance/reports/trial-balance/", area: "finance", model: "financialreport" },
  { resourcePath: "/v1/finance/reports/general-journal/", area: "finance", model: "financialreport" },
  { resourcePath: "/v1/finance/reports/general-ledger/", area: "finance", model: "financialreport" },
  { resourcePath: "/v1/finance/reports/balance-sheet/", area: "finance", model: "financialreport" },
  { resourcePath: "/v1/finance/reports/income-statement/", area: "finance", model: "financialreport" },
  {
    resourcePath: "/v1/finance/year-close/",
    area: "finance",
    model: "yearclose",
    actionCodenames: {
      run: ["finance.run_yearclose"],
    },
  },

  { resourcePath: "/v1/real-estate/projects/", area: "real_estate", model: "realestateproject" },
  { resourcePath: "/v1/real-estate/buildings/", area: "real_estate", model: "building" },
  { resourcePath: "/v1/real-estate/unit-types/", area: "real_estate", model: "unittype" },
  { resourcePath: "/v1/real-estate/units/", area: "real_estate", model: "unit" },
  { resourcePath: "/v1/real-estate/unit-pricing/", area: "real_estate", model: "unitpricing" },
  { resourcePath: "/v1/real-estate/reservations/", area: "real_estate", model: "reservation" },
  { resourcePath: "/v1/real-estate/sales-contracts/", area: "real_estate", model: "salescontract" },
  { resourcePath: "/v1/real-estate/payment-schedules/", area: "real_estate", model: "paymentschedule" },
  { resourcePath: "/v1/real-estate/installments/", area: "real_estate", model: "installment" },
  { resourcePath: "/v1/real-estate/handovers/", area: "real_estate", model: "handover" },
  { resourcePath: "/v1/real-estate/portal/contracts/", area: "real_estate", model: "salescontract" },
  { resourcePath: "/v1/real-estate/portal/installments/", area: "real_estate", model: "installment" },
  { resourcePath: "/v1/real-estate/portal/reservations/", area: "real_estate", model: "reservation" },
  { resourcePath: "/v1/real-estate/portal/handovers/", area: "real_estate", model: "handover" },
  { resourcePath: "/v1/finance/portal/payments/", area: "finance", model: "payment" },
  { resourcePath: "/v1/payments/payment-intents/", area: "finance", model: "paymentintent" },
];

const defaultActionVerbByActionName: Record<string, "view" | "add" | "change" | "delete" | "approve" | "submit" | "reject" | "close" | "send" | "receive" | "cancel" | "generate_invoice"> = {
  submit: "submit",
  approve: "approve",
  reject: "reject",
  close: "close",
  send: "send",
  receive: "receive",
  cancel: "cancel",
  "generate-invoice": "generate_invoice",
};

function normalizeResourcePath(path: string): string {
  if (!path.endsWith("/")) {
    return `${path}/`;
  }
  return path;
}

export function getResourcePermissionDefinition(resourcePath: string): ResourcePermissionDefinition | null {
  const normalized = normalizeResourcePath(resourcePath);
  return resourcePermissionMap.find((definition) => normalizeResourcePath(definition.resourcePath) === normalized) ?? null;
}

export function buildCrudPermissionCodenames(
  definition: ResourcePermissionDefinition | null,
  operation: "view" | "add" | "change" | "delete",
): string[] {
  if (!definition) {
    return [];
  }
  const { area, model } = definition;
  const codename = `${operation}_${model}`;
  return [
    `${area}.${codename}`,
    codename,
    `${area}:${codename}`,
    `${area}.${operation}.${model}`,
    `${area}:${operation}:${model}`,
    `${area}:*`,
    `${area}.*`,
  ];
}

export function buildActionPermissionCodenames(
  definition: ResourcePermissionDefinition | null,
  actionName: string,
): string[] {
  if (!definition) {
    return [];
  }
  const explicit = definition.actionCodenames?.[actionName] ?? [];
  if (explicit.length > 0) {
    return Array.from(new Set([...explicit, `${definition.area}:*`, `${definition.area}.*`]));
  }

  const normalizedAction = actionName.trim().toLowerCase();
  const verb = defaultActionVerbByActionName[normalizedAction];
  if (!verb) {
    return [];
  }
  const actionCodename = `${verb}_${definition.model}`;
  return [
    `${definition.area}.${actionCodename}`,
    actionCodename,
    `${definition.area}:${actionCodename}`,
    `${definition.area}.${verb}.${definition.model}`,
    `${definition.area}:${verb}:${definition.model}`,
    `${definition.area}:*`,
    `${definition.area}.*`,
  ];
}

export function listMappedResourcePaths(): string[] {
  return resourcePermissionMap.map((definition) => normalizeResourcePath(definition.resourcePath));
}
