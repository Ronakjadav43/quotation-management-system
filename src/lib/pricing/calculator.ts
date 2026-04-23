import type {
  PricingJSON,
  PricingSection,
  PricingCharge,
  QuotationItemInput,
  CalculatedItem,
  CalculationResult,
  ManualItemInput,
} from "@/types";

export function matchLoadSlab(
  loadKw: number,
  charges: PricingCharge[]
): PricingCharge | null {
  return (
    charges.find(
      (c) =>
        c.min_kw !== undefined &&
        c.max_kw !== undefined &&
        loadKw >= c.min_kw &&
        loadKw <= c.max_kw
    ) ?? null
  );
}

export function calculateChargeAmount(
  charge: PricingCharge,
  loadKw?: number
): number {
  switch (charge.amount_type) {
    case "fixed":
      return charge.amount ?? 0;

    case "formula": {
      if (loadKw === undefined) return charge.base_amount ?? 0;
      const base = charge.base_amount ?? 0;
      const fromKw = charge.formula_from_kw ?? 0;
      const extraKw = Math.max(0, loadKw - fromKw);
      return base + extraKw * (charge.extra_per_kw ?? 0);
    }

    case "per_kw":
      return (charge.rate_per_kw ?? 0) * (loadKw ?? 0);

    default:
      return 0;
  }
}

export function calculateSection(
  section: PricingSection,
  input: QuotationItemInput
): CalculatedItem | null {
  let charge: PricingCharge | null = null;
  let loadKw = input.loadKw;

  if (section.input_type === "type_select") {
    charge = section.charges.find((c) => c.key === input.chargeKey) ?? null;
  } else if (
    section.input_type === "load_kw" ||
    section.input_type === "load_kw_type_select"
  ) {
    if (section.input_type === "load_kw_type_select") {
      charge = section.charges.find((c) => c.key === input.chargeKey) ?? null;
    } else {
      if (loadKw !== undefined) {
        charge = matchLoadSlab(loadKw, section.charges);
      }
    }
  }

  if (!charge) return null;

  const baseAmount = calculateChargeAmount(charge, loadKw);
  const lateFee = input.isLate ? (charge.late_fee ?? 0) : 0;
  const total = baseAmount + lateFee;

  return {
    sectionKey: section.key,
    sectionName: section.section_name,
    itemLabel: charge.label,
    calculationType: charge.amount_type,
    inputData: {
      chargeKey: input.chargeKey,
      loadKw: input.loadKw,
      isLate: input.isLate,
    },
    baseAmount,
    lateFee,
    total,
  };
}

export function calculateQuotation(
  inputs: QuotationItemInput[],
  pricing: PricingJSON,
  manualItems: ManualItemInput[] = [],
  discount = 0
): CalculationResult {
  const items: CalculatedItem[] = [];

  for (const input of inputs) {
    const section = pricing.sections.find((s) => s.key === input.sectionKey);
    if (!section) continue;
    const result = calculateSection(section, input);
    if (result) items.push(result);
  }

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const extraCharges = manualItems.reduce((sum, m) => sum + m.amount, 0);
  const grandTotal = Math.max(0, subtotal + extraCharges - discount);

  return { items, subtotal, extraCharges, discount, grandTotal };
}
