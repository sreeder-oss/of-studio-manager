import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';

export type DbSystem = {
  id: string;
  user_id: string;
  name: string;
  manufacturer: string | null;
  description: string | null;
  coats: number | null;
  coverage_rate: number | null;
  coverage_unit: string | null;
  cost_per_unit: number | null;
  labor_rate_per_sf: number | null;
  typical_equipment: string | null;
  substrate_notes: string | null;
  application_notes: string | null;
  is_active: boolean | null;
  waste_factor: number | null;
  sundries_pct: number | null;
  min_charge: number | null;
  prep_tier_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const useSystems = () => {
  const { user, isReady } = useAuthReady();
  return useQuery({
    queryKey: ['systems', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('systems').select('*').order('name');
      if (error) throw error;
      return data as DbSystem[];
    },
    enabled: isReady && !!user,
  });
};

export const useSaveSystem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<DbSystem> & { name: string }) => {
      const payload = {
        name: s.name, manufacturer: s.manufacturer, description: s.description,
        coats: s.coats, coverage_rate: s.coverage_rate, coverage_unit: s.coverage_unit,
        cost_per_unit: s.cost_per_unit, labor_rate_per_sf: s.labor_rate_per_sf,
        typical_equipment: s.typical_equipment, substrate_notes: s.substrate_notes,
        application_notes: s.application_notes, is_active: s.is_active ?? true,
        waste_factor: s.waste_factor ?? 0.12, sundries_pct: s.sundries_pct ?? 0.05,
        min_charge: s.min_charge ?? null, prep_tier_notes: s.prep_tier_notes ?? null,
      };
      if (s.id) {
        const { error } = await supabase.from('systems').update(payload).eq('id', s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('systems').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['systems'] }),
  });
};

export const useDeleteSystem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('systems').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['systems'] }),
  });
};

export const SEED_SYSTEMS: Array<Omit<DbSystem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'waste_factor' | 'sundries_pct' | 'min_charge' | 'prep_tier_notes'> & Partial<Pick<DbSystem, 'waste_factor' | 'sundries_pct' | 'min_charge' | 'prep_tier_notes'>>> = [
  {
    name: 'Biolime 3-Coat Exterior',
    manufacturer: 'Biolime',
    description: 'Three-coat natural lime plaster system for exterior substrates.',
    coats: 3, coverage_rate: 73, coverage_unit: 'bag',
    cost_per_unit: 76, labor_rate_per_sf: 4.80,
    typical_equipment: 'Hawk & trowel, mortar mixer, scaffolding or scissor lift',
    substrate_notes: 'FasWall block, CMU, properly prepped masonry',
    application_notes: 'Scratch (55 SF/bag $68), brown (65 SF/bag $72), finish (100 SF/bag $88).',
    is_active: true,
  },
  {
    name: 'Bauwerks Limewash',
    manufacturer: 'Bauwerks',
    description: 'Two-coat mineral limewash for exterior masonry & plaster.',
    coats: 2, coverage_rate: 87, coverage_unit: 'gal',
    cost_per_unit: 68, labor_rate_per_sf: 1.80,
    typical_equipment: 'Brush, scaffolding or scissor lift',
    substrate_notes: 'Lime plaster, raw masonry, mineral substrates only',
    application_notes: 'Net 87 SF/gal across both coats.',
    is_active: true,
  },
  {
    name: 'Standard Interior Paint',
    manufacturer: 'Various',
    description: 'Two-coat acrylic interior wall paint.',
    coats: 2, coverage_rate: 400, coverage_unit: 'gal',
    cost_per_unit: 45, labor_rate_per_sf: 1.20,
    typical_equipment: 'Roller, brush, drop cloths, ladder',
    substrate_notes: 'Drywall, primed surfaces',
    application_notes: 'Includes minor patching and one prime coat as needed.',
    is_active: true,
  },
  {
    name: 'Venetian Plaster',
    manufacturer: 'Various',
    description: 'Two-coat polished interior Venetian plaster.',
    coats: 2, coverage_rate: 120, coverage_unit: 'bag',
    cost_per_unit: 95, labor_rate_per_sf: 6.50,
    typical_equipment: 'Steel trowel, sponge, drop cloths',
    substrate_notes: 'Smooth drywall, properly primed',
    application_notes: 'Burnish final coat for sheen.',
    is_active: true,
  },
];
