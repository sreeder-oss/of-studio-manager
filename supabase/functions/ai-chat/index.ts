// AI chat with tool-calling (web search/scrape) + streaming final response.
// Injects Systems Library + company defaults into the system prompt.

function isNaaHost(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    return h === "newageartisans.com" || h.endsWith(".newageartisans.com") || h === "new-age-artisans.outseta.com";
  } catch { return false; }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
/** Single pinned model for all assistant calls (deterministic scope extraction). */
const PINNED_MODEL = "deepseek/deepseek-v4.1-flash";
const FC = "https://api.firecrawl.dev/v2";
const MAX_TOOL_ROUNDS = 16;
const RESEARCH_SOFT_CAP = 6; // after this many tool rounds, force the model to wrap up
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
  /** Optional client-provided API key (stored in app Settings) */
  apiKey?: string;
}

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the public web. Returns up to 5 results with url, title, description. Use this to find product/spec pages when the user names a brand.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
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
        properties: { url: { type: "string", description: "Full https URL" } },
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
        properties: { url: { type: "string", description: "Full https URL on newageartisans.com (e.g. /plaster-portal or a course/product page)" } },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "emit_scope",
      description: "Emit the structured SCOPE of an estimate. You NEVER set prices — the app prices it from the SERVICES price book. Call exactly once when the user asks for an estimate. After this call, write a 1–2 sentence summary (no dollar amounts).",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["title", "client_name", "project_address", "areas"],
        properties: {
          title: { type: "string", description: "Short project title, e.g. 'Primary Shower — Tadelakt'. Never the user's raw prompt." },
          client_name: { type: "string", description: "Client name if stated, else empty string." },
          project_address: { type: "string", description: "Address/city if stated, else empty string." },
          areas: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "service_id", "qty", "unit", "system_id", "substrate", "prep_tier", "notes"],
              properties: {
                name: { type: "string", description: "Short area name, e.g. 'Entryway'. Max ~6 words." },
                service_id: { type: ["string", "null"], description: "id of the matching SERVICES row (match by name, case-insensitive). null if no match." },
                qty: { type: "number", minimum: 0, description: "Square feet when unit is SF, number of days when unit is day." },
                unit: { type: "string", enum: ["SF", "day"], description: "Use the matched service's pricing_unit (sf -> SF, day -> day)." },
                system_id: { type: ["string", "null"], description: "Optional, materials only: id of the matching Systems Library row. null if not needed or no match." },
                substrate: { type: "string" },
                prep_tier: { type: "string", enum: ["light", "standard", "heavy"] },
                notes: { type: "string", description: "Concise client-facing scope note (inclusions/exclusions). Never paste the user's prompt; never include prices." },
              },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "emit_invoice",
      description: "Emit the FINAL structured invoice document. Call this exactly once when the invoice is complete. Do NOT also output a ```json fenced invoice block. After this call, write a 1–3 sentence prose summary.",
      parameters: {
        type: "object",
        properties: {
          invoice_number: { type: "string" },
          title: { type: "string" },
          client_name: { type: "string" },
          project_address: { type: "string" },
          project_name: { type: "string" },
          substrate: { type: "string" },
          system_name: { type: "string" },
          area_sf: { type: "number" },
          invoice_date: { type: "string" },
          due_date: { type: "string" },
          service_period: { type: "string" },
          work_summary: { type: "string" },
          milestone: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                line_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      sub_note: { type: "string" },
                      qty: { type: "number" },
                      unit: { type: "string" },
                      unit_cost: { type: "number" },
                      total: { type: "number" },
                    },
                    required: ["description", "qty", "unit", "unit_cost", "total"],
                  },
                },
                subtotal: { type: "number" },
              },
              required: ["label", "line_items", "subtotal"],
            },
          },
          direct_cost_subtotal: { type: "number" },
          subtotal: { type: "number" },
          tax_rate: { type: "number", description: "Sales tax as a percent (e.g. 8.75 for 8.75%)" },
          tax_amount: { type: "number" },
          total: { type: "number" },
          deposit_applied: { type: "number" },
          prior_payments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" }, amount: { type: "number" },
                method: { type: "string" }, note: { type: "string" },
              },
              required: ["date", "amount"],
            },
          },
          amount_paid: { type: "number" },
          balance_due: { type: "number" },
          payment_terms: { type: "string" },
          payment_methods: { type: "array", items: { type: "string" } },
          late_fee_note: { type: "string" },
          thank_you_note: { type: "string" },
          notes: { type: "array", items: { type: "string" } },
        },
        required: ["title", "sections"],
      },
    },
  },
];

type ScopeArea = { name: string; service_id: string | null; unmatched_service: string | null; qty: number; unit: "SF" | "day"; system_id: string | null; substrate: string; prep_tier: "light" | "standard" | "heavy"; notes: string };
function validateScope(raw: any, validIds: Set<string>, nameToId: Map<string, string>, validServiceIds: Set<string>, serviceNameToId: Map<string, string>):
  { ok: true; scope: { title: string; client_name: string; project_address: string; areas: ScopeArea[] } } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "payload must be an object" };
  const allowedTop = new Set(["title", "client_name", "project_address", "areas"]);
  for (const k of Object.keys(raw)) if (!allowedTop.has(k)) return { ok: false, error: `unexpected field ${k}` };
  if (!Array.isArray(raw.areas) || raw.areas.length === 0) return { ok: false, error: "areas must be a non-empty array" };
  const areas: ScopeArea[] = [];
  for (const [i, a] of raw.areas.entries()) {
    if (!a || typeof a !== "object") return { ok: false, error: `areas[${i}] must be an object` };
    const allowed = new Set(["name", "service_id", "qty", "unit", "system_id", "substrate", "prep_tier", "notes"]);
    for (const k of Object.keys(a)) if (!allowed.has(k)) return { ok: false, error: `areas[${i}] unexpected field ${k}` };
    if (typeof a.name !== "string" || !a.name.trim()) return { ok: false, error: `areas[${i}].name required` };
    if (typeof a.qty !== "number" || !Number.isFinite(a.qty) || a.qty < 0) return { ok: false, error: `areas[${i}].qty must be a number >= 0` };
    if (a.unit !== "SF" && a.unit !== "day") return { ok: false, error: `areas[${i}].unit must be SF|day` };
    if (!["light", "standard", "heavy"].includes(a.prep_tier)) return { ok: false, error: `areas[${i}].prep_tier must be light|standard|heavy` };
    let sid: string | null = typeof a.system_id === "string" ? a.system_id : null;
    if (sid && !validIds.has(sid)) sid = nameToId.get(sid.toLowerCase()) ?? null; // model passed a name
    let svc: string | null = typeof a.service_id === "string" && a.service_id.trim() ? a.service_id.trim() : null;
    let unmatched: string | null = null;
    if (svc && !validServiceIds.has(svc)) {
      const byName = serviceNameToId.get(svc.toLowerCase()) ?? null; // model passed a name
      if (!byName) unmatched = svc.slice(0, 80);
      svc = byName;
    }
    areas.push({
      name: a.name.trim().slice(0, 80), service_id: svc, unmatched_service: unmatched, qty: a.qty, unit: a.unit, system_id: sid,
      substrate: String(a.substrate ?? "").slice(0, 200), prep_tier: a.prep_tier, notes: String(a.notes ?? "").slice(0, 600),
    });
  }
  return { ok: true, scope: { title: String(raw.title ?? "").slice(0, 120), client_name: String(raw.client_name ?? ""), project_address: String(raw.project_address ?? ""), areas } };
}

function buildSystemPrompt(systemsLibrary: unknown[], services: unknown[], settings: { tax_rate: number; estimate_valid_days: number; deposit_pct: number; }, currentPage?: string, currentRecord?: unknown) {
  return `You are the AI assistant for OF Manager, the business management app for
Organic Finishes LLC, a specialty plaster and paint company in Tulsa, Oklahoma.
The owner is Shawn. You can perform any action in the app through conversation.

CURRENT CONTEXT:
- Page: ${currentPage || "unknown"}
- Active record: ${currentRecord ? JSON.stringify(currentRecord) : "none"}

SYSTEMS LIBRARY (materials spec — use only for an area's optional materials system_id):
${JSON.stringify(systemsLibrary, null, 2)}

SERVICES (the owner's price book — match each estimate area to one of these by name and use its id):
${JSON.stringify(services, null, 2)}

MANUFACTURER TECHNICAL SPECIFICATIONS & ESTIMATING RULES:
- SureCrete SureBroom Base & Broom Resurfacing: 50# bag = 100-180 SF base coat (squeegee/tight trowel), 150-250 SF broom finish coat (system avg ~150 SF/bag). Mix 4-6 qts water per 50# bag. 6,000+ PSI compressive strength. Substrate requires ICRI CSP-2 to CSP-4 profile, etched with SCR (2:1 dilution), SSD (Saturated Surface Dry - damp, no standing puddles). Honor all expansion joints. Recoat/seal in 24 hrs.
- SureCrete MicroTek One Coat / Micro-Topping: 40# bag = 200-300 SF tightly troweled (0.5-1.0mm thickness). Mix 5-6 qts water per 40# bag with variable speed drill & cage mixer (min 1 min). 4,278 PSI compressive strength. 0 g/L VOC. 2 coats standard; recoat in 2-6 hrs. Dry 12-24 hrs before stains/sealers.
- SureCrete Surface Prep & Primers: SCR cleaner/degreaser (2:1 dilution for concrete etching, 4:1 for overlay cleaning); SureBond cementitious slurry bonding agent for stamp/deep overlays (~200 SF/bag); DK 700 Class 1 Moisture Vapor Barrier (96.5% solids urethane, 300-400 SF/gal @ 3-5 mils wet, stops MVT < 0.5 lb/1,000 SF; tack-free in 4.5 hrs).
- SureCrete Protective Sealers: Dura-Kote DK 400WB (2-component 57% aliphatic polyurethane, 300-400 SF/gal @ 4-5.3 mils wet, gloss/satin); HS 200/300 silane-acrylic nano-sealer (200-300 SF/gal, freeze-thaw spall protection); FloorTek 6 NanoCoat (400-500 SF/gal); SureFinish acrylic sacrificial wax (1,500 SF/gal).
- Meoded Quartz Primer: Required 100% acrylic silica grit bonding primer for all Meoded lime & concrete plasters. 300-500 SF/gal. Dries in 3-5 hrs. Dilute up to 25% with water on porous masonry brown coats or previous plaster.
- Meoded Concretta FS™ Shower & Wet Area Plaster: Portland cement & slaked lime water-resistant microcement for showers, steam rooms & tub surrounds. 50# bucket = 48-100 SF @ 1/8" thickness (2 coats, ~75 SF avg). Requires 100% waterproof substrate (Schluter Kerdi/RedGard) + Quartz Primer. Embed fiberglass mesh in 1st coat. Minimum 72 HOURS cure before sealing!
- Meoded PlasterGuard Waterproofing Shower Sealer: Single-component self-crosslinking nano copolymer topcoat for Concretta shower walls. 250-350 SF/gal for 3 layers. Layer 1 diluted 20% water; layers 2-4 full strength (1-2 hr dry between coats). Dry 24-48 hrs before shower use. 100% clear silicone at all corners/fixtures.
- Meoded PlasterSeal Plus Urethane Floor Sealer: 3-component urethane for Concretta floors & countertops. 400 SF/gal (2 coats). Roll over 1 coat PlasterGuard (diluted 20%). Apply 2nd coat with AntiSkid additive for non-slip floors. 24 hr cure.
- Meoded Marmorino Palladino™ Lime Slurry: Thick brush-applied mineral masonry coating for brick/stone. Dilute Marmorino Palladino plaster with 5-10% water. 20 kg bucket = 260-300 SF for 2 coats (65-75 SF/gal). Meoded Large Box Brush application in horizontal passes. Dry 8-10 hrs between coats; mist surface 20 min before 2nd pass.
- Meoded Lime Wash: Natural slaked limestone mineral paint (Zero VOC). 200-300 SF/gal for 2 coats with Large Box Brush. Dry 8-12 hrs. Light water mist hydration to accelerate carbonation and bloom mottling. Exterior: protect with Meoded Stain Shield after 48-72 hrs.
- Meoded HydroWax™: Water-soluble liquid wax for Venetian plasters. 1,000-2,000 SF/gal. Apply with sponge/rag and buff immediately with microfiber or wool bonnet for glass sheen.
- Meoded Marmorino Tintoretto: Slaked lime + fine marble dust for smooth matte/satin stone textures. 20 kg pail = 160-240 SF for 2 coats (~50 SF/5 kg). Burnish damp for low satin sheen.
- Meoded Marmorino Palladino (Troweled): Medium-grain marble lime plaster for pitted travertine, distressed stone, and concrete textures. 20 kg pail = 100-180 SF for 2 coats (~35 SF/5 kg).
- Meoded Golmex: Concrete-look architectural plaster (Portland cement + hydrated lime). 50# pail = 80-140 SF @ 1/8" thickness (2 coats); 10# = 16-28 SF. Form-line relief, sponge float & tight trowel compress. Cure 48 hrs before sealing.
- Meoded Stucco Veneziano: Ultra-high gloss mirror Venetian plaster. 20 kg pail = 250-320 SF for 3 ultra-thin passes. Burnish with trowel at 30 deg for high mirror reflection.

PRICING — YOU DO NOT PRICE ESTIMATES. Never state, compute, or suggest dollar
amounts, rates, or totals for an estimate. The app computes all pricing from the
SERVICES price book.

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
  "name": "string (required)", "type": "Client|Vendor|Lead|null",
  "status": "Active|Inactive|Pending|null", "email": "string|null",
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
  "id": "uuid (required)", "name": "string|null", "type": "Client|Vendor|Lead|null",
  "status": "Active|Inactive|Pending|null", "email": "string|null", "phone": "string|null",
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
  "category": "Materials|Labor|Equipment|Travel|Supplies|Miscellaneous",
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



ESTIMATING — When the user asks for an estimate, your ONLY job is to extract
structured scope and call the **emit_scope** tool exactly once:
- Split the work into areas (e.g. "Entryway 450 SF", "Entertainment room 450 SF").
  If the user gives one total, use one area.
- service_id = the id of the SERVICES row matching the work the user named (match
  by name, case-insensitive). If nothing matches, put the name the user used in
  service_id (the app will flag it) and say which service is missing.
- unit = the matched service's pricing_unit ('SF' for sf, 'day' for day).
- qty = net square footage (unit SF) or number of days (unit day) the user stated.
  Never invent quantities — if missing, ask ONE short question instead of calling emit_scope.
- system_id (optional, materials only) = id of the Systems Library row for the
  material, when the user named one. Otherwise null.
- prep_tier: light (sound, clean substrate), standard (typical patch/prime), heavy
  (significant repair, waterproofing, or board prep).
- name and notes are short, professional, client-facing text. NEVER copy the user's
  message into any field.
- Do NOT output prices, line-item costs, overhead, profit, tax or totals — not in
  the tool call and not in your prose. Do not output a \`\`\`json estimate block.

INVOICING — Organic Finishes invoices are presentation-grade billing
documents the client pays from. They share the visual language of our
estimates (same header, type, color) but answer a different question:
"what work was completed, what was already paid, what is owed now, and
how do I pay it." When the user asks for an invoice (deposit, progress,
or final), prefer calling the **emit_invoice** tool with the structured
payload below (more reliable than fenced JSON):

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
    { "date": "YYYY-MM-DD", "amount": 0, "method": "Check | Zelle", "note": "optional" }
  ],
  "amount_paid": 0,
  "balance_due": 0,

  "payment_terms": "Net 30 from invoice date.",
  "payment_methods": ["Check","Zelle"],
  "late_fee_note": "A 1.5% monthly finance charge applies to balances 30+ days past due (per signed estimate).",
  "thank_you_note": "Thank you for choosing Organic Finishes — we appreciate the partnership.",
  "notes": ["optional bullet notes — change orders applied, retainage held, etc."]
}
\`\`\`

INVOICE QUALITY BAR — every invoice must hit ALL of these:

1. **work_summary is real prose**, not a tagline. It tells the client exactly
   what they're paying for in this billing cycle (elevations finished, coats
   applied, days on site). If this is a Deposit invoice, say so plainly:
   "${settings.deposit_pct}% deposit per signed estimate dated MM/DD to schedule materials and crew."

2. **Every line item has a sub_note** explaining what's included or how the
   qty was measured (SF completed, days × day-rate, lot for prep).

3. **milestone is set** — Deposit, Progress #N, Substantial completion,
   Final, or Retainer release. The PDF surfaces this prominently.

4. **Numbers reconcile.** line.total = qty × unit_cost. section.subtotal =
   sum of lines. subtotal = sum of sections.
   total = subtotal. amount_paid = deposit_applied + sum(prior_payments).
   balance_due = total - amount_paid. The client app re-runs these but
   yours should already match.

5. **prior_payments + deposit_applied** reflect reality. If converting an
   estimate to a deposit invoice, deposit_applied = 0 (this IS the deposit).
   If this is a Progress/Final invoice, include the deposit and any earlier
   progress payments so the client sees the running ledger.

6. **payment_terms / payment_methods / late_fee_note** are always set —
   default to Net 30, Check and Zelle only, and the 1.5%/mo late fee that
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

// Strict detection: returns true when content clearly is NOT authenticated portal content.
function detectUnauthenticated(finalUrl: string, md: string): { unauth: boolean; reason: string } {
  if (/outseta\.com\/auth/i.test(finalUrl)) return { unauth: true, reason: "redirected_to_login" };
  const head = md.slice(0, 4000);
  if (/Annual Membership\s*-\s*\$\d+|Get Access|Sign in with Google|sign up.*plan/i.test(head) &&
      /\[log in\]|\[sign up\]/i.test(head)) {
    return { unauth: true, reason: "public_marketing_page" };
  }
  if (/o-auth-username|o-auth-password|name=["']password["']/i.test(md)) {
    return { unauth: true, reason: "login_form_present" };
  }
  return { unauth: false, reason: "" };
}

async function fcNaaPortal(target: string, key: string) {
  const EMAIL = Deno.env.get("NAA_PORTAL_EMAIL");
  const PASSWORD = Deno.env.get("NAA_PORTAL_PASSWORD");
  if (!EMAIL || !PASSWORD) {
    return { error: "NAA_PORTAL_AUTH_FAILED: portal credentials not configured (NAA_PORTAL_EMAIL / NAA_PORTAL_PASSWORD missing)." };
  }
  if (!isNaaHost(target)) {
    return { error: "naa_portal_fetch only works for newageartisans.com URLs." };
  }
  const LOGIN_URL = "https://new-age-artisans.outseta.com/auth?widgetMode=login#o-anonymous";
  const actions = [
    { type: "wait", milliseconds: 4000 },
    { type: "click", selector: "#o-auth-username" },
    { type: "write", selector: "#o-auth-username", text: EMAIL },
    { type: "press", key: "Tab" },
    { type: "click", selector: "#o-auth-password" },
    { type: "write", selector: "#o-auth-password", text: PASSWORD },
    { type: "press", key: "Tab" },
    { type: "wait", milliseconds: 1200 },
    { type: "click", selector: "button.o--Login--login" },
    { type: "wait", milliseconds: 8000 },
    { type: "executeJavascript", script: `window.location.href = ${JSON.stringify(target)};` },
    { type: "wait", milliseconds: 7000 },
    { type: "scrape" },
  ];
  try {
    const r = await fetchWithTimeout(`${FC}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: LOGIN_URL, formats: ["markdown", "links"], onlyMainContent: false, actions, waitFor: 1500 }),
    }, TOOL_TIMEOUT_MS.portal);
    const data = await r.json();
    if (!r.ok) return { error: `NAA_PORTAL_AUTH_FAILED: scrape failed [${r.status}]` };
    const md: string = data?.data?.markdown ?? data?.markdown ?? "";
    const meta = data?.data?.metadata ?? data?.metadata ?? {};
    const links: string[] = (data?.data?.links ?? data?.links ?? []).slice(0, 60);
    const finalUrl = meta?.sourceURL ?? meta?.url ?? target;
    const det = detectUnauthenticated(finalUrl, md);
    console.log("naa_portal_fetch", { target, finalUrl, bytes: md.length, unauth: det.unauth, reason: det.reason, emailLen: EMAIL.length, pwLen: PASSWORD.length });
    if (det.unauth) {
      return {
        error: `NAA_PORTAL_AUTH_FAILED: ${det.reason}. The saved NAA portal credentials did not authenticate (final URL: ${finalUrl}). Do not call naa_portal_fetch again this conversation. Proceed with public web research and clearly note in the estimate that protected NAA portal data was unavailable.`,
        finalUrl,
        reason: det.reason,
      };
    }
    const trimmed = md.length > 14000 ? md.slice(0, 14000) + "\n\n[...truncated...]" : md;
    return { requestedUrl: target, finalUrl, title: meta?.title, loggedIn: true, markdown: trimmed, links };
  } catch (e) {
    return { error: `NAA_PORTAL_AUTH_FAILED: ${(e as Error).message}` };
  }
}


// --- Receipt scan: image -> { vendor, amount, date, category } as strict JSON ---
const RECEIPT_SCAN_CATEGORIES = ["Materials", "Labor", "Equipment", "Travel", "Supplies", "Miscellaneous"] as const;

async function handleReceiptScan(input: { image?: unknown; apiKey?: unknown }): Promise<Response> {
  const json = (status: number, b: unknown) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const image = typeof input.image === "string" ? input.image : "";
  if (!/^data:image\/(png|jpe?g|webp|gif|heic|heif);base64,/i.test(image) || image.length > 12_000_000) {
    return json(400, { error: "A receipt image (data URL, under ~9 MB) is required." });
  }
  const clientKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  const key = clientKey || Deno.env.get("DEEPSEEK_API_KEY") || Deno.env.get("OPENROUTER_API_KEY") || "";
  if (!key) return json(500, { error: "DEEPSEEK_API_KEY is not configured. Please add your key in Settings or environment." });

  const isOpenRouter = key.startsWith("sk-or-");
  const upstreamUrl = isOpenRouter ? OPENROUTER_URL : DEEPSEEK_URL;
  const model = isOpenRouter ? "deepseek/deepseek-v4.1-flash" : "deepseek-flash";
  const upstreamHeaders: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (isOpenRouter) {
    upstreamHeaders["HTTP-Referer"] = "https://of-manager.lovable.app";
    upstreamHeaders["X-Title"] = "OF Manager";
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["vendor", "amount", "date", "category"],
    properties: {
      vendor: { type: "string", description: "Store name, or empty string if unreadable" },
      amount: { type: "number", description: "Grand total paid in dollars, or 0 if unreadable" },
      date: { type: "string", description: "Purchase date as YYYY-MM-DD, or empty string if unreadable" },
      category: { type: "string", enum: [...RECEIPT_SCAN_CATEGORIES, "Unknown"] },
    },
  };
  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: upstreamHeaders,
    body: JSON.stringify({
      model,
      temperature: 0,
      stream: false,
      response_format: { type: "json_schema", json_schema: { name: "receipt", strict: true, schema } },
      messages: [
        {
          role: "system",
          content: "You read a single purchase receipt. Return ONLY JSON matching the schema: vendor (store name), amount (the final total paid, number), date (YYYY-MM-DD), category (best match from: Materials, Labor, Equipment, Travel, Supplies, Miscellaneous). For anything you cannot read with confidence use an empty string, 0 for amount, or \"Unknown\" for category. Never guess.",
        },
        { role: "user", content: [
          { type: "text", text: "Read this receipt." },
          { type: "image_url", image_url: { url: image } },
        ] },
      ],
    }),
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("receipt_scan upstream", upstream.status, detail.slice(0, 300));
    return json(upstream.status === 429 || upstream.status === 402 ? upstream.status : 502, { error: `Could not read the receipt (AI service ${upstream.status}).` });
  }
  let parsed: Record<string, unknown> = {};
  try {
    const data = await upstream.json();
    let text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1];
    parsed = JSON.parse(text);
  } catch {
    return json(502, { error: "Could not read the receipt (unreadable AI reply)." });
  }
  const vendor = typeof parsed.vendor === "string" && parsed.vendor.trim() ? parsed.vendor.trim().slice(0, 200) : null;
  const amt = Number(parsed.amount);
  const amount = parsed.amount != null && Number.isFinite(amt) && amt > 0 ? Math.round(amt * 100) / 100 : null;
  const date = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null;
  const category = (RECEIPT_SCAN_CATEGORIES as readonly string[]).includes(String(parsed.category)) ? String(parsed.category) : null;
  if (!vendor && amount == null && !date && !category) {
    return json(422, { error: "Could not read anything from this receipt." });
  }
  return json(200, { vendor, amount, date, category });
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
    {
      const ownerEmail = (Deno.env.get("OWNER_EMAIL") ?? "").trim().toLowerCase();
      const signedIn = await userResp.json().catch(() => ({}));
      const email = String(signedIn?.email ?? "").trim().toLowerCase();
      if (!ownerEmail || email !== ownerEmail) {
        return new Response(JSON.stringify({ error: "This app is private." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = (await req.json()) as RequestBody;
    if ((body as unknown as { mode?: string }).mode === "receipt_scan") {
      return await handleReceiptScan(body as unknown as { image?: unknown; apiKey?: unknown });
    }
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

    let servicesList: unknown[] = [];
    try {
      const svcResp = await fetch(`${SUPABASE_URL}/rest/v1/services?is_active=eq.true&select=id,name,pricing_unit,materials_included,system_id`, {
        headers: { Authorization: authHeader, apikey: ANON_KEY },
      });
      if (svcResp.ok) servicesList = await svcResp.json();
    } catch (e) { console.warn("services fetch failed", e); }

    let depositPct = 50;
    try {
      const setResp = await fetch(`${SUPABASE_URL}/rest/v1/user_settings?select=default_deposit_pct&limit=1`, {
        headers: { Authorization: authHeader, apikey: ANON_KEY },
      });
      if (setResp.ok) {
        const rows = await setResp.json();
        const v = Number(rows?.[0]?.default_deposit_pct);
        if (Number.isFinite(v)) depositPct = v;
      }
    } catch (e) { console.warn("settings fetch failed", e); }
    const settings = { tax_rate: 0, estimate_valid_days: 30, deposit_pct: depositPct };
    const systemPrompt = buildSystemPrompt(systemsLibrary, servicesList, settings, body.currentPage, body.currentRecord);

    const hasImages = body.hasImages || body.messages.some((m) =>
      Array.isArray(m.content) && m.content.some((c) => c.type === "image_url")
    );

    // Model & key selection: DeepSeek V4.1 Flash (direct API or OpenRouter)
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
    const clientApiKey = (typeof body.apiKey === "string" && body.apiKey.trim()) ? body.apiKey.trim() : "";
    const activeKey = clientApiKey || DEEPSEEK_API_KEY || OPENROUTER_API_KEY;

    if (!activeKey) {
      return new Response(JSON.stringify({
        error: "DEEPSEEK_API_KEY is not configured. Please enter your API key in Settings or add DEEPSEEK_API_KEY in your Supabase environment secrets."
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOpenRouter = activeKey.startsWith("sk-or-");
    const upstreamUrl = isOpenRouter ? OPENROUTER_URL : DEEPSEEK_URL;
    const rawModel = (typeof body.model === "string" && body.model.trim()) ? body.model.trim() : PINNED_MODEL;
    const model = isOpenRouter
      ? (rawModel.startsWith("deepseek/") ? rawModel : "deepseek/deepseek-v4.1-flash")
      : "deepseek-flash";
    const upstreamKey = activeKey;
    const upstreamExtraHeaders: Record<string, string> = isOpenRouter
      ? { "HTTP-Referer": "https://of-manager.lovable.app", "X-Title": "OF Manager" }
      : {};
    const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
    const userPromptText = !lastUserMsg ? "" : typeof lastUserMsg.content === "string"
      ? lastUserMsg.content
      : lastUserMsg.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
    const systemIds = new Map<string, string>(); // lowercased name -> id
    const validSystemIds = new Set<string>();
    for (const sy of systemsLibrary as Array<{ id?: string; name?: string }>) {
      if (sy?.id) { validSystemIds.add(sy.id); if (sy.name) systemIds.set(sy.name.toLowerCase(), sy.id); }
    }
    const serviceIds = new Map<string, string>();
    const validServiceIds = new Set<string>();
    for (const sv of servicesList as Array<{ id?: string; name?: string }>) {
      if (sv?.id) { validServiceIds.add(sv.id); if (sv.name) serviceIds.set(sv.name.toLowerCase(), sv.id); }
    }

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
        let closed = false;
        const safeEnqueue = (chunk: Uint8Array) => {
          if (closed) return;
          try { controller.enqueue(chunk); } catch { closed = true; }
        };
        const send = (obj: unknown) => safeEnqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const ping = () => safeEnqueue(enc.encode(`: keepalive ${Date.now()}\n\n`));
        const done = () => {
          if (closed) return;
          safeEnqueue(enc.encode(`data: [DONE]\n\n`));
          closed = true;
          try { controller.close(); } catch { /* already closed */ }
        };

        // Heartbeat every 10s so neither the edge runtime nor any proxy idles us out.
        const heartbeat = setInterval(() => {
          if (closed) { clearInterval(heartbeat); return; }
          ping();
        }, 10_000);
        ping();

        let scrapesUsed = 0;
        let portalAuthFailed = false;
        try {
          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const isLastAllowedRound = round === MAX_TOOL_ROUNDS - 1;
            const forceWrapUp = round >= RESEARCH_SOFT_CAP;
            if (forceWrapUp) {
              // Inject a final user-style nudge so the model stops researching and produces output.
              const lastIsNudge = (conversation[conversation.length - 1] as any)?._wrapUpNudge;
              if (!lastIsNudge) {
                conversation.push({
                  role: "user",
                  content: "STOP researching. You have enough. Produce the final answer NOW using what you have — call emit_scope for estimates (no prices), or produce whatever else the user asked for. Do not call any more tools.",
                  _wrapUpNudge: true,
                } as any);
              }
            }
            const reqBody: Record<string, unknown> = {
              model,
              messages: conversation.map(({ _wrapUpNudge, ...m }: any) => m),
              stream: false,
              temperature: 0,
            };
            if (!forceWrapUp) {
              reqBody.tools = tools;
              reqBody.tool_choice = "auto";
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
                if (portalAuthFailed) {
                  result = { error: "NAA_PORTAL_AUTH_FAILED: already failed once this conversation. Do not retry. Use public web research only." };
                } else if (scrapesUsed >= MAX_SCRAPES_PER_REQUEST) {
                  result = { error: `Scrape cap reached (${MAX_SCRAPES_PER_REQUEST}).` };
                } else {
                  scrapesUsed++;
                  result = await fcNaaPortal(String(args.url ?? ""), FIRECRAWL_API_KEY);
                  if ((result as any)?.error?.startsWith?.("NAA_PORTAL_AUTH_FAILED")) {
                    portalAuthFailed = true;
                    send({ choices: [{ delta: { content: `_⚠️ NAA portal login failed (${(result as any).reason ?? "auth error"}). Continuing with public sources only._\n` } }] });
                  }
                }
              } else if (fname === "emit_scope") {
                const v = validateScope(args, validSystemIds, systemIds, validServiceIds, serviceIds);
                if (!v.ok) {
                  result = { error: `Invalid scope: ${v.error}. Call emit_scope again with a corrected payload.` };
                } else {
                  const payload = { kind: "estimate_scope", model_used: model, prompt: userPromptText.slice(0, 8000), ...v.scope };
                  send({ choices: [{ delta: { content: "```json\n" + JSON.stringify(payload, null, 2) + "\n```\n" } }] });
                  result = { ok: true, note: "Scope accepted. The app will price it. Do not state any prices." };
                }
              } else if (fname === "emit_invoice") {
                // Structured emit: serialize to the same fenced JSON the client parser expects,
                // then ack the tool call so the model can append its prose summary.
                try {
                  const fenced = "```json\n" + JSON.stringify(args, null, 2) + "\n```\n";
                  send({ choices: [{ delta: { content: fenced } }] });
                  result = { ok: true, emitted: fname };
                } catch (e) {
                  result = { error: `emit failed: ${(e as Error).message}` };
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
