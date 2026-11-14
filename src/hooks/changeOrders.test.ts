import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { appendChangeOrders, approvedChangesTotal } from './useChangeOrders';

describe('change orders', () => {
  it('revised contract counts only Approved, credits subtract', () => {
    expect(approvedChangesTotal([
      { status: 'Approved', amount: 1200 }, { status: 'Approved', amount: -200 },
      { status: 'Proposed', amount: 999 }, { status: 'Declined', amount: 500 },
    ])).toBe(1000);
  });
  it('appends "Change order: …" lines and recomputes totals', () => {
    const r = appendChangeOrders([{ kind: 'service', amount: 5000 }], [{ id: 'c1', description: 'Extra niche', amount: 750 }, { id: 'c2', description: 'Credit', amount: -100 }], 0);
    expect((r.line_items as any[]).slice(1).map(l => [l.description, l.amount])).toEqual([['Change order: Extra niche', 750], ['Change order: Credit', -100]]);
    expect(r.subtotal).toBe(5650);
    expect(r.total).toBe(5650);
  });
  it('applies tax rate to the new subtotal', () => {
    const r = appendChangeOrders([{ amount: 1000 }], [{ id: 'c', description: 'x', amount: 1000 }], 0.1);
    expect(r).toMatchObject({ subtotal: 2000, tax_amount: 200, tax_applied: 200, total: 2200 });
  });
});
