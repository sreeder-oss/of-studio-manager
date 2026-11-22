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
  // --- SURECRETE SYSTEMS ---
  {
    name: 'SureCrete SureBroom Base & Broom Resurfacing System',
    manufacturer: 'SureCrete',
    description: 'High-strength (6,000+ PSI @ 28 days) commercial concrete restoration and broom overlay system. Applied as a slurry base coat followed by a broom-textured finish coat for pedestrian and vehicular traffic.',
    coats: 2, coverage_rate: 150, coverage_unit: 'bag',
    cost_per_unit: 79.95, labor_rate_per_sf: 12.00,
    typical_equipment: 'Concrete finishing broom, gauge rake, Magic Trowel or squeegee, heavy duty drill with cage mixer, rubbing stone, 3000+ PSI pressure washer',
    substrate_notes: 'Sound cured concrete (min 28 days), profiled to ICRI CSP-2 through CSP-4. Cleaned and etched with SCR (2:1 dilution). Substrate must be Saturated Surface Dry (SSD - damp, no puddles). Honor all expansion joints.',
    application_notes: 'Base Coat: Mix 4-6 qts water per 50 lb bag. Squeegee or tight-trowel at 100-180 SF/bag. Dry 2-8 hrs. Rub down ridges. Finish Coat: Mix with 4-6 qts water, apply at 150-250 SF/bag, pull concrete broom in uniform direction. Recoat/seal in 24 hrs.',
    prep_tier_notes: 'Light: pressure wash & SCR clean. Standard: SCR acid etch & degrease (CSP-2). Heavy: mechanical diamond grind / shot blast to CSP-3/4 and crack repair with Flash Patch.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 1500,
    is_active: true,
  },
  {
    name: 'SureCrete MicroTek One Coat / Micro-Topping System',
    manufacturer: 'SureCrete',
    description: 'Single-component self-bonding microcement overlay mix (4,278 PSI) for floors and interior vertical walls. Yields a tight-troweled smooth blank canvas or burnished plaster effect. 0 g/L VOC.',
    coats: 2, coverage_rate: 250, coverage_unit: 'bag',
    cost_per_unit: 93.95, labor_rate_per_sf: 18.00,
    typical_equipment: 'Magic Trowel, stainless steel pool/finishing trowel, margin trowel, variable speed drill with cage blade, Festool HEPA dustless sander',
    substrate_notes: 'Interior concrete, cement board, or primed Level 5 drywall. Must be structurally sound, dry, and profiled. Mist surface with clean water (SSD) prior to troweling.',
    application_notes: 'Mix 5-6 qts clean water per 40 lb bag with optional SC Color Pack (min 1 min mixing). Tightly trowel or squeegee 1st coat. Dry 2-6 hrs. Lightly scrape ridges. Apply 2nd tight pass. Dry 12-24 hrs before stains or sealers.',
    prep_tier_notes: 'Light: damp sponge clean & vacuum. Standard: scratch coat leveling with SureBroom or MicroTek base. Heavy: fiberglass mesh bridge coat over uneven or patched substrates.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 1800,
    is_active: true,
  },
  {
    name: 'SureCrete Architectural Microcement Turnkey System',
    manufacturer: 'SureCrete / FloorTek',
    description: 'Commercial & architectural microcement overlay with heavy mortar base, fiberglass mesh lath, MicroTex/SureBroom hand-troweled overlay, and FloorTek 6 NanoCoat protective seal.',
    coats: 4, coverage_rate: 150, coverage_unit: 'bag',
    cost_per_unit: 93.95, labor_rate_per_sf: 38.00,
    typical_equipment: 'Festool HEPA dustless sanding system, steel finishing trowels, sponge floats, mixing station, containment barrier',
    substrate_notes: 'Demolition of failing substrate, dustless prep, PVA & Quartz primer bridge coats, heavy polymer mortar with embedded fiberglass mesh',
    application_notes: 'Phase 1: Dustless demo/prep. Phase 2: PVA & Quartz bridge coats + mortar/mesh. Phase 3: 2 coats SureCrete MicroTex/SureBroom. 48hr cure. Phase 4: 2-3 coats FloorTek 6 NanoCoat sealer.',
    prep_tier_notes: 'Commercial night shifts: HEPA dustless grind, perimeter foam isolation, crack stitch lath reinforcement.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 2500,
    is_active: true,
  },
  {
    name: 'SureCrete Primers & Moisture Vapor Blocker System',
    manufacturer: 'SureCrete',
    description: 'Specialty concrete surface prep, etching, and moisture mitigation system featuring SCR cleaner/degreaser, SureBond cementitious slurry bonding agent, and DK 700 Class 1 Moisture Vapor Barrier (96.5% solids urethane).',
    coats: 1, coverage_rate: 350, coverage_unit: 'gal',
    cost_per_unit: 164.20, labor_rate_per_sf: 3.50,
    typical_equipment: 'Acid-resistant pump sprayer, stiff broom, turbo-tip pressure washer, 3/8" nap phenolic core roller, squeegee',
    substrate_notes: 'Moisture-laden concrete slabs (DK 700 stops MVT up to 1/2 lb/1000 SF; ASTM E-96 compliant), or sound slabs requiring chemical etch profiling.',
    application_notes: 'Profile with SCR diluted 2:1, pressure wash and allow to dry. Apply DK 700 2-component urethane primer at 300-400 SF/gal; tack-free in 4.5 hrs. For high-build stamp overlays, apply SureBond slurry wet-on-wet.',
    prep_tier_notes: 'Standard: SCR 2:1 dilution spray and scrub. Heavy: moisture vapor remediation with DK 700 on high RH slabs.',
    waste_factor: 0.08, sundries_pct: 0.05, min_charge: 850,
    is_active: true,
  },
  {
    name: 'SureCrete Dura-Kote Polyurethane & NanoCoat Sealer System',
    manufacturer: 'SureCrete / FloorTek',
    description: 'Commercial high-performance protective coating system utilizing Dura-Kote DK 400WB (2-component 57% solids water-based aliphatic polyurethane) or FloorTek 6 NanoCoat for extreme chemical, scratch, and UV resistance.',
    coats: 2, coverage_rate: 350, coverage_unit: 'gal',
    cost_per_unit: 109.90, labor_rate_per_sf: 4.00,
    typical_equipment: '3/8" nap lint-free microfiber rollers, paint trays, Jiffy mixer, NIOSH respirator',
    substrate_notes: 'Cured SureCrete microcement, SureBroom, decorative concrete, or plaster. Surface moisture must be below 4%. Completely clean and dust-free.',
    application_notes: 'DK 400WB: Mechanically mix 1 Part B into 3 Parts A for 3 mins. Pot life 30 mins. Roll uniform thin coats at 300-400 SF/gal. Light foot traffic in 12 hrs; maximum chemical cure 7 days.',
    prep_tier_notes: 'Light: tack cloth & vacuum. Standard: screening with 150-grit mesh prior to 2nd topcoat pass.',
    waste_factor: 0.08, sundries_pct: 0.05, min_charge: 750,
    is_active: true,
  },
  {
    name: 'SureCrete HS Series Silane-Acrylic Penetrating Sealer System',
    manufacturer: 'SureCrete',
    description: 'Premium high-performance solvent-based penetrating acrylic nano-sealer (HS 200 / HS 300 Series, 20% to 30% solids). Deep chemical bond slows moisture migration and protects against rapid freeze/thaw spalling.',
    coats: 2, coverage_rate: 250, coverage_unit: 'gal',
    cost_per_unit: 65.00, labor_rate_per_sf: 2.50,
    typical_equipment: 'Solvent-rated industrial pump sprayer, solvent resistant roller, respirators',
    substrate_notes: 'Exterior concrete overlays, broomed driveways, patios, pool decks, and stamped concrete.',
    application_notes: 'Apply thin, uniform coats with pump sprayer or roller at 200-300 SF/gal. Avoid puddling. Apply 2nd coat as soon as 1st is tack-free. Breathable UV protection.',
    prep_tier_notes: 'Standard: clean with SCR 4:1 dilution and ensure 100% moisture dry before solvent application.',
    waste_factor: 0.08, sundries_pct: 0.05, min_charge: 650,
    is_active: true,
  },

  // --- MEODED SYSTEMS ---
  {
    name: 'Meoded Quartz Primer & Substrate Prep System',
    manufacturer: 'Meoded',
    description: '100% acrylic textured silica bonding primer specifically formulated as the required foundation for all Meoded lime and concrete plasters. Provides aggregate tooth for consistent trowel grip and absorption control.',
    coats: 1, coverage_rate: 400, coverage_unit: 'gal',
    cost_per_unit: 86.75, labor_rate_per_sf: 1.75,
    typical_equipment: 'Medium-nap roller (3/8" to 1/2"), stiff brush, or airless sprayer, drop cloths, painter tape',
    substrate_notes: 'Level 4 or Level 5 smooth drywall, existing sound painted surfaces, or cured exterior brown coat. Surface must be free of grease, dust, and peeling paint.',
    application_notes: 'Stir thoroughly. Apply one uniform coat by brush or roller (300-500 SF/gal). Allow 3 to 5 hours dry time before plaster application. Over exterior brown coats or absorbent surfaces, dilute up to 25% with clean water.',
    prep_tier_notes: 'Standard: 1 coat over primed drywall. Heavy: dilute 25% on porous plaster/masonry brown coats.',
    waste_factor: 0.08, sundries_pct: 0.05, min_charge: 500,
    is_active: true,
  },
  {
    name: 'Meoded Marmorino Tintoretto Matte Venetian Plaster System',
    manufacturer: 'Meoded',
    description: 'Authentic Italian lime-based plaster formulated with aged slaked lime and fine marble dust. Produces soft matte to low-sheen stone textures with natural organic movement and high breathability.',
    coats: 2, coverage_rate: 200, coverage_unit: 'pail',
    cost_per_unit: 155.00, labor_rate_per_sf: 9.50,
    typical_equipment: 'Stainless steel Venetian plaster trowel, Japanese spatula, corner trowel, burnishing blade',
    substrate_notes: 'Drywall primed with Meoded Quartz Primer. Structurally sound, flat, and dust-free.',
    application_notes: '1st Coat: Spread evenly at grain thickness across surface. Let dry 8-12 hours. 2nd Coat: Apply thin skim in random cross-hatch strokes. Compact with blade as it sets for smooth matte/satin finish.',
    prep_tier_notes: 'Standard: Level 4 drywall with Quartz Primer. Heavy: Level 5 skim and sand before primer.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 1500,
    is_active: true,
  },
  {
    name: 'Meoded Marmorino Palladino Travertine & Stone Plaster',
    manufacturer: 'Meoded',
    description: 'Medium-grain marble aggregate lime plaster designed for textured, pitted travertine, distressed stone, and architectural concrete-look walls. Highly breathable and mold-resistant.',
    coats: 2, coverage_rate: 140, coverage_unit: 'pail',
    cost_per_unit: 165.00, labor_rate_per_sf: 11.00,
    typical_equipment: 'Stainless steel trowel, grassello spatula, distressing sea sponge or bristle brush for pitting',
    substrate_notes: 'Drywall or masonry primed with Meoded Quartz Primer. Interior or exterior.',
    application_notes: '1st Coat: Apply ~1.5mm uniform base. Dry 12 hours. 2nd Coat: Apply and create pitted or banded travertine texture. Compress and smooth flat areas while leaving voids open for rustic stone depth.',
    prep_tier_notes: 'Standard: 2-coat stone finish. Heavy: exterior installation with protective wash.',
    waste_factor: 0.12, sundries_pct: 0.05, min_charge: 1600,
    is_active: true,
  },
  {
    name: 'Meoded Golmex Concrete-Look Architectural Plaster',
    manufacturer: 'Meoded',
    description: 'Portland cement and slaked lime powder plaster engineered to replicate cast-in-place concrete panels, board-formed concrete, and industrial polished concrete walls. Low VOC, durable.',
    coats: 2, coverage_rate: 110, coverage_unit: 'pail',
    cost_per_unit: 148.00, labor_rate_per_sf: 14.00,
    typical_equipment: 'Stainless steel trowel, sponge float, form-line tape, tie-hole stencil stamps, mixing paddle',
    substrate_notes: 'Cement board or drywall primed with Meoded Quartz Primer. Sound, rigid, non-flexing.',
    application_notes: 'Mix with water (~1 hr pot life). Apply 1st base coat. Allow 12 hours dry time. Apply 2nd coat, float with sponge and compress with trowel to simulate authentic concrete panel joints and texture. Cure 48 hrs before sealer.',
    prep_tier_notes: 'Standard: 2 coats floated to smooth concrete. Heavy: routed control joint lines & recessed tie-hole relief.',
    waste_factor: 0.12, sundries_pct: 0.05, min_charge: 1800,
    is_active: true,
  },
  {
    name: 'Meoded Stucco Veneziano High-Gloss Mirror Venetian Plaster',
    manufacturer: 'Meoded',
    description: 'Classic micro-filtered slaked lime Venetian plaster capable of an ultra-high gloss mirror reflective burnish. Delivers deep color saturation and translucent marble elegance.',
    coats: 3, coverage_rate: 280, coverage_unit: 'pail',
    cost_per_unit: 175.00, labor_rate_per_sf: 13.50,
    typical_equipment: 'Mirror-polished Venetian trowel, Japanese spatulas, fine burnishing pads (3000-grit)',
    substrate_notes: 'Level 5 ultra-smooth drywall primed with Meoded Quartz Primer. Must be flat without imperfections.',
    application_notes: '1st pass: thin uniform ground coat; dry 4-6 hrs. 2nd pass: tight cross-hatch spatulata strokes; dry 2-4 hrs. 3rd pass: whisper-thin skim, burnish immediately with trowel edge held at 30° angle for mirror gloss.',
    prep_tier_notes: 'Standard: Level 5 skim and sand. Heavy: micro-sanding between passes and multiple burnish cycles.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 1600,
    is_active: true,
  },
  {
    name: 'Meoded PlasterSeal Plus & Hydrowax Protective Finishing System',
    manufacturer: 'Meoded',
    description: 'Complete dual-layer protection for lime plasters. PlasterSeal Plus (deeply penetrating siloxane water/stain barrier) followed by Hydrowax (natural Italian Marseille soap & beeswax emulsion) for washability and luster.',
    coats: 2, coverage_rate: 300, coverage_unit: 'gal',
    cost_per_unit: 89.00, labor_rate_per_sf: 2.75,
    typical_equipment: 'Microfiber applicator pad, natural sponge, low-speed buffer with wool pad',
    substrate_notes: 'Cured Meoded lime plaster (minimum 48 to 72 hours dry time). Must be dry and dust-free.',
    application_notes: 'Apply 1 coat PlasterSeal Plus evenly; let dry 4 hours. Apply Hydrowax in gentle circular motions. Allow to haze 30 minutes, then buff with wool pad to deep lustrous water-repellent finish.',
    prep_tier_notes: 'Standard: single wax buffing. Heavy: wet area application with dual PlasterSeal Plus penetration.',
    waste_factor: 0.08, sundries_pct: 0.05, min_charge: 650,
    is_active: true,
  },

  // --- TRADITIONAL & MINERAL SYSTEMS ---
  {
    name: 'Vasari Marmorino Lime Plaster System',
    manufacturer: 'Vasari',
    description: 'Authentic Italian lime Marmorino plaster with gypsum leveling sub-base, twin structural passes of authentic lime plaster, natural olive oil soap fusion layer, and burnished Aqua Wax protective topcoat.',
    coats: 3, coverage_rate: 180, coverage_unit: 'bag',
    cost_per_unit: 145.00, labor_rate_per_sf: 8.50,
    typical_equipment: 'Japanese stainless trowel, hawk, burnishing blades, olive oil soap applicator, buffing microfiber',
    substrate_notes: 'Structurally sound, flat drywall or masonry, primed with gypsum leveling base',
    application_notes: 'Waterproof luxury environment finish with olive oil soap sealer fusion and Aqua Wax burnished seal.',
    prep_tier_notes: 'Standard: Level 4 drywall primed with quartz primer. Heavy: gypsum leveling skim for out-of-plumb walls.',
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
    prep_tier_notes: 'Standard: Level 5 drywall prep with fine finish sanding. Heavy: acoustic ceiling or curved dome prep.',
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
    prep_tier_notes: 'Standard: mineral prep coat over drywall. Heavy: damp masonry conditioning.',
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
    prep_tier_notes: 'Standard: spackle nail holes and spot prime. Heavy: skim-coat failing drywall.',
    waste_factor: 0.10, sundries_pct: 0.05, min_charge: 500,
    is_active: true,
  },
];

