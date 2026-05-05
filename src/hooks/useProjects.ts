import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbProject = Database['public']['Tables']['projects']['Row'];
export type DbProjectInsert = Database['public']['Tables']['projects']['Insert'];

export const useProjects = () => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user,
  });
};

export const useSaveProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: Partial<DbProject> & { name: string }): Promise<DbProject> => {
      const payload = {
        name: project.name,
        contact_id: project.contact_id ?? null,
        status: project.status ?? 'Active',
        address: project.address ?? null,
        start_date: project.start_date ?? null,
        end_date: project.end_date ?? null,
        contract_value: project.contract_value ?? null,
        notes: project.notes ?? null,
      };
      if (project.id) {
        const { data, error } = await supabase
          .from('projects').update(payload).eq('id', project.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('projects').insert(payload as DbProjectInsert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};
