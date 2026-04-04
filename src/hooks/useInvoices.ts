import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbInvoice = {
  id: string;
  user_id: string;
  project_id: string | null;
  estimate_id: string | null;
  contact_id: string | null;
  line_items: Json | null;
  subtotal: number | null;
  tax_applied: number | null;
  total: number | null;
  due_date: string | null;
  paid: boolean | null;
  paid_date: string | null;
  created_at: string | null;
};

export const useInvoices = () => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbInvoice[];
    },
    enabled: isReady && !!user,
  });
};

export const useInvoice = (id: string) => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['invoices', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
      if (error) throw error;
      return data as DbInvoice;
    },
    enabled: isReady && !!user && !!id,
  });
};

export const useSaveInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Partial<DbInvoice>) => {
      if (invoice.id) {
        const { error } = await supabase.from('invoices').update({
          contact_id: invoice.contact_id, project_id: invoice.project_id,
          estimate_id: invoice.estimate_id, line_items: invoice.line_items,
          subtotal: invoice.subtotal, tax_applied: invoice.tax_applied, total: invoice.total,
          due_date: invoice.due_date, paid: invoice.paid, paid_date: invoice.paid_date,
        }).eq('id', invoice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('invoices').insert({
          contact_id: invoice.contact_id, project_id: invoice.project_id,
          estimate_id: invoice.estimate_id, line_items: invoice.line_items,
          subtotal: invoice.subtotal, tax_applied: invoice.tax_applied, total: invoice.total,
          due_date: invoice.due_date, paid: invoice.paid,
        });
        if (error) throw error;
      }
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
