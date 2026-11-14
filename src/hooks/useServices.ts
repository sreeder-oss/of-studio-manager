import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbService = Database['public']['Tables']['services']['Row'];
export type DbServiceInsert = Database['public']['Tables']['services']['Insert'];
export type DbServiceUpdate = Database['public']['Tables']['services']['Update'];

export const useServices = () => {
  const { user, isReady } = useAuthReady();
  return useQuery({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user,
  });
};

/** Update only the fields passed. */
export const useUpdateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DbServiceUpdate }) => {
      const { error } = await supabase.from('services').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
};

export const useCreateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: DbServiceInsert) => {
      const { data, error } = await supabase.from('services').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
};
