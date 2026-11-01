import { describe, it, expect } from 'vitest';
import { computeEstimatePricing } from '@/lib/pricing';

const settings = {
  default_overhead_pct: 0.15, default_profit_pct: 0.2, default_tax_rate: 0.0875,
  default_waste_factor: 0.12, sundries_pct: 0.05, minimum_charge: 0,
};
const system = { coverage_rate: 100, coats: 2, cost_per_unit: 50, labor_rate_per_sf: 10, waste_factor: 0.12, sundries_pct: 0.05, min_charge: null };

describe('computeEstimatePricing', () => {
  const p = computeEstimatePricing({ system, area_sf: 300, settings });
  it('units = (area ÷ coverage) × coats × (1 + waste)', () => expect(p.units_needed).toBe(6.72));
  it('material = units × cost per unit', () => expect(p.material_cost).toBe(336));
  it('labor = area × labor rate', () => expect(p.labor_cost).toBe(3000));
  it('direct = material + labor + sundries', () => {
    expect(p.sundries_cost).toBe(166.8);
    expect(p.direct_cost_subtotal).toBe(3502.8);
  });
  it('applies overhead, profit, then tax', () => {
    expect(p.overhead_amount).toBe(525.42);
    expect(p.profit_amount).toBe(805.64);
    expect(p.pre_tax_total).toBe(4833.86);
    expect(p.tax_amount).toBe(422.96);
    expect(p.total).toBe(5256.82);
  });
  it('enforces the system minimum charge before tax', () => {
    const m = computeEstimatePricing({ system: { ...system, min_charge: 10000 }, area_sf: 300, settings });
    expect(m.pre_tax_total).toBe(10000);
    expect(m.total).toBe(10875);
  });
  it('falls back to the settings minimum charge', () => {
    const m = computeEstimatePricing({ system, area_sf: 10, settings: { ...settings, minimum_charge: 1500 } });
    expect(m.pre_tax_total).toBe(1500);
  });
});

import { computeScopePricing } from '@/lib/pricing';
describe('computeScopePricing', () => {
  it('sums two areas and line items reconcile with pre-tax', () => {
    const p = computeScopePricing([
      { name: 'Entry', area_sf: 150, system },
      { name: 'Den', area_sf: 150, system },
    ], settings);
    expect(p.direct_cost_subtotal).toBe(3502.8);
    expect(+(p.areas[0].pre_tax + p.areas[1].pre_tax).toFixed(2)).toBe(p.pre_tax_total);
  });
  it('raises Tadelakt to at least $55/SF all-in', () => {
    const p = computeScopePricing([{ name: 'Shower', area_sf: 300, system: { ...system, name: 'NAA Tadelakt' } }], settings);
    expect(p.total).toBeGreaterThanOrEqual(16500 - 0.01);
    expect(p.total).toBeLessThanOrEqual(16500.01);
  });
  it('caps Tadelakt at $60/SF all-in', () => {
    const p = computeScopePricing([{ name: 'Shower', area_sf: 100, system: { ...system, labor_rate_per_sf: 200, name: 'Tadelakt' } }], settings);
    expect(p.total).toBeLessThanOrEqual(6000.01);
  });
});
