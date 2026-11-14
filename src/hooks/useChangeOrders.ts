import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ChangeOrder = Database['public']['Tables']['change_orders']['Row'];
export const CHANGE_ORDER_STATUSES = ['Proposed', 'Approved', 'Declined'] as const;
export type ChangeOrderStatus = typeof CHANGE_ORDER_STATUSES[number];

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const approvedChangesTotal = (cos: Pick<ChangeOrder, 'status' | 'amount'>[]) =>
  r2(cos.filter(c => c.status === 'Approved').reduce((s, c) => s + Number(c.amount || 0), 0));

/**
 * Pure: append change orders to stored invoice line_items and recompute money.
 * Works for flat line arrays and for structured docs with sections.
 * tax_rate is a fraction (0.0875).
 */
export function appendChangeOrders(lineItems: unknown, cos: Pick<ChangeOrder, 'id' | 'description' | 'amount'>[], tax_rate: number) {
  const coLines = cos.map(c => ({
    id: `co-${c.id}`, kind: 'change_order', change_order_id: c.id, service_id: null, system_id: null,
    description: `Change order: ${c.description}`, qty: 1, unit: 'lot', rate: r2(Number(c.amount || 0)), amount: r2(Number(c.amount || 0)), note: null,
  }));
  let line_items: any;
  let subtotal: number;
  if (lineItems && typeof lineItems === 'object' && !Array.isArray(lineItems) && Array.isArray((lineItems as any).sections)) {
    const doc = lineItems as any;
    const docLines = coLines.map(l => ({ description: l.description, sub_note: '', qty: 1, unit: 'lot', unit_cost: l.amount, total: l.amount, change_order_id: l.change_order_id }));
    const sections = [...doc.sections];
    const idx = sections.findIndex((s: any) => s.label === 'Change orders');
    if (idx >= 0) {
      const items = [...sections[idx].line_items, ...docLines];
      sections[idx] = { ...sections[idx], line_items: items, subtotal: r2(items.reduce((s: number, l: any) => s + Number(l.total || 0), 0)) };
    } else {
      sections.push({ label: 'Change orders', line_items: docLines, subtotal: r2(docLines.reduce((s, l) => s + l.total, 0)) });
    }
    subtotal = r2(sections.reduce((s: number, sec: any) => s + Number(sec.subtotal || 0), 0));
    line_items = { ...doc, sections };
  } else {
    const arr = Array.isArray(lineItems) ? [...lineItems] : [];
    line_items = [...arr, ...coLines];
    subtotal = r2(line_items.reduce((s: number, l: any) => s + Number(l.amount || 0), 0));
  }
  const tax = r2(subtotal * Math.max(0, Number(tax_rate || 0)));
  return { line_items, subtotal, tax_amount: tax, tax_applied: tax, total: r2(subtotal + tax) };
}

export const useChangeOrders = (projectId: string | null | undefined) => useQuery({
  queryKey: ['change_orders', projectId],
  enabled: !!projectId,
  queryFn: async () => {
    const { data, error } = await supabase.from('change_orders').select('*').eq('project_id', projectId!)
      .order('agreed_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const useSaveChangeOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { id?: string; project_id: string; description: string; amount: number; agreed_on: string | null; status: ChangeOrderStatus; notes: string | null }) => {
      const payload = { description: c.description, amount: c.amount, agreed_on: c.agreed_on, status: c.status, notes: c.notes };
      const { error } = c.id
        ? await supabase.from('change_orders').update(payload).eq('id', c.id)
        : await supabase.from('change_orders').insert({ ...payload, project_id: c.project_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['change_orders'] }),
  });
};

export const useSetChangeOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ChangeOrderStatus }) => {
      const { error } = await supabase.from('change_orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['change_orders'] }),
  });
};

export const useAddChangeOrdersToInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, projectId }: { invoiceId: string; projectId: string }) => {
      const { data: inv, error: e1 } = await supabase.from('invoices').select('line_items, tax_rate').eq('id', invoiceId).single();
      if (e1 || !inv) throw e1 ?? new Error('Invoice not found');
      const { data: cos, error: e2 } = await supabase.from('change_orders').select('id, description, amount')
        .eq('project_id', projectId).eq('status', 'Approved').is('invoice_id', null);
      if (e2) throw e2;
      if (!cos?.length) return 0;
      const next = appendChangeOrders(inv.line_items, cos, Number(inv.tax_rate || 0));
      const { error: e3 } = await supabase.from('invoices').update({
        line_items: next.line_items,
        subtotal: next.subtotal,
        tax_amount: next.tax_amount,
        tax_applied: next.tax_applied,
        total: next.total,
      }).eq('id', invoiceId);
      if (e3) throw e3;
      const { error: e4 } = await supabase.from('change_orders').update({ invoice_id: invoiceId }).in('id', cos.map(c => c.id));
      if (e4) throw e4;
      return cos.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change_orders'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
