// Authenticated scraper for the New Age Artisans plaster portal (Outseta-gated).
// Uses Firecrawl /scrape with `actions` to log in, then fetch the requested URL.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FC = "https://api.firecrawl.dev/v2";
const LOGIN_URL = "https://new-age-artisans.outseta.com/auth?widgetMode=login#o-anonymous";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const EMAIL = Deno.env.get("NAA_PORTAL_EMAIL");
    const PASSWORD = Deno.env.get("NAA_PORTAL_PASSWORD");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!EMAIL || !PASSWORD) throw new Error("NAA_PORTAL_EMAIL / NAA_PORTAL_PASSWORD not configured");

    // Auth check (same pattern as web-tools)
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

    const body = await req.json().catch(() => ({}));
    const target = String(body.url ?? "https://www.newageartisans.com/plaster-portal");
    if (!/newageartisans\.com|outseta\.com/.test(target)) {
      return new Response(JSON.stringify({ error: "URL must be on newageartisans.com" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Firecrawl supported action types: wait, click, write, press, scroll, scrape, screenshot, executeJavascript, pdf.
    // Strategy: load the LOGIN_URL, fill and submit the Outseta widget, wait, then JS-navigate to the target.
    const actions: any[] = [
      { type: "wait", milliseconds: 3500 },
      { type: "write", selector: "input[type='email']", text: EMAIL },
      { type: "write", selector: "input[type='password']", text: PASSWORD },
      { type: "click", selector: "button[type='submit']" },
      { type: "wait", milliseconds: 5000 },
      { type: "executeJavascript", script: `window.location.href = ${JSON.stringify(target)};` },
      { type: "wait", milliseconds: 4000 },
      { type: "scrape" },
    ];

    const r = await fetch(`${FC}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: LOGIN_URL,
        formats: ["markdown", "links"],
        onlyMainContent: false,
        actions,
        waitFor: 1500,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({
        error: `Firecrawl scrape failed [${r.status}]`,
        details: data,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const md: string = data?.data?.markdown ?? data?.markdown ?? "";
    const meta = data?.data?.metadata ?? data?.metadata ?? {};
    const links: string[] = (data?.data?.links ?? data?.links ?? []).slice(0, 80);
    const finalUrl: string = meta?.sourceURL ?? meta?.url ?? target;

    // Heuristic: if we still see a login form or were redirected back to /auth, login failed.
    const stillOnLogin = /outseta\.com\/auth/i.test(finalUrl) ||
      /\b(sign in|log in|password|incorrect|invalid)\b/i.test(md.slice(0, 1500)) && md.length < 1200;

    const trimmed = md.length > 14000 ? md.slice(0, 14000) + "\n\n[...truncated...]" : md;

    return new Response(JSON.stringify({
      requestedUrl: target,
      finalUrl,
      title: meta?.title,
      loggedIn: !stillOnLogin,
      markdown: trimmed,
      links,
      bytes: md.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("portal-fetch error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
