import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { applyPayment } from '@/hooks/useInvoices';

describe('applyPayment', () => {
  it('partial payment sets status partial', () => {
    expect(applyPayment({ total: 1000, amount_paid: 0, deposit_applied: 0 }, 400)).toEqual({ amount_paid: 400, balance: 600, status: 'partial' });
  });
  it('payment covering balance after deposit sets paid', () => {
    expect(applyPayment({ total: 1000, amount_paid: 200, deposit_applied: 500 }, 300).status).toBe('paid');
  });
});
