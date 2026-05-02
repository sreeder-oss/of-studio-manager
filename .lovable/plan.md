# Make the AI a stronger researcher

## What's actually happening

Your AI used Firecrawl correctly. The problem is the **source**. New Age Artisans' public site (`newageartisans.com`) is a marketing + gallery site:

- No `/shop` or `/products` page exists (both 404)
- All technical specs, coverage rates, mix ratios, and pricing live behind **Plaster Portal** — their **paid** training/dealer area (`/plaster-portal`)
- Firecrawl can't log in, so coverage/cost truly isn't reachable from public pages

So "the AI can't find costs" is partly true (it's behind a paywall) and partly fixable (we can make it search harder and tell you clearly *why* it came up empty).

## Plan — 4 upgrades to the AI

### 1. Smarter model + more browsing budget
In `supabase/functions/ai-chat/index.ts`:
- Switch the default model from `google/gemini-2.5-flash` → **`google/gemini-2.5-pro`** for tool-using requests (better at multi-step research, reading spec sheets, and reasoning across pages). Keep flash only for trivial single-turn replies.
- Raise `MAX_TOOL_ROUNDS` from 6 → **10** and `MAX_SCRAPES_PER_REQUEST` from 8 → **12** so it can chase sub-pages (PDFs, MSDS, tech data sheets).

### 2. Paywall / portal awareness in the system prompt
Add explicit rules so the AI:
- **Tries multiple search angles** before giving up: brand site, `site:` searches, "technical data sheet", "MSDS", "coverage", "tadelakt mix ratio", and third-party retailers (Amazon, Build With Rise, distributor sites) which often list coverage and price even when the maker doesn't.
- Recognizes paywalled / login-protected pages (Plaster Portal, dealer logins, Patreon, course platforms) and **says so explicitly** in its reply: *"Coverage and pricing for NAA are behind their paid Plaster Portal — I can add the system shell now and you can fill in your dealer pricing, or I can pull comparable specs from a similar tadelakt product (e.g. American Clay, Meoded, Texston). Which?"*
- For `add_system`, when web data is incomplete, sets unknown fields to `null` and **lists what's missing in the prose summary**, instead of silently omitting things or refusing.

### 3. Better Firecrawl usage
In `web-tools` and the inline `fcSearch` / `fcScrape` helpers in `ai-chat`:
- Bump `search` limit from 5 → **10** results so the model has more URLs to choose from.
- On `scrape`, also request `links` format alongside `markdown` so the model can discover product/spec sub-pages from the homepage in one shot (today it only sees rendered text).
- Detect HTTP 401/403/login-redirect responses and return a structured `{ paywalled: true, url }` so the model can route around it.

### 4. Surface a dealer/cost fallback
Add a new action type **`update_system`** so when you say *"NAA Tadelakt cost is $XX/bag, coverage 35sf"*, the AI patches the row directly instead of asking you to go edit it. Card UI: shows the diff (old → new) with a Save button.

## What the AI will do differently after this
For *"add all New Age Artisans plaster systems including Tadelakt"* it will:
1. Search broadly (NAA + tadelakt + retailers + spec sheets)
2. Map the NAA site to find every system page (Marrakesh, Tadelakt Blend, Lime Wash, etc.)
3. Scrape each one, plus any retailer pages with pricing
4. Emit one `add_system` block per system with **everything it could find**, `null` for paywalled fields, and a clear note: *"Coverage/cost not public — Plaster Portal members only. Add your dealer numbers via the edit card."*

## Files to edit
- `supabase/functions/ai-chat/index.ts` — model switch, round/scrape caps, prompt rewrites, `update_system` tool
- `supabase/functions/web-tools/index.ts` — limit bumps, links format, paywall detection
- `src/lib/actionSchema.ts` — add `update_system` schema
- `src/hooks/useAIActions.ts` — `update_system` executor
- `src/components/ai/ActionCard.tsx` — diff renderer for `update_system`

## Note on cost
Switching the default to Gemini 2.5 Pro costs more credits per request than Flash. Worth it for research tasks; if you'd rather keep Flash as default and only auto-promote to Pro when web tools get triggered, say the word and I'll wire that branch instead.
