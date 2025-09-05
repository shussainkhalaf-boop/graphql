// api.js — auth + graphql helpers (vanilla)


const CFG = (window.__CONFIG__ || {});
const TOKEN_KEY = CFG.TOKEN_KEY || "reboot01.jwt";


export function saveToken(jwt){ try{ localStorage.setItem(TOKEN_KEY, jwt); }catch{} }
export function getToken(){ try{ return localStorage.getItem(TOKEN_KEY)||"";}catch{return "";} }
export function clearToken(){ try{ localStorage.removeItem(TOKEN_KEY);}catch{} }


function b64uEncode(str){
// UTF-8 safe base64
return btoa(unescape(encodeURIComponent(str)));
}


export async function signinBasic(identifier, password){
const url = CFG.SIGNIN_URL;
const res = await fetch(url, {
method: "POST",
headers: {
"authorization": "Basic " + b64uEncode(`${identifier}:${password}`),
}
});


// Most 01-* backends return the JWT in the Authorization header
// e.g. Authorization: Bearer <jwt>
const auth = res.headers.get("authorization") || res.headers.get("Authorization");
if(!res.ok || !auth){
const txt = await res.text().catch(()=>"");
const msg = txt && txt.trim() ? txt.trim() : `Sign-in failed (${res.status})`;
throw new Error(msg);
}
const jwt = (auth || "").replace(/^Bearer\s+/i, "").trim();
return jwt;
}


export async function gql(query, variables={}){
const token = getToken();
if(!token) throw new Error("Missing JWT. Please sign in.");
const res = await fetch(CFG.GRAPHQL_URL, {
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
