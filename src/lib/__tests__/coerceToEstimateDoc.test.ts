import { describe, it, expect } from 'vitest';
import { coerceToEstimateDoc } from '@/lib/estimatePdf';

describe('coerceToEstimateDoc', () => {
  it('returns null for null/undefined', () => {
    expect(coerceToEstimateDoc(null)).toBeNull();
    expect(coerceToEstimateDoc(undefined)).toBeNull();
  });

  it('returns the doc when stored value is already structured', () => {
    const doc = {
      sections: [{ label: 'A', line_items: [], subtotal: 0 }],
      title: 'Existing',
    };
    const out = coerceToEstimateDoc(doc, { valid_until: '2026-12-31' });
    expect(out?.title).toBe('Existing');
    // injects fallback valid_until when missing
    expect(out?.valid_until).toBe('2026-12-31');
  });

  it('preserves existing valid_until on a structured doc', () => {
    const doc = { sections: [], valid_until: '2027-01-01' };
    const out = coerceToEstimateDoc(doc, { valid_until: '2099-12-31' });
    expect(out?.valid_until).toBe('2027-01-01');
  });

  it('coerces a legacy flat array of line items into a single-section doc', () => {
    const legacy = [
      { scope: 'Prep', materials: 'Sandpaper', amount: 250 },
      { description: 'Topcoat', amount: 750 },
    ];
    const out = coerceToEstimateDoc(legacy, {
      title: 'Legacy',
      client_name: 'Acme',
      total: 1000,
      tax_rate: 0.0875,
    });
    expect(out).not.toBeNull();
    expect(out!.title).toBe('Legacy');
    expect(out!.client_name).toBe('Acme');
    expect(out!.sections).toHaveLength(5);
    expect(out!.sections[0].line_items).toHaveLength(2);
    expect(out!.sections[0].subtotal).toBe(1000);
    // tax_rate stored as fraction is converted to percent for the doc
    expect(out!.tax_rate).toBeCloseTo(8.75, 2);
    expect(out!.total).toBe(1000);
  });

  it('returns null for unknown shapes', () => {
    expect(coerceToEstimateDoc('a string')).toBeNull();
    expect(coerceToEstimateDoc(42)).toBeNull();
  });
});
