import { describe, it, expect } from 'vitest';
import { toPriceRows, linesMatchSubtotal, pricePerSf } from './estimateLines';
import { coerceToEstimateDoc } from './estimatePdf';

const lines = [
  { kind: 'service', area_id: 'a', description: 'Primary shower - Tadelakt', qty: 120, unit: 'SF', rate: 42.5, amount: 5100 },
  { kind: 'service', area_id: 'b', description: 'Vent hood', qty: 2, unit: 'day', rate: 850, amount: 1700 },
  { kind: 'materials', area_id: 'b', description: 'Materials at cost', qty: 3, unit: 'lot', rate: 40, amount: 120 },
  { kind: 'other', description: 'Mobilization', qty: 1, unit: 'lot', rate: 200, amount: 200 },
];

describe('client price rows', () => {
  it('puts materials under its area and others last', () => {
    expect(toPriceRows(lines).map((r) => r.kind)).toEqual(['service', 'service', 'materials', 'other']);
  });
  it('lines must add to the subtotal exactly', () => {
    const rows = toPriceRows(lines);
    expect(linesMatchSubtotal(rows, 7120)).toBe(true);
    expect(linesMatchSubtotal(rows, 7120.01)).toBe(false);
  });
  it('price per SF = total / SF', () => {
    expect(pricePerSf(7120, toPriceRows(lines))).toBe(59.33);
  });
  it('coerce keeps real qty, unit and rate', () => {
    const doc = coerceToEstimateDoc(lines, { total: 7120 })!;
    const li = doc.sections[0].line_items;
    expect(li[0]).toMatchObject({ qty: 120, unit: 'SF', unit_cost: 42.5, total: 5100 });
    expect(li[1]).toMatchObject({ qty: 2, unit: 'day', unit_cost: 850, total: 1700 });
  });
});
