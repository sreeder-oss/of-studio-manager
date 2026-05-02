import { z } from 'zod';

export const invoiceLineItemSchema = z.object({
  description: z.string(),
  sub_note: z.string().optional().default(''),
  qty: z.number(),
  unit: z.string(),
  unit_cost: z.number(),
  total: z.number(),
});

export const invoiceSectionSchema = z.object({
  label: z.string(),
  line_items: z.array(invoiceLineItemSchema),
  subtotal: z.number(),
});

export const invoicePaymentSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  amount: z.number(),
  method: z.string().optional().default(''),
  note: z.string().optional().default(''),
});

export const invoiceSchema = z.object({
  invoice_number: z.string().optional().default(''),
  title: z.string(),
  client_name: z.string().optional().default(''),
  project_address: z.string().optional().default(''),
  project_name: z.string().optional().default(''),
  substrate: z.string().optional().default(''),
  system_name: z.string().optional().default(''),
  area_sf: z.number().optional().default(0),

  invoice_date: z.string().optional().default(''),     // YYYY-MM-DD
  due_date: z.string().optional().default(''),         // YYYY-MM-DD
  service_period: z.string().optional().default(''),   // free-form e.g. "Mar 4 – Mar 22, 2026"

  /** Plain-English summary of what work this invoice covers — 2–4 sentences. */
  work_summary: z.string().optional().default(''),

  /** Project milestone this invoice represents (Deposit / Progress / Final). */
  milestone: z.string().optional().default(''),

  sections: z.array(invoiceSectionSchema),
  direct_cost_subtotal: z.number().optional().default(0),
  tax_rate: z.number().optional().default(0),     // %
  tax_amount: z.number().optional().default(0),
  subtotal: z.number().optional().default(0),     // before tax
  total: z.number().optional().default(0),        // invoice gross
  deposit_applied: z.number().optional().default(0),
  prior_payments: z.array(invoicePaymentSchema).optional().default([]),
  amount_paid: z.number().optional().default(0),  // sum of prior_payments + deposit
  balance_due: z.number().optional().default(0),

  payment_terms: z.string().optional().default(''),       // 1–2 sentences (Net 30 etc.)
  payment_methods: z.array(z.string()).optional().default([]),
  late_fee_note: z.string().optional().default(''),
  thank_you_note: z.string().optional().default(''),
  notes: z.array(z.string()).optional().default([]),
});

export type InvoiceDoc = z.infer<typeof invoiceSchema>;

/** Extract first ```json fenced block whose payload is an InvoiceDoc. */
export function parseInvoiceFromText(text: string): InvoiceDoc | null {
  const re = /```json\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      // disambiguate from estimates: invoice docs have no `bid_range`, no `assumptions`,
      // and have invoice-specific fields.
      if (
        obj && typeof obj === 'object' &&
        Array.isArray(obj.sections) &&
        ('invoice_number' in obj || 'balance_due' in obj || 'milestone' in obj || 'work_summary' in obj)
      ) {
        const result = invoiceSchema.safeParse(obj);
        if (result.success) return result.data;
      }
    } catch { /* try next */ }
  }
  return null;
}

export function recalcInvoice(inv: InvoiceDoc): InvoiceDoc {
  const sections = inv.sections.map((s) => {
    const items = s.line_items.map((li) => ({ ...li, total: +(li.qty * li.unit_cost).toFixed(2) }));
    const subtotal = +items.reduce((a, b) => a + b.total, 0).toFixed(2);
    return { ...s, line_items: items, subtotal };
  });
  const direct = +sections.reduce((a, s) => a + s.subtotal, 0).toFixed(2);
  const tax = +(direct * ((inv.tax_rate || 0) / 100)).toFixed(2);
  const total = +(direct + tax).toFixed(2);
  const paymentsSum = (inv.prior_payments || []).reduce((a, p) => a + (p.amount || 0), 0);
  const amountPaid = +((inv.deposit_applied || 0) + paymentsSum).toFixed(2);
  const balance = +(total - amountPaid).toFixed(2);
  return {
    ...inv,
    sections,
    direct_cost_subtotal: direct,
    subtotal: direct,
    tax_amount: tax,
    total,
    amount_paid: amountPaid,
    balance_due: balance,
  };
}
