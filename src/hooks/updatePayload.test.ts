import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { buildUpdatePayload } from '@/hooks/useEstimates';

const ESTIMATE_KEYS = ['contact_id','project_id','line_items','subtotal','tax_rate','total','status','valid_until','notes','terms','direct_cost_subtotal','overhead_amount','profit_amount','pre_tax_total','tax_amount','system_id','area_sf','model_used','prompt'];
const INVOICE_KEYS = ['contact_id','project_id','estimate_id','line_items','subtotal','tax_rate','tax_applied','total','due_date','paid','paid_date','notes','terms'];

describe('update payload builder', () => {
  it('estimate: { id, notes } sends only notes', () => {
    expect(buildUpdatePayload({ id: 'e1', notes: 'hi' }, ESTIMATE_KEYS)).toEqual({ notes: 'hi' });
  });
  it('invoice: { id, notes } sends only notes', () => {
    expect(buildUpdatePayload({ id: 'i1', notes: 'hi' }, INVOICE_KEYS)).toEqual({ notes: 'hi' });
  });
  it('explicit null is still sent', () => {
    expect(buildUpdatePayload({ id: 'i1', notes: null, terms: undefined }, INVOICE_KEYS)).toEqual({ notes: null });
  });
});
