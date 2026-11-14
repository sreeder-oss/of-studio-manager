import { describe, it, expect } from 'vitest';
import { coerceToInvoiceDoc } from '@/lib/invoicePdf';
import { recalcInvoice } from '@/lib/invoiceSchema';

describe('invoice PDF balance', () => {
  it('balance due = total - deposit_applied - payments', () => {
    const doc = coerceToInvoiceDoc([{ description: 'Work', amount: 10000 }], {
      invoice_number: 'INV-0007', total: 10000, deposit_applied: 2000,
      payments: [{ date: '2026-11-01', method: 'Check', reference: '1042', amount: 3000 }],
    })!;
    const inv = recalcInvoice(doc);
    expect(inv.invoice_number).toBe('INV-0007');
    expect(inv.prior_payments).toHaveLength(1);
    expect(inv.balance_due).toBe(5000);
  });
});
