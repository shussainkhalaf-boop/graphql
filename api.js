// api.js — auth + graphql helpers (vanilla) with CORS-friendly fallbacks

const CFG = (window.__CONFIG__ || {});
const TOKEN_KEY = CFG.TOKEN_KEY || "reboot01.jwt";

export function saveToken(jwt){ try{ localStorage.setItem(TOKEN_KEY, jwt); }catch{} }
export function getToken(){ try{ return localStorage.getItem(TOKEN_KEY)||"";}catch{return "";} }
export function clearToken(){ try{ localStorage.removeItem(TOKEN_KEY);}catch{} }

function b64uEncode(str){
  // UTF-8 safe base64
  return btoa(unescape(encodeURIComponent(str)));
}

// Optional proxy passthrough: set __CONFIG__.PROXY = "https://<your-worker>/?t="
function withProxy(url){
  const P = CFG.PROXY || "";
  return P ? P + encodeURIComponent(url) : url;
}

function extractJwtFromText(t=""){
  const m = t.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return m ? m[0] : "";
}

export async function signinBasic(identifier, password){
  const url = withProxy(CFG.SIGNIN_URL);
  const res = await fetch(url, {
    method: "POST",
    headers: { "authorization": "Basic " + b64uEncode(`${identifier}:${password}`) }
  });

  // 1) header (ideal)
  const auth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
  let jwt = (auth || "").replace(/^Bearer\s+/i, "").trim();

  // 2) fallback: parse body if header isn't exposed by CORS
  if(!jwt){
    const txt = await res.text().catch(()=> "");
    jwt = extractJwtFromText(txt);
  }

  if(!res.ok || !jwt){
    const msg = `Sign-in failed (${res.status})` + (!auth && res.ok ? " — JWT header not exposed; set __CONFIG__.PROXY" : "");
    throw new Error(msg);
  }
  return jwt;
}

export async function gql(query, variables={}){
  const token = getToken();
  if(!token) throw new Error("Missing JWT. Please sign in.");

  const url = withProxy(CFG.GRAPHQL_URL);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json().catch(()=> ({}));
  if(!res.ok || json.errors){
    const msg = json.errors?.[0]?.message || `GraphQL error (${res.status})`;
    throw new Error(msg);
  }
  return json.data;
}

export function decodeJWT(jwt){
  try{
    const [,payload] = jwt.split(".");
    const json = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g,"+").replace(/_/g,"/")))));
    return json || {};
  }catch{ return {}; }
}
