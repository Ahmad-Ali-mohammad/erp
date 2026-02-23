export type PortalContract = {
  id: number;
  contract_number: string;
  status: string;
  contract_date: string;
  total_price: string;
  down_payment: string;
  currency?: string;
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
};

export type PortalInstallment = {
  id: number;
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
  currency?: string;
  status: string;
  paid_amount: string;
  paid_at: string | null;
  schedule: number;
  linked_invoice: number | null;
};

export type PortalReservation = {
  id: number;
  reservation_number: string;
  status: string;
  reserved_at: string | null;
  expires_at: string | null;
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
};

export type PortalHandover = {
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
  handover_date: string | null;
  notes: string;
};

export type PortalInvoice = {
  id: number;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  total_amount: string;
  currency: string;
};

export type PortalInvoiceItem = {
  id: number;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  line_subtotal?: string;
  line_tax?: string;
};

export type PortalInvoiceDetail = {
  id: number;
  invoice_number: string;
  invoice_type: string;
  status: string;
  partner_name: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal?: string;
  tax_amount?: string;
  total_amount?: string;
  notes?: string;
  items?: PortalInvoiceItem[];
};

export type PortalPayment = {
  id: number;
  invoice: number;
  invoice_number?: string;
  payment_date: string;
  amount: string;
  currency?: string;
  method: string;
  status: string;
  reference_no: string;
};

export type PortalInstallmentPayment = {
  id: number;
  payment: number | null;
  invoice: number | null;
  installment: number | null;
  amount: string;
  payment_reference?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_amount?: string | null;
  currency?: string | null;
  created_at: string;
};

export type PortalPaymentAllocation = {
  id: number;
  payment: number | null;
  invoice: number | null;
  installment: number | null;
  amount: string;
  payment_reference?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_amount?: string | null;
  currency?: string | null;
  created_at: string;
};

export type PortalPaymentIntent = {
  id: number;
  status: string;
  amount: string;
  currency: string;
  invoice: number | null;
  installment: number | null;
  customer: number | null;
  provider_intent_id: string;
  client_secret: string;
  created_at: string;
};
