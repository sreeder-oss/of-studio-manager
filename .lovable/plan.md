## Goal

Finish the AI Enhancement spec by shipping Phases 5–7 on top of the already-completed assistant + estimating engine + add_system action.

## Phase 5 — Voice & dictation polish

Replace the current "tap mic, speak one phrase, tap stop" flow with a true hands-free experience.

**Changes to `src/hooks/useSpeechRecognition.ts`:**
- Switch to `continuous: true`, `interimResults: true`.
- Track final + interim text internally; expose `interim` for live preview.
- **Auto-stop on silence**: arm a 1.5s timer on each result/audio event; when it fires, stop recognition.
- Fire `onResult` once with the concatenated final text when `onend` runs (so caller gets one clean transcript, not chunks).
- Add `silenceMs` option (default 1500).

**Changes to `src/components/ai/AIChat.tsx`:**
- Show interim transcript live in the textarea placeholder area while listening (greyed italic preview under the mic indicator).
- Add a hands-free toggle button (small `⚡` chip next to the mic). When **on**, after `onResult` fires we auto-call `handleSend()` instead of just dropping text into the input. Toggle persists in `localStorage`.
- Persist toggle as `of-ai-handsfree=1`. Default **off** (matches your earlier guidance to err on the side of review-first).

## Phase 6 — Action executors (wire the rest)

The system prompt already advertises these action types — only `add_system` actually executes today. We extend `actionSchema.ts` and `useAIActions.ts` to handle the rest, and `ActionCard.tsx` renders a small confirmation card for each.

**New action types (Zod schemas in `src/lib/actionSchema.ts`):**
- `create_contact` → name (required), type, status, email, phone, address, notes
- `update_contact` → id (required) + same optional fields
- `create_project` → name (required), contact_id, status, address, start_date, end_date, contract_value, notes
- `create_receipt` → vendor, amount (required), receipt_date (required, YYYY-MM-DD), category, project_id, tax_deductible, notes
- `mark_payment_received` → invoice_id (required), paid_date (optional, defaults today)
- `query_tax_summary` → year (string, e.g. "2026")

**Executors in `src/hooks/useAIActions.ts`:**
- Each action gets a branch in `run(action)` calling the matching mutation hook (`useSaveContact`, `useSaveProject`, `useSaveReceipt`, `useSaveInvoice`).
- `mark_payment_received`: load invoice via supabase, then call `useSaveInvoice` with `{ id, paid: true, paid_date }`.
- `query_tax_summary`: navigate to `/reports/tax?year=...` (uses `useNavigate`). No mutation; closes the assistant after navigation.

**Card UI (`src/components/ai/ActionCard.tsx`):**
- Generic header (uppercase action type label) + summary of the most relevant fields per action type, plus Add/Confirm + Dismiss buttons (same pattern as add_system).
- Per-action renderers (small switch in the same file) so each card shows the right preview fields. Examples:
  - create_contact → name, type, email/phone
  - create_project → name, address, contact name (resolved from contacts), contract_value
  - create_receipt → vendor, amount, date, category
  - mark_payment_received → invoice id (short), paid date
  - query_tax_summary → year + "Open report"
- Confirm button labels: "Create", "Update", "Mark paid", "Open report".

**System prompt update in `supabase/functions/ai-chat/index.ts`:**
- Replace the current single-action-type schema with a discriminated list documenting all six types, including required fields and date format conventions.
- Reinforce the rule: prose summary first, action block(s) only after explicit confirmation cue from the user (e.g. "yes", "do it", "go ahead").
- For `create_receipt`: instruct the AI to suggest a category from the existing list (Materials, Labor, Equipment, Subcontractor, Vehicle, Insurance, Office, Permits, Miscellaneous) and to set `tax_deductible: true` by default for business expenses.

## Phase 7 — Page-aware context

Today `currentPage` is sent but `currentRecord` is always `null`. Make the assistant aware of *which record* you're looking at so "summarize this project" or "draft an invoice for this estimate" works without restating context.

**New: `src/contexts/AIContextProvider.tsx`**
- Thin context that exposes `setCurrentRecord(record)` / `clearCurrentRecord()`.
- Lives alongside `AIAssistantProvider` (added in `App.tsx` so all routes can call it).

**New hook: `src/hooks/useAIPageContext.ts`**
- `useAIPageContext(record)` — `useEffect` that calls `setCurrentRecord` on mount and clears on unmount.
- Detail pages call this with a compact summary object (NOT the raw row — only the fields useful to the AI):
  - `ProjectDetail`: `{ kind: 'project', id, name, status, address, contact_name, contract_value }`
  - `EstimateDetail`: `{ kind: 'estimate', id, total, project_name, contact_name }`
  - `InvoiceDetail`: `{ kind: 'invoice', id, total, paid, due_date, project_name }`
  - `ContactDetail`: `{ kind: 'contact', id, name, email, phone, type }`

**Integration:**
- `useAIChat` reads `currentRecord` from the new context (instead of always sending `undefined`) and includes it in the request body.
- The existing `ai-chat` edge function already injects `currentRecord` into the system prompt — no backend change needed beyond mentioning the new shape in the prompt's CURRENT CONTEXT example.

## Files

**New**
- `src/contexts/AIContextProvider.tsx`
- `src/hooks/useAIPageContext.ts`

**Modified**
- `src/hooks/useSpeechRecognition.ts` — continuous + interim + silence auto-stop
- `src/components/ai/AIChat.tsx` — interim preview, hands-free toggle
- `src/lib/actionSchema.ts` — add 5 new action variants to the discriminated union
- `src/hooks/useAIActions.ts` — executors for the new actions
- `src/components/ai/ActionCard.tsx` — per-action card renderers
- `src/hooks/useAIChat.ts` — pull currentRecord from new context
- `src/App.tsx` — wrap with `AIContextProvider`
- `src/pages/ProjectDetail.tsx`, `EstimateDetail.tsx`, `InvoiceDetail.tsx`, `ContactDetail.tsx` — call `useAIPageContext(...)`
- `supabase/functions/ai-chat/index.ts` — expanded action schema in system prompt + receipt category guidance

## Out of scope

- No new database tables, RLS, or storage buckets.
- No changes to the existing manual editors for contacts/projects/estimates/invoices/receipts.
- No persistent chat history (still in-memory per session, per your earlier decision).
