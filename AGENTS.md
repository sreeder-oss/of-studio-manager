- AI (ai-chat edge function) only extracts estimate scope via the strict `emit_scope` tool; all estimate pricing is computed client-side in `src/lib/pricing.ts`. Why: deterministic, auditable prices.
- ai-chat is pinned to one model at temperature 0. Why: reproducible scope extraction.
- Whenever a feature, route, workflow, or pricing rule is added or changed, update the matching chapter and changelog in `src/data/handbook.ts` (and `src/components/handbook/HandbookDiagrams.tsx` if visuals change) in the same commit/PR. Why: keeps the in-app Studio Handbook accurate with zero drift.

