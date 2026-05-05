import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbContact = Database['public']['Tables']['contacts']['Row'];
export type DbContactInsert = Database['public']['Tables']['contacts']['Insert'];

export const useContacts = () => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user,
  });
};

export const useContact = (id: string) => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['contacts', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user && !!id,
  });
};

export const useSaveContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Partial<DbContact> & { name: string }): Promise<DbContact> => {
      const payload = {
        name: contact.name,
        type: contact.type ?? null,
        status: contact.status ?? null,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        address: contact.address ?? null,
        notes: contact.notes ?? null,
      };
      if (contact.id) {
        const { data, error } = await supabase
          .from('contacts').update(payload).eq('id', contact.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('contacts').insert(payload as DbContactInsert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['estimates'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};
