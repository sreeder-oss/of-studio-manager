import { z } from 'zod';

export const lineItemSchema = z.object({
  description: z.string(),
  sub_note: z.string().optional().default(''),
  qty: z.number(),
  unit: z.string(),
  unit_cost: z.number(),
  total: z.number(),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const sectionSchema = z.object({
  label: z.string(),
  line_items: z.array(lineItemSchema),
  subtotal: z.number(),
});
export type EstimateSection = z.infer<typeof sectionSchema>;

export const bidRangeSchema = z.object({
  low: z.number(),
  low_note: z.string().optional().default(''),
  mid: z.number(),
  mid_note: z.string().optional().default(''),
  high: z.number(),
  high_note: z.string().optional().default(''),
});
export type BidRange = z.infer<typeof bidRangeSchema>;

export const estimateSchema = z.object({
  title: z.string(),
  client_name: z.string().optional().default(''),
  project_address: z.string().optional().default(''),
  substrate: z.string().optional().default(''),
  system_name: z.string().optional().default(''),
  area_sf: z.number().nonnegative().optional().default(0),
  area_note: z.string().optional().default(''),
  duration_estimate: z.string().optional().default(''),
  sections: z.array(sectionSchema),
  direct_cost_subtotal: z.number().nonnegative().optional().default(0),
  overhead_pct: z.number().min(0).max(100).optional().default(8),
  overhead_amount: z.number().nonnegative().optional().default(0),
  profit_pct: z.number().min(0).max(100).optional().default(10),
  profit_amount: z.number().nonnegative().optional().default(0),
  /** percent (e.g. 8.75 for 8.75%) — converted to fraction (0.0875) before persisting */
  tax_rate: z.number().min(0).max(100).optional().default(0),
  tax_amount: z.number().nonnegative().optional().default(0),
  total: z.number().nonnegative().optional().default(0),
  per_sf: z.number().nonnegative().optional().default(0),
  bid_range: bidRangeSchema.optional(),
  assumptions: z.array(z.string()).optional().default([]),
  exclusions: z.array(z.string()).optional().default([]),
  system_note: z.string().optional().default(''),
  /** ISO date 'YYYY-MM-DD' — when this estimate expires */
  valid_until: z.string().optional().default(''),
  /** Lines come from the price book: amounts are stored, not recomputed. */
  price_book: z.boolean().optional(),
});

export type EstimateDoc = z.infer<typeof estimateSchema>;

/** Extract first ```json fenced block that parses as an estimate. */
export function parseEstimateFromText(text: string): EstimateDoc | null {
  const re = /```json\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      const result = estimateSchema.safeParse(obj);
      if (result.success && Array.isArray(result.data.sections)) return result.data;
    } catch { /* try next */ }
  }
  return null;
}

export function recalcEstimate(e: EstimateDoc): EstimateDoc {
  if (e.price_book) return e;
  const sections = e.sections.map((s) => {
    const items = s.line_items.map((li) => ({ ...li, total: +(li.qty * li.unit_cost).toFixed(2) }));
    const subtotal = +items.reduce((a, b) => a + b.total, 0).toFixed(2);
    return { ...s, line_items: items, subtotal };
  });
  // Direct cost = A + B + C + D (skip E which is overhead/profit)
  const direct = +sections.slice(0, 4).reduce((a, s) => a + s.subtotal, 0).toFixed(2);
  const overhead = +(direct * (e.overhead_pct / 100)).toFixed(2);
  const profit = +((direct + overhead) * (e.profit_pct / 100)).toFixed(2);
  const preTax = direct + overhead + profit;
  const tax = +(preTax * (e.tax_rate / 100)).toFixed(2);
  const total = +(preTax + tax).toFixed(2);
  const perSf = e.area_sf > 0 ? +(total / e.area_sf).toFixed(2) : 0;
  return {
    ...e,
    sections,
    direct_cost_subtotal: direct,
    overhead_amount: overhead,
    profit_amount: profit,
    tax_amount: tax,
    total,
    per_sf: perSf,
  };
}
