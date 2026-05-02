// Web search + scrape proxy via Firecrawl. Called by ai-chat tool loop.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FC = "https://api.firecrawl.dev/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    // Auth check via Supabase
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

    const body = await req.json();
    const op = body.op as "search" | "scrape";

    if (op === "search") {
      const query = String(body.query ?? "").slice(0, 500);
      if (!query) throw new Error("query required");
      const r = await fetch(`${FC}/search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: Math.min(Number(body.limit ?? 10), 15) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(`Firecrawl search ${r.status}: ${JSON.stringify(data)}`);
      const results = (data?.data?.web ?? data?.data ?? []).slice(0, 12).map((x: any) => ({
        url: x.url, title: x.title, description: x.description ?? x.snippet ?? "",
      }));
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (op === "scrape") {
      const url = String(body.url ?? "");
      if (!/^https?:\/\//.test(url)) throw new Error("valid url required");
      const r = await fetch(`${FC}/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true }),
      });
      const data = await r.json();
      if (!r.ok) {
        const status = r.status;
        if (status === 401 || status === 403) {
          return new Response(JSON.stringify({ url, paywalled: true, status, note: "Login or paid access required (e.g. dealer portal, course platform)." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Firecrawl scrape ${status}: ${JSON.stringify(data)}`);
      }
      const md: string = data?.data?.markdown ?? data?.markdown ?? "";
      const meta = data?.data?.metadata ?? data?.metadata ?? {};
      const links: string[] = (data?.data?.links ?? data?.links ?? []).slice(0, 60);
      const trimmed = md.length > 12000 ? md.slice(0, 12000) + "\n\n[...truncated...]" : md;
      // Detect paywall heuristics in body even when status is 200 (e.g. course portals returning marketing page)
      const paywalled = /sign\s*in|log\s*in|members?\s*only|enroll now|course access|password|subscribe to access/i.test(md.slice(0, 2000)) && md.length < 1500;
      return new Response(JSON.stringify({ url, title: meta?.title, markdown: trimmed, links, paywalled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("unknown op (use 'search' or 'scrape')");
  } catch (e) {
    console.error("web-tools error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
