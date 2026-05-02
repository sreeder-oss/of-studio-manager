
# OF Manager — AI Command Layer + Estimate Engine

This is a large spec (7 phases). I recommend implementing **Phases 1–4 in this batch** (floating AI button, chat, voice, Systems Library, estimating engine). Phases 5–7 (full action execution beyond estimates, PDF/DOCX export, Tax Center) follow in a second pass once the foundation is verified working.

## Key adaptation from the spec
The spec calls for direct Anthropic API calls with a hard-coded API key. This won't work in Lovable — it would leak the key client-side. We'll use **Lovable AI Gateway** through a Supabase Edge Function instead:
- No API key for you to manage (LOVABLE_API_KEY is auto-provisioned)
- Supports vision (Gemini) for photo + plan-drawing analysis
- Supports streaming for token-by-token chat
- Default model: `google/gemini-3-flash-preview` (fast, multimodal). Switch to `google/gemini-2.5-pro` automatically when images are attached for better drawing/photo analysis.

Everything else in the spec stays as written.

## What gets built

### 1. `systems` table + Systems Library page
- New Supabase table per spec, with RLS scoped to `auth.uid()`.
- Seeded with the 4 base systems (Biolime 3-coat, Bauwerks Limewash, Standard interior paint, Venetian plaster).
- New page `/systems` with card grid, add/edit/delete. Added to bottom nav.
- `useSystems` hook following the existing TanStack Query pattern.

### 2. Floating AI button (every protected page)
- Mounted inside `AppLayout` so it appears everywhere except `/login`. **No App.tsx changes.**
- Fixed bottom-right, sits above the bottom nav (bottom offset accounts for the existing nav bar).
- Amber circle (`#BA7517`), mic + sparkle icon, subtle glow.
- Tap → opens chat. Bottom-sheet on mobile (uses existing `vaul` Drawer), right-side Sheet on desktop (≥768px).

### 3. AI chat interface
- New component `AIAssistant` (drawer container) + `AIChat` (thread + input).
- Conversation state held in a React context (`AIAssistantContext`) so it persists across route changes within the session — closing the drawer doesn't wipe history; signing out does.
- Messages render with `react-markdown` (will add the dep) + the existing Tailwind typography setup.
- Input bar: textarea (auto-grow), mic button, paperclip (image upload), send.
- Image attachments: previewed as thumbnails above the input, sent as base64 data URLs in the message payload.
- When the AI's response includes a ```json estimate block, an **Estimate Preview Panel** slides in (right side on desktop, expandable card on mobile) showing the parsed estimate with editable line items + Save button.

### 4. Voice input (Web Speech API)
- `useSpeechRecognition` hook wrapping `window.SpeechRecognition || window.webkitSpeechRecognition`.
- Mic button: tap to start (animated pulsing red ring), tap again or auto-stop on silence → transcript fills the input. Auto-send is **off by default** so Shawn can review trade terms before sending; tap-and-hold for "send immediately" mode.
- If the API isn't available, the mic button is hidden.
- No auto-correction — `recognition.lang = 'en-US'`, no custom grammar; trade terms (Biolime, FasWall, Bauwerks, limewash, etc.) come through as spoken.

### 5. AI edge function (`ai-chat`)
- Streams from Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`).
- Verifies the user JWT, fetches their `systems` table rows + settings (overhead/profit/tax defaults — hardcoded for now: 8% / 10% / 8.75%, easy to upgrade to a `settings` table later).
- Builds the system prompt dynamically per spec, injecting Systems Library JSON + current page context (sent from client).
- Auto-bumps the model from flash → pro when images are present.
- Returns the SSE stream directly to the client.
- Surfaces 429 (rate limit) and 402 (credits) with friendly toast messages on the client.

### 6. Estimating engine (Phase 4 in spec)
- Client parses ```json blocks from the streamed assistant message.
- Validated against the spec's schema (Zod) — invalid blocks ignored gracefully.
- Renders the live `EstimatePreview` panel with all sections A–E, editable line items, recalculating totals, overhead, profit, tax on the fly.
- "Save to Estimates" button writes to the existing `estimates` table via the existing `useSaveEstimate` hook (mapping the rich JSON into the existing `line_items` jsonb column — keeps full structure for later PDF rendering, plus flat `subtotal`/`tax_rate`/`total`).
- Project context: if user is on a project page when they open chat, that project is pre-selected and the AI knows it.

### 7. Action blocks (limited subset in this batch)
For Phase 1–4, only one action type is wired: `create_estimate` (handled via the preview panel save). The full action block parser is scaffolded but other action types (create_contact, create_project, create_receipt, etc.) come in Phase 5. This keeps the first batch focused and testable.

## Files

**New:**
- `supabase/migrations/<ts>_systems_table.sql` — table + RLS + 4 seed rows
- `supabase/functions/ai-chat/index.ts` — streaming gateway proxy
- `src/hooks/useSystems.ts`
- `src/pages/Systems.tsx`
- `src/contexts/AIAssistantContext.tsx` — open state, messages, current page/record
- `src/components/ai/FloatingAIButton.tsx`
- `src/components/ai/AIAssistant.tsx` — Drawer/Sheet container
- `src/components/ai/AIChat.tsx` — message list + input
- `src/components/ai/ChatMessage.tsx` — markdown renderer + action cards
- `src/components/ai/EstimatePreview.tsx` — live editable preview
- `src/hooks/useSpeechRecognition.ts`
- `src/hooks/useAIChat.ts` — streaming + parsing
- `src/lib/estimateSchema.ts` — Zod schema + parser

**Modified:**
- `src/components/AppLayout.tsx` — mount `<AIAssistantProvider>` + `<FloatingAIButton/>` + `<AIAssistant/>`; add Systems nav item
- `package.json` — add `react-markdown`

**NOT touched:** `src/App.tsx`, all existing pages, all existing hooks, all existing estimate/invoice editors, legal terms.

## Open questions before I build

1. **Bottom nav** has 6 items already. Adding Systems makes 7 — tight on mobile. Want me to (a) replace one (e.g., move Receipts under a "More" menu), (b) add it as a 7th and let it shrink, or (c) put Systems only inside a Settings/More page accessible from the header?
2. The **AI assistant context persistence** — keep messages in memory only (cleared on refresh), or also persist to `localStorage` per-user? In-memory is simpler and matches "session" wording in the spec.
3. **Auto-send after voice** — default off (review first) or default on (true hands-free)? Spec says "auto-send on silence" → I'll default to **on** unless you say otherwise, with a toggle in the chat UI.

I'll proceed with sensible defaults if you approve without answering — Systems as 7th nav item, in-memory messages, voice auto-send on.
