import { z } from 'zod';

export const addSystemDataSchema = z.object({
  name: z.string().min(1),
  manufacturer: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  coats: z.number().nullable().optional(),
  coverage_rate: z.number().nullable().optional(),
  coverage_unit: z.string().nullable().optional(),
  cost_per_unit: z.number().nullable().optional(),
  labor_rate_per_sf: z.number().nullable().optional(),
  typical_equipment: z.string().nullable().optional(),
  substrate_notes: z.string().nullable().optional(),
  application_notes: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
});
export type AddSystemData = z.infer<typeof addSystemDataSchema>;

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_system'), data: addSystemDataSchema }),
]);
export type AIAction = z.infer<typeof actionSchema>;

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
