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

/* ------------------------------------------------------------------ */
/* Multi-area pricing for AI-extracted scope                           */
/* ------------------------------------------------------------------ */

export interface ScopeAreaInput {
  name: string;
  area_sf: number;
  system: (PricingSystem & { name?: string | null }) | null;
}

export interface AreaPricing {
  name: string;
  area_sf: number;
  system_name: string | null;
  units_needed: number;
  material_cost: number;
  labor_cost: number;
  sundries_cost: number;
  direct_cost: number;
  computed_pre_tax: number;
  /** Adjustment from a per-SF floor/ceiling rule (e.g. Tadelakt $55–$60/SF all-in). */
  rule_adjustment: number;
  rule_note: string | null;
  pre_tax: number;
}

export interface ScopePricing extends Omit<PricingBreakdown, 'extra_direct'> {
  areas: AreaPricing[];
  rule_adjustment: number;
}

/** Tadelakt is always $55–$60/SF all-in (incl. tax), regardless of manufacturer. */
export const TADELAKT_MIN_PER_SF = 55;
export const TADELAKT_MAX_PER_SF = 60;
export const isTadelakt = (name?: string | null) => /tadelakt/i.test(name || '');

export function computeScopePricing(areas: ScopeAreaInput[], settings: PricingSettings, tax_rate?: number): ScopePricing {
  const taxRate = tax_rate != null ? num(tax_rate) : num(settings.default_tax_rate);
  const ohPct = num(settings.default_overhead_pct);
  const prPct = num(settings.default_profit_pct);

  const out: AreaPricing[] = areas.map((a) => {
    const p = computeEstimatePricing({ system: a.system ? { ...a.system, min_charge: null } : null, area_sf: a.area_sf, settings: { ...settings, minimum_charge: 0 }, tax_rate: taxRate });
    let preTax = p.pre_tax_total;
    let note: string | null = null;
    if (isTadelakt(a.system?.name) && p.area_sf > 0) {
      const minPre = r2((TADELAKT_MIN_PER_SF * p.area_sf) / (1 + taxRate));
      const maxPre = r2((TADELAKT_MAX_PER_SF * p.area_sf) / (1 + taxRate));
      if (preTax < minPre) { preTax = minPre; note = `Raised to Tadelakt floor of $${TADELAKT_MIN_PER_SF}/SF all-in`; }
      else if (preTax > maxPre) { preTax = maxPre; note = `Capped at Tadelakt ceiling of $${TADELAKT_MAX_PER_SF}/SF all-in`; }
    }
    return {
      name: a.name, area_sf: p.area_sf, system_name: a.system?.name ?? null,
      units_needed: p.units_needed, material_cost: p.material_cost, labor_cost: p.labor_cost,
      sundries_cost: p.sundries_cost, direct_cost: p.direct_cost_subtotal,
      computed_pre_tax: p.pre_tax_total, rule_adjustment: r2(preTax - p.pre_tax_total), rule_note: note, pre_tax: preTax,
    };
  });

  const sum = (k: keyof AreaPricing) => r2(out.reduce((s, a) => s + Number(a[k] || 0), 0));
  const area = sum('area_sf');
  const direct = sum('direct_cost');
  const overhead = r2(direct * ohPct);
  const profit = r2((direct + overhead) * prPct);
  const ruleAdj = sum('rule_adjustment');
  const afterRules = sum('pre_tax');

  const systemMins = areas.map((a) => a.system?.min_charge).filter((v): v is number => v != null).map(Number);
  const minCharge = systemMins.length ? Math.max(...systemMins) : num(settings.minimum_charge);
  const preTax = direct > 0 ? Math.max(afterRules, minCharge) : afterRules;
  const minAdj = r2(preTax - afterRules);
  // Spread min-charge adjustment across areas proportionally so line items reconcile.
  if (minAdj > 0 && afterRules > 0) {
    let left = minAdj;
    out.forEach((a, i) => {
      const share = i === out.length - 1 ? left : r2(minAdj * (a.pre_tax / afterRules));
      a.pre_tax = r2(a.pre_tax + share); left = r2(left - share);
    });
  }
  const tax = r2(preTax * taxRate);
  const total = r2(preTax + tax);

  return {
    areas: out,
    area_sf: area,
    units_needed: sum('units_needed'),
    material_cost: sum('material_cost'),
    labor_cost: sum('labor_cost'),
    sundries_cost: sum('sundries_cost'),
    direct_cost_subtotal: direct,
    overhead_pct: ohPct, overhead_amount: overhead,
    profit_pct: prPct, profit_amount: profit,
    rule_adjustment: ruleAdj,
    min_charge: minCharge, min_charge_adjustment: minAdj,
    pre_tax_total: r2(preTax),
    tax_rate: taxRate, tax_amount: tax, total,
    per_sf: area > 0 ? r2(total / area) : 0,
  };
}
