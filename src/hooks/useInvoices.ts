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
