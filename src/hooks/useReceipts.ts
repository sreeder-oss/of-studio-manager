import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbReceipt = {
  id: string;
  user_id: string;
  project_id: string | null;
  vendor: string | null;
  amount: number;
  receipt_date: string;
  category: string | null;
  tax_deductible: boolean | null;
  tax_year: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string | null;
};

export const useReceipts = () => {
  const { user, isReady } = useAuthReady();

  return useQuery({
    queryKey: ['receipts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('receipts').select('*').order('receipt_date', { ascending: false });
      if (error) throw error;
      return data as DbReceipt[];
    },
    enabled: isReady && !!user,
  });
};

export const useSaveReceipt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (receipt: Partial<DbReceipt> & { amount: number; receipt_date: string }) => {
      if (receipt.id) {
        const { error } = await supabase.from('receipts').update({
          vendor: receipt.vendor, amount: receipt.amount, receipt_date: receipt.receipt_date,
          category: receipt.category, project_id: receipt.project_id,
          tax_deductible: receipt.tax_deductible, image_url: receipt.image_url, notes: receipt.notes,
        }).eq('id', receipt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('receipts').insert({
          vendor: receipt.vendor, amount: receipt.amount, receipt_date: receipt.receipt_date,
          category: receipt.category, project_id: receipt.project_id,
          tax_deductible: receipt.tax_deductible, image_url: receipt.image_url, notes: receipt.notes,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  });
};

export const useDeleteReceipt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  });
};

export const uploadReceiptImage = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('receipts').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
};
