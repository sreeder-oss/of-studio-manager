import { z } from 'zod';

/** AI-extracted scope. The AI never sets prices — pricing comes from src/lib/pricing.ts. */
export const PREP_TIERS = ['light', 'standard', 'heavy'] as const;

export const scopeAreaSchema = z.object({
  name: z.string().min(1),
  area_sf: z.number().nonnegative(),
  system_id: z.string().nullable(),
  substrate: z.string(),
  prep_tier: z.enum(PREP_TIERS),
  notes: z.string(),
});
export type ScopeArea = z.infer<typeof scopeAreaSchema>;

export const estimateScopeSchema = z.object({
  kind: z.literal('estimate_scope'),
  model_used: z.string(),
  prompt: z.string(),
  title: z.string().default(''),
  client_name: z.string().default(''),
  project_address: z.string().default(''),
  areas: z.array(scopeAreaSchema).min(1),
});
export type EstimateScope = z.infer<typeof estimateScopeSchema>;

export function parseScopeFromText(text: string): EstimateScope | null {
  const re = /```json\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      const r = estimateScopeSchema.safeParse(JSON.parse(m[1]));
      if (r.success) return r.data;
    } catch { /* next */ }
  }
  return null;
}
