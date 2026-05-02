## Goal

Let the AI assistant browse the web during a chat. When you say "go to newageartisans.com and add their Tadelkt system" (or "add all their systems"), it scrapes the site, extracts each system's specs, and creates entries in your Systems Library — with a confirmation step before anything is written.

## How it will work (user-facing)

1. You ask: *"Go to newageartisans.com, find their Tadelkt waterproof plaster system, and add it to my library."*
2. The AI calls a web-search tool, then a scrape tool on the matching page(s).
3. It returns a short summary with the parsed fields (name, manufacturer, description, coats, coverage, cost, labor, substrate, application notes) and asks: *"Add these 4 systems? Yes/No."*
4. On confirmation it emits an `add_system` action block per system, the chat UI calls `useSaveSystem`, and you see them appear in `/systems`.
5. Same flow works for "add all their systems" — it maps the site, scrapes each product page, and batches them.

## Technical changes

### 1. Edge function: `web-tools` (new)
`supabase/functions/web-tools/index.ts` — single endpoint with two operations the AI calls via tool-calling:
- `web_search(query)` → uses **Firecrawl `/v2/search`** (already a known connector pattern). Returns top 5 results with url/title/snippet.
- `web_scrape(url)` → uses **Firecrawl `/v2/scrape`** with `formats: ['markdown']`, `onlyMainContent: true`. Returns clean markdown.

Requires `FIRECRAWL_API_KEY`. I'll prompt you to connect the Firecrawl connector (free tier covers this easily). JWT-verified, CORS enabled.

### 2. Upgrade `ai-chat` edge function to support tool-calling
- Switch model to `google/gemini-2.5-pro` when tools are needed (flash-preview supports tools too, keep as default).
- Add `tools: [web_search, web_scrape, add_system]` to the gateway request.
- Implement the **tool-call loop**: when the model returns `tool_calls`, the function executes them server-side (web_search/web_scrape call the Firecrawl proxy; `add_system` is *not* executed server-side — it's emitted back to the client as an action block for confirmation).
- Stream the final assistant message after tools resolve. The existing SSE parser on the client keeps working.

### 3. New action type: `add_system`
Extend the system prompt's action schema:
```
```action
{ "type": "add_system", "data": { name, manufacturer, description, coats, coverage_rate, coverage_unit, cost_per_unit, labor_rate_per_sf, typical_equipment, substrate_notes, application_notes } }
```
```
The prompt instructs the AI to **always show the parsed data in prose first and wait for "yes"** before emitting the action block. For "add all", it emits one action block per system in sequence.

### 4. Client: action block parser + executor
- New `src/lib/actionSchema.ts` — Zod schemas for each action type, mirror of `parseEstimateFromText` but for ` ```action ` blocks.
- New `src/hooks/useAIActions.ts` — given a parsed action, dispatches to the right hook (`useSaveSystem` for `add_system`, later `useContacts`/`useReceipts` mutations for the other types already in the prompt).
- Update `ChatMessage.tsx`: when an assistant message contains action blocks, hide the raw fenced block and render a compact card per action with **Confirm** / **Dismiss** buttons. On Confirm → run the mutation → toast → mark the action as applied (stored on the message).
- Extend `ChatMessage` in `AIAssistantContext` with an optional `appliedActions: string[]` so confirmed actions don't re-trigger.

### 5. Cost/safety guardrails
- Cap scrape calls per user message to 8 (prevents a runaway "add all" on a 200-page site).
- Cap web_search results to 5.
- Action blocks are **never auto-applied** — always require your click. Voice "yes" in the next message also works because the AI sees the confirmation in chat history and emits the action block then.

### 6. System prompt additions
Tell the AI:
- Use `web_search` to find the right page when the user names a brand or product.
- Use `web_scrape` on the resulting URLs to read product specs.
- Map scraped specs into the `add_system` schema. **Leave numeric fields null if the site doesn't state them** — never invent coverage/cost numbers.
- Always summarize what it's about to add and ask for confirmation before emitting `add_system` blocks.

## Files

**New**
- `supabase/functions/web-tools/index.ts`
- `src/lib/actionSchema.ts`
- `src/hooks/useAIActions.ts`
- `src/components/ai/ActionCard.tsx`

**Modified**
- `supabase/functions/ai-chat/index.ts` — tool-calling loop, updated system prompt
- `src/components/ai/ChatMessage.tsx` — render action cards
- `src/contexts/AIAssistantContext.tsx` — track applied actions
- `src/hooks/useAIChat.ts` — minor: surface tool-call streaming events in status

## Setup step required from you

I'll trigger the Firecrawl connector flow when implementing — one click to connect it. After that, everything works inside the chat with no extra setup.

## Out of scope (for this round)

- Wiring up `create_contact`, `create_project`, etc. action handlers (the prompt already mentions them but they don't have client executors yet). I'll scaffold `useAIActions` so adding them later is one function each, but only `add_system` ships fully wired in this change.
- Caching scraped pages (each scrape is a fresh Firecrawl call).
