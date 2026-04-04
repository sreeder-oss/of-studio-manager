import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DbPhoto = {
  id: string;
  user_id: string;
  project_id: string | null;
  image_url: string | null;
  caption: string | null;
  phase: string | null;
  taken_at: string | null;
};

export const usePhotos = (projectId?: string) => {
  return useQuery({
    queryKey: ['photos', projectId],
    queryFn: async () => {
      let q = supabase.from('photos').select('*').order('taken_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbPhoto[];
    },
  });
};

export const useSavePhoto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: Partial<DbPhoto> & { project_id: string }) => {
      const { error } = await supabase.from('photos').insert({
        project_id: photo.project_id, image_url: photo.image_url,
        caption: photo.caption, phase: photo.phase || 'During',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
  });
};

export const useDeletePhoto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('photos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
  });
};

export const uploadProjectPhoto = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('of-photos').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('of-photos').getPublicUrl(path);
  return data.publicUrl;
};
