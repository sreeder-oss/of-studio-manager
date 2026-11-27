import { describe, it, expect } from 'vitest';
import {
  ROMABIO_PALETTE,
  MEODED_PALETTE,
  VASARI_PALETTE,
  SURECRETE_PALETTE,
  CUSTOM_MATCH_FEE,
  getSwatchesForSystem,
  getSwatchesForVisualizerSystem,
  getManufacturersForVisualizerSystem,
} from '@/data/colorCatalog';
import { compileFinishPrompt } from '@/lib/finishVisualizer';

describe('Manufacturer Color Catalog (Romabio, Meoded, Vasari, SureCrete)', () => {
  it('loads all 4 core manufacturer palettes (46 total factory swatches)', () => {
    expect(ROMABIO_PALETTE.swatches).toHaveLength(12);
    expect(MEODED_PALETTE.swatches).toHaveLength(12);
    expect(VASARI_PALETTE.swatches).toHaveLength(10);
    expect(SURECRETE_PALETTE.swatches).toHaveLength(12);
  });

  it('filters Lime Slurry strictly to light-to-medium bases (blocks full-spectrum darks)', () => {
    const romabioSlurry = getSwatchesForSystem('Romabio', 'Romabio Lime Slurry');
    expect(romabioSlurry.length).toBeGreaterThan(0);
    expect(romabioSlurry.every((s) => s.tintBaseLimit === 'light-to-medium')).toBe(true);
    expect(romabioSlurry.some((s) => s.code === 'RB-ARDESIA')).toBe(false);

    const meodedSlurry = getSwatchesForSystem('Meoded', 'Meoded Marmorino Palladino™ Lime Slurry Finish (Masonry & Brick)');
    expect(meodedSlurry.length).toBeGreaterThan(0);
    expect(meodedSlurry.every((s) => s.tintBaseLimit === 'light-to-medium')).toBe(true);
    expect(meodedSlurry.some((s) => s.code === 'MC-893')).toBe(false);
  });

  it('skips clear primers and sealers in Systems Library TDS palette lookup', () => {
    expect(getSwatchesForSystem('Meoded', 'Meoded Quartz Primer & Substrate Prep System')).toHaveLength(0);
    expect(getSwatchesForSystem('Romabio', 'Romabio Mineral Shield')).toHaveLength(0);
    expect(getSwatchesForSystem('SureCrete', 'SureCrete Dura-Kote Polyurethane & NanoCoat Sealer System')).toHaveLength(0);
  });

  it('returns Meoded & SureCrete swatches for Microcement in Visualizer and supports brand filtering', () => {
    const brands = getManufacturersForVisualizerSystem('Microcement');
    expect(brands).toEqual(expect.arrayContaining(['Meoded', 'SureCrete']));

    const surecreteOnly = getSwatchesForVisualizerSystem('Microcement', 'SureCrete');
    expect(surecreteOnly.length).toBe(12);
    expect(surecreteOnly.every((s) => s.manufacturer === 'SureCrete')).toBe(true);
  });

  it('injects factory swatch code, undertone, and sheen behavior into Visualizer prompt', () => {
    const whiteDove = MEODED_PALETTE.swatches.find((s) => s.code === 'MC-706')!;
    const prompt = compileFinishPrompt({
      surfaceTarget: 'Fireplace',
      finishSystem: 'Venetian Marmorino',
      movement: 'Medium',
      sheen: 'Satin',
      texture: 'Smooth',
      hasInspirationImage: false,
      swatch: whiteDove,
    });
    expect(prompt).toContain('Meoded MC-706');
    expect(prompt).toContain('White Dove');
    expect(prompt).toContain('Soft Warm Off-White');
  });

  it('sets Custom Paint Match Lab Fee to $150', () => {
    expect(CUSTOM_MATCH_FEE).toBe(150);
  });
});
