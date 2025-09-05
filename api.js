// api.js — auth + graphql helpers (vanilla) with CORS-friendly fallbacks


function b64uEncode(str){
// UTF-8 safe base64
return btoa(unescape(encodeURIComponent(str)));
}


function withProxy(url){
// Optional proxy passthrough: set __CONFIG__.PROXY like "https://<worker>/?t="
const P = CFG.PROXY || "";
return P ? P + encodeURIComponent(url) : url;
}


function extractJwtFromText(t=""){ const m = t.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/); return m? m[0] : ""; }


export async function signinBasic(identifier, password){
const url = withProxy(CFG.SIGNIN_URL);
const res = await fetch(url, {
method: "POST",
headers: {
"authorization": "Basic " + b64uEncode(`${identifier}:${password}`),
}
});


// Try to read JWT from exposed header first
const auth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
let jwt = (auth || "").replace(/^Bearer\s+/i, "").trim();


// If header isn't exposed due to CORS, try to parse body as fallback
if(!jwt){
const txt = await res.text().catch(()=>"");
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
const json = await res.json().catch(()=>({}));
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
