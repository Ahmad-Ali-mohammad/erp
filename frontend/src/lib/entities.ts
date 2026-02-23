export type Project = {
  id: number;
  code: string;
  name: string;
  client_name: string;
  status: string;
  budget: string;
  contract_value: string;
  currency: string;
};

export type ChangeOrder = {
  id: number;
  order_number: string;
  title: string;
  project: number;
  status: string;
  total_contract_value_delta: string;
  total_budget_delta: string;
};

export type ProjectPhase = {
  id: number;
  project: number;
  name: string;
  sequence: number;
  budget: string;
  planned_progress: string;
  actual_progress: string;
};

export type BoqItem = {
  id: number;
  project: number;
  phase: number | null;
  item_code: string;
  description: string;
  planned_total_cost: string;
  actual_total_cost: string;
};

export type CostCode = {
  id: number;
  project: number;
  code: string;
  name: string;
  is_active: boolean;
};

export type BudgetLine = {
  id: number;
  project: number;
  cost_code: number;
  baseline_amount: string;
  revised_amount: string;
};

export type CostRecord = {
  id: number;
  project: number;
  cost_code: number;
  record_type: string;
  amount: string;
  record_date: string;
  source_module: string;
  source_reference: string;
};

export type Supplier = {
  id: number;
  code: string;
  name: string;
  tax_number: string;
  is_active: boolean;
};

export type Warehouse = {
  id: number;
  code: string;
  name: string;
  location: string;
  is_active: boolean;
};

export type Material = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  reorder_level: string;
  preferred_supplier: number | null;
};

export type PurchaseRequest = {
  id: number;
  request_number: string;
  project: number | null;
  status: string;
  needed_by: string | null;
  created_at: string;
};

export type PurchaseOrder = {
  id: number;
  order_number: string;
  status: string;
  order_date: string;
  total_amount: string;
  supplier: number | null;
  project: number | null;
  items?: Array<{
    id: number;
    quantity: string;
    received_quantity: string;
  }>;
};

export type StockTransaction = {
  id: number;
  transaction_type: string;
  quantity: string;
  transaction_date: string;
  reference_type: string;
  reference_id: string;
};

export type Account = {
  id: number;
  code: string;
  name: string;
  account_type: string;
  report_group?: string;
  is_active: boolean;
};

export type JournalEntry = {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  status: string;
  entry_class?: string;
  source_module?: string;
  source_event?: string;
  currency?: string;
  fx_rate_to_base?: string;
  period?: number | null;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  invoice_type: string;
  status: string;
  partner_name: string;
  issue_date: string;
  total_amount: string;
};

export type InvoiceItem = {
  id: number;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  line_subtotal?: string;
  line_tax?: string;
};

export type InvoiceDetail = Invoice & {
  project?: number | null;
  cost_code?: number | null;
  due_date?: string | null;
  currency?: string;
  subtotal?: string;
  tax_amount?: string;
  total_amount?: string;
  notes?: string;
  items?: InvoiceItem[];
};

export type PrintSettings = {
  id: number;
  watermark_type: "none" | "text" | "image";
  watermark_text: string;
  watermark_image_url: string;
  watermark_opacity: string;
  watermark_rotation: number;
  watermark_scale: string;
  invoice_prefix: string;
  invoice_padding: number;
  invoice_next_number: number;
  created_at: string;
  updated_at: string;
};

export type CompanyProfile = {
  id: number;
  name: string;
  legal_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  website: string;
  primary_color: string;
  secondary_color: string;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: number;
  invoice: number;
  payment_date: string;
  amount: string;
  method: string;
  status: string;
};

export type ProgressBilling = {
  id: number;
  billing_number: string;
  status: string;
  billing_date: string;
  completion_percentage: string;
  total_amount: string;
  linked_invoice: number | null;
};

export type RevenueRecognition = {
  id: number;
  entry_number: string;
  method: string;
  status: string;
  recognition_date: string;
  recognized_amount: string;
};

export type TrialBalanceRow = {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  report_group?: string;
  opening_debit: string;
  opening_credit: string;
  period_debit: string;
  period_credit: string;
  closing_debit: string;
  closing_credit: string;
};

export type LedgerMovement = {
  entry_id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  debit: string;
  credit: string;
  running_balance: string;
};

export type LedgerAccountGroup = {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: string;
  period_debit: string;
  period_credit: string;
  closing_balance: string;
  movements: LedgerMovement[];
};

export type BalanceSheetRow = {
  account_id: number;
  code: string;
  name: string;
  amount: string;
};

export type BalanceSheetSection = {
  as_of_date: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totals: {
    assets: string;
    liabilities: string;
    equity: string;
    equation_gap: string;
    is_balanced: boolean;
  };
};

export type IncomeStatementRow = {
  account_id: number;
  code: string;
  name: string;
  amount: string;
};

export type AccountingKpi = {
  totalRevenue: number;
  totalExpense: number;
  netProfitOrLoss: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  trialBalanceBalanced: boolean;
};

export type FiscalPeriod = {
  id: number;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: string;
};

export type ExchangeRate = {
  id: number;
  from_currency: string;
  to_currency: string;
  rate_date: string;
  rate: string;
};

export type PostingRule = {
  id: number;
  name: string;
  source_module: string;
  source_event: string;
  is_active: boolean;
  posting_policy: string;
  entry_class: string;
};

export type RecurringTemplate = {
  id: number;
  template_code: string;
  name: string;
  frequency: string;
  next_run_date: string;
  is_active: boolean;
};

export type BankStatement = {
  id: number;
  bank_account: number;
  statement_date: string;
  opening_balance: string;
  closing_balance: string;
  status: string;
};

export type Role = {
  id: number;
  name: string;
  slug: string;
};

export type UserRecord = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  job_title?: string;
  is_field_staff?: boolean;
  is_active?: boolean;
  role?: {
    id: number;
    name: string;
    slug: string;
  } | null;
};

export type AuditLog = {
  id: number;
  action: string;
  model_name: string;
  object_id: string;
  created_at: string;
};

export type RealEstateProject = {
  id: number;
  code: string;
  name: string;
  description?: string;
  location?: string;
  status: string;
  currency: string;
  start_date?: string | null;
  expected_end_date?: string | null;
};

export type Building = {
  id: number;
  project: number;
  code: string;
  name: string;
  floors: number;
  notes?: string;
};

export type UnitType = {
  id: number;
  project: number;
  code: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: string;
  base_price: string;
};

export type Unit = {
  id: number;
  building: number;
  unit_type: number | null;
  code: string;
  floor: number;
  area_sqm: string;
  status: string;
  is_active: boolean;
};

export type UnitPricing = {
  id: number;
  unit: number;
  price: string;
  currency: string;
  effective_date: string;
  is_active: boolean;
};

export type Reservation = {
  id: number;
  reservation_number: string;
  unit: number;
  unit_code?: string;
  unit_building_code?: string;
  building_name?: string;
  project_name?: string;
  project_code?: string;
  unit_floor?: number;
  unit_area_sqm?: string;
  unit_type_name?: string;
  customer: number;
  customer_name?: string;
  status: string;
  reserved_at?: string | null;
  expires_at?: string | null;
  notes?: string;
};

export type SalesContract = {
  id: number;
  contract_number: string;
  unit: number;
  unit_code?: string;
  unit_building_code?: string;
  building_name?: string;
  project_name?: string;
  project_code?: string;
  unit_floor?: number;
  unit_area_sqm?: string;
  unit_type_name?: string;
  customer: number;
  customer_name?: string;
  reservation?: number | null;
  status: string;
  contract_date: string;
  total_price: string;
  down_payment: string;
  currency: string;
  signed_by?: string;
};

export type PaymentSchedule = {
  id: number;
  contract: number;
  name: string;
  total_amount: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string;
};

export type Installment = {
  id: number;
  schedule: number;
  installment_number: string;
  contract_number?: string;
  unit_code?: string;
  unit_building_code?: string;
  building_name?: string;
  project_name?: string;
  project_code?: string;
  unit_floor?: number;
  unit_area_sqm?: string;
  unit_type_name?: string;
  due_date: string;
  amount: string;
  currency: string;
  status: string;
  paid_amount: string;
  paid_at?: string | null;
  linked_invoice?: number | null;
};

export type Handover = {
  id: number;
  contract: number;
  contract_number?: string;
  unit_code?: string;
  unit_building_code?: string;
  building_name?: string;
  project_name?: string;
  project_code?: string;
  unit_floor?: number;
  unit_area_sqm?: string;
  unit_type_name?: string;
  status: string;
  handover_date?: string | null;
  notes?: string;
};
