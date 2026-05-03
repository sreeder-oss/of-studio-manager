## Goal
Stop the silent multi-minute hangs when the AI runs research-heavy prompts (Tadelakt estimate, "add all NAA systems", etc.) on Sonnet 4.5 / 4.6, while keeping the existing tool-calling behavior.

## Root cause recap
- `ai-chat` runs a non-streaming tool round, then executes tools (NAA portal fetch = ~18s each), then loops — up to 25 rounds.
- Any single stalled upstream call freezes the whole conversation. The 10s heartbeat keeps the socket open, so the UI shows "thinking" forever with no signal of progress or failure.
- Sonnet's tool-use loops are noticeably longer than GPT-5's because the new system prompt aggressively encourages multiple lookups + the portal tool.

## Changes (all in `supabase/functions/ai-chat/index.ts`)

1. **Per-round timeout on the upstream LLM call.**
   Wrap each `fetch(upstreamUrl, ...)` in an `AbortController` with a 90s timeout. On abort: stream a clear message (`_Model timed out on round N. Returning what I have so far._`), break the loop, and `done()` instead of hanging.

2. **Per-tool timeout on Firecrawl calls.**
   - `fcSearch`: 20s
   - `fcScrape`: 30s
   - `fcNaaPortal`: 45s (it legitimately needs ~18–25s for the login dance)
   On timeout, return `{ error: "<tool> timed out after Ns" }` to the model so it can recover instead of the whole function dying.

3. **Visible progress pings as real assistant deltas.**
   Right now we only send SSE comments between rounds. Add short italic status lines as actual `delta.content` events so the user sees:
   - `_Searching: tadelakt waterproof shower coverage…_`
   - `_Reading newageartisans.com plaster portal…_`
   - `_Drafting estimate…_`
   These are emitted before each tool call and before the final answer round. Cheap to do, massive UX win, and they make a wedge state obvious.

4. **Lower `MAX_TOOL_ROUNDS` from 25 → 8.**
   Twenty-five rounds was always aspirational; in practice the model either finishes in ≤5 or it's stuck in a loop. 8 is a real cap, and combined with the per-round timeout the worst-case wall time becomes bounded (~12 min absolute ceiling, typical 60–120s).

5. **Tighten the portal-fetch wording in the system prompt.**
   Add: "Call `naa_portal_fetch` AT MOST 2 times per estimate. If the first 1–2 fetches don't surface coverage / mix ratio, proceed with the spec you have plus a clear assumption note — don't keep retrying."
   This is the single biggest reason Sonnet hangs on Tadelakt: it keeps re-fetching portal pages hoping for a number that isn't published.

6. **Catch & surface `429` / `402` mid-loop.**
   Already handled on first call; make sure the same handling runs for every round (it currently does, but the error string will now include which round failed so we can debug from logs).

7. **Log every round.**
   `console.log("ai-chat round", round, "tool_calls", toolCalls?.length, "scrapes_used", scrapesUsed)` so future hangs are diagnosable from the function log alone.

## Validation (after switching to default mode)

1. Deploy `ai-chat`.
2. `curl_edge_functions` with the exact failing prompt on **Sonnet 4.6**:
   > create an estimate for a 300 square foot shower, finished using the Tadelakt system from New Age Artisans, no color, we are waterproofing and sealing, we are not hanging the board or doing the pan. no niches just walls please, in tulsa
3. Confirm the response stream contains:
   - At least one `_Searching…_` / `_Reading…_` status delta
   - Either a full ```json estimate block, or a clear timeout/limit message — never silence
4. Repeat on **Sonnet 4.5** and **GPT-5** (default) to confirm no regression.
5. Read `edge_function_logs ai-chat` and verify the new per-round logs appear and the function reaches a clean shutdown each time.
6. Report results back here honestly — including any prompt that still doesn't finish, with the round count and what tool stalled.

## Non-goals (call out so we don't scope-creep)
- Not changing the model list, not touching `aiModels.ts`.
- Not adding new tools or new portal logic.
- Not refactoring the SSE client (`useAIChat.ts`) — it already handles `delta.content` correctly, so the new status pings will render with no client change.
