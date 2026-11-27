import { describe, it, expect } from 'vitest';
import {
  ROMABIO_PALETTE,
  CUSTOM_MATCH_FEE,
  getSwatchesForSystem,
  getSwatchesForVisualizerSystem,
} from '@/data/colorCatalog';
import { compileFinishPrompt } from '@/lib/finishVisualizer';

describe('Manufacturer Color Catalog (Romabio)', () => {
  it('filters Lime Slurry strictly to light-to-medium bases (blocks Ardesia Charcoal)', () => {
    const slurrySwatches = getSwatchesForSystem('Romabio', 'Romabio Lime Slurry');
    expect(slurrySwatches.length).toBeGreaterThan(0);
    expect(slurrySwatches.every((s) => s.tintBaseLimit === 'light-to-medium')).toBe(true);
    expect(slurrySwatches.some((s) => s.code === 'RB-ARDESIA')).toBe(false);
  });

  it('includes full-spectrum swatches for Venetian Marmorino in Visualizer', () => {
    const marmorinoSwatches = getSwatchesForVisualizerSystem('Venetian Marmorino');
    expect(marmorinoSwatches.some((s) => s.code === 'RB-ARDESIA')).toBe(true);
    expect(marmorinoSwatches.some((s) => s.code === 'RB-AVO')).toBe(true);
  });

  it('injects factory swatch code, undertone, and sheen behavior into Visualizer prompt', () => {
    const avorio = ROMABIO_PALETTE.swatches.find((s) => s.code === 'RB-AVO')!;
    const prompt = compileFinishPrompt({
      surfaceTarget: 'Fireplace',
      finishSystem: 'Limewash',
      movement: 'Medium',
      sheen: 'Dead Flat Matte',
      texture: 'Light Trowel',
      hasInspirationImage: false,
      swatch: avorio,
    });
    expect(prompt).toContain('RB-AVO');
    expect(prompt).toContain('Avorio White');
    expect(prompt).toContain('Warm Cream');
  });

  it('sets Custom Paint Match Lab Fee to $150', () => {
    expect(CUSTOM_MATCH_FEE).toBe(150);
  });
});
