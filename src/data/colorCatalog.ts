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

/* ================================================================== */
/* 1. ROMABIO — Core Slaked-Lime Mineral Palette                       */
/* ================================================================== */
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

/* ================================================================== */
/* 2. MEODED — Official MC-Series Plaster & Lime Wash Palette          */
/* ================================================================== */
export const MEODED_PALETTE: ManufacturerColorPalette = {
  manufacturer: 'Meoded',
  paletteName: 'Meoded MC-Series Color Chart',
  note: 'Shared colorant system across Stucco Veneziano, Marmorino Tintoretto, Palladino, Tonachino, Concretta FS, Golmex, Moroccan Clay & Lime Wash.',
  swatches: [
    {
      id: 'meo-mc701',
      manufacturer: 'Meoded',
      code: 'MC-701',
      name: 'Natural White',
      hex: '#F2EFE8',
      undertone: 'Pure Lime Putty White',
      lrvApprox: 85,
      sheenBehavior: 'Clean gallery white; polishes to a mirror-bright marble glow in Stucco Veneziano and stays airy in Lime Wash.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Microcement', 'Roman Clay', 'Travertino'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'golmex', 'stucco veneziano'],
    },
    {
      id: 'meo-mc706',
      manufacturer: 'Meoded',
      code: 'MC-706',
      name: 'White Dove',
      hex: '#ECE8DD',
      undertone: 'Soft Warm Off-White',
      lrvApprox: 81,
      sheenBehavior: 'Meoded’s top-requested warm designer white; hides sharp drywall glare while highlighting gentle trowel movement.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Microcement', 'Roman Clay', 'Travertino'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'golmex', 'stucco veneziano'],
    },
    {
      id: 'meo-mc715',
      manufacturer: 'Meoded',
      code: 'MC-715',
      name: 'Calm White',
      hex: '#E5E1D6',
      undertone: 'Balanced Neutral Cream',
      lrvApprox: 76,
      sheenBehavior: 'Dries slightly lighter and cloudier in Lime Wash; smooth velvety limestone tone in Marmorino Tintoretto.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Roman Clay', 'Travertino'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'stucco veneziano'],
    },
    {
      id: 'meo-mc756',
      manufacturer: 'Meoded',
      code: 'MC-756',
      name: 'Swiss Coffee',
      hex: '#E4DCCB',
      undertone: 'Creamy Almond',
      lrvApprox: 73,
      sheenBehavior: 'Rich creamy warmth ideal for range hoods and living room fireplaces; deepens 10–15% under HydroWax or PlasterGuard.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Microcement', 'Roman Clay', 'Travertino'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'stucco veneziano'],
    },
    {
      id: 'meo-mc749',
      manufacturer: 'Meoded',
      code: 'MC-749',
      name: 'Tip-Taupe',
      hex: '#CDC6AD',
      undertone: 'Pale Khaki-Taupe Greige',
      lrvApprox: 57,
      sheenBehavior: 'Quiet organic greige that dries soft and mottled; bridges warm oak floors and cool stone countertops effortlessly.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Microcement', 'Roman Clay', 'Travertino'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'golmex', 'stucco veneziano'],
    },
    {
      id: 'meo-mc786',
      manufacturer: 'Meoded',
      code: 'MC-786',
      name: 'Canvas',
      hex: '#D6CCB9',
      undertone: 'Raw Linen Sand',
      lrvApprox: 61,
      sheenBehavior: 'Natural unbleached linen character; pitted Palladino and Travertino textures add warm travertine micro-shadows.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Roman Clay', 'Travertino'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'stucco veneziano'],
    },
    {
      id: 'meo-mc753',
      manufacturer: 'Meoded',
      code: 'MC-753',
      name: 'Light Coffee',
      hex: '#BCA992',
      undertone: 'Warm Café Beige',
      lrvApprox: 43,
      sheenBehavior: 'Earthy mid-tone warmth with pronounced light/dark compression marks when steel-troweled.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Roman Clay', 'Travertino'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'stucco veneziano'],
    },
    {
      id: 'meo-mc777',
      manufacturer: 'Meoded',
      code: 'MC-777',
      name: 'Mountain Fog',
      hex: '#C4C5C1',
      undertone: 'Misty Cool-Neutral Gray',
      lrvApprox: 55,
      sheenBehavior: ' architectural fog gray; looks crisp and monolithic in Concretta FS showers and modern fireplaces.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Microcement', 'Roman Clay'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'golmex', 'stucco veneziano'],
    },
    {
      id: 'meo-mc779',
      manufacturer: 'Meoded',
      code: 'MC-779',
      name: 'Stone',
      hex: '#AEAAA1',
      undertone: 'Natural Limestone Gray',
      lrvApprox: 41,
      sheenBehavior: 'Authentic cut-limestone neutral; hides water spotting well in Concretta FS wet areas.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Limewash', 'Tadelakt', 'Microcement', 'Travertino'],
      systemKeywords: ['concretta', 'marmorino', 'palladino', 'tintoretto', 'lime wash', 'golmex', 'stucco veneziano'],
    },
    {
      id: 'meo-mc807',
      manufacturer: 'Meoded',
      code: 'MC-807',
      name: 'Concrete',
      hex: '#989793',
      undertone: 'Architectural Cast Cement',
      lrvApprox: 31,
      sheenBehavior: 'True board-formed concrete gray; signature tone for Golmex and Concretta FS seamless walls.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Microcement', 'Tadelakt', 'Venetian Marmorino', 'Travertino'],
      systemKeywords: ['concretta', 'golmex', 'marmorino', 'palladino', 'tintoretto', 'stucco veneziano'],
    },
    {
      id: 'meo-mc885',
      manufacturer: 'Meoded',
      code: 'MC-885',
      name: 'Charcoal',
      hex: '#505150',
      undertone: 'Deep Soot Charcoal',
      lrvApprox: 9,
      sheenBehavior: 'Dramatic statement charcoal for range hoods and burnished Venetian feature walls; shows dramatic silvery burnish highlights.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Venetian Marmorino', 'Microcement', 'Tadelakt'],
      systemKeywords: ['concretta', 'golmex', 'marmorino', 'tintoretto', 'stucco veneziano', 'lime wash'],
    },
    {
      id: 'meo-mc893',
      manufacturer: 'Meoded',
      code: 'MC-893',
      name: 'Dark Knight',
      hex: '#36383B',
      undertone: 'Obsidian Slate Black',
      lrvApprox: 5,
      sheenBehavior: 'Ultra-deep architectural black-slate; high-polish Stucco Veneziano creates mirror-like depth, while PlasterGuard deepens tone.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Venetian Marmorino', 'Microcement', 'Tadelakt'],
      systemKeywords: ['concretta', 'golmex', 'marmorino', 'tintoretto', 'stucco veneziano'],
    },
  ],
};

/* ================================================================== */
/* 3. VASARI — 2026 A-Series Natural Lime Plaster & Paint Palette      */
/* ================================================================== */
export const VASARI_PALETTE: ManufacturerColorPalette = {
  manufacturer: 'Vasari',
  paletteName: 'Vasari 2026 A-Series Lime Palette',
  note: 'Formulated specifically for natural slaked lime & powdered marble across Veneziano, Marmorino, Carrera, Corso & Lime Paint.',
  swatches: [
    {
      id: 'vas-a001',
      manufacturer: 'Vasari',
      code: 'A001',
      name: 'Natural White',
      hex: '#F4F1E9',
      undertone: 'Unpigmented Marble Lime',
      lrvApprox: 87,
      sheenBehavior: 'Pure slaked-lime & marble white; luminous specular polish in Veneziano and soft diffused chalk in Marmorino.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Limewash', 'Tadelakt', 'Roman Clay', 'Travertino'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano', 'lime'],
    },
    {
      id: 'vas-a006',
      manufacturer: 'Vasari',
      code: 'A006',
      name: 'Piedra Blanca',
      hex: '#EBE5D8',
      undertone: 'Warm White Limestone',
      lrvApprox: 79,
      sheenBehavior: 'Timeless sun-washed white stone; gentle tonal shifts keep large open walls feeling alive rather than flat.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Limewash', 'Tadelakt', 'Roman Clay', 'Travertino'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano', 'lime'],
    },
    {
      id: 'vas-a117',
      manufacturer: 'Vasari',
      code: 'A117',
      name: 'Yuzu',
      hex: '#EFE5CE',
      undertone: 'Pale Warm Cream',
      lrvApprox: 77,
      sheenBehavior: 'Replaces conventional warm white paint with luminous mineral depth and subtle butter-cream warmth.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Limewash', 'Roman Clay'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano', 'lime'],
    },
    {
      id: 'vas-a022',
      manufacturer: 'Vasari',
      code: 'A022',
      name: 'Marcona',
      hex: '#DFD2BD',
      undertone: 'Blond Almond',
      lrvApprox: 65,
      sheenBehavior: 'Even, welcoming almond warmth tailored for residential living spaces and hospitality Marmorino walls.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Limewash', 'Tadelakt', 'Roman Clay', 'Travertino'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano', 'lime'],
    },
    {
      id: 'vas-a029',
      manufacturer: 'Vasari',
      code: 'A029',
      name: 'Fossil',
      hex: '#CFC1AA',
      undertone: 'Golden Stone Beige',
      lrvApprox: 54,
      sheenBehavior: 'Beige with subtle hints of gold; gains dramatic translucent depth in polished Veneziano and reads grounded in matte Marmorino.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Limewash', 'Tadelakt', 'Roman Clay', 'Travertino'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano', 'lime'],
    },
    {
      id: 'vas-a030',
      manufacturer: 'Vasari',
      code: 'A030',
      name: 'Abora',
      hex: '#C4BCB0',
      undertone: 'Balanced Greige',
      lrvApprox: 50,
      sheenBehavior: 'Sits right between warm and cool — ideal bridge color when pairing warm wood floors with cooler stone or cabinetry.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Limewash', 'Tadelakt', 'Roman Clay', 'Travertino'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano', 'lime'],
    },
    {
      id: 'vas-a054',
      manufacturer: 'Vasari',
      code: 'A054',
      name: 'Dolomite',
      hex: '#BEB9B0',
      undertone: 'Alpine Mineral Grey',
      lrvApprox: 48,
      sheenBehavior: 'Crisp crushed-dolomite neutral with soft mineral variation across 2–3 thin trowel passes.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Tadelakt', 'Travertino'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano', 'lime'],
    },
    {
      id: 'vas-a158',
      manufacturer: 'Vasari',
      code: 'A158',
      name: 'Andalus',
      hex: '#C59F87',
      undertone: 'Beige Terracotta',
      lrvApprox: 40,
      sheenBehavior: 'Soft sun-baked clay bridging neutral beige and terracotta; rich biophilic warmth on plaster niches and hoods.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Venetian Marmorino', 'Biolime', 'Roman Clay', 'Tadelakt'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano', 'lime'],
    },
    {
      id: 'vas-a046',
      manufacturer: 'Vasari',
      code: 'A046',
      name: 'Sumatra',
      hex: '#7D6759',
      undertone: 'Deep Reddish Umber',
      lrvApprox: 16,
      sheenBehavior: 'Deep muted earth brown; shows strong tonal movement when burnished in Veneziano.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Venetian Marmorino', 'Roman Clay', 'Tadelakt'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano'],
    },
    {
      id: 'vas-a074',
      manufacturer: 'Vasari',
      code: 'A074',
      name: 'Carbon',
      hex: '#464644',
      undertone: 'Burnished Mineral Carbon',
      lrvApprox: 7,
      sheenBehavior: 'Statement dark mineral charcoal; high-gloss burnishing creates dramatic marble depth in dining rooms and range hoods.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Venetian Marmorino', 'Tadelakt'],
      systemKeywords: ['vasari', 'marmorino', 'venetian', 'veneziano'],
    },
  ],
};

/* ================================================================== */
/* 4. SURECRETE — Pre-Measured SC Color Pack Iron-Oxide Palette        */
/* ================================================================== */
export const SURECRETE_PALETTE: ManufacturerColorPalette = {
  manufacturer: 'SureCrete',
  paletteName: 'SureCrete SC Color Pack Palette',
  note: 'Pre-measured 100% synthetic UV-stable iron-oxide pigment packs (1 pack per bag of white MicroTek, SureBroom, SureTex, or SureSpray).',
  swatches: [
    {
      id: 'sc-nat-white',
      manufacturer: 'SureCrete',
      code: 'SC-NATWHT',
      name: 'Natural White',
      hex: '#ECE9E1',
      undertone: 'White Cement Canvas',
      lrvApprox: 82,
      sheenBehavior: 'Clean architectural microcement white; deepens slightly under FloorTek NanoCoat or Dura-Kote polyurethane.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-ant-white',
      manufacturer: 'SureCrete',
      code: 'SC-ANTWHT',
      name: 'Antique White',
      hex: '#E3DCCD',
      undertone: 'Warm Bone White',
      lrvApprox: 74,
      sheenBehavior: 'Soft warm micro-topping white that prevents sterile floor or shower-wall glare.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-ivory',
      manufacturer: 'SureCrete',
      code: 'SC-IVORY',
      name: 'Ivory',
      hex: '#DFD4BE',
      undertone: 'Creamy Travertine',
      lrvApprox: 68,
      sheenBehavior: 'Warm ivory cement tone; penetrating sealers bring out subtle tight-trowel compression clouds.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Microcement', 'Tadelakt', 'Travertino'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-limestone',
      manufacturer: 'SureCrete',
      code: 'SC-LIME',
      name: 'Limestone',
      hex: '#D0C8B8',
      undertone: 'Quarried Limestone',
      lrvApprox: 58,
      sheenBehavior: 'Go-to neutral stone color for seamless MicroTek bathroom walls, floors, and commercial broom overlays.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Microcement', 'Tadelakt', 'Travertino'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-putty',
      manufacturer: 'SureCrete',
      code: 'SC-PUTTY',
      name: 'Putty',
      hex: '#C2B7A3',
      undertone: 'Warm Mineral Putty',
      lrvApprox: 49,
      sheenBehavior: 'Organic warm greige concrete look; pairs well with natural white oak and unlacquered brass.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-sand-buff',
      manufacturer: 'SureCrete',
      code: 'SC-SANDBUFF',
      name: 'Sand Buff',
      hex: '#C8B294',
      undertone: 'Desert Sandstone',
      lrvApprox: 47,
      sheenBehavior: 'UV-stable sandstone buff popular for exterior SureBroom patios, pool decks, and warm interior floors.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Microcement', 'Travertino'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-silver',
      manufacturer: 'SureCrete',
      code: 'SC-SILVER',
      name: 'Silver',
      hex: '#C2C4C4',
      undertone: 'Light Platinum Gray',
      lrvApprox: 55,
      sheenBehavior: 'Bright modern architectural concrete gray with crisp trowel movement.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-dove-gray',
      manufacturer: 'SureCrete',
      code: 'SC-DOVE',
      name: 'Dove Gray',
      hex: '#A9ABA8',
      undertone: 'Soft Neutral Cement',
      lrvApprox: 41,
      sheenBehavior: 'Balanced mid-light concrete gray; hides foot traffic and dust cleanly on commercial and residential floors.',
      tintBaseLimit: 'light-to-medium',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-concrete-gray',
      manufacturer: 'SureCrete',
      code: 'SC-CONCGRAY',
      name: 'Concrete Gray',
      hex: '#8E908D',
      undertone: 'True Cured Slab Gray',
      lrvApprox: 28,
      sheenBehavior: 'Classic troweled slab gray; color-enhancing sealers enrich depth by ~15%.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-taupe',
      manufacturer: 'SureCrete',
      code: 'SC-TAUPE',
      name: 'Taupe',
      hex: '#96897B',
      undertone: 'Earthy Warm Concrete',
      lrvApprox: 26,
      sheenBehavior: 'Warm architectural taupe microcement with rich organic mottling.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-smoke',
      manufacturer: 'SureCrete',
      code: 'SC-SMOKE',
      name: 'Smoke',
      hex: '#737677',
      undertone: 'Cool Steel Slate',
      lrvApprox: 19,
      sheenBehavior: 'Medium-dark industrial slate gray for modern microcement showers, hearths, and floors.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
    {
      id: 'sc-charcoal',
      manufacturer: 'SureCrete',
      code: 'SC-CHAR',
      name: 'Charcoal',
      hex: '#484A4B',
      undertone: 'Deep Iron-Oxide Charcoal',
      lrvApprox: 8,
      sheenBehavior: 'Bold dark charcoal overlay; dramatic tight-trowel variation under matte or satin urethane topcoats.',
      tintBaseLimit: 'full-spectrum',
      visualizerSystems: ['Microcement', 'Tadelakt'],
      systemKeywords: ['surebroom', 'microtek', 'microcement'],
    },
  ],
};

export const MANUFACTURER_COLOR_CATALOG: ManufacturerColorPalette[] = [
  ROMABIO_PALETTE,
  MEODED_PALETTE,
  VASARI_PALETTE,
  SURECRETE_PALETTE,
];

export const ALL_COLOR_SWATCHES: ColorSwatch[] = MANUFACTURER_COLOR_CATALOG.flatMap((p) => p.swatches);

/** Return factory-approved swatches for a Finish Visualizer system (optionally filtered by manufacturer). */
export function getSwatchesForVisualizerSystem(
  system: FinishSystem,
  manufacturerFilter?: string,
): ColorSwatch[] {
  return ALL_COLOR_SWATCHES.filter((s) => {
    if (!s.visualizerSystems.includes(system)) return false;
    if (manufacturerFilter && manufacturerFilter !== 'All') {
      return s.manufacturer.toLowerCase() === manufacturerFilter.toLowerCase();
    }
    return true;
  });
}

/** Return distinct manufacturers available for a given Finish Visualizer system. */
export function getManufacturersForVisualizerSystem(system: FinishSystem): string[] {
  const set = new Set<string>();
  for (const s of ALL_COLOR_SWATCHES) {
    if (s.visualizerSystems.includes(system)) set.add(s.manufacturer);
  }
  return Array.from(set);
}

/** Return factory-approved swatches for a Systems Library record (by manufacturer + system name). */
export function getSwatchesForSystem(manufacturer: string | null | undefined, systemName: string): ColorSwatch[] {
  const m = (manufacturer || '').toLowerCase();
  const n = systemName.toLowerCase();
  if (!m) return [];
  // Skip pure primers and clear sealers/waxes that aren't tinted finish coats
  if (/(primer|shield|topcoat|hydrowax|plasterguard|plasterseal|dura-kote|silane)/i.test(n)) {
    return [];
  }
  return ALL_COLOR_SWATCHES.filter((s) => {
    if (!m.includes(s.manufacturer.toLowerCase())) return false;
    // Slurry systems only accept light-to-medium mineral bases
    if (n.includes('lime slurry') && s.tintBaseLimit !== 'light-to-medium') return false;
    return s.systemKeywords.some((kw) => n.includes(kw));
  });
}
