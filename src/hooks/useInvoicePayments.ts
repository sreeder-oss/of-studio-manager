import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type InvoicePayment = Database['public']['Tables']['invoice_payments']['Row'];
export const PAYMENT_METHODS = ['Check', 'Zelle'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

/** Today's date (YYYY-MM-DD) in the device's local time zone. */
export function localToday(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Pure: the four invoice columns derived from the payment ledger. */
export function ledgerSummary(
  inv: { total: number | null; deposit_applied: number | null },
  payments: { amount: number | null; paid_on: string | null }[],
) {
  const amount_paid = Math.round(payments.reduce((s, p) => s + Number(p.amount || 0), 0) * 100) / 100;
  const balance = Math.round((Number(inv.total || 0) - Number(inv.deposit_applied || 0) - amount_paid) * 100) / 100;
  const status = balance <= 0 ? 'paid' : amount_paid > 0 ? 'partial' : 'sent';
  const paid = status === 'paid';
  const last = payments.map((p) => p.paid_on || '').filter(Boolean).sort().pop() || null;
  return { amount_paid, status, paid, paid_date: paid ? last : null };
}

/** Re-read the ledger and write ONLY amount_paid, status, paid, paid_date. */
export async function recomputeInvoiceFromLedger(invoiceId: string) {
  const { data: inv, error: e1 } = await supabase.from('invoices').select('total, deposit_applied').eq('id', invoiceId).single();
  if (e1 || !inv) throw e1 ?? new Error('Invoice not found');
  const { data: pays, error: e2 } = await supabase.from('invoice_payments').select('amount, paid_on').eq('invoice_id', invoiceId);
  if (e2) throw e2;
  const s = ledgerSummary(inv, pays || []);
  const { error } = await supabase.from('invoices').update({
    amount_paid: s.amount_paid,
    status: s.status,
    paid: s.paid,
    paid_date: s.paid_date,
  }).eq('id', invoiceId);
  if (error) throw error;
  return s;
}

export const useInvoicePayments = (invoiceId: string) => useQuery({
  queryKey: ['invoice_payments', invoiceId],
  enabled: !!invoiceId,
  queryFn: async () => {
    const { data, error } = await supabase.from('invoice_payments').select('*').eq('invoice_id', invoiceId)
      .order('paid_on', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
});

const useInvalidate = () => {
  const qc = useQueryClient();
  return (invoiceId: string) => {
    qc.invalidateQueries({ queryKey: ['invoice_payments', invoiceId] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };
};

export const useAddInvoicePayment = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (p: { invoice_id: string; amount: number; paid_on: string; method: PaymentMethod; reference?: string | null; note?: string | null }) => {
      if (!(p.amount > 0)) throw new Error('Payment amount must be greater than 0');
      const { error } = await supabase.from('invoice_payments').insert({
        invoice_id: p.invoice_id, amount: Math.round(p.amount * 100) / 100, paid_on: p.paid_on,
        method: p.method, reference: p.reference || null, note: p.note || null,
      });
      if (error) throw error;
      return recomputeInvoiceFromLedger(p.invoice_id);
    },
    onSettled: (_d, _e, v) => invalidate(v.invoice_id),
  });
};

export const useDeleteInvoicePayment = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (p: { id: string; invoice_id: string }) => {
      const { error } = await supabase.from('invoice_payments').delete().eq('id', p.id);
      if (error) throw error;
      return recomputeInvoiceFromLedger(p.invoice_id);
    },
    onSettled: (_d, _e, v) => invalidate(v.invoice_id),
  });
};
