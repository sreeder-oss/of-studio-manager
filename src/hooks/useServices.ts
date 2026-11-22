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

export type StarterService = {
  name: string;
  pricing_unit: 'sf' | 'day';
  rate_default: number;
  rate_low: number;
  rate_high: number;
  materials_included: boolean;
  minimum_charge: number;
  is_active: boolean;
};

export const SEED_SERVICES: StarterService[] = [
  {
    name: 'Vasari Marmorino Lime Plaster',
    pricing_unit: 'sf',
    rate_default: 8.50,
    rate_low: 7.50,
    rate_high: 12.00,
    materials_included: false,
    minimum_charge: 1500,
    is_active: true,
  },
  {
    name: 'Architectural Microcement (Standard Schedule)',
    pricing_unit: 'sf',
    rate_default: 38.00,
    rate_low: 28.00,
    rate_high: 50.00,
    materials_included: false,
    minimum_charge: 2500,
    is_active: true,
  },
  {
    name: 'Specialty Night Labor & Storefront Operations (Per Shift)',
    pricing_unit: 'day',
    rate_default: 1475.00,
    rate_low: 975.00,
    rate_high: 1850.00,
    materials_included: false,
    minimum_charge: 2500,
    is_active: true,
  },
  {
    name: 'Substrate Prep & HEPA Dustless Demolition',
    pricing_unit: 'day',
    rate_default: 950.00,
    rate_low: 750.00,
    rate_high: 1200.00,
    materials_included: false,
    minimum_charge: 950,
    is_active: true,
  },
  {
    name: 'Polished Venetian Plaster',
    pricing_unit: 'sf',
    rate_default: 12.00,
    rate_low: 10.00,
    rate_high: 18.00,
    materials_included: false,
    minimum_charge: 1500,
    is_active: true,
  },
  {
    name: 'Mineral Limewash Application',
    pricing_unit: 'sf',
    rate_default: 2.50,
    rate_low: 1.80,
    rate_high: 3.50,
    materials_included: false,
    minimum_charge: 850,
    is_active: true,
  },
  {
    name: 'Remote Travel & Mobilization Per Diem',
    pricing_unit: 'day',
    rate_default: 225.00,
    rate_low: 175.00,
    rate_high: 300.00,
    materials_included: true,
    minimum_charge: 225,
    is_active: true,
  },
];

export interface ServiceJobStats {
  count: number;
  avgRate: number;
  minRate: number;
  maxRate: number;
  lastDate: string | null;
}

/** Analyzes approved and invoiced estimates to suggest verified rates for each service. */
export const useServiceJobStats = () => {
  const { user, isReady } = useAuthReady();
  return useQuery({
    queryKey: ['service_job_stats', user?.id],
    queryFn: async (): Promise<Record<string, ServiceJobStats>> => {
      const { data, error } = await supabase
        .from('estimates')
        .select('line_items, created_at, status')
        .in('status', ['Approved', 'Invoiced']);
      if (error) throw error;

      const grouped: Record<string, { rates: number[]; dates: string[] }> = {};

      (data || []).forEach((est) => {
        const items = Array.isArray(est.line_items) ? (est.line_items as any[]) : [];
        items.forEach((item) => {
          if (item && item.kind === 'service' && Number(item.rate) > 0) {
            const sid = item.service_id || item.description?.trim();
            if (!sid) return;
            if (!grouped[sid]) grouped[sid] = { rates: [], dates: [] };
            grouped[sid].rates.push(Number(item.rate));
            if (est.created_at) grouped[sid].dates.push(String(est.created_at).slice(0, 10));
          }
        });
      });

      const out: Record<string, ServiceJobStats> = {};
      Object.entries(grouped).forEach(([key, val]) => {
        if (!val.rates.length) return;
        const sum = val.rates.reduce((a, b) => a + b, 0);
        out[key] = {
          count: val.rates.length,
          avgRate: Math.round((sum / val.rates.length) * 100) / 100,
          minRate: Math.min(...val.rates),
          maxRate: Math.max(...val.rates),
          lastDate: val.dates.sort().pop() || null,
        };
      });
      return out;
    },
    enabled: isReady && !!user,
  });
};

