// AI chat with tool-calling (web search/scrape) + streaming final response.
// Injects Systems Library + company defaults into the system prompt.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FC = "https://api.firecrawl.dev/v2";
const MAX_TOOL_ROUNDS = 8;
const MAX_SCRAPES_PER_REQUEST = 30;
const UPSTREAM_ROUND_TIMEOUT_MS = 90_000;
const TOOL_TIMEOUT_MS = { search: 20_000, scrape: 30_000, portal: 45_000 };

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) => ctl.signal.addEventListener("abort", () => rej(new Error(`${label} timed out after ${ms}ms`)))),
    ]);
  } finally {
    clearTimeout(t);
  }
}

// Whitelist of OpenRouter model slugs the client may request. Anything else
// falls back to GPT-5 high-reasoning on Lovable AI.
const OPENROUTER_MODELS = new Set([
  "openai/gpt-5",
  "openai/gpt-5-pro",
  "anthropic/claude-opus-4.5",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-sonnet-4-6",
  "google/gemini-3-pro-preview",
  "x-ai/grok-4",
]);

interface IncomingMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
}

interface RequestBody {
  messages: IncomingMessage[];
  currentPage?: string;
  currentRecord?: unknown;
  hasImages?: boolean;
  /** Optional model override. If it matches an OpenRouter slug, route through OpenRouter. */
  model?: string;
}

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the public web. Returns up to 5 results with url, title, description. Use this to find product/spec pages when the user names a brand.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_scrape",
      description: "Fetch the readable text (markdown) of a single URL. Use this on URLs returned by web_search to read product specs.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full https URL" },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "naa_portal_fetch",
      description: "Fetch a page from the New Age Artisans Plaster Portal using saved login credentials. Use this for ANY newageartisans.com URL that requires login (product specs, coverage, dealer pricing). Logs in via the Outseta auth widget then returns the page markdown.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full https URL on newageartisans.com (e.g. /plaster-portal or a course/product page)" },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
];

function buildSystemPrompt(systemsLibrary: unknown[], settings: { overhead_pct: number; profit_pct: number; tax_rate: number; estimate_valid_days: number; }, currentPage?: string, currentRecord?: unknown) {
  return `You are the AI assistant for OF Manager, the business management app for
Organic Finishes LLC, a specialty plaster and paint company in Tulsa, Oklahoma.
The owner is Shawn. You can perform any action in the app through conversation.

CURRENT CONTEXT:
- Page: ${currentPage || "unknown"}
- Active record: ${currentRecord ? JSON.stringify(currentRecord) : "none"}

COMPANY DEFAULTS:
- Overhead: ${settings.overhead_pct}%
- Profit: ${settings.profit_pct}%
- Sales tax rate: ${settings.tax_rate}%
- Estimate valid for: ${settings.estimate_valid_days} days

SYSTEMS LIBRARY (use these specs when estimating; never invent costs/coverage):
${JSON.stringify(systemsLibrary, null, 2)}

WEB BROWSING — be a relentless researcher:
You can call web_search and web_scrape to look up info on the open web.
ALWAYS try multiple angles before reporting "not found":
  1. Brand site directly: web_search("New Age Artisans tadelakt")
  2. Spec sheet hunting: append "technical data sheet", "MSDS", "coverage", "spread rate", "mix ratio"
  3. Retailer / distributor pages — they often list coverage + price even when the maker doesn't:
     try Amazon, Build With Rise, Green Building Supply, Ecological Building Network, Eco-Building Products, distributor names
  4. Forums / how-to guides for application notes when official docs are thin

PAYWALL AWARENESS:
For ANY newageartisans.com URL (Plaster Portal, courses, product pages), use the
naa_portal_fetch tool — Shawn's portal credentials are saved and it will log in for you.
Do NOT use web_scrape on newageartisans.com; it will only see the public marketing page.
**Call naa_portal_fetch AT MOST 2 times per estimate.** If the first 1–2 fetches don't
surface coverage / mix ratio / price, STOP retrying — proceed with the spec you have
plus a clear assumption note in the estimate. Do not loop trying to find numbers that
aren't published.
For other paywalled sources (Patreon, other dealer logins) where we have no saved login,
say so plainly and offer (a) add system shell with public info, or (b) pull comparable
specs from a similar product (American Clay, Meoded, Texston).

When info IS partial, still emit add_system with everything you DO have, set unknowns to null,
and in your prose summary list exactly which fields are missing and why.

ACTIONS — emit one or more fenced \`\`\`action blocks to perform operations in
the app. Each block is a separate confirmation card the user clicks to apply.
ALWAYS show a short prose summary first describing what you're about to do,
then emit the block(s). Wait for an explicit confirmation cue ("yes", "do it",
"go ahead") before emitting blocks for destructive or creative operations.

Supported action types:

\`\`\`action
{ "type": "add_system", "data": {
  "name": "string (required)", "manufacturer": "string|null",
  "description": "string|null", "coats": number|null,
  "coverage_rate": number|null, "coverage_unit": "bag|gal|kit|can|null",
  "cost_per_unit": number|null, "labor_rate_per_sf": number|null,
  "typical_equipment": "string|null", "substrate_notes": "string|null",
  "application_notes": "string|null", "source_url": "string|null"
}}
\`\`\`

\`\`\`action
{ "type": "create_contact", "data": {
  "name": "string (required)", "type": "Client|Vendor|Subcontractor|null",
  "status": "Active|Inactive|null", "email": "string|null",
  "phone": "string|null", "address": "string|null", "notes": "string|null"
}}
\`\`\`

\`\`\`action
{ "type": "update_system", "data": {
  "id": "uuid (required)", "name": "string|null", "manufacturer": "string|null",
  "description": "string|null", "coats": number|null,
  "coverage_rate": number|null, "coverage_unit": "bag|gal|kit|can|null",
  "cost_per_unit": number|null, "labor_rate_per_sf": number|null,
  "typical_equipment": "string|null", "substrate_notes": "string|null",
  "application_notes": "string|null", "source_url": "string|null"
}}
\`\`\`

\`\`\`action
{ "type": "update_contact", "data": {
  "id": "uuid (required)", "name": "string|null", "type": "string|null",
  "status": "string|null", "email": "string|null", "phone": "string|null",
  "address": "string|null", "notes": "string|null"
}}
\`\`\`

\`\`\`action
{ "type": "create_project", "data": {
  "name": "string (required)", "contact_id": "uuid|null",
  "status": "Bidding|Active|Complete|Archived|null", "address": "string|null",
  "start_date": "YYYY-MM-DD|null", "end_date": "YYYY-MM-DD|null",
  "contract_value": number|null, "notes": "string|null"
}}
\`\`\`

\`\`\`action
{ "type": "create_receipt", "data": {
  "vendor": "string|null", "amount": number (required),
  "receipt_date": "YYYY-MM-DD (required)",
  "category": "Materials|Labor|Equipment|Subcontractor|Vehicle|Insurance|Office|Permits|Miscellaneous",
  "project_id": "uuid|null", "tax_deductible": boolean,
  "notes": "string|null"
}}
\`\`\`

\`\`\`action
{ "type": "mark_payment_received", "data": {
  "invoice_id": "uuid (required)", "paid_date": "YYYY-MM-DD|null"
}}
\`\`\`

\`\`\`action
{ "type": "query_tax_summary", "data": { "year": "2026" } }
\`\`\`

RULES:
- add_system: ALWAYS scrape the source page first; never invent costs, coverage,
  or labor rates. Set unknown numerics to null. For "add all their systems",
  emit one block per system, capped at ${MAX_SCRAPES_PER_REQUEST} scrapes per
  request. Set source_url to the page you scraped from.
- create_receipt: default tax_deductible=true for business expenses. Pick the
  best matching category from the list above (default Materials).
- update_contact / mark_payment_received: only emit when you have the actual
  uuid (from CURRENT CONTEXT active record, or after a lookup the user just
  showed you). Never fabricate a uuid.
- create_project: if the user references an existing client by name, set
  contact_id to that contact's uuid only if you actually have it.
- query_tax_summary: opens the report; no DB write.



ESTIMATING — Organic Finishes estimates are presentation-grade documents that
clients sign and return with a deposit. They MUST match the depth of our
reference estimates (Bauwerks Limewash on tilt panels; Biolime 3-coat on
FasWall). When the user asks for an estimate, output a SINGLE \`\`\`json fenced
block following EXACTLY this schema (separate from action blocks):

\`\`\`json
{
  "title": "Bauwerks Limewash on Exterior Tilt Panels — LDF Project",
  "client_name": "string", "project_address": "string, City, ST",
  "substrate": "specific surface (e.g., 'New tilt concrete panels (TP-3)')",
  "system_name": "exact product + coat count (e.g., 'Bauwerks limewash, 2-coat system')",
  "area_sf": 0,
  "area_note": "2–4 sentence TAKEOFF BASIS: how the SF was derived (which elevations / drawings used, scale, wall heights from callouts, bay spacing, opening deduction %, what's in/out of scope). This is the 'show your work' paragraph the client reads to trust the number.",
  "duration_estimate": "e.g., '5–6 weeks (weather dependent)' or '7 working days'",
  "sections": [
    { "label": "A — Surface Preparation", "line_items": [
      {"description":"Tilt panel surface inspection & prep","sub_note":"Wipe down, remove form release residue, check for laitance — critical step on new tilt concrete before any mineral paint application","qty":3360,"unit":"SF","unit_cost":0.35,"total":1176}
    ], "subtotal": 0 },
    { "label": "B — Materials", "line_items": [], "subtotal": 0 },
    { "label": "C — Labor", "line_items": [], "subtotal": 0 },
    { "label": "D — Equipment & Site", "line_items": [], "subtotal": 0 },
    { "label": "E — Overhead & Profit", "line_items": [
      {"description":"Overhead — insurance, fuel, vehicle, admin, warranty reserve","sub_note":"~${settings.overhead_pct}% of direct costs","qty":1,"unit":"lot","unit_cost":0,"total":0},
      {"description":"Profit margin","sub_note":"Specialty applicator premium — ~${settings.profit_pct}% of direct costs","qty":1,"unit":"lot","unit_cost":0,"total":0}
    ], "subtotal": 0 }
  ],
  "direct_cost_subtotal": 0,
  "overhead_pct": ${settings.overhead_pct}, "overhead_amount": 0,
  "profit_pct": ${settings.profit_pct}, "profit_amount": 0,
  "tax_rate": ${settings.tax_rate}, "tax_amount": 0,
  "total": 0, "per_sf": 0,
  "bid_range": {
    "low": 0,  "low_note":  "Lean crew / owner supplies some materials / no finish sealer",
    "mid": 0,  "mid_note":  "As estimated above — recommended scope",
    "high": 0, "high_note": "Premium finish, integrally pigmented coat, extended cure monitoring"
  },
  "assumptions": ["8–12 specific bullets"],
  "exclusions": ["4–8 specific bullets"],
  "system_note": "2–4 sentence prose paragraph educating the client on WHY this material/system suits this substrate (chemistry, vapor permeability, durability, climate fit). Written as confident expert prose."
}
\`\`\`

QUALITY BAR — every estimate must hit ALL of these or it is not done:

1. **Every line item has a sub_note** — one sentence of plain-English rationale
   explaining WHY this line exists, what's included, or why the qty/cost is what
   it is (e.g., "Limewash applied by brush and sponge for authentic mineral
   texture; roller for field, brush for cut-in and panel edges"). No empty notes.

2. **area_note is the takeoff paragraph** — not a single word. It cites which
   drawings/elevations were used, how heights and bay lengths were measured,
   what % was deducted for openings, and what is/isn't in scope. If you
   estimated rather than measured, say so and offer to revise once dimensions
   are confirmed.

3. **Sections A–D are fully populated.** Typical content:
   - **A Prep**: surface inspection, cleaning/patching, masking, primer/bonding labor
   - **B Materials**: each product line w/ coverage rate in sub_note (gal or bag count w/ SF/unit), aggregate, mesh, beads, primer material, brushes/buckets allowance
   - **C Labor**: lead applicator + tender, broken out by days × day-rate; sub_note explains technique demand (wet-edge, multi-coat cure windows, etc.)
   - **D Equipment**: lift rental + delivery, mortar mixer, water/utility, masking lot, dumpster if relevant
   - **E Overhead & Profit**: as scaffolded above

4. **assumptions** must include: substrate condition, cure window for new
   substrates, weather constraints (temp/wind/rain limits for lime), sales tax
   handling, color/finish caveats, schedule contingency, recommendation of test
   panel on Day 1, and validity period.

5. **exclusions** must explicitly call out: structural repair, flashing/window
   work, painting beyond included sealer, interior surfaces, debris hauling
   beyond normal waste, change-order policy for unforeseen substrate conditions.

6. **system_note** is a real paragraph, not a tagline. Reference vapor
   permeability, mineral bond, UV stability, breathability, low maintenance,
   climate suitability — whatever applies to the product chosen.

7. **bid_range** ALWAYS present. mid = estimate total. low ≈ 0.85×mid (with
   low_note explaining what got cut). high ≈ 1.18×mid (with high_note explaining
   the premium).

8. **Numbers must reconcile.** Each line total = qty × unit_cost. Each section
   subtotal = sum of its lines. direct_cost_subtotal = A+B+C+D. overhead =
   direct × overhead_pct. profit = (direct + overhead) × profit_pct.
   tax = (direct + overhead + profit) × tax_rate. total = pre-tax + tax.
   per_sf = total / area_sf. The client app re-runs these calcs but yours
   should already match.

If you don't have enough info to hit the quality bar (e.g., no drawings, no
substrate confirmation), ASK ONE focused clarifying question first instead of
guessing. Better to spend one turn confirming wall heights than to ship a
half-baked estimate.

INVOICING — Organic Finishes invoices are presentation-grade billing
documents the client pays from. They share the visual language of our
estimates (same header, type, color) but answer a different question:
"what work was completed, what was already paid, what is owed now, and
how do I pay it." When the user asks for an invoice (deposit, progress,
or final), output a SINGLE \`\`\`json fenced block matching this schema
EXACTLY (separate from action blocks and from any estimate block):

\`\`\`json
{
  "invoice_number": "INV-2026-0001",
  "title": "Bauwerks Limewash — LDF Project · Progress Invoice #2",
  "client_name": "string",
  "project_address": "street, City, ST",
  "project_name": "string (matches an existing project name when known)",
  "substrate": "optional",
  "system_name": "optional",
  "area_sf": 0,

  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD (default: invoice_date + 30 days, Net 30)",
  "service_period": "human range, e.g. 'Mar 4 – Mar 22, 2026'",

  "milestone": "Deposit | Progress #N | Substantial completion | Final | Retainer release",
  "work_summary": "2–4 sentence plain-English summary of WHAT was completed during this billing window. Cite elevations, coats applied, square footage finished, milestones hit.",

  "sections": [
    { "label": "A — Work completed", "line_items": [
      {"description":"Limewash coat 1 — North & East elevations","sub_note":"1,840 SF complete. Applied by brush + sponge per Bauwerks 2-coat system; cure time observed before billing.","qty":1840,"unit":"SF","unit_cost":3.25,"total":5980}
    ], "subtotal": 0 },
    { "label": "B — Materials supplied", "line_items": [], "subtotal": 0 },
    { "label": "C — Equipment & site", "line_items": [], "subtotal": 0 }
  ],
  "direct_cost_subtotal": 0,
  "subtotal": 0,
  "tax_rate": ${settings.tax_rate}, "tax_amount": 0,
  "total": 0,

  "deposit_applied": 0,
  "prior_payments": [
    { "date": "YYYY-MM-DD", "amount": 0, "method": "Check #1042 | ACH | Card | Cash", "note": "optional" }
  ],
  "amount_paid": 0,
  "balance_due": 0,

  "payment_terms": "Net 30 from invoice date. Make checks payable to Organic Finishes LLC. ACH and card accepted.",
  "payment_methods": ["Check","ACH transfer","Credit/debit card"],
  "late_fee_note": "A 1.5% monthly finance charge applies to balances 30+ days past due (per signed estimate).",
  "thank_you_note": "Thank you for choosing Organic Finishes — we appreciate the partnership.",
  "notes": ["optional bullet notes — change orders applied, retainage held, etc."]
}
\`\`\`

INVOICE QUALITY BAR — every invoice must hit ALL of these:

1. **work_summary is real prose**, not a tagline. It tells the client exactly
   what they're paying for in this billing cycle (elevations finished, coats
   applied, days on site). If this is a Deposit invoice, say so plainly:
   "30% deposit per signed estimate dated MM/DD to schedule materials and crew."

2. **Every line item has a sub_note** explaining what's included or how the
   qty was measured (SF completed, days × day-rate, lot for prep).

3. **milestone is set** — Deposit, Progress #N, Substantial completion,
   Final, or Retainer release. The PDF surfaces this prominently.

4. **Numbers reconcile.** line.total = qty × unit_cost. section.subtotal =
   sum of lines. subtotal = sum of sections. tax = subtotal × tax_rate%.
   total = subtotal + tax. amount_paid = deposit_applied + sum(prior_payments).
   balance_due = total - amount_paid. The client app re-runs these but
   yours should already match.

5. **prior_payments + deposit_applied** reflect reality. If converting an
   estimate to a deposit invoice, deposit_applied = 0 (this IS the deposit).
   If this is a Progress/Final invoice, include the deposit and any earlier
   progress payments so the client sees the running ledger.

6. **payment_terms / payment_methods / late_fee_note** are always set —
   default to Net 30, the methods above, and the 1.5%/mo late fee that
   matches our signed estimates. Adjust only if the user overrides.

7. **invoice_number** — if the user gives one, use it. Otherwise propose a
   sensible one (e.g., INV-YYYY-NNNN) and tell them in your prose that they
   can rename before saving.

8. **If converting from an existing estimate**, mirror the project_name,
   client_name, project_address, substrate, and system_name from that
   estimate so the invoice clearly belongs to the same job.

If you don't have enough info (no service period, unclear what was actually
completed, missing prior-payment ledger), ASK ONE focused clarifying question
first instead of guessing.

VOICE / TRANSCRIPTION: Do not auto-correct trade terms — Biolime, FasWall,
Bauwerks, tadelkt, limewash, tilt panel, scissor lift, hawk and trowel,
scratch coat, brown coat are correct.

TONE: Professional peer. Concise confirmations, clear questions, no filler.`;
}

function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(t));
}

async function fcSearch(query: string, key: string) {
  try {
    const r = await fetchWithTimeout(`${FC}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 10 }),
    }, TOOL_TIMEOUT_MS.search);
    const data = await r.json();
    if (!r.ok) return { error: `Firecrawl search failed: ${r.status}` };
    const results = (data?.data?.web ?? data?.data ?? []).slice(0, 10).map((x: any) => ({
      url: x.url, title: x.title, description: x.description ?? x.snippet ?? "",
    }));
    return { results };
  } catch (e) {
    return { error: `web_search ${(e as Error).message}` };
  }
}

async function fcScrape(url: string, key: string) {
  try {
    const r = await fetchWithTimeout(`${FC}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true }),
    }, TOOL_TIMEOUT_MS.scrape);
    const data = await r.json();
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) {
        return { url, paywalled: true, status: r.status, note: "Login or paid access required." };
      }
      return { error: `Firecrawl scrape failed: ${r.status}` };
    }
    const md: string = data?.data?.markdown ?? data?.markdown ?? "";
    const meta = data?.data?.metadata ?? data?.metadata ?? {};
    const links: string[] = (data?.data?.links ?? data?.links ?? []).slice(0, 50);
    const trimmed = md.length > 12000 ? md.slice(0, 12000) + "\n\n[...truncated...]" : md;
    const paywalled = /sign\s*in|log\s*in|members?\s*only|enroll now|course access|password|subscribe to access/i.test(md.slice(0, 2000)) && md.length < 1500;
    return { url, title: meta?.title, markdown: trimmed, links, paywalled };
  } catch (e) {
    return { error: `web_scrape ${(e as Error).message}` };
  }
}

async function fcNaaPortal(target: string, key: string) {
  const EMAIL = Deno.env.get("NAA_PORTAL_EMAIL");
  const PASSWORD = Deno.env.get("NAA_PORTAL_PASSWORD");
  if (!EMAIL || !PASSWORD) {
    return { error: "NAA portal credentials not configured (NAA_PORTAL_EMAIL / NAA_PORTAL_PASSWORD)." };
  }
  if (!/newageartisans\.com|outseta\.com/.test(target)) {
    return { error: "naa_portal_fetch only works for newageartisans.com URLs." };
  }
  const LOGIN_URL = "https://new-age-artisans.outseta.com/auth?widgetMode=login#o-anonymous";
  const actions = [
    { type: "wait", milliseconds: 4000 },
    { type: "write", selector: "#o-auth-username", text: EMAIL },
    { type: "write", selector: "#o-auth-password", text: PASSWORD },
    { type: "wait", milliseconds: 800 },
    { type: "click", selector: "button.o--Login--login" },
    { type: "wait", milliseconds: 7000 },
    { type: "executeJavascript", script: `window.location.href = ${JSON.stringify(target)};` },
    { type: "wait", milliseconds: 6000 },
    { type: "scrape" },
  ];
  try {
    const r = await fetchWithTimeout(`${FC}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: LOGIN_URL, formats: ["markdown", "links"], onlyMainContent: false, actions, waitFor: 1500 }),
    }, TOOL_TIMEOUT_MS.portal);
    const data = await r.json();
    if (!r.ok) return { error: `NAA portal scrape failed [${r.status}]`, details: data };
    const md: string = data?.data?.markdown ?? data?.markdown ?? "";
    const meta = data?.data?.metadata ?? data?.metadata ?? {};
    const links: string[] = (data?.data?.links ?? data?.links ?? []).slice(0, 60);
    const trimmed = md.length > 14000 ? md.slice(0, 14000) + "\n\n[...truncated...]" : md;
    const finalUrl = meta?.sourceURL ?? meta?.url ?? target;
    const stillOnLogin = /outseta\.com\/auth/i.test(finalUrl) && md.length < 1200;
    return { requestedUrl: target, finalUrl, title: meta?.title, loggedIn: !stillOnLogin, markdown: trimmed, links };
  } catch (e) {
    return { error: `naa_portal_fetch ${(e as Error).message}` };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") ?? "";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: ANON_KEY },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemsLibrary: unknown[] = [];
    try {
      const sysResp = await fetch(`${SUPABASE_URL}/rest/v1/systems?is_active=eq.true&select=*`, {
        headers: { Authorization: authHeader, apikey: ANON_KEY },
      });
      if (sysResp.ok) systemsLibrary = await sysResp.json();
    } catch (e) { console.warn("systems fetch failed", e); }

    const settings = { overhead_pct: 8, profit_pct: 10, tax_rate: 8.75, estimate_valid_days: 30 };
    const systemPrompt = buildSystemPrompt(systemsLibrary, settings, body.currentPage, body.currentRecord);

    const hasImages = body.hasImages || body.messages.some((m) =>
      Array.isArray(m.content) && m.content.some((c) => c.type === "image_url")
    );

    // Provider routing. Default = Lovable AI / GPT-5 with high reasoning.
    // If client passed an OpenRouter-whitelisted slug, use OpenRouter instead.
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
    const requestedModel = body.model?.trim() || "";
    const useOpenRouter = !!requestedModel && OPENROUTER_MODELS.has(requestedModel) && !!OPENROUTER_API_KEY;
    const model = useOpenRouter
      ? requestedModel
      : (requestedModel.startsWith("google/") || requestedModel.startsWith("openai/") ? requestedModel : "openai/gpt-5");

    const upstreamUrl = useOpenRouter ? OPENROUTER_URL : GATEWAY_URL;
    const upstreamKey = useOpenRouter ? OPENROUTER_API_KEY : LOVABLE_API_KEY;
    const upstreamExtraHeaders: Record<string, string> = useOpenRouter
      ? { "HTTP-Referer": "https://of-manager.lovable.app", "X-Title": "OF Manager" }
      : {};

    console.log("ai-chat routing", { provider: useOpenRouter ? "openrouter" : "lovable", model });

    // Tool-calling loop. We open the SSE stream IMMEDIATELY and write keepalive
    // comments between rounds so the edge runtime's 150s idle timer never trips.
    type ChatMsg = Record<string, unknown>;
    const conversation: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      ...body.messages as unknown as ChatMsg[],
    ];

    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const ping = () => controller.enqueue(enc.encode(`: keepalive ${Date.now()}\n\n`));
        const done = () => {
          controller.enqueue(enc.encode(`data: [DONE]\n\n`));
          controller.close();
        };

        // Heartbeat every 10s so neither the edge runtime nor any proxy idles us out.
        const heartbeat = setInterval(() => {
          try { ping(); } catch { /* closed */ }
        }, 10_000);
        ping();

        let scrapesUsed = 0;
        try {
          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const isLastAllowedRound = round === MAX_TOOL_ROUNDS - 1;
            const reqBody: Record<string, unknown> = {
              model,
              messages: conversation,
              tools,
              tool_choice: "auto",
              stream: false,
            };
            if (model.startsWith("openai/gpt-5")) {
              reqBody.reasoning = { effort: "high" };
            }

            console.log("ai-chat round", round, "scrapes_used", scrapesUsed);
            let upstream: Response;
            try {
              upstream = await fetchWithTimeout(upstreamUrl, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${upstreamKey}`,
                  "Content-Type": "application/json",
                  ...upstreamExtraHeaders,
                },
                body: JSON.stringify(reqBody),
              }, UPSTREAM_ROUND_TIMEOUT_MS);
            } catch (e) {
              console.error("ai-chat upstream timeout/abort round", round, e);
              send({ choices: [{ delta: { content: `_Model timed out on round ${round + 1} (${Math.round(UPSTREAM_ROUND_TIMEOUT_MS/1000)}s). Try again, or pick a faster model._` } }] });
              done();
              return;
            }

            if (!upstream.ok) {
              const t = await upstream.text().catch(() => "");
              console.error("AI gateway error", upstream.status, t);
              const errMsg =
                upstream.status === 429 ? "_Rate limit reached. Please wait a moment and try again._" :
                upstream.status === 402 ? "_AI credits exhausted. Add credits in workspace settings._" :
                `_AI gateway error (${upstream.status})._`;
              send({ choices: [{ delta: { content: errMsg } }] });
              done();
              return;
            }

            let data: any;
            try {
              data = await upstream.json();
            } catch (e) {
              console.error("ai-chat upstream JSON parse error", e);
              send({ choices: [{ delta: { content: "_Upstream returned an unreadable response (502). Please retry._" } }] });
              done();
              return;
            }
            const choice = data?.choices?.[0];
            const msg = choice?.message ?? {};
            const toolCalls = msg.tool_calls as Array<any> | undefined;

            if (!toolCalls || toolCalls.length === 0) {
              const finalText: string = msg.content ?? "";
              const CHUNK = 80;
              for (let i = 0; i < finalText.length; i += CHUNK) {
                send({ choices: [{ delta: { content: finalText.slice(i, i + CHUNK) } }] });
              }
              done();
              return;
            }

            // Tool round — push assistant message + execute tools, with progress pings.
            conversation.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });

            for (const tc of toolCalls) {
              const fname = tc.function?.name;
              let args: any = {};
              try { args = JSON.parse(tc.function?.arguments ?? "{}"); } catch { /* ignore */ }
              ping();
              let result: unknown;

              // Visible status so the user knows we're working, not stuck.
              const status =
                fname === "web_search"      ? `_🔎 Searching: ${String(args.query ?? "").slice(0, 80)}…_\n` :
                fname === "web_scrape"      ? `_📄 Reading ${String(args.url ?? "").slice(0, 80)}…_\n` :
                fname === "naa_portal_fetch"? `_🔐 Logging into NAA portal for ${String(args.url ?? "").slice(0, 80)}…_\n` :
                "";
              if (status && round === 0) send({ choices: [{ delta: { content: status } }] });
              else if (status) send({ choices: [{ delta: { content: status } }] });

              if (!FIRECRAWL_API_KEY) {
                result = { error: "Web tools unavailable: FIRECRAWL_API_KEY not configured." };
              } else if (fname === "web_search") {
                result = await fcSearch(String(args.query ?? ""), FIRECRAWL_API_KEY);
              } else if (fname === "web_scrape") {
                if (scrapesUsed >= MAX_SCRAPES_PER_REQUEST) {
                  result = { error: `Scrape cap reached (${MAX_SCRAPES_PER_REQUEST}). Summarize with what you have.` };
                } else {
                  scrapesUsed++;
                  result = await fcScrape(String(args.url ?? ""), FIRECRAWL_API_KEY);
                }
              } else if (fname === "naa_portal_fetch") {
                if (scrapesUsed >= MAX_SCRAPES_PER_REQUEST) {
                  result = { error: `Scrape cap reached (${MAX_SCRAPES_PER_REQUEST}).` };
                } else {
                  scrapesUsed++;
                  result = await fcNaaPortal(String(args.url ?? ""), FIRECRAWL_API_KEY);
                }
              } else {
                result = { error: `Unknown tool: ${fname}` };
              }
              ping();

              conversation.push({
                role: "tool",
                tool_call_id: tc.id,
                name: fname,
                content: JSON.stringify(result).slice(0, 16000),
              });
            }

            if (isLastAllowedRound) {
              send({ choices: [{ delta: { content: "_I gathered partial info but hit my browsing limit. Want me to continue with what I have?_" } }] });
              done();
              return;
            }
          }
        } catch (err) {
          console.error("ai-chat stream error", err);
          try {
            send({ choices: [{ delta: { content: `_Connection error: ${(err as Error).message}_` } }] });
            done();
          } catch { /* already closed */ }
        } finally {
          clearInterval(heartbeat);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    console.error("ai-chat error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
