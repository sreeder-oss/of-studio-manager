import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { depositAmount, renderTerms, DEFAULT_SETTINGS } from '@/hooks/useSettings';

describe('settings defaults', () => {
  it('tax 8.75%, waste 12%, deposit 50%', () => {
    expect(DEFAULT_SETTINGS.default_tax_rate).toBe(0.0875);
    expect(DEFAULT_SETTINGS.default_waste_factor).toBe(0.12);
    expect(DEFAULT_SETTINGS.default_deposit_pct).toBe(0.5);
  });
  it('deposit requested is total × deposit %', () => expect(depositAmount(10000, 0.5)).toBe(5000));
  it('terms show the configured deposit %', () => {
    expect(renderTerms({ terms_text: null, default_deposit_pct: 0.3 })[0]).toContain('A 30% deposit');
  });
});
