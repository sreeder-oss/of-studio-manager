import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbContact = {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  status: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string | null;
};

export const useContacts = () => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbContact[];
    },
    enabled: isReady && !!user,
  });
};

export const useContact = (id: string) => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['contacts', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').eq('id', id).single();
      if (error) throw error;
      return data as DbContact;
    },
    enabled: isReady && !!user && !!id,
  });
};

export const useSaveContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Partial<DbContact> & { name: string }) => {
      if (contact.id) {
        const { error } = await supabase.from('contacts').update({
          name: contact.name, type: contact.type, status: contact.status,
          email: contact.email, phone: contact.phone, address: contact.address, notes: contact.notes,
        }).eq('id', contact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contacts').insert({
          name: contact.name, type: contact.type, status: contact.status,
          email: contact.email, phone: contact.phone, address: contact.address, notes: contact.notes,
        });
        if (error) throw error;
      }
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
};
