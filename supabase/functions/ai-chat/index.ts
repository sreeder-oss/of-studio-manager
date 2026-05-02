// AI chat with tool-calling (web search/scrape) + streaming final response.
// Injects Systems Library + company defaults into the system prompt.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const FC = "https://api.firecrawl.dev/v2";
const MAX_TOOL_ROUNDS = 6;
const MAX_SCRAPES_PER_REQUEST = 8;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
}

interface RequestBody {
  messages: IncomingMessage[];
  currentPage?: string;
  currentRecord?: unknown;
  hasImages?: boolean;
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

WEB BROWSING:
You can call web_search and web_scrape tools to look up information online —
manufacturer websites, product spec sheets, MSDS, coverage rates, pricing.
Use them whenever the user references a brand, product, or website you don't
already have data for. Workflow:
  1. web_search("New Age Artisans tadelkt") to find candidate URLs
  2. web_scrape on the most relevant 1–3 URLs to read specs
  3. Summarize what you found and ask for confirmation before adding anything

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



ESTIMATING — when the user asks for an estimate, output the estimate as a single
\`\`\`json fenced block following EXACTLY this schema (this is separate from action blocks):

\`\`\`json
{
  "title": "string", "client_name": "string", "project_address": "string",
  "substrate": "string", "system_name": "string", "area_sf": 0,
  "area_note": "confirmed | estimated", "duration_estimate": "string",
  "sections": [
    { "label": "A — Surface Preparation", "line_items": [{"description":"","sub_note":"","qty":0,"unit":"SF","unit_cost":0,"total":0}], "subtotal": 0 },
    { "label": "B — Materials", "line_items": [], "subtotal": 0 },
    { "label": "C — Labor", "line_items": [], "subtotal": 0 },
    { "label": "D — Equipment & Site", "line_items": [], "subtotal": 0 },
    { "label": "E — Overhead & Profit", "line_items": [], "subtotal": 0 }
  ],
  "direct_cost_subtotal": 0,
  "overhead_pct": ${settings.overhead_pct}, "overhead_amount": 0,
  "profit_pct": ${settings.profit_pct}, "profit_amount": 0,
  "tax_rate": ${settings.tax_rate}, "tax_amount": 0,
  "total": 0, "per_sf": 0,
  "bid_range": { "low": 0, "low_note": "", "mid": 0, "mid_note": "", "high": 0, "high_note": "" },
  "assumptions": ["string"], "exclusions": ["string"], "system_note": "string"
}
\`\`\`

VOICE / TRANSCRIPTION: Do not auto-correct trade terms — Biolime, FasWall,
Bauwerks, tadelkt, limewash, tilt panel, scissor lift, hawk and trowel,
scratch coat, brown coat are correct.

TONE: Professional peer. Concise confirmations, clear questions, no filler.`;
}

async function fcSearch(query: string, key: string) {
  const r = await fetch(`${FC}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 5 }),
  });
  const data = await r.json();
  if (!r.ok) return { error: `Firecrawl search failed: ${r.status}` };
  const results = (data?.data?.web ?? data?.data ?? []).slice(0, 5).map((x: any) => ({
    url: x.url, title: x.title, description: x.description ?? x.snippet ?? "",
  }));
  return { results };
}

async function fcScrape(url: string, key: string) {
  const r = await fetch(`${FC}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const data = await r.json();
  if (!r.ok) return { error: `Firecrawl scrape failed: ${r.status}` };
  const md: string = data?.data?.markdown ?? data?.markdown ?? "";
  const meta = data?.data?.metadata ?? data?.metadata ?? {};
  const trimmed = md.length > 12000 ? md.slice(0, 12000) + "\n\n[...truncated...]" : md;
  return { url, title: meta?.title, markdown: trimmed };
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
    // Use pro for vision OR when tools may be needed; flash-preview supports tools as well
    const model = hasImages ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    // Tool-calling loop: keep asking the gateway non-streaming until no more tool_calls.
    type ChatMsg = Record<string, unknown>;
    const conversation: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      ...body.messages as unknown as ChatMsg[],
    ];
    let scrapesUsed = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const upstream = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: conversation, tools, tool_choice: "auto" }),
      });

      if (!upstream.ok) {
        if (upstream.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (upstream.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace settings." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await upstream.text();
        console.error("AI gateway error", upstream.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await upstream.json();
      const choice = data?.choices?.[0];
      const msg = choice?.message ?? {};
      const toolCalls = msg.tool_calls as Array<any> | undefined;

      if (!toolCalls || toolCalls.length === 0) {
        // Final answer — stream as a single SSE chunk + [DONE] for the existing client parser.
        const finalText: string = msg.content ?? "";
        const stream = new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            // Send in chunks so the UI feels live
            const CHUNK = 60;
            for (let i = 0; i < finalText.length; i += CHUNK) {
              const piece = finalText.slice(i, i + CHUNK);
              const payload = JSON.stringify({ choices: [{ delta: { content: piece } }] });
              controller.enqueue(enc.encode(`data: ${payload}\n\n`));
            }
            controller.enqueue(enc.encode(`data: [DONE]\n\n`));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // Push assistant tool-call message and execute each tool
      conversation.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });

      for (const tc of toolCalls) {
        const fname = tc.function?.name;
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments ?? "{}"); } catch { /* ignore */ }
        let result: unknown;

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
        } else {
          result = { error: `Unknown tool: ${fname}` };
        }

        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          name: fname,
          content: JSON.stringify(result).slice(0, 16000),
        });
      }
    }

    // Hit the round cap — return a graceful message
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        const payload = JSON.stringify({ choices: [{ delta: { content: "I gathered partial info but hit my browsing limit. Want me to continue with what I have?" } }] });
        controller.enqueue(enc.encode(`data: ${payload}\n\n`));
        controller.enqueue(enc.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-chat error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
