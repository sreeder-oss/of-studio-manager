## Goal
Let the AI fetch product/spec/pricing pages from the New Age Artisans Plaster portal that currently sit behind a login, so estimates use real data instead of guesses.

## Honest constraints (read first)
1. **I still need the portal URL.** You answered the URL question with your email address. I won't guess a URL — without the real login page I can't test anything and I'd be doing exactly what you asked me not to do.
2. **Firecrawl (our current scraper) does not log into arbitrary portals.** It fetches a page and returns whatever the server gives an unauthenticated visitor. To get past a login we need a different approach — either a Firecrawl `actions` flow (type email, type password, click submit, then scrape) or a Deno-side `fetch` that posts to the portal's login endpoint and reuses the session cookie. Which one works depends entirely on how that specific portal authenticates. We will only know after testing against the real URL.
3. **No payment/banking data rule still applies.** A vendor portal login is fine to store; just flagging that I checked.

## Storage
- Save credentials as **backend secrets**, not in a database row:
  - `NAA_PORTAL_EMAIL`
  - `NAA_PORTAL_PASSWORD`
  - `NAA_PORTAL_BASE_URL` (the login URL you provide)
- Secrets are only readable by edge functions, never shipped to the browser, and don't appear in logs.

## New edge function: `portal-fetch`
A small Deno function the AI tool loop can call when it hits a paywalled New Age Artisans page.

Behavior:
1. Verify the caller is an authenticated app user (same JWT check as `web-tools`).
2. Read the three secrets above. If any missing → return a clear error (no guessing).
3. Attempt login against the portal:
   - First try: HTTP login (POST form/JSON to the portal's auth endpoint, capture `Set-Cookie`, then GET the requested URL with that cookie).
   - If that fails, fall back to Firecrawl `scrape` with `actions: [{type:"write", selector:"...", text: email}, {type:"write", selector:"...", text: password}, {type:"click", selector:"..."}, {type:"wait", milliseconds: 1500}]`.
4. Return `{ url, markdown, title, loggedIn: true }` on success, or `{ error, status }` on failure — including the actual HTTP status and a short snippet so we can debug instead of pretending it worked.

## Wiring into the AI
- In `supabase/functions/ai-chat/index.ts`, register a new tool `portal_fetch` (description: "Fetch a page from the New Age Artisans plaster portal using saved credentials. Use this whenever a New Age Artisans URL would otherwise be paywalled.") that proxies to `portal-fetch`.
- Update the existing `web-tools` paywall response so when the scraper sees `newageartisans` (or whatever the real domain is) and gets blocked, the AI knows to retry via `portal_fetch` instead of giving up.

## Validation (the part that proves it actually works)
Once the URL is provided and secrets are added, I will:
1. Deploy `portal-fetch`.
2. Call it via `curl_edge_functions` against the real login URL + one known product page.
3. Read the response. If `loggedIn: true` and we get real product markdown back → confirm to you it works.
4. If it fails → tell you exactly what failed (e.g. "login form uses CSRF token X, need a different approach") and propose the next step. **No silent fallbacks, no fake success.**

## What I need from you to proceed
- The **portal URL** (login page, e.g. `https://portal.newageartisans.com/login` — whatever the real one is).
- Confirmation to add the three secrets (`NAA_PORTAL_EMAIL`, `NAA_PORTAL_PASSWORD`, `NAA_PORTAL_BASE_URL`).

Once approved, I'll request the secrets, build the function, test it live, and report back honestly with the result.
