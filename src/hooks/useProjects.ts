import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DbProject = {
  id: string;
  user_id: string;
  contact_id: string | null;
  name: string;
  status: string | null;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  notes: string | null;
  created_at: string | null;
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbProject[];
    },
  });
};

export const useSaveProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: Partial<DbProject> & { name: string }) => {
      if (project.id) {
        const { error } = await supabase.from('projects').update({
          name: project.name, contact_id: project.contact_id, status: project.status,
          address: project.address, start_date: project.start_date, end_date: project.end_date,
          contract_value: project.contract_value, notes: project.notes,
        }).eq('id', project.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('projects').insert({
          name: project.name, contact_id: project.contact_id, status: project.status || 'Active',
          address: project.address, start_date: project.start_date, end_date: project.end_date,
          contract_value: project.contract_value, notes: project.notes,
        }).select().single();
        if (error) throw error;
        return data;
      }
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
