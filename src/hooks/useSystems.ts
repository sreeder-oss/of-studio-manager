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
    name: 'SureCrete Architectural Microcement System',
    manufacturer: 'SureCrete / FloorTek',
    description: 'Commercial & architectural microcement overlay with heavy mortar base, fiberglass mesh lath, MicroTex/SureBroom hand-troweled overlay, and FloorTek 6 NanoCoat protective seal.',
    coats: 4, coverage_rate: 150, coverage_unit: 'bag',
    cost_per_unit: 93.95, labor_rate_per_sf: 38.00,
    typical_equipment: 'Festool HEPA dustless sanding system, steel finishing trowels, sponge floats, mixing station, containment barrier',
    substrate_notes: 'Demolition of failing substrate, dustless prep, PVA & Quartz primer bridge coats, heavy polymer mortar with embedded fiberglass mesh',
    application_notes: 'Phase 1: Dustless demo/prep. Phase 2: PVA & Quartz bridge coats + mortar/mesh. Phase 3: 2 coats SureCrete MicroTex/SureBroom. 48hr cure. Phase 4: 2-3 coats FloorTek 6 NanoCoat sealer.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 2500,
    is_active: true,
  },
  {
    name: 'Vasari Marmorino Lime Plaster System',
    manufacturer: 'Vasari',
    description: 'Authentic Italian lime Marmorino plaster with gypsum leveling sub-base, twin structural passes of authentic lime plaster, natural olive oil soap fusion layer, and burnished Aqua Wax protective topcoat.',
    coats: 3, coverage_rate: 180, coverage_unit: 'bag',
    cost_per_unit: 145.00, labor_rate_per_sf: 8.50,
    typical_equipment: 'Japanese stainless trowel, hawk, burnishing blades, olive oil soap applicator, buffing microfiber',
    substrate_notes: 'Structurally sound, flat drywall or masonry, primed with gypsum leveling base',
    application_notes: 'Waterproof luxury environment finish with olive oil soap sealer fusion and Aqua Wax burnished seal.',
    waste_factor: 0.12, sundries_pct: 0.05, min_charge: 1500,
    is_active: true,
  },
  {
    name: 'Polished Venetian Plaster',
    manufacturer: 'Vasari / San Marco',
    description: 'Two to three-coat authentic polished interior Venetian plaster burnished to a high gloss mirror sheen.',
    coats: 3, coverage_rate: 120, coverage_unit: 'bag',
    cost_per_unit: 125.00, labor_rate_per_sf: 12.00,
    typical_equipment: 'Venetian steel trowel, spatulas, burnishing pads, drop cloths',
    substrate_notes: 'Level 5 smooth drywall, properly primed with quartz primer',
    application_notes: 'Multiple ultra-thin passes, compressed and burnished for sheen.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 1500,
    is_active: true,
  },
  {
    name: 'Mineral Limewash / Paint System',
    manufacturer: 'Bauwerk / Romabio',
    description: 'Two-coat breathable mineral limewash for interior & exterior masonry, plaster, and drywall.',
    coats: 2, coverage_rate: 250, coverage_unit: 'gal',
    cost_per_unit: 68.00, labor_rate_per_sf: 2.50,
    typical_equipment: 'Masonry brush, limewash brush, drop cloths',
    substrate_notes: 'Lime plaster, masonry, or mineral-primed drywall',
    application_notes: 'Cloud-effect cross-hatch brush application.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 850,
    is_active: true,
  },
  {
    name: 'Standard Interior Paint',
    manufacturer: 'Various',
    description: 'Two-coat acrylic interior wall paint.',
    coats: 2, coverage_rate: 400, coverage_unit: 'gal',
    cost_per_unit: 45.00, labor_rate_per_sf: 1.20,
    typical_equipment: 'Roller, brush, drop cloths, ladder',
    substrate_notes: 'Drywall, primed surfaces',
    application_notes: 'Includes minor patching and one prime coat as needed.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 500,
    is_active: true,
  },
];

