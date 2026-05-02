// AI chat streaming proxy to Lovable AI Gateway
// Injects Systems Library + company defaults into the system prompt

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

CAPABILITIES:
You can create, read, update contacts, projects, estimates, invoices, receipts,
documents, and photos by responding with structured JSON action blocks.

ESTIMATING — when the user asks for an estimate or you have enough info to draft one:
- Always confirm critical details (substrate, SF, system, access equipment) before generating
- Inject the Systems Library: pick the matching system; use its coverage_rate, cost_per_unit, labor_rate_per_sf
- Apply company defaults for overhead, profit, tax
- Output the estimate as a single \`\`\`json fenced block following EXACTLY this schema:

\`\`\`json
{
  "title": "string",
  "client_name": "string",
  "project_address": "string",
  "substrate": "string",
  "system_name": "string",
  "area_sf": 0,
  "area_note": "confirmed from drawings | estimated from description",
  "duration_estimate": "string",
  "sections": [
    { "label": "A — Surface Preparation", "line_items": [{"description":"","sub_note":"","qty":0,"unit":"SF","unit_cost":0,"total":0}], "subtotal": 0 },
    { "label": "B — Materials", "line_items": [], "subtotal": 0 },
    { "label": "C — Labor", "line_items": [], "subtotal": 0 },
    { "label": "D — Equipment & Site", "line_items": [], "subtotal": 0 },
    { "label": "E — Overhead & Profit", "line_items": [], "subtotal": 0 }
  ],
  "direct_cost_subtotal": 0,
  "overhead_pct": ${settings.overhead_pct},
  "overhead_amount": 0,
  "profit_pct": ${settings.profit_pct},
  "profit_amount": 0,
  "tax_rate": ${settings.tax_rate},
  "tax_amount": 0,
  "total": 0,
  "per_sf": 0,
  "bid_range": {
    "low": 0, "low_note": "tight scope, ideal conditions",
    "mid": 0, "mid_note": "As estimated above",
    "high": 0, "high_note": "added complexity / contingency"
  },
  "assumptions": ["string"],
  "exclusions": ["string"],
  "system_note": "2-3 sentences on why this system suits this substrate"
}
\`\`\`

Show a short prose summary BEFORE the JSON block so Shawn can read it quickly.

ACTIONS — for non-estimate database operations, emit a \`\`\`action block:
\`\`\`action
{ "type": "create_contact", "data": { ... } }
\`\`\`
Action types: create_contact, update_contact, create_project, update_project,
create_receipt, mark_payment_received, query_tax_summary.
Always describe what you're about to do in prose first and ask for confirmation
before emitting the action block — unless the user has already confirmed.

VOICE / TRANSCRIPTION:
Do not auto-correct trade terms — Biolime, FasWall, Bauwerks, limewash,
tilt panel, scissor lift, hawk and trowel, scratch coat, brown coat are correct.

TONE:
Professional peer. Shawn is the expert; you are his efficient assistant.
Concise confirmations, clear questions, no filler.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const authHeader = req.headers.get("Authorization") ?? "";
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: ANON_KEY },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's systems library (RLS scopes by their JWT)
    let systemsLibrary: unknown[] = [];
    try {
      const sysResp = await fetch(`${SUPABASE_URL}/rest/v1/systems?is_active=eq.true&select=*`, {
        headers: { Authorization: authHeader, apikey: ANON_KEY },
      });
      if (sysResp.ok) systemsLibrary = await sysResp.json();
    } catch (e) {
      console.warn("systems fetch failed", e);
    }

    const settings = { overhead_pct: 8, profit_pct: 10, tax_rate: 8.75, estimate_valid_days: 30 };
    const systemPrompt = buildSystemPrompt(systemsLibrary, settings, body.currentPage, body.currentRecord);

    // Auto-bump model when images are attached
    const hasImages = body.hasImages || body.messages.some((m) =>
      Array.isArray(m.content) && m.content.some((c) => c.type === "image_url")
    );
    const model = hasImages ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";

    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...body.messages,
        ],
      }),
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

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
