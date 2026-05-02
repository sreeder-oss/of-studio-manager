import { z } from 'zod';

// Common helpers
const nstr = z.string().nullable().optional();
const nnum = z.number().nullable().optional();
const nbool = z.boolean().nullable().optional();

export const addSystemDataSchema = z.object({
  name: z.string().min(1),
  manufacturer: nstr,
  description: nstr,
  coats: nnum,
  coverage_rate: nnum,
  coverage_unit: nstr,
  cost_per_unit: nnum,
  labor_rate_per_sf: nnum,
  typical_equipment: nstr,
  substrate_notes: nstr,
  application_notes: nstr,
  source_url: nstr,
});

export const createContactSchema = z.object({
  name: z.string().min(1),
  type: nstr, status: nstr, email: nstr, phone: nstr, address: nstr, notes: nstr,
});

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().uuid(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1),
  contact_id: z.string().uuid().nullable().optional(),
  status: nstr, address: nstr,
  start_date: nstr, end_date: nstr,
  contract_value: nnum, notes: nstr,
});

export const createReceiptSchema = z.object({
  vendor: nstr,
  amount: z.number(),
  receipt_date: z.string(), // YYYY-MM-DD
  category: nstr,
  project_id: z.string().uuid().nullable().optional(),
  tax_deductible: nbool,
  notes: nstr,
});

export const markPaymentReceivedSchema = z.object({
  invoice_id: z.string().uuid(),
  paid_date: nstr,
});

export const queryTaxSummarySchema = z.object({
  year: z.string(),
});

export const updateSystemSchema = addSystemDataSchema.partial().extend({
  id: z.string().uuid(),
});

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_system'), data: addSystemDataSchema }),
  z.object({ type: z.literal('update_system'), data: updateSystemSchema }),
  z.object({ type: z.literal('create_contact'), data: createContactSchema }),
  z.object({ type: z.literal('update_contact'), data: updateContactSchema }),
  z.object({ type: z.literal('create_project'), data: createProjectSchema }),
  z.object({ type: z.literal('create_receipt'), data: createReceiptSchema }),
  z.object({ type: z.literal('mark_payment_received'), data: markPaymentReceivedSchema }),
  z.object({ type: z.literal('query_tax_summary'), data: queryTaxSummarySchema }),
]);

export type AIAction = z.infer<typeof actionSchema>;
export type AddSystemData = z.infer<typeof addSystemDataSchema>;
export type CreateContactData = z.infer<typeof createContactSchema>;
export type UpdateContactData = z.infer<typeof updateContactSchema>;
export type CreateProjectData = z.infer<typeof createProjectSchema>;
export type CreateReceiptData = z.infer<typeof createReceiptSchema>;
export type MarkPaymentReceivedData = z.infer<typeof markPaymentReceivedSchema>;
export type QueryTaxSummaryData = z.infer<typeof queryTaxSummarySchema>;
export type UpdateSystemData = z.infer<typeof updateSystemSchema>;

export interface ParsedAction {
  /** Stable id (hash of fenced block contents) so we can mark it applied. */
  id: string;
  action: AIAction;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `a${(h >>> 0).toString(36)}`;
}

/** Pull all ```action fenced blocks from an assistant message. */
export function parseActionsFromText(text: string): ParsedAction[] {
  const re = /```action\s*([\s\S]*?)```/g;
  const out: ParsedAction[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].trim();
    try {
      const obj = JSON.parse(raw);
      const result = actionSchema.safeParse(obj);
      if (result.success) out.push({ id: hash(raw), action: result.data });
    } catch { /* skip invalid */ }
  }
  return out;
}

/** Strip the action fences for clean prose rendering. */
export function stripActionBlocks(text: string): string {
  return text.replace(/```action\s*[\s\S]*?```/g, '').trim();
}
