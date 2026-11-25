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
  // 1. Square footage rates (Walls & Floors — Turnkey Labor & Materials)
  {
    name: 'Mineral Limewash — Interior Walls',
    pricing_unit: 'sf',
    rate_default: 5.50,
    rate_low: 4.50,
    rate_high: 7.00,
    materials_included: true,
    minimum_charge: 1200,
    is_active: true,
  },
  {
    name: 'Mineral Limewash — Commercial / Exterior Masonry',
    pricing_unit: 'sf',
    rate_default: 4.50,
    rate_low: 3.75,
    rate_high: 5.50,
    materials_included: true,
    minimum_charge: 1800,
    is_active: true,
  },
  {
    name: 'Venetian & Lime Plaster — Matte / Satin Marmorino',
    pricing_unit: 'sf',
    rate_default: 16.50,
    rate_low: 13.00,
    rate_high: 20.00,
    materials_included: true,
    minimum_charge: 1400,
    is_active: true,
  },
  {
    name: 'Venetian Plaster — High-Gloss Mirror / Travertino / Concrete-Look',
    pricing_unit: 'sf',
    rate_default: 22.00,
    rate_low: 18.00,
    rate_high: 28.00,
    materials_included: true,
    minimum_charge: 1800,
    is_active: true,
  },
  {
    name: 'Microcement — Dry Feature Walls',
    pricing_unit: 'sf',
    rate_default: 22.00,
    rate_low: 18.00,
    rate_high: 26.00,
    materials_included: true,
    minimum_charge: 1800,
    is_active: true,
  },
  {
    name: 'Microcement — Seamless Floors & Retail',
    pricing_unit: 'sf',
    rate_default: 25.00,
    rate_low: 20.00,
    rate_high: 32.00,
    materials_included: true,
    minimum_charge: 2400,
    is_active: true,
  },
  {
    name: 'Microcement / Concretta — Waterproof Showers & Wet Areas',
    pricing_unit: 'sf',
    rate_default: 38.00,
    rate_low: 30.00,
    rate_high: 48.00,
    materials_included: true,
    minimum_charge: 3500,
    is_active: true,
  },
  // 2. Day rates & project minimums (Plus Landed Materials & Consumables)
  {
    name: 'Custom Architectural Features (Fireplaces, Hoods & Arches)',
    pricing_unit: 'day',
    rate_default: 950.00,
    rate_low: 900.00,
    rate_high: 1050.00,
    materials_included: false,
    minimum_charge: 950,
    is_active: true,
  },
  {
    name: 'Substrate Prep & HEPA Dustless Demo (Festool)',
    pricing_unit: 'day',
    rate_default: 950.00,
    rate_low: 850.00,
    rate_high: 1050.00,
    materials_included: false,
    minimum_charge: 950,
    is_active: true,
  },
  {
    name: 'Specialty & Commercial Painting / Touch-Ups',
    pricing_unit: 'day',
    rate_default: 625.00,
    rate_low: 550.00,
    rate_high: 700.00,
    materials_included: false,
    minimum_charge: 450,
    is_active: true,
  },
  {
    name: 'Additional Skilled Applicator / Helper (2nd Person)',
    pricing_unit: 'day',
    rate_default: 450.00,
    rate_low: 425.00,
    rate_high: 475.00,
    materials_included: false,
    minimum_charge: 425,
    is_active: true,
  },
  {
    name: 'Commercial Off-Hours / Night Shift (Solo Principal)',
    pricing_unit: 'day',
    rate_default: 1150.00,
    rate_low: 1100.00,
    rate_high: 1250.00,
    materials_included: false,
    minimum_charge: 1150,
    is_active: true,
  },
  {
    name: 'Commercial Off-Hours / Night Shift (2-Person Crew)',
    pricing_unit: 'day',
    rate_default: 1700.00,
    rate_low: 1600.00,
    rate_high: 1850.00,
    materials_included: false,
    minimum_charge: 2500,
    is_active: true,
  },
  // 3. Regional Travel & Lodging Allowances (Out-of-Area Jobs)
  {
    name: 'Regional Travel & Lodging — Standard (OK / AR / KS / MO)',
    pricing_unit: 'day',
    rate_default: 225.00,
    rate_low: 225.00,
    rate_high: 240.00,
    materials_included: true,
    minimum_charge: 225,
    is_active: true,
  },
  {
    name: 'Regional Travel & Lodging — Tier-1 Metro (DFW / Austin / KC)',
    pricing_unit: 'day',
    rate_default: 285.00,
    rate_low: 275.00,
    rate_high: 310.00,
    materials_included: true,
    minimum_charge: 285,
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

