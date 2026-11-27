/**
 * Deterministic estimate pricing. All money math lives here — the AI never sets prices.
 *
 * Pricing model (price book):
 *  - Labor is a flat rate per SF or per day from the services table; profit is inside that rate.
 *  - Materials pass through at cost, no markup.
 *  - No overhead %, profit %, sundries % or hidden adjustments on the client price.
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

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/* ------------------------------------------------------------------ */
/* Materials quantity (coverage × coats × waste)                        */
/* ------------------------------------------------------------------ */

/** units = (area_sf ÷ coverage_rate) × coats × (1 + waste_factor). */
export function materialUnits(system: PricingSystem | null, area_sf: number, default_waste = 0.12): number {
  const coverage = num(system?.coverage_rate);
  if (!system || coverage <= 0) return 0;
  const coats = num(system.coats, 1) || 1;
  const waste = system.waste_factor != null ? num(system.waste_factor) : num(default_waste);
  return Math.round(((Math.max(0, num(area_sf)) / coverage) * coats * (1 + waste)) * 100) / 100;
}

/** Materials at cost = units × cost_per_unit (no markup). */
export function materialCost(system: PricingSystem | null, area_sf: number, default_waste = 0.12): number {
  const units = materialUnits(system, area_sf, default_waste);
  return r2(units * num(system?.cost_per_unit));
}

/** Fair material handling / procurement fee (e.g. 10% = 0.10). */
export function materialHandling(materialsCost: number, handling_pct = 0): number {
  return r2(Math.max(0, num(materialsCost)) * Math.max(0, num(handling_pct)));
}

/* ------------------------------------------------------------------ */
/* Price-book line pricing                                              */
/* ------------------------------------------------------------------ */

export type LineKind = 'service' | 'materials' | 'other';
export type LineUnit = 'SF' | 'day' | 'lot';

export interface EstimateLine {
  id: string;
  kind: LineKind;
  service_id: string | null;
  system_id: string | null;
  description: string;
  qty: number;
  unit: LineUnit;
  rate: number;
  amount: number;
  note: string | null;
  /** Grouping for the editor; optional. */
  area_id?: string | null;
  area_name?: string | null;
  materials_included?: boolean;
  /** Optional solo-craftsman duration estimate stored on the primary line item. */
  duration_estimate?: string | null;
}

export interface PriceBookService {
  id: string;
  minimum_charge: number | null;
}

export interface LinePricing {
  lines: EstimateLine[];
  service_total: number;
  materials_total: number;
  other_total: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

/**
 * Price an estimate from lines.
 *  - service: amount = qty × rate (cents); raised to the service minimum_charge if below it.
 *  - materials: amount is cost, no markup.
 *  - other: amount exactly as typed.
 */
export function priceLines(lines: EstimateLine[], services: PriceBookService[], tax_rate: number): LinePricing {
  const byId = new Map(services.map((s) => [s.id, s]));
  const out = lines.map((l): EstimateLine => {
    if (l.kind === 'service') {
      const raw = r2(num(l.qty) * num(l.rate));
      const min = num(l.service_id ? byId.get(l.service_id)?.minimum_charge : 0);
      if (min > 0 && num(l.qty) > 0 && raw < min) {
        return { ...l, amount: r2(min), note: `Raised to $${min.toLocaleString(undefined, { minimumFractionDigits: 2 })} minimum charge` };
      }
      return { ...l, amount: raw, note: l.note && /minimum charge/i.test(l.note) ? null : l.note };
    }
    return { ...l, amount: r2(num(l.amount)) };
  });
  const sum = (k: LineKind) => r2(out.filter((l) => l.kind === k).reduce((s, l) => s + l.amount, 0));
  const service_total = sum('service');
  const materials_total = sum('materials');
  const other_total = sum('other');
  const subtotal = r2(out.reduce((s, l) => s + l.amount, 0));
  const rate = Math.max(0, num(tax_rate));
  const tax_amount = r2(subtotal * rate);
  return { lines: out, service_total, materials_total, other_total, subtotal, tax_rate: rate, tax_amount, total: r2(subtotal + tax_amount) };
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
  pre_tax: number;
}

export interface ScopePricing extends Omit<PricingBreakdown, 'extra_direct'> {
  areas: AreaPricing[];
}

/** Materials at cost + labor at the system's per-SF rate. No overhead, profit, sundries or adjustments. */
export function computeScopePricing(areas: ScopeAreaInput[], settings: PricingSettings, tax_rate?: number): ScopePricing {
  const taxRate = tax_rate != null ? num(tax_rate) : num(settings.default_tax_rate);
  const out: AreaPricing[] = areas.map((a) => {
    const sf = Math.max(0, num(a.area_sf));
    const units = materialUnits(a.system, sf, settings.default_waste_factor);
    const material = materialCost(a.system, sf, settings.default_waste_factor);
    const labor = r2(a.system ? sf * num(a.system.labor_rate_per_sf) : 0);
    const direct = r2(material + labor);
    return {
      name: a.name, area_sf: sf, system_name: a.system?.name ?? null,
      units_needed: units, material_cost: material, labor_cost: labor, sundries_cost: 0,
      direct_cost: direct, computed_pre_tax: direct, pre_tax: direct,
    };
  });
  const sum = (k: keyof AreaPricing) => r2(out.reduce((s, a) => s + Number(a[k] || 0), 0));
  const area = sum('area_sf');
  const preTax = sum('pre_tax');
  const tax = r2(preTax * taxRate);
  const total = r2(preTax + tax);
  return {
    areas: out,
    area_sf: area,
    units_needed: sum('units_needed'),
    material_cost: sum('material_cost'),
    labor_cost: sum('labor_cost'),
    sundries_cost: 0,
    direct_cost_subtotal: sum('direct_cost'),
    overhead_pct: 0, overhead_amount: 0,
    profit_pct: 0, profit_amount: 0,
    min_charge: 0, min_charge_adjustment: 0,
    pre_tax_total: preTax,
    tax_rate: taxRate, tax_amount: tax, total,
    per_sf: area > 0 ? r2(total / area) : 0,
  };
}
