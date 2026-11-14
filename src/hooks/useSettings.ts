import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuthReady } from '@/hooks/useAuthReady';
import { LEGAL_TERMS, COMPANY_INFO } from '@/lib/legal';

export type DbSettings = Database['public']['Tables']['user_settings']['Row'];
export type Settings = Omit<DbSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

/** Default terms; `{deposit}` is replaced with the deposit percentage when rendered. */
export const DEFAULT_TERMS_TEXT = Object.values(LEGAL_TERMS)
  .map((t) => t.replace('A 50% deposit', 'A {deposit}% deposit'))
  .join('\n\n');

export const DEFAULT_SETTINGS: Settings = {
  default_tax_rate: 0,
  default_overhead_pct: 0.15,
  default_profit_pct: 0.2,
  default_deposit_pct: 0.5,
  minimum_charge: 0,
  default_waste_factor: 0.12,
  sundries_pct: 0.05,
  mobilization_fee: 0,
  terms_text: DEFAULT_TERMS_TEXT,
  company_name: COMPANY_INFO.name,
  company_address: null,
  license_number: null,
  payee_name: 'Shawn Reeder',
  zelle_contact: null,
};

/** Format a fraction (0.5) as a percent label ("50"). */
export const pctLabel = (f: number) => String(+(Number(f || 0) * 100).toFixed(2));

/** Terms paragraphs with the deposit percentage filled in. */
export function renderTerms(s: Pick<Settings, 'terms_text' | 'default_deposit_pct'>): string[] {
  const text = (s.terms_text && s.terms_text.trim()) || DEFAULT_TERMS_TEXT;
  return text.replace(/\{deposit\}/g, pctLabel(s.default_deposit_pct)).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export const depositAmount = (total: number, depositPct: number) => +(Number(total || 0) * Number(depositPct || 0)).toFixed(2);

export const useSettings = () => {
  const { user, isReady } = useAuthReady();
  const q = useQuery({
    queryKey: ['user_settings', user?.id],
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase.from('user_settings').select('*').maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;
      const { id, user_id, created_at, updated_at, ...rest } = data;
      return { ...rest, terms_text: rest.terms_text || DEFAULT_TERMS_TEXT };
    },
    enabled: isReady && !!user,
  });
  return { ...q, settings: q.data ?? DEFAULT_SETTINGS };
};

export const useSaveSettings = () => {
  const qc = useQueryClient();
  const { user } = useAuthReady();
  return useMutation({
    mutationFn: async (s: Settings) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('user_settings').upsert({ ...s, user_id: user.id }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_settings'] }),
  });
};
