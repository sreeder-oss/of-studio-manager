import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type DbEstimate = {
  id: string;
  user_id: string;
  project_id: string | null;
  contact_id: string | null;
  line_items: Json | null;
  subtotal: number | null;
  tax_rate: number | null;
  total: number | null;
  status: string | null;
  valid_until: string | null;
  created_at: string | null;
};

export const useEstimates = () => {
  return useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estimates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbEstimate[];
    },
  });
};

export const useEstimate = (id: string) => {
  return useQuery({
    queryKey: ['estimates', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('estimates').select('*').eq('id', id).single();
      if (error) throw error;
      return data as DbEstimate;
    },
    enabled: !!id,
  });
};

export const useSaveEstimate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (estimate: Partial<DbEstimate> & { contact_id: string; line_items: Json; subtotal: number; total: number }) => {
      if (estimate.id) {
        const { error } = await supabase.from('estimates').update({
          contact_id: estimate.contact_id, project_id: estimate.project_id,
          line_items: estimate.line_items, subtotal: estimate.subtotal,
          tax_rate: estimate.tax_rate, total: estimate.total,
          status: estimate.status, valid_until: estimate.valid_until,
        }).eq('id', estimate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('estimates').insert({
          contact_id: estimate.contact_id, project_id: estimate.project_id,
          line_items: estimate.line_items, subtotal: estimate.subtotal,
          tax_rate: estimate.tax_rate, total: estimate.total,
          status: estimate.status || 'Pending', valid_until: estimate.valid_until,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estimates'] }),
  });
};

export const useDeleteEstimate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('estimates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estimates'] }),
  });
};
