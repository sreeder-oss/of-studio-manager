import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DbDocument = {
  id: string;
  user_id: string;
  project_id: string | null;
  label: string;
  type: string | null;
  file_url: string | null;
  uploaded_at: string | null;
};

export const useDocuments = (projectId?: string) => {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      let q = supabase.from('documents').select('*').order('uploaded_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbDocument[];
    },
  });
};

export const useSaveDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Partial<DbDocument> & { label: string }) => {
      if (doc.id) {
        const { error } = await supabase.from('documents').update({
          label: doc.label, type: doc.type, file_url: doc.file_url, project_id: doc.project_id,
        }).eq('id', doc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('documents').insert({
          label: doc.label, type: doc.type, file_url: doc.file_url, project_id: doc.project_id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
};

export const useDeleteDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, path }: { id: string; path?: string | null }) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      let key = path || null;
      if (key && /^https?:\/\//.test(key)) {
        const m = key.match(/\/of-documents\/(.+)$/);
        key = m ? decodeURIComponent(m[1].split('?')[0]) : null;
      }
      if (key) {
        const { error: sErr } = await supabase.storage.from('of-documents').remove([key]);
        if (sErr) throw sErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
};

// Returns the storage path (not a URL). Use getDocumentFileUrl to open.
export const uploadDocumentFile = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('of-documents').upload(path, file);
  if (error) throw error;
  return path;
};

// Resolve a stored value (path or legacy public URL) to a short-lived signed URL.
export const getDocumentFileUrl = async (pathOrUrl: string): Promise<string> => {
  if (/^https?:\/\//.test(pathOrUrl)) {
    const m = pathOrUrl.match(/\/of-documents\/(.+)$/);
    if (!m) return pathOrUrl;
    pathOrUrl = m[1];
  }
  const { data, error } = await supabase.storage.from('of-documents').createSignedUrl(pathOrUrl, 3600);
  if (error) throw error;
  return data.signedUrl;
};
