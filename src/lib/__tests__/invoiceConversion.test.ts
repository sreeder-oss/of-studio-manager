import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { nextInvoiceNumber, conversionInsert } from '@/hooks/useInvoices';

describe('nextInvoiceNumber', () => {
  it('starts at INV-0001', () => expect(nextInvoiceNumber([])).toBe('INV-0001'));
  it('increments past the highest existing number', () =>
    expect(nextInvoiceNumber(['INV-0002', null, 'INV-0010', 'INV-0003'])).toBe('INV-0011'));
});

describe('conversionInsert', () => {
  it('never credits a deposit as paid', () => {
    const row = conversionInsert({ id: 'e1', total: 10000, subtotal: 10000, tax_amount: 0, tax_rate: 0, line_items: [] } as any, 'INV-0001');
    expect(row.deposit_applied).toBe(0);
    expect(row.status).toBe('draft');
    expect(row.total).toBe(10000);
  });
});
