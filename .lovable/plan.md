## What I found

The current behavior does **not actually prove the NAA login succeeded**.

1. `ai-chat` is **not using** the dedicated `portal-fetch` function at all.
   - It has its own inline `fcNaaPortal()` implementation inside `supabase/functions/ai-chat/index.ts`.
   - That means any prior “it worked” result only proved the assistant eventually produced an estimate, **not** that the NAA portal auth flow was valid.

2. The current login-success check is too weak.
   - `fcNaaPortal()` decides login worked unless the final URL still contains `outseta.com/auth` **and** the markdown is short.
   - But `https://www.newageartisans.com/plaster-portal` is publicly readable as a marketing page even without login.
   - So the function can return a plausible page, the model keeps researching, and it looks like it “got into the portal” when it may not have.

3. The logs support that diagnosis.
   - I can see `ai-chat` rounds and the assistant’s status messages.
   - I **do not** see evidence that the dedicated `portal-fetch` function was involved.
   - So the portal step is currently a black box inside `ai-chat`, with weak auth verification and no direct test coverage.

## Root cause to fix

Most likely one of these is happening:

- the saved NAA credentials are wrong / expired, or
- the Outseta login flow/selectors changed, or
- login works but the scraper lands on a public/plaster-portal marketing page, so the code mistakes that for authenticated access.

Right now the code masks all three cases as “success enough.”

## Plan

### 1) Unify portal access behind the dedicated backend function
Refactor `ai-chat` so `naa_portal_fetch` calls the deployed `portal-fetch` function instead of duplicating the login logic inline.

Why:
- one source of truth for login behavior
- easier debugging
- direct logs for portal auth attempts
- easier to test separately from the model loop

### 2) Make portal auth validation strict
Update `portal-fetch` and the `naa_portal_fetch` tool contract so they only report success when authenticated access is clearly confirmed.

Specifically:
- treat login as failed if the response still resembles a login wall or public upsell page
- detect obvious unauthenticated markers such as:
  - login form fields
  - “Annual Membership”, “Get Access”, “Sign in with Google”, “Foundational Courses” upsell content
  - redirect back to Outseta auth
- return a structured error like:
  - `auth_failed`
  - `login_page_detected`
  - `public_marketing_page_detected`

This will stop the assistant from pretending it has portal data when it doesn’t.

### 3) Add safe diagnostics
Add explicit logs around the portal flow without exposing secrets:
- target URL
- final URL
- whether login markers were detected
- whether marketing-page markers were detected
- safe credential metadata only if needed (length / masked prefix), never full values

This will tell us whether the issue is:
- bad credentials
- broken selectors
- redirect/login failure
- false positive on a public page

### 4) Make the AI fail fast and clearly when portal auth fails
Update `ai-chat` so when `naa_portal_fetch` returns auth failure:
- it stops retrying the portal
- it tells you plainly that the saved NAA credentials/login flow failed
- it does **not** continue as if it successfully browsed the protected portal
- it falls back to public-web research only, with a clear note that protected portal data was unavailable

### 5) Add automated tests
Create Deno tests for the portal flow and tool interpretation.

Coverage:
- successful authenticated portal scrape
- redirected back to login
- public marketing page mistaken for portal content
- invalid credentials / auth failure
- `ai-chat` tool handling when portal auth fails

These tests will mock Firecrawl responses so this behavior is deterministic.

### 6) Validate end-to-end after the fix
Once I’m back in build mode, I’ll run both direct and end-to-end checks:

1. direct call to `portal-fetch` against the NAA target URL
2. inspect `portal-fetch` logs to confirm whether auth succeeded or failed
3. send your exact estimate prompt through `ai-chat` on Sonnet 4.5 and 4.6
4. confirm one of these happens:
   - authenticated portal content is used, or
   - a clear “portal auth failed” message appears
5. verify the assistant no longer gets stuck looping at the portal step

## Expected result

After this fix, the system will no longer blur together:
- “the assistant finished an estimate” and
- “the NAA credentials/login actually worked.”

It will either:
- successfully authenticate and use protected NAA data, or
- tell you clearly that the stored NAA login failed and stop pretending otherwise.