import type { FinishSystem } from '@/lib/finishVisualizer';

export type TintBaseLimit = 'light-to-medium' | 'full-spectrum';

export interface ColorSwatch {
  id: string;
  manufacturer: string;
  code: string;
  name: string;
  hex: string;
  undertone: string;
  lrvApprox: number;
  sheenBehavior: string;
  tintBaseLimit: TintBaseLimit;
  /** Which Finish Visualizer systems this swatch is factory-approved for */
  visualizerSystems: FinishSystem[];
  /** Keywords matched against Systems Library system names */
  systemKeywords: string[];
  sampleBoardRef?: string;
}

export interface ManufacturerColorPalette {
  manufacturer: string;
  paletteName: string;
  note: string;
  swatches: ColorSwatch[];
}

export const CUSTOM_MATCH_FEE = 150;
export const CUSTOM_MATCH_LINE_ID = 'custom-paint-match';
export const CUSTOM_MATCH_DISCLAIMER =
  'Custom Paint Match Policy: Includes $150 Custom Tint Lab Fee and +7–10 business days lead time for physical mineral drawdown. Signed Sample Board Approval is required prior to ordering material; the approved physical mineral sample overrides paper paint chips.';

export const ROMABIO_PALETTE: ManufacturerColorPalette = {
  manufacturer: 'Romabio',
  paletteName: 'Romabio Core Mineral Palette',
  note: 'Factory-formulated Italian slaked-lime mineral shades. Lime Slurry and BioMarmorino accept light-to-medium mineral bases only.',
  swatches: [
    {
      id: 'rb-bianco',
      manufacturer: 'Romabio',
      code: 'RB-BIANCO',
      name: 'Bianco White',
      hex: '#F3F1EA',
      undertone: 'Crisp Mineral Chalk',
      lrvApprox: 86,
      sheenBehavior: 'Bright, airy reflection on flat limewash; crisp marble glow when burnished in Grassello.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-avo',
      manufacturer: 'Romabio',
      code: 'RB-AVO',
      name: 'Avorio White',
      hex: '#EDE6D6',
      undertone: 'Warm Cream',
      lrvApprox: 80,
      sheenBehavior: 'Soft ivory warmth; heavy aggregate (Marmorino GF) adds subtle micro-shadows that read half a shade deeper.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-cris',
      manufacturer: 'Romabio',
      code: 'RB-CRIS',
      name: 'Cristallo White',
      hex: '#E6E4DF',
      undertone: 'Cool Chalk',
      lrvApprox: 78,
      sheenBehavior: 'Clean architectural white with faint mineral stone undertone; resists yellowing under warm LEDs.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino'],
    },
    {
      id: 'rb-rip',
      manufacturer: 'Romabio',
      code: 'RB-RIP',
      name: 'Riposo Beige',
      hex: '#D9CEBC',
      undertone: 'Warm Limestone',
      lrvApprox: 62,
      sheenBehavior: 'Classic European limestone feel; mottling deepens naturally in troweled Marmorino and Travertino.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-trop',
      manufacturer: 'Romabio',
      code: 'RB-TROP',
      name: 'Tropea Beige',
      hex: '#CBBBA4',
      undertone: 'Sun-Warmed Sand',
      lrvApprox: 52,
      sheenBehavior: 'Rich Mediterranean warmth; shows pronounced clouding in Classico Limewash and velvety depth in Marmorino Satin.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-crema',
      manufacturer: 'Romabio',
      code: 'RB-CREMA',
      name: 'Crema Travertine',
      hex: '#E2D4BC',
      undertone: 'Golden Stone',
      lrvApprox: 68,
      sheenBehavior: 'Pairs naturally with pitted Travertino and honed Marmorino; soft golden bounce in raking daylight.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Travertino', 'Biolime', 'Roman Clay'],
      systemKeywords: ['venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-nube',
      manufacturer: 'Romabio',
      code: 'RB-NUBE',
      name: 'Nube Gray',
      hex: '#CFCBC3',
      undertone: 'Soft Warm Gray',
      lrvApprox: 59,
      sheenBehavior: 'Balanced neutral stone gray; stays chalky and calm in flat finishes without turning icy blue.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-flor',
      manufacturer: 'Romabio',
      code: 'RB-FLOR',
      name: 'Florentine Gray',
      hex: '#B3ACA1',
      undertone: 'Earthy Taupe-Gray',
      lrvApprox: 42,
      sheenBehavior: 'Medium mineral depth; burnished Venetian passes highlight subtle darker veining and specular sheen.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-citta',
      manufacturer: 'Romabio',
      code: 'RB-CITTA',
      name: 'Citta Taupe',
      hex: '#A79B8C',
      undertone: 'Earthy Taupe',
      lrvApprox: 35,
      sheenBehavior: 'Grounded architectural taupe; aggregate plasters read slightly darker in low-light rooms.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-sabbia',
      manufacturer: 'Romabio',
      code: 'RB-SABBIA',
      name: 'Sabbia Sand',
      hex: '#C4B198',
      undertone: 'Ochre Limestone',
      lrvApprox: 46,
      sheenBehavior: 'Natural earthen sand tone; accentuates hand-troweled movement on range hoods and fireplace surrounds.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Limewash', 'Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['classico', 'limewash', 'lime slurry', 'venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-pietra',
      manufacturer: 'Romabio',
      code: 'RB-PIETRA',
      name: 'Pietra Stone',
      hex: '#8F8A82',
      undertone: 'Weathered Slate',
      lrvApprox: 26,
      sheenBehavior: 'Deep mineral stone tone for full-spectrum plasters & glazes; dramatic tonal variation when troweled.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Roman Clay', 'Travertino'],
      systemKeywords: ['venetian glaze', 'slaked-lime', 'marmorino', 'travertino'],
    },
    {
      id: 'rb-ardesia',
      manufacturer: 'Romabio',
      code: 'RB-ARDESIA',
      name: 'Ardesia Charcoal',
      hex: '#595854',
      undertone: 'Mineral Charcoal',
      lrvApprox: 11,
      sheenBehavior: 'High-contrast charcoal for burnished Venetian Marmorino / Grassello; NOT available in light-to-medium Lime Slurry.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Venetian Marmorino'],
      systemKeywords: ['venetian glaze', 'slaked-lime', 'marmorino'],
    },
  ],
};

export const MANUFACTURER_COLOR_CATALOG: ManufacturerColorPalette[] = [
  ROMABIO_PALETTE,
];

export const ALL_COLOR_SWATCHES: ColorSwatch[] = MANUFACTURER_COLOR_CATALOG.flatMap((p) => p.swatches);

/** Return factory-approved swatches for a Finish Visualizer system. */
export function getSwatchesForVisualizerSystem(system: FinishSystem): ColorSwatch[] {
  return ALL_COLOR_SWATCHES.filter((s) => s.visualizerSystems.includes(system));
}

/** Return factory-approved swatches for a Systems Library record (by manufacturer + system name). */
export function getSwatchesForSystem(manufacturer: string | null | undefined, systemName: string): ColorSwatch[] {
  const m = (manufacturer || '').toLowerCase();
  const n = systemName.toLowerCase();
  if (!m) return [];
  return ALL_COLOR_SWATCHES.filter((s) => {
    if (!m.includes(s.manufacturer.toLowerCase())) return false;
    // Lime Slurry only accepts light-to-medium mineral bases
    if (n.includes('lime slurry') && s.tintBaseLimit !== 'light-to-medium') return false;
    return s.systemKeywords.some((kw) => n.includes(kw));
  });
}
