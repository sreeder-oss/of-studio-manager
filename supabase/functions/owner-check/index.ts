import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Server-side owner gate: 200 only when the signed-in user's email equals OWNER_EMAIL.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: req.headers.get("Authorization") ?? "", apikey: ANON_KEY },
  });
  if (!userResp.ok) return json(401, { error: "Unauthorized" });
  const ownerEmail = (Deno.env.get("OWNER_EMAIL") ?? "").trim().toLowerCase();
  const user = await userResp.json().catch(() => ({}));
  const email = String(user?.email ?? "").trim().toLowerCase();
  if (!ownerEmail || email !== ownerEmail) return json(403, { error: "This app is private." });
  return json(200, { ok: true });
});
