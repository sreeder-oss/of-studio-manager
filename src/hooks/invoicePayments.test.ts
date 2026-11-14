import { describe, it, expect } from 'vitest';
import { ledgerSummary, localToday } from './useInvoicePayments';

const inv = { total: 1000, deposit_applied: 200 };
describe('ledgerSummary', () => {
  it('no payments -> sent, unpaid', () => {
    expect(ledgerSummary(inv, [])).toEqual({ amount_paid: 0, status: 'sent', paid: false, paid_date: null });
  });
  it('some paid -> partial, no paid date', () => {
    expect(ledgerSummary(inv, [{ amount: 300, paid_on: '2026-11-01' }])).toEqual({ amount_paid: 300, status: 'partial', paid: false, paid_date: null });
  });
  it('balance 0 -> paid, date of last payment', () => {
    expect(ledgerSummary(inv, [{ amount: 300, paid_on: '2026-11-09' }, { amount: 500, paid_on: '2026-11-01' }]))
      .toEqual({ amount_paid: 800, status: 'paid', paid: true, paid_date: '2026-11-09' });
  });
  it('localToday uses local date parts', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
