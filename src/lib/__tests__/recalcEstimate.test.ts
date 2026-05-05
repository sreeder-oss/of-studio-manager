import { describe, it, expect } from 'vitest';
import { recalcEstimate, type EstimateDoc } from '@/lib/estimateSchema';

const baseDoc = (overrides: Partial<EstimateDoc> = {}): EstimateDoc => ({
  title: 'Test',
  client_name: '',
  project_address: '',
  substrate: '',
  system_name: '',
  area_sf: 100,
  area_note: '',
  duration_estimate: '',
  sections: [
    { label: 'A', line_items: [{ description: 'x', sub_note: '', qty: 2, unit: 'sf', unit_cost: 10, total: 0 }], subtotal: 0 },
    { label: 'B', line_items: [{ description: 'y', sub_note: '', qty: 1, unit: 'lot', unit_cost: 50, total: 0 }], subtotal: 0 },
    { label: 'C', line_items: [], subtotal: 0 },
    { label: 'D', line_items: [], subtotal: 0 },
    { label: 'E', line_items: [], subtotal: 0 },
  ],
  direct_cost_subtotal: 0,
  overhead_pct: 10,
  overhead_amount: 0,
  profit_pct: 10,
  profit_amount: 0,
  tax_rate: 0,
  tax_amount: 0,
  total: 0,
  per_sf: 0,
  assumptions: [],
  exclusions: [],
  system_note: '',
  valid_until: '',
  ...overrides,
});

describe('recalcEstimate', () => {
  it('computes line totals, section subtotals, direct cost, overhead, profit', () => {
    const out = recalcEstimate(baseDoc());
    expect(out.sections[0].line_items[0].total).toBe(20);
    expect(out.sections[0].subtotal).toBe(20);
    expect(out.sections[1].subtotal).toBe(50);
    expect(out.direct_cost_subtotal).toBe(70);
    expect(out.overhead_amount).toBe(7);
    // profit applied on direct + overhead
    expect(out.profit_amount).toBe(+(77 * 0.1).toFixed(2));
  });

  it('applies tax on pre-tax total and computes per_sf', () => {
    const out = recalcEstimate(baseDoc({ tax_rate: 10, area_sf: 50 }));
    const preTax = out.direct_cost_subtotal + out.overhead_amount + out.profit_amount;
    expect(out.tax_amount).toBeCloseTo(preTax * 0.1, 2);
    expect(out.total).toBeCloseTo(preTax + out.tax_amount, 2);
    expect(out.per_sf).toBeCloseTo(out.total / 50, 2);
  });

  it('handles zero area_sf without dividing by zero', () => {
    const out = recalcEstimate(baseDoc({ area_sf: 0 }));
    expect(out.per_sf).toBe(0);
  });

  it('excludes section E from direct cost', () => {
    const doc = baseDoc({
      sections: [
        { label: 'A', line_items: [], subtotal: 0 },
        { label: 'B', line_items: [], subtotal: 0 },
        { label: 'C', line_items: [], subtotal: 0 },
        { label: 'D', line_items: [{ description: 'd', sub_note: '', qty: 1, unit: 'ea', unit_cost: 100, total: 0 }], subtotal: 0 },
        { label: 'E', line_items: [{ description: 'e', sub_note: '', qty: 1, unit: 'ea', unit_cost: 999, total: 0 }], subtotal: 0 },
      ],
      overhead_pct: 0,
      profit_pct: 0,
    });
    const out = recalcEstimate(doc);
    expect(out.direct_cost_subtotal).toBe(100);
  });
});
