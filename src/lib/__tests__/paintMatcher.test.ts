import { describe, it, expect } from 'vitest';
import {
  searchDesignerPaints,
  findClosestStockSwatches,
  buildVisualizerHandoffUrl,
  buildColorMatcherPromptContext,
} from '@/lib/paintMatcher';
import { MEODED_PALETTE } from '@/data/colorCatalog';

describe('Designer Paint Cross-Reference & Visualizer Handoff', () => {
  it('distinguishes BM OC-45 Swiss Coffee, Behr 12 Swiss Coffee, and DE/Spectrum Swiss Coffee', () => {
    const matches = searchDesignerPaints('Swiss Coffee');
    expect(matches.length).toBeGreaterThanOrEqual(3);
    const brands = matches.map((m) => m.brand);
    expect(brands).toContain('Benjamin Moore');
    expect(brands).toContain('Behr');
    expect(brands).toContain('Dunn-Edwards / Spectrum');
  });

  it('matches Shoji White (SW 7042) to closest Meoded Microcement stock offerings', () => {
    const shoji = searchDesignerPaints('Shoji White')[0];
    expect(shoji).toBeDefined();
    expect(shoji.lrv).toBe(74);

    const closest = findClosestStockSwatches({
      targetHex: shoji.hex,
      targetLrv: shoji.lrv,
      system: 'Microcement',
      manufacturer: 'Meoded',
      limit: 2,
    });
    expect(closest).toHaveLength(2);
    const codes = closest.map((c) => c.swatch.code);
    // Swiss Coffee MC-756 and White Dove MC-706 are the closest Meoded Microcement warm off-whites
    expect(codes.some((c) => c === 'MC-756' || c === 'MC-706')).toBe(true);
  });

  it('builds a valid /visualizer handoff deep-link with surface, system, brand & swatch', () => {
    const whiteDove = MEODED_PALETTE.swatches.find((s) => s.code === 'MC-706')!;
    const url = buildVisualizerHandoffUrl({
      surface: 'Fireplace',
      system: 'Microcement',
      swatch: whiteDove,
    });
    expect(url).toBe('/visualizer?surface=Fireplace&system=Microcement&brand=Meoded&swatch=meo-mc706');
  });

  it('includes both 46 stock swatches and same-name Swiss Coffee warning in AI prompt context', () => {
    const ctx = buildColorMatcherPromptContext();
    expect(ctx).toContain('MC-706');
    expect(ctx).toContain('Shoji White');
    expect(ctx).toContain('TRAP ALERT: BM OC-45');
  });
});
