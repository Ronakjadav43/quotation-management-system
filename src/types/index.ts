export type UserRole = "ADMIN" | "STAFF" | "VIEWER";
export type QuotationStatus = "DRAFT" | "FINAL" | "APPROVED" | "REJECTED";

export interface PricingCharge {
  key: string;
  label: string;
  amount_type: "fixed" | "formula" | "per_kw" | "slab";
  amount?: number;
  late_fee?: number;
  min_kw?: number;
  max_kw?: number;
  base_amount?: number;
  extra_per_kw?: number;
  formula_from_kw?: number;
  rate_per_kw?: number;
  sub_types?: Array<{
    key: string;
    label: string;
    rate_per_kw: number;
  }>;
}

export interface PricingSection {
  key: string;
  section_name: string;
  description?: string;
  input_type: "type_select" | "load_kw" | "load_kw_type_select";
  charges: PricingCharge[];
}

export interface PricingJSON {
  title: string;
  version: string;
  sections: PricingSection[];
}

export interface QuotationItemInput {
  sectionKey: string;
  chargeKey?: string;
  loadKw?: number;
  isLate?: boolean;
  subTypeKey?: string;
}

export interface CalculatedItem {
  sectionKey: string;
  sectionName: string;
  itemLabel: string;
  calculationType: string;
  inputData: Record<string, unknown>;
  baseAmount: number;
  lateFee: number;
  total: number;
}

export interface CalculationResult {
  items: CalculatedItem[];
  subtotal: number;
  extraCharges: number;
  discount: number;
  grandTotal: number;
}

export interface ManualItemInput {
  label: string;
  amount: number;
}
