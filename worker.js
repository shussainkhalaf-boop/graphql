// Cloudflare Worker: Reboot01 proxy (signin + graphql)
// Deploy this in a single Worker (no repo folders needed).
// Set the following environment variable in Cloudflare:
//   UPSTREAM_GRAPHQL = "https://learn.reboot01.com/api/graphql-engine/v1/graphql"
// Also set UPSTREAM_SIGNIN to your school's sign-in endpoint if needed.
// The worker expects the upstream sign-in to return a JWT either in an
// Authorization header or somewhere in the body. It will echo it back.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/signin") return handleSignin(request, env);
    if (url.pathname === "/graphql") return handleGraphQL(request, env);
    return new Response("ok", {status:200});
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Expose-Headers": "authorization"
  };
}

async function handleSignin(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders() });
  }
  const {login, password} = await readJson(request);
  if (!login || !password) {
    return json({error:"missing login/password"}, 400);
  }

  // Example upstream sign-in (adjust to your auth service).
  const upstream = env.UPSTREAM_SIGNIN || "";
  if (!upstream) return json({error:"UPSTREAM_SIGNIN not configured"}, 500);

  const res = await fetch(upstream, {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({login, password})
  });

  const text = await res.text();
  // forward status for visibility
  if (!res.ok) return new Response(text, {status: res.status, headers: corsHeaders()});

  // try to extract JWT
  const hAuth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
  let jwt = "";
  if (hAuth && /bearer\s+/i.test(hAuth)) jwt = hAuth.split(/\s+/).pop();
  if (!jwt) {
    try { const data = JSON.parse(text); jwt = data.token || data.jwt || ""; } catch {}
  }
  if (!jwt) {
    const m = text.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    jwt = m ? m[0] : "";
  }
  if (!jwt || !jwt.includes(".")) {
    return json({error:"signin ok but no JWT found"}, 502);
  }

  return new Response(JSON.stringify({ok:true, token:jwt}), {
    status: 200,
    headers: {"content-type":"application/json", "authorization": `Bearer ${jwt}`, ...corsHeaders()}
  });
}

async function handleGraphQL(request, env){
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders() });
  }
  const upstream = env.UPSTREAM_GRAPHQL || "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
  const hdrs = new Headers(request.headers);
  // sanitize and pass-through only necessary headers
  const out = new Headers({"content-type":"application/json", ...corsHeaders()});
  const auth = hdrs.get("authorization") || hdrs.get("Authorization");
  if (auth) out.set("authorization", auth);

  const res = await fetch(upstream, {
    method: "POST",
    headers: out,
    body: await request.text()
  });
  const text = await res.text();
  return new Response(text, {status: res.status, headers: corsHeaders()});
}

async function readJson(req){
  try { return await req.json(); } catch { return {}; }
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), {status, headers: {"content-type":"application/json", ...corsHeaders()}});
}
