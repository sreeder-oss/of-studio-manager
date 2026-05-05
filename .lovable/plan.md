# OF Studio Manager — Remediation Plan

This plan addresses all 93 issues from the audit (10 Critical, 26 High, 36 Medium, 21 Low). Work is sequenced so that data-model and security fixes land before any UI behavior depends on them.

---

## Phase 1 — Data model & security foundation (CRITICAL) ✅ COMPLETE

> Status: applied 2026-05-05. Estimates/invoices pricing columns + CHECK constraints added (`tax_rate` is now a fraction 0–1; `subtotal` non-negative; new `direct_cost_subtotal`, `overhead_amount`, `profit_amount`, `pre_tax_total`, `tax_amount`, plus `notes`, `terms`, `updated_at`). Project-child FKs converted from CASCADE → SET NULL. `assert_owns()` SECURITY DEFINER function + BEFORE INSERT/UPDATE triggers on estimates/invoices/projects/receipts/documents/photos block cross-user references. `updated_at` auto-trigger on 7 tables. `app_role` enum + `user_roles` table + `has_role()` helper added. RLS tightened from `public` → `authenticated` everywhere. `of-photos` bucket made private with folder-owner storage policies. EXECUTE revoked from anon/authenticated on all internal SECURITY DEFINER helpers (only `has_role` retained for RLS). Code in `useEstimates`/PDF still treats `tax_rate` as fraction in some paths and percent in others — that fix lands in Phase 2.

Migrations + RLS first, because every later phase depends on consistent units, FKs, and storage policies.

### 1.1 Lock down the `tax_rate` and `subtotal` semantics (C1, C2)

- **Canonical convention:**
  - `estimates.tax_rate` and `invoices.tax_applied`-derived rate are stored as **fraction** (e.g. `0.0875`).
  - `estimates.subtotal` = sum of line-item totals **before** overhead/profit/tax.
  - Add new columns: `direct_cost_subtotal numeric`, `overhead_amount numeric`, `profit_amount numeric`, `tax_amount numeric`, `pre_tax_total numeric`. Total stays as final invoiced amount.
- **CHECK constraints:** `tax_rate >= 0 AND tax_rate <= 1`, all `*_amount/total >= 0`.
- **Backfill migration:** detect rows where `tax_rate > 1` (legacy percent) and divide by 100; recompute `subtotal` from `line_items` JSON where possible.
- All write paths (`EstimatePreview`, `EstimateCreate`, `ai-chat`, `coerceToEstimateDoc`, `estimatePdf`) updated to use the canonical convention.

### 1.2 Foreign keys + ownership integrity (C7, H5)

- Add FKs:
  - `estimates.contact_id → contacts(id) ON DELETE SET NULL`
  - `estimates.project_id → projects(id) ON DELETE SET NULL`
  - `invoices.estimate_id → estimates(id) ON DELETE SET NULL`
  - `invoices.contact_id → contacts(id)`, `invoices.project_id → projects(id)`
  - `projects.contact_id → contacts(id) ON DELETE SET NULL`
  - `receipts.project_id`, `documents.project_id`, `photos.project_id → projects(id) ON DELETE SET NULL`
- Add a SECURITY DEFINER function `assert_owns(parent_table, parent_id)` and a BEFORE INSERT/UPDATE trigger on each child table to ensure referenced parent row's `user_id = auth.uid()`. Prevents cross-tenant smuggling.

### 1.3 Storage policy fixes (C3, C4, C5, M21)

- `of-photos` SELECT: replace broad public-read with `(storage.foldername(name))[1] = auth.uid()::text`. Photos are accessed via signed URLs only.
- `of-photos` INSERT: add `(storage.foldername(name))[1] = auth.uid()::text` predicate.
- `of-photos` UPDATE + DELETE: add owner-folder policies.
- `receipts` UPDATE: add owner-folder policy.
- Update photo render code to mint signed URLs via `storage.createSignedUrl`.

### 1.4 Domain CHECK constraints (H6, M35, M36)

- Postgres enums or CHECK constraints on: `contacts.type`, `contacts.status`, `estimates.status`, `projects.status`, `receipts.category`, `photos.phase`.
- Trigger keeping `invoices.paid_date` in sync with `paid` flag.

### 1.5 Schema hygiene (M22, L14)

- Add `updated_at` columns + trigger to `contacts`, `projects`, `estimates`, `invoices`, `receipts`, `documents`, `photos`.
- Create `user_roles` table + `app_role` enum + `has_role()` SECURITY DEFINER function. No usage yet — pre-positioned for future team features.
- Tighten policies from `to public` → `to authenticated` (L1).

---

## Phase 2 — AI estimate generation reliability (CRITICAL)

### 2.1 Switch `ai-chat` to tool-calling (C6, H18, H20)

- Replace "return JSON" prompt with an OpenAI/Anthropic-compatible **tool definition** whose parameters mirror the EstimateDoc Zod schema exactly.
- `tool_choice: { type: 'function', function: { name: 'emit_estimate' } }` to force structured output.
- Default model: Claude Sonnet 4.5 via OpenRouter (already have key).
- Fallback chain: Sonnet → GPT-5 → Gemini 2.5 Pro on 5xx/rate-limit.
- Surface 402/429 to client with toasts.
- Server-side Zod validation + one retry on parse failure.

### 2.2 Tighten `estimateSchema.ts` (H19)

- Make `bid_range`, `system_note`, `area_note`, `assumptions`, `exclusions` either strictly typed or strictly optional; remove permissive `.passthrough()`.
- Single source of truth for tax_rate units (now: fraction).
- Export DB row types as `Database['public']['Tables']['estimates']['Row']` (M6).

---

## Phase 3 — Estimates round-trip workflow (HIGH)

This is the biggest user-facing gap.

### 3.1 Save → return → navigate (C9, H1, H2, H3)

- `useSaveEstimate` insert path: `.select().single()` and return the row.
- After save, navigate to `/estimates/:newId` (also fixes deep-link UX).
- Persist `notes` and `terms_overrides` in dedicated columns (C8) — add `notes text` and `terms jsonb` to `estimates`.

### 3.2 Estimate edit (H2)

- New route `/estimates/:id/edit` reusing `EstimateCreate` layout pre-populated.
- `useUpdateEstimate` hook returning the updated row.

### 3.3 Status transitions (H3)

- Status selector on `EstimateDetail`: Pending → Approved → Invoiced/Declined/Expired.
- CHECK constraint on `status` enum.

### 3.4 Convert to Invoice (H1)

- "Convert to Invoice" button on Approved estimates → creates invoice with `estimate_id` FK, copies line_items, marks estimate `Invoiced`.
- Navigate to `/invoices/:newId`.

### 3.5 Project link, contact link, valid_until display (H10, H16, M14)

- Show project link, contact link, `valid_until` date on `EstimateDetail`.
- Editable `valid_until` on create/edit (default still +30 days).
- Gate `useContact('')` queries with `enabled: !!estimate?.contact_id`.

### 3.6 EstimatePreview/EstimateCreate fixes (H13, H14, H15, M11, M12, M13, M20, M27, M28)

- Editable `sub_note` and quality-bar fields.
- Filter project dropdown by selected client.
- Validation toast on Save with empty form.
- Fix number-input UX (parseFloat fallback, no zero-on-backspace).
- Memoize `recalcEstimate` (`useMemo`).
- Remove `doc as any` cast — type properly.
- Default unit `SF` (or null), not `EA`.
- Persisted, editable deposit %.
- Save default notes/terms or remove the placeholder.

---

## Phase 4 — PDF correctness (HIGH/MEDIUM)

### 4.1 Visible bugs (H7, H8, H17, H24, H25)

- Wrap multi-line client/address/duration in cover panel; auto-grow box height.
- Bullet glyph alignment: render bullet as part of the wrapped paragraph, not as a separate `circle()` call positioned at line 1.
- Replace `pages.length - 1` math with explicit page tracking via autoTable's `didDrawPage` hook.
- Erase header band area before redrawing on overflow pages.
- Acceptance text: `50% deposit` to match UI; remove hardcoded "Tulsa, Oklahoma"; use `valid_until` from data, not hardcoded "30 days".

### 4.2 Lower-priority polish (M15–M19, L17, L20, L21)

- Filename: keep Unicode letters; use `encodeURIComponent` or transliteration for safe download.
- "Page X of Y" footer.
- ISO/UTC date for stable rendering.
- Acceptance block height computed from rendered paragraph height, not magic 130pt.
- Embed a fallback Unicode-capable font.
- Empty-section guard.
- "Continued" indicator if assumptions/exclusions overflow.

---

## Phase 5 — Hooks & data layer (HIGH/MEDIUM)

### 5.1 Global QueryClient defaults (H21)

```text
defaultOptions:
  queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 }
  mutations: { onError: (e) => toast.error(formatDbError(e)) }
```

### 5.2 Error formatting (H9)

- `formatDbError(error)` helper mapping Postgres codes (`23505`, `42501`, `PGRST301`, RLS rejections) to friendly strings. Used by the global `onError`.

### 5.3 Hook hygiene (M1–M6)

- `.maybeSingle()` everywhere a row may not exist.
- Optimistic updates on save/delete mutations (`onMutate` cancel + cache push, `onError` rollback, `onSettled` invalidate).
- Cross-table invalidation on deletes (delete contact → invalidate estimates/invoices/projects/receipts).
- `enabled` gates split into "auth loading" vs "no user" via revised `useAuthReady` returning `{ isLoading, isAuthed }`.
- Single `upsertHook(table)` factory replacing duplicated insert/update boilerplate.
- Replace hand-rolled DB types with `Database['public']['Tables'][...]['Row']`.

---

## Phase 6 — Pages, contacts, routing (HIGH/MEDIUM)

### 6.1 Contacts page (H11, H12, M7–M10, M23–M25)

- Bug: `created_at: null` removed from insert payload (let default fire).
- Modal closes after delete.
- Replace custom modal with shadcn `Dialog`.
- Filter counts respect search filter.
- Email/phone trim+validation; reject empty strings.
- Disable delete button while in-flight.
- Replace `confirm()` with shadcn `AlertDialog`.
- Status options scoped per-type (Vendors don't show Estimate/Pending).
- Default Lead status → "Pending".

### 6.2 Routing & auth (H4, H22, H23, H26, M29–M32, L19)

- Refactor App router to `<Outlet />` + `RequireAuth` (no nested `<Routes>`).
- Capture `location` on redirect to `/login`; consume `from` on success.
- Login: pass `redirectTo` (camelCase) to Supabase OAuth helper.
- Add `/reset-password` route.
- Add missing routes: `/contacts/new`, `/projects/new`, `/invoices/new`, `/receipts/:id`, `/systems/:id`, `/settings`, `/profile`.
- Catch-all 404 lifted to top-level so it works for unauthed users.
- Move `AIContextProvider`/`AIAssistantProvider` inside `RequireAuth` — only mounted when authed.
- Memoize `AppLayout` to prevent AI panel remount on navigation.
- Wrap `<Routes>` in an ErrorBoundary; render fallback page.
- Listen for `SIGNED_OUT` event on session expiry and surface toast.

---

## Phase 7 — Polish & low-priority

L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12, L13, L15, L16, L18:

- Lazy-route splitting via `React.lazy` + `Suspense`.
- Print stylesheet for `EstimateDetail`.
- Always show "Tax: $0.00" when zero.
- Empty-state for line items in EstimateDetail.
- Rename `step === 'select-client'` to reflect project picker addition.
- Cmd+S handler on create/edit.
- Vitest tests on `recalcEstimate`, `coerceToEstimateDoc`, `formatDbError`, snapshot test on `buildEstimatePdf`.
- Better NotFound CTA.
- Enable HIBP password check (when password auth ever added).
- CSV import for contacts (Roadmap).

---

## Implementation order (incremental, shippable)

```text
Sprint 1: Phase 1 (data + RLS + storage)        — landings: migrations, no UI regressions
Sprint 2: Phase 2 (AI tool-calling)              — landings: reliable estimate generation
Sprint 3: Phase 3 (estimates round-trip)         — landings: edit, status, convert-to-invoice
Sprint 4: Phase 4 (PDF correctness)              — landings: customer-visible polish
Sprint 5: Phase 5 (hooks + global error UX)
Sprint 6: Phase 6 (contacts modal, routing)
Sprint 7: Phase 7 (polish, tests, lazy routes)
```

Each sprint ends with a deployable preview. Phases 1–4 cover all 10 Criticals and the most visible Highs.

---

## Out of scope / noted but deferred

- Payment processing UI — explicitly forbidden by Memory.
- Multi-user/team features — `user_roles` infra prepped in 1.5 but no UI.
- Internationalization — flagged for future; Memory says nationwide US service.

---

## Notes

- Migrations in Phase 1 require user approval; backfill SQL will be drafted per table with row counts before applying.
- Phase 2 swaps the AI model and provider; user can override the default before we ship.
- All visible "30%" deposit text in the PDF will become "50%" to match the rest of the app, unless you tell me otherwise.
- After Phase 1, remember to update `mem://features/estimates-invoices` to reflect the canonical tax_rate/subtotal convention.