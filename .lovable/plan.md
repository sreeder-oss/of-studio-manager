## Problem

When the AI generates an estimate and the preview opens, the **Save Estimate** button stays disabled and clicking it does nothing — so no row ever lands in the `estimates` table and the Estimates tab stays empty. Verified: the `estimates` table currently has 0 rows.

The cause is in `src/components/ai/EstimatePreview.tsx`:

- Save is disabled whenever `contactId === ''`.
- `contactId` is only filled if the AI's `client_name` happens to **exactly** match (case-insensitive) an existing contact name.
- If the contact doesn't exist yet, or the name is slightly different, the user has no way to select / create one from the modal — so save is permanently blocked.
- `handleSave` also early-returns with a toast before calling the mutation.

The mutation itself (`useSaveEstimate`), the list query (`useEstimates`), and the RLS policies are all correct. The pipeline just never gets triggered.

## Fix

Make the Client field in the AI estimate preview always resolvable, and make the disabled state self-explanatory. No DB / RLS / schema changes.

### 1. Inline "+ New client" in the Client dropdown
`src/components/ai/EstimatePreview.tsx`

- Add a `+ Create new client...` option at the bottom of the Client `<select>`.
- When chosen, swap the select for a small inline form (Name required, optional email/phone), with **Create** and **Cancel** buttons.
- On Create: call a mutation in `useContacts` to insert the contact, then auto-select the new id into `contactId`. Pre-fill the Name field with `doc.client_name` so it's one click in the common case.
- Show a subtle inline error if the insert fails (don't close the modal).

### 2. Fuzzy auto-match on client_name
Same file, replace the exact-match `useMemo` with a tiered match:
1. exact case-insensitive,
2. trimmed / punctuation-stripped equality,
3. all tokens of `client_name` appear in a contact name (e.g. "John Smith" → "John A. Smith").

Only auto-select when there is exactly one match — otherwise leave `contactId` empty and let the user pick.

### 3. Make the disabled state visible
- Under the Client dropdown, when `!contactId`, show small muted helper text: `Select a client to enable saving`.
- Add a `title` attribute on the Save button with the same message so hover explains the grayed-out state.

### 4. Tiny resilience tweaks in `handleSave`
- Log the Supabase error to console before the toast, so future failures are debuggable.
- After successful save, also `invalidateQueries(['estimates'])` is already handled in `useSaveEstimate.onSuccess`, so no change needed there — but add a `navigate('/estimates')` (optional, behind a check) **only if** we're not already on `/estimates`. Skip if you'd rather keep the chat context.

## Files touched

- `src/components/ai/EstimatePreview.tsx` — UI for inline contact create, fuzzy match, helper text, error logging.
- `src/hooks/useContacts.ts` — add a `useSaveContact` mutation if one doesn't already exist (will check during implementation; reuse if present).

## Out of scope

- No changes to `App.tsx`, the AI edge function, RLS policies, or DB schema.
- No changes to the manual `/estimates/new` flow — it already has its own contact picker.
- Not allowing `contact_id = null` saves; estimates without a client get orphaned and that's worse than the current bug.

## Verification

1. Open the AI assistant, generate an estimate for a brand-new client name.
2. Confirm the preview shows `Select a client to enable saving` under the dropdown.
3. Pick `+ Create new client...`, accept the prefilled name, click Create.
4. Save Estimate becomes enabled and turns green; click it.
5. New contact appears in Contacts; new estimate appears at the top of `/estimates` with the correct total and "Pending" badge.
6. Re-run the same flow with an AI estimate whose `client_name` matches an existing contact — confirm it auto-selects without prompting.
