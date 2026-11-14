import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbEstimate = Database['public']['Tables']['estimates']['Row'];
export type DbEstimateInsert = Database['public']['Tables']['estimates']['Insert'];
export type DbEstimateUpdate = Database['public']['Tables']['estimates']['Update'];

export const useEstimates = () => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['estimates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('estimates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user,
  });
};

export const useEstimate = (id: string) => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['estimates', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('estimates').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user && !!id,
  });
};

/** UPDATE payload: only keys the caller actually passed (undefined is dropped, null is kept). */
export function buildUpdatePayload(input: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k !== 'id' && input[k] !== undefined) out[k] = input[k];
  }
  return out;
}

type SaveEstimateInput = Partial<DbEstimate> &
  Pick<DbEstimateInsert, 'contact_id' | 'line_items' | 'subtotal' | 'total'>;

export const useSaveEstimate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (estimate: SaveEstimateInput): Promise<DbEstimate> => {
      const payload = {
        contact_id: estimate.contact_id,
        project_id: estimate.project_id ?? null,
        line_items: estimate.line_items,
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        total: estimate.total,
        status: estimate.status ?? 'Pending',
        valid_until: estimate.valid_until ?? null,
        notes: estimate.notes ?? null,
        terms: estimate.terms ?? null,
        direct_cost_subtotal: estimate.direct_cost_subtotal,
        overhead_amount: estimate.overhead_amount,
        profit_amount: estimate.profit_amount,
        pre_tax_total: estimate.pre_tax_total,
        tax_amount: estimate.tax_amount,
        system_id: estimate.system_id,
        area_sf: estimate.area_sf,
        model_used: estimate.model_used,
        prompt: estimate.prompt,
      };

      if (estimate.id) {
        const { data, error } = await supabase
          .from('estimates')
          .update(buildUpdatePayload(estimate, Object.keys(payload)) as DbEstimateUpdate)
          .eq('id', estimate.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('estimates')
        .insert(payload as DbEstimateInsert)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['estimates'] });
      if (row?.id) qc.invalidateQueries({ queryKey: ['estimates', row.id] });
    },
  });
};

export const useDeleteEstimate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('estimates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
