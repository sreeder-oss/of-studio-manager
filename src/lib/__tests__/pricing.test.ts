import { describe, it, expect } from 'vitest';
import { priceLines, materialCost, materialUnits, materialHandling, type EstimateLine } from '@/lib/pricing';

const line = (p: Partial<EstimateLine>): EstimateLine => ({
  id: 'x', kind: 'service', service_id: null, system_id: null, description: '', qty: 0, unit: 'SF', rate: 0, amount: 0, note: null, ...p,
});
const services = [
  { id: 'tad', minimum_charge: 0 },
  { id: 'hood', minimum_charge: 0 },
  { id: 'paint', minimum_charge: 300 },
];

describe('priceLines', () => {
  it('SF service: 300 SF × $42.50 = $12,750', () => {
    const p = priceLines([line({ service_id: 'tad', qty: 300, unit: 'SF', rate: 42.5 })], services, 0);
    expect(p.lines[0].amount).toBe(12750);
    expect(p.subtotal).toBe(12750);
  });
  it('day-rate service: 2 days × $850 = $1,700', () => {
    const p = priceLines([line({ service_id: 'hood', qty: 2, unit: 'day', rate: 850 })], services, 0);
    expect(p.lines[0].amount).toBe(1700);
  });
  it('minimum charge raises amount and sets a note', () => {
    const p = priceLines([line({ service_id: 'paint', qty: 100, rate: 1 })], services, 0);
    expect(p.lines[0].amount).toBe(300);
    expect(p.lines[0].note).toMatch(/minimum/i);
  });
  it('materials line passes through at cost with no markup', () => {
    const sys = { coverage_rate: 100, coats: 2, cost_per_unit: 50, labor_rate_per_sf: null, waste_factor: 0.12 };
    expect(materialUnits(sys, 300)).toBe(6.72);
    expect(materialCost(sys, 300)).toBe(336);
    const p = priceLines([line({ kind: 'materials', amount: 336, unit: 'lot' })], services, 0);
    expect(p.materials_total).toBe(336);
    expect(p.subtotal).toBe(336);
  });
  it('materialHandling computes fair 10% procurement fee', () => {
    expect(materialHandling(336, 0.1)).toBe(33.6);
    expect(materialHandling(0, 0.1)).toBe(0);
    expect(materialHandling(500, 0)).toBe(0);
  });
  it("'other' line at face value", () => {
    const p = priceLines([line({ kind: 'other', amount: 123.45, unit: 'lot' })], services, 0);
    expect(p.subtotal).toBe(123.45);
    expect(p.total).toBe(123.45);
  });
  it('zero tax: total equals subtotal', () => {
    const p = priceLines([line({ service_id: 'tad', qty: 100, rate: 42.5 }), line({ kind: 'other', amount: 50 })], services, 0);
    expect(p.tax_amount).toBe(0);
    expect(p.total).toBe(4300);
  });
  it('tax applies to subtotal when set', () => {
    const p = priceLines([line({ kind: 'other', amount: 1000 })], services, 0.1);
    expect(p.tax_amount).toBe(100);
    expect(p.total).toBe(1100);
  });
});
