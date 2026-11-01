/**
 * Deterministic estimate pricing. All money math lives here — the AI never sets prices.
 * Rates are fractions (0.12 = 12%).
 */
export interface PricingSystem {
  coverage_rate: number | null;   // SF per unit
  coats: number | null;
  cost_per_unit: number | null;
  labor_rate_per_sf: number | null;
  waste_factor?: number | null;
  sundries_pct?: number | null;
  min_charge?: number | null;
}

export interface PricingSettings {
  default_overhead_pct: number;
  default_profit_pct: number;
  default_tax_rate: number;
  default_waste_factor: number;
  sundries_pct: number;
  minimum_charge: number;
}

export interface PricingInput {
  system: PricingSystem | null;
  area_sf: number;
  settings: PricingSettings;
  /** Extra direct costs from manual line items (added before overhead/profit). */
  extra_direct?: number;
  /** Overrides settings.default_tax_rate when provided. */
  tax_rate?: number;
}

export interface PricingBreakdown {
  area_sf: number;
  units_needed: number;
  material_cost: number;
  labor_cost: number;
  sundries_cost: number;
  extra_direct: number;
  direct_cost_subtotal: number;
  overhead_pct: number;
  overhead_amount: number;
  profit_pct: number;
  profit_amount: number;
  min_charge: number;
  min_charge_adjustment: number;
  pre_tax_total: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  per_sf: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

export function computeEstimatePricing({ system, area_sf, settings, extra_direct = 0, tax_rate }: PricingInput): PricingBreakdown {
  const area = Math.max(0, num(area_sf));
  const coverage = num(system?.coverage_rate);
  const coats = num(system?.coats, 1) || 1;
  const waste = system?.waste_factor != null ? num(system.waste_factor) : num(settings.default_waste_factor);
  const sundriesPct = system?.sundries_pct != null ? num(system.sundries_pct) : num(settings.sundries_pct);

  const units = system && coverage > 0 ? (area / coverage) * coats * (1 + waste) : 0;
  const material = r2(units * num(system?.cost_per_unit));
  const labor = r2(system ? area * num(system.labor_rate_per_sf) : 0);
  const sundries = r2((material + labor) * sundriesPct);
  const extra = r2(Math.max(0, num(extra_direct)));
  const direct = r2(material + labor + sundries + extra);

  const ohPct = num(settings.default_overhead_pct);
  const prPct = num(settings.default_profit_pct);
  const overhead = r2(direct * ohPct);
  const profit = r2((direct + overhead) * prPct);
  const computedPreTax = r2(direct + overhead + profit);

  const minCharge = system?.min_charge != null ? num(system.min_charge) : num(settings.minimum_charge);
  const preTax = direct > 0 ? Math.max(computedPreTax, minCharge) : computedPreTax;
  const minAdj = r2(preTax - computedPreTax);

  const taxRate = tax_rate != null ? num(tax_rate) : num(settings.default_tax_rate);
  const tax = r2(preTax * taxRate);
  const total = r2(preTax + tax);

  return {
    area_sf: area,
    units_needed: Math.round(units * 100) / 100,
    material_cost: material,
    labor_cost: labor,
    sundries_cost: sundries,
    extra_direct: extra,
    direct_cost_subtotal: direct,
    overhead_pct: ohPct,
    overhead_amount: overhead,
    profit_pct: prPct,
    profit_amount: profit,
    min_charge: minCharge,
    min_charge_adjustment: minAdj,
    pre_tax_total: r2(preTax),
    tax_rate: taxRate,
    tax_amount: tax,
    total,
    per_sf: area > 0 ? r2(total / area) : 0,
  };
}
