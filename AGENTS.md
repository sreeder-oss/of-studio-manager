
- AI (ai-chat edge function) only extracts estimate scope via the strict `emit_scope` tool; all estimate pricing is computed client-side in `src/lib/pricing.ts`. Why: deterministic, auditable prices.
- ai-chat is pinned to one model at temperature 0. Why: reproducible scope extraction.
