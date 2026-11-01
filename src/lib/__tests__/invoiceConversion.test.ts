import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { nextInvoiceNumber, depositCollected } from '@/hooks/useInvoices';

describe('nextInvoiceNumber', () => {
  it('starts at INV-0001', () => expect(nextInvoiceNumber([])).toBe('INV-0001'));
  it('increments past the highest existing number', () =>
    expect(nextInvoiceNumber(['INV-0002', null, 'INV-0010', 'INV-0003'])).toBe('INV-0011'));
});

describe('depositCollected', () => {
  it('reads deposit recorded on the estimate', () => expect(depositCollected({ deposit_collected: 1500 })).toBe(1500));
  it('is 0 when none recorded', () => expect(depositCollected([{ amount: 5 }])).toBe(0));
});
