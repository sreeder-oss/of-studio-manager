import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbInvoice = Database['public']['Tables']['invoices']['Row'];
export type DbInvoiceInsert = Database['public']['Tables']['invoices']['Insert'];

export const useInvoices = () => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user,
  });
};

export const useInvoice = (id: string) => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['invoices', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user && !!id,
  });
};

export const useSaveInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Partial<DbInvoice>): Promise<DbInvoice> => {
      const payload = {
        contact_id: invoice.contact_id ?? null,
        project_id: invoice.project_id ?? null,
        estimate_id: invoice.estimate_id ?? null,
        line_items: invoice.line_items ?? [],
        subtotal: invoice.subtotal ?? 0,
        tax_rate: invoice.tax_rate ?? 0,
        tax_applied: invoice.tax_applied ?? 0,
        total: invoice.total ?? 0,
        due_date: invoice.due_date ?? null,
        paid: invoice.paid ?? false,
        paid_date: invoice.paid_date ?? null,
        notes: invoice.notes ?? null,
        terms: invoice.terms ?? null,
      };
      if (invoice.id) {
        const { data, error } = await supabase.from('invoices').update(payload).eq('id', invoice.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('invoices').insert(payload as DbInvoiceInsert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      if (row?.id) qc.invalidateQueries({ queryKey: ['invoices', row.id] });
    },
  });
};

/** Pure helper: new amount_paid + status after recording a payment. */
export function applyPayment(
  inv: { total: number; amount_paid: number; deposit_applied: number },
  amount: number,
) {
  const amount_paid = +(Number(inv.amount_paid || 0) + amount).toFixed(2);
  const balance = +(Number(inv.total || 0) - amount_paid - Number(inv.deposit_applied || 0)).toFixed(2);
  const status = balance <= 0 ? 'paid' : amount_paid > 0 ? 'partial' : 'sent';
  return { amount_paid, balance, status };
}

export const useRecordInvoicePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoice, amount }: { invoice: DbInvoice; amount: number }) => {
      if (!(amount > 0)) throw new Error('Payment amount must be greater than 0');
      const { amount_paid, status } = applyPayment(
        { total: Number(invoice.total), amount_paid: Number(invoice.amount_paid), deposit_applied: Number(invoice.deposit_applied) },
        amount,
      );
      const paid = status === 'paid';
      const { data, error } = await supabase.from('invoices')
        .update({ amount_paid, status, paid, paid_date: paid ? new Date().toISOString().split('T')[0] : null })
        .eq('id', invoice.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
};

export const useDeleteInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
};
