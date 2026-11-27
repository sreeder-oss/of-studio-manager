import {
  ALL_COLOR_SWATCHES,
  type ColorSwatch,
} from '@/data/colorCatalog';
import type { FinishSystem, SurfaceTarget } from '@/lib/finishVisualizer';

export interface DesignerPaintColor {
  id: string;
  brand: 'Sherwin-Williams' | 'Benjamin Moore' | 'Behr' | 'Dunn-Edwards / Spectrum' | 'Farrow & Ball';
  code: string;
  name: string;
  aliases?: string[];
  hex: string;
  lrv: number;
  undertone: string;
  fieldNote: string;
}

/**
 * Curated reference library of popular residential & commercial designer paint colors
 * (including same-name multi-brand traps like Swiss Coffee and Shoji White).
 */
export const DESIGNER_PAINT_REFERENCES: DesignerPaintColor[] = [
  // --- WHITES & WARM OFF-WHITES ---
  {
    id: 'sw-7042',
    brand: 'Sherwin-Williams',
    code: 'SW 7042',
    name: 'Shoji White',
    aliases: ['spectrum shoji white', 'shoji'],
    hex: '#E6DFD3',
    lrv: 74,
    undertone: 'Warm Creamy Greige (subtle taupe-beige base)',
    fieldNote: 'Warmer and slightly deeper than Alabaster; avoids stark glare and bridges warm wood + stone.',
  },
  {
    id: 'bm-oc45',
    brand: 'Benjamin Moore',
    code: 'OC-45',
    name: 'Swiss Coffee (BM)',
    aliases: ['swiss coffee', 'benjamin moore swiss coffee', 'oc 45'],
    hex: '#EFECE3',
    lrv: 82,
    undertone: 'Soft Creamy Off-White with Muted Green-Gray Drop',
    fieldNote: 'TRAP ALERT: BM OC-45 (LRV 82) is much brighter and cleaner than Meoded stock MC-756 Swiss Coffee (LRV 73).',
  },
  {
    id: 'behr-12',
    brand: 'Behr',
    code: '12',
    name: 'Swiss Coffee (Behr)',
    aliases: ['behr swiss coffee'],
    hex: '#F1EAD8',
    lrv: 84,
    undertone: 'Warm Butter-Ivory Cream',
    fieldNote: 'Noticeably yellower/butterier than BM OC-45 Swiss Coffee.',
  },
  {
    id: 'de-dew341',
    brand: 'Dunn-Edwards / Spectrum',
    code: 'DEW341',
    name: 'Swiss Coffee (DE / Spectrum)',
    aliases: ['spectrum swiss coffee', 'dunn edwards swiss coffee'],
    hex: '#F0ECE1',
    lrv: 83,
    undertone: 'Crisp Warm Cream White',
    fieldNote: 'Clean warm off-white; brighter than Meoded stock MC-756 Swiss Coffee.',
  },
  {
    id: 'sw-7008',
    brand: 'Sherwin-Williams',
    code: 'SW 7008',
    name: 'Alabaster',
    aliases: ['alabaster'],
    hex: '#EDEAE0',
    lrv: 82,
    undertone: 'Soft Warm Creamy White',
    fieldNote: 'Go-to warm white without heavy yellow; very close in brightness to White Dove.',
  },
  {
    id: 'bm-oc17',
    brand: 'Benjamin Moore',
    code: 'OC-17',
    name: 'White Dove',
    aliases: ['bm white dove', 'oc 17'],
    hex: '#EFECE4',
    lrv: 83,
    undertone: 'Soft Greige-Muted Warm White',
    fieldNote: 'Tiny drop of grey keeps it soft and prevents yellowing.',
  },
  {
    id: 'sw-7005',
    brand: 'Sherwin-Williams',
    code: 'SW 7005',
    name: 'Pure White',
    aliases: ['sw pure white'],
    hex: '#EDECE6',
    lrv: 84,
    undertone: 'Clean Neutral White (slight warm-grey softness)',
    fieldNote: 'Crisp modern trim and plaster white without turning icy blue.',
  },
  {
    id: 'bm-oc65',
    brand: 'Benjamin Moore',
    code: 'OC-65',
    name: 'Chantilly Lace',
    aliases: ['chantilly lace'],
    hex: '#F5F5F2',
    lrv: 90,
    undertone: 'Ultra-Clean Crisp Gallery White',
    fieldNote: 'Very high LRV; pair with unpigmented Natural White / Bianco lime bases.',
  },
  {
    id: 'sw-7551',
    brand: 'Sherwin-Williams',
    code: 'SW 7551',
    name: 'Greek Villa',
    aliases: ['greek villa'],
    hex: '#F0ECE1',
    lrv: 84,
    undertone: 'Sunlit Warm Cream White',
    fieldNote: 'Slightly sunnier/warmer than Alabaster.',
  },
  {
    id: 'sw-7012',
    brand: 'Sherwin-Williams',
    code: 'SW 7012',
    name: 'Creamy',
    aliases: ['sw creamy'],
    hex: '#EFE8D8',
    lrv: 81,
    undertone: 'Soft Ivory Cream',
    fieldNote: 'Rich warm cream without reading pastel yellow.',
  },
  {
    id: 'sw-7011',
    brand: 'Sherwin-Williams',
    code: 'SW 7011',
    name: 'Natural Choice',
    aliases: ['natural choice'],
    hex: '#E3DEC9',
    lrv: 73,
    undertone: 'Earthy Almond Cream',
    fieldNote: 'Reads like warm European limestone in troweled finishes.',
  },
  {
    id: 'bm-oc117',
    brand: 'Benjamin Moore',
    code: 'OC-117',
    name: 'Simply White',
    aliases: ['simply white'],
    hex: '#F4F2E8',
    lrv: 89,
    undertone: 'FreshHint-of-Warmth Bright White',
    fieldNote: 'Bright warm white; subtle sunlit undertone in morning/afternoon light.',
  },
  {
    id: 'fb-2001',
    brand: 'Farrow & Ball',
    code: 'No. 2001',
    name: 'Strong White',
    aliases: ['strong white'],
    hex: '#E5E2DC',
    lrv: 76,
    undertone: 'Cool Chalky Limestone White',
    fieldNote: 'Subtle grey mineral base perfect for contemporary plaster.',
  },
  {
    id: 'fb-2005',
    brand: 'Farrow & Ball',
    code: 'No. 2005',
    name: 'Pointing',
    aliases: ['pointing'],
    hex: '#EFE9DC',
    lrv: 82,
    undertone: 'Warm Lime-Mortar Ivory',
    fieldNote: 'Named after traditional lime pointing mortar.',
  },

  // --- GREIGES, TAUPES & LIMESTONES ---
  {
    id: 'sw-7029',
    brand: 'Sherwin-Williams',
    code: 'SW 7029',
    name: 'Agreeable Gray',
    aliases: ['agreeable gray', 'agreeable grey'],
    hex: '#D1CBC1',
    lrv: 60,
    undertone: 'Balanced Warm Greige',
    fieldNote: 'Sits cleanly between warm beige and cool gray.',
  },
  {
    id: 'sw-7036',
    brand: 'Sherwin-Williams',
    code: 'SW 7036',
    name: 'Accessible Beige',
    aliases: ['accessible beige'],
    hex: '#D1C7B8',
    lrv: 58,
    undertone: 'Gray-Spun Warm Beige',
    fieldNote: 'Warm sand-beige toned down with grey so it never turns orange.',
  },
  {
    id: 'bm-oc20',
    brand: 'Benjamin Moore',
    code: 'OC-20',
    name: 'Pale Oak',
    aliases: ['pale oak'],
    hex: '#DDD7CC',
    lrv: 69,
    undertone: 'Light Taupe-Greige with Subtle Blush Warmth',
    fieldNote: 'Airy, refined greige that shifts softly with daylight.',
  },
  {
    id: 'bm-hc172',
    brand: 'Benjamin Moore',
    code: 'HC-172',
    name: 'Revere Pewter',
    aliases: ['revere pewter'],
    hex: '#CCC7B9',
    lrv: 55,
    undertone: 'Earthy Warm Gray-Green Greige',
    fieldNote: 'Classic medium-light limestone greige.',
  },
  {
    id: 'bm-hc173',
    brand: 'Benjamin Moore',
    code: 'HC-173',
    name: 'Edgecomb Gray',
    aliases: ['edgecomb gray', 'edgecomb grey'],
    hex: '#DBD5C7',
    lrv: 63,
    undertone: 'Soft Organic Beige-Gray',
    fieldNote: 'Lighter, warmer sibling of Revere Pewter.',
  },
  {
    id: 'bm-oc23',
    brand: 'Benjamin Moore',
    code: 'OC-23',
    name: 'Classic Gray',
    aliases: ['classic gray', 'classic grey'],
    hex: '#E4E0D8',
    lrv: 74,
    undertone: 'Whisper-Light Warm Greige',
    fieldNote: 'Reads as a nuanced off-white in bright rooms and pale stone in shade.',
  },
  {
    id: 'bm-990',
    brand: 'Benjamin Moore',
    code: '990',
    name: 'ampshire Taupe / Taj Mahal',
    aliases: ['taj mahal', 'hampshire taupe'],
    hex: '#D8CCB8',
    lrv: 60,
    undertone: 'Warm Quartzite / Limestone Sand',
    fieldNote: 'Popular match for Taj Mahal quartzite countertops and range hoods.',
  },
  {
    id: 'sw-9173',
    brand: 'Sherwin-Williams',
    code: 'SW 9173',
    name: 'Shiitake',
    aliases: ['shiitake'],
    hex: '#C8BCAB',
    lrv: 51,
    undertone: 'Warm Mushroom Stone Taupe',
    fieldNote: 'Grounded organic mushroom tone for hoods and Plaster walls.',
  },
  {
    id: 'sw-7037',
    brand: 'Sherwin-Williams',
    code: 'SW 7037',
    name: 'Balanced Beige',
    aliases: ['balanced beige'],
    hex: '#C1B3A0',
    lrv: 46,
    undertone: 'Rich Earthy Sand Taupe',
    fieldNote: 'Medium warm taupe with strong movement in Marmorino.',
  },
  {
    id: 'fb-15',
    brand: 'Farrow & Ball',
    code: 'No. 15',
    name: 'Bone',
    aliases: ['farrow and ball bone'],
    hex: '#CFC8B8',
    lrv: 57,
    undertone: 'Mineral Chalky Khaki-Stone',
    fieldNote: 'Timeless mineral stone neutral.',
  },
  {
    id: 'fb-9',
    brand: 'Farrow & Ball',
    code: 'No. 9',
    name: "Elephant's Breath",
    aliases: ['elephants breath', "elephant's breath"],
    hex: '#C4BCB0',
    lrv: 52,
    undertone: 'Warm Mid-Greige with Subtle Lilac-Taupe Warmth',
    fieldNote: 'Reads uplifting charcoal-taupe in west light and cool stone in north light.',
  },

  // --- GRAYS, CONCRETES & DARK CHARCOALS ---
  {
    id: 'sw-7015',
    brand: 'Sherwin-Williams',
    code: 'SW 7015',
    name: 'Repose Gray',
    aliases: ['repose gray', 'repose grey'],
    hex: '#C8C6C0',
    lrv: 58,
    undertone: 'Clean Cool-Neutral Architectural Gray',
    fieldNote: 'Crisp modern concrete/stone gray.',
  },
  {
    id: 'bm-1465',
    brand: 'Benjamin Moore',
    code: '1465',
    name: 'Nimbus',
    aliases: ['nimbus'],
    hex: '#C6C6C1',
    lrv: 56,
    undertone: 'Soft Misty Cloud Gray',
    fieldNote: 'Calm architectural gray for microcement and Venetian.',
  },
  {
    id: 'sw-7018',
    brand: 'Sherwin-Williams',
    code: 'SW 7018',
    name: 'Dovetail',
    aliases: ['dovetail'],
    hex: '#928E89',
    lrv: 26,
    undertone: 'Warm Weathered Slate Gray',
    fieldNote: 'Mid-dark concrete/stone shade.',
  },
  {
    id: 'bm-hc166',
    brand: 'Benjamin Moore',
    code: 'HC-166',
    name: 'Kendall Charcoal',
    aliases: ['kendall charcoal'],
    hex: '#696864',
    lrv: 14,
    undertone: 'Rich Warm-Neutral Charcoal',
    fieldNote: 'Versatile dark charcoal without harsh blue undertone.',
  },
  {
    id: 'sw-7048',
    brand: 'Sherwin-Williams',
    code: 'SW 7048',
    name: 'Urbane Bronze',
    aliases: ['urbane bronze'],
    hex: '#57524B',
    lrv: 8,
    undertone: 'Deep Earthy Brown-Bronze Charcoal',
    fieldNote: 'Grounded organic dark bronze-gray; dramatic on range hoods.',
  },
  {
    id: 'sw-7069',
    brand: 'Sherwin-Williams',
    code: 'SW 7069',
    name: 'Iron Ore',
    aliases: ['iron ore'],
    hex: '#464746',
    lrv: 6,
    undertone: 'Softened Graphite Charcoal-Black',
    fieldNote: 'Statement charcoal-black; requires full-spectrum plaster or microcement.',
  },
  {
    id: 'sw-6258',
    brand: 'Sherwin-Williams',
    code: 'SW 6258',
    name: 'Tricorn Black',
    aliases: ['tricorn black'],
    hex: '#313233',
    lrv: 3,
    undertone: 'True Neutral Obsidian Black',
    fieldNote: 'Deepest architectural black; burnishes to dramatic obsidian marble.',
  },
];

/* ------------------------------------------------------------------ */
/* Perceptual CIELAB (Delta-E) Color Matching                          */
/* ------------------------------------------------------------------ */

function hexToLab(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const rRaw = parseInt(clean.slice(0, 2), 16) / 255;
  const gRaw = parseInt(clean.slice(2, 4), 16) / 255;
  const bRaw = parseInt(clean.slice(4, 6), 16) / 255;

  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = lin(rRaw);
  const g = lin(gRaw);
  const b = lin(bRaw);

  // sRGB -> XYZ (D65)
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function deltaE(hexA: string, hexB: string): number {
  const [l1, a1, b1] = hexToLab(hexA);
  const [l2, a2, b2] = hexToLab(hexB);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

export interface SwatchMatchResult {
  swatch: ColorSwatch;
  distance: number;
  lrvDiff: number;
  comparisonNote: string;
}

/** Find the closest factory plaster/microcement swatches to a target hex & LRV. */
export function findClosestStockSwatches(params: {
  targetHex: string;
  targetLrv: number;
  system?: FinishSystem;
  manufacturer?: string;
  limit?: number;
}): SwatchMatchResult[] {
  const { targetHex, targetLrv, system, manufacturer, limit = 2 } = params;
  const candidates = ALL_COLOR_SWATCHES.filter((s) => {
    if (system && !s.visualizerSystems.includes(system)) return false;
    if (manufacturer && manufacturer !== 'All' && s.manufacturer.toLowerCase() !== manufacturer.toLowerCase()) {
      return false;
    }
    return true;
  });

  const scored = candidates.map((swatch) => {
    const distance = Math.round(deltaE(targetHex, swatch.hex) * 10) / 10;
    const lrvDiff = swatch.lrvApprox - targetLrv;
    const brightness =
      Math.abs(lrvDiff) <= 3
        ? 'Nearly identical LRV brightness'
        : lrvDiff > 0
          ? `+${lrvDiff} LRV brighter (compensates well if sealing with HydroWax/PlasterGuard)`
          : `${lrvDiff} LRV deeper/richer`;
    return {
      swatch,
      distance,
      lrvDiff,
      comparisonNote: `${brightness} · ${swatch.undertone}`,
    };
  });

  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, limit);
}

/** Search designer paint references by name, code, or alias (e.g. "Shoji White", "Swiss Coffee", "OC-45"). */
export function searchDesignerPaints(query: string): DesignerPaintColor[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DESIGNER_PAINT_REFERENCES.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.code.toLowerCase().includes(q)) return true;
    if (`${p.brand} ${p.name}`.toLowerCase().includes(q)) return true;
    return (p.aliases || []).some((a) => a.toLowerCase().includes(q));
  });
}

/* ------------------------------------------------------------------ */
/* Compact Prompt Context & Visualizer Deep-Link Builder for AI Chat   */
/* ------------------------------------------------------------------ */

export function buildColorMatcherPromptContext(): string {
  const swatchLines = ALL_COLOR_SWATCHES.map(
    (s) =>
      `${s.id} | ${s.manufacturer} ${s.code} "${s.name}" | hex:${s.hex} | LRV:${s.lrvApprox} | undertone:${s.undertone} | base:${s.tintBaseLimit} | systems:[${s.visualizerSystems.join(', ')}]`,
  ).join('\n');

  const paintLines = DESIGNER_PAINT_REFERENCES.map(
    (p) =>
      `${p.brand} ${p.code} "${p.name}" | hex:${p.hex} | LRV:${p.lrv} | undertone:${p.undertone} | note:${p.fieldNote}`,
  ).join('\n');

  return [
    '=== MANUFACTURER STOCK COLOR CATALOG (46 NATIVE SWATCHES) ===',
    swatchLines,
    '',
    '=== DESIGNER PAINT FAN-DECK CROSS-REFERENCE (UNDERTONES & LRV) ===',
    paintLines,
    '',
    'COLOR CONSULTATION & VISUALIZER HANDOFF RULES:',
    '- When Shawn asks for the closest stock plaster/microcement color to a paint color (e.g. Shoji White, Swiss Coffee, Alabaster, Agreeable Gray):',
    '  1. Watch for same-name traps (e.g. BM OC-45 Swiss Coffee LRV 82 vs Behr 12 Swiss Coffee LRV 84 vs Meoded stock MC-756 Swiss Coffee LRV 73). Explain the LRV & undertone difference concisely.',
    '  2. Recommend the closest 1–2 NATIVE factory swatches from the requested manufacturer & system above (respecting light-to-medium base limits and noting that sealers like HydroWax/PlasterGuard/NanoCoat deepen tone ~10%).',
    '  3. For EACH recommended swatch, include a clickable markdown deep-link so Shawn can tap straight into Finish Visualizer on site:',
    '     Format: `[Visualize <Code> <Name> on <Surface> →](/visualizer?surface=<Surface>&system=<FinishSystem>&brand=<Manufacturer>&swatch=<swatch.id>)`',
    '     Valid <Surface>: `Feature%20Wall`, `Range%20Hood`, `Fireplace`, `Shower%20%2F%20Wet%20Area`, `Ceiling`.',
    '     Valid <FinishSystem>: `Biolime`, `Venetian%20Marmorino`, `Limewash`, `Tadelakt`, `Microcement`, `Roman%20Clay`, `Travertino`.',
  ].join('\n');
}

export function buildVisualizerHandoffUrl(params: {
  surface: SurfaceTarget;
  system: FinishSystem;
  swatch: ColorSwatch;
  projectId?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set('surface', params.surface);
  sp.set('system', params.system);
  sp.set('brand', params.swatch.manufacturer);
  sp.set('swatch', params.swatch.id);
  if (params.projectId) sp.set('projectId', params.projectId);
  return `/visualizer?${sp.toString()}`;
}
