// graphql.js — token handling + GraphQL client (no design changes, browser-ready)

// ---- Config
window.CONFIG = window.CONFIG || {};
const GRAPHQL_URL =
  window.CONFIG.GRAPHQL_URL ||
  "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
const WORKER_BASE =
  window.CONFIG.WORKER_BASE || localStorage.getItem("WORKER_BASE") || "";

// ---- JWT helpers (auto-extract + validate)
function _b64uToB64(s) { return s.replace(/-/g, "+").replace(/_/g, "/"); }
function isWellFormedJwt(tok) {
  if (!tok || typeof tok !== "string") return false;
  const parts = tok.split(".");
  if (parts.length !== 3) return false;
  try {
    atob(_b64uToB64(parts[0]));
    atob(_b64uToB64(parts[1]));
    return true;
  } catch { return false; }
}
function extractJwt(text) {
  if (!text) return "";
  const m = String(text).match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return m ? m[0] : "";
}
function getToken() {
  const sources = [
    localStorage.getItem("JWT"),
    localStorage.getItem("jwt"),
    localStorage.getItem("token"),
    localStorage.getItem("authToken"),
    sessionStorage.getItem("JWT"),
    sessionStorage.getItem("jwt"),
    sessionStorage.getItem("token"),
    sessionStorage.getItem("authToken"),
    document.cookie || ""
  ].filter(Boolean);
  for (const src of sources) {
    const cand = extractJwt(src);
    if (isWellFormedJwt(cand)) return cand;
  }
  return "";
}
function saveTokenFrom(raw) {
  const jwt = extractJwt(raw);
  if (!isWellFormedJwt(jwt)) throw new Error("Invalid JWT (not base64url)");
  localStorage.setItem("JWT", jwt);
  return jwt;
}
function clearToken() {
  ["JWT", "jwt", "token", "authToken"].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

// ---- HTTP / GraphQL
async function httpJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) {
    const msg = (data && data.error) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return { res, data, text };
}

async function gql(query, variables = {}) {
  const token = getToken();
  if (!token) throw new Error("Missing or invalid JWT.");
  const { data } = await httpJson(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });
  if (data.errors) throw new Error(data.errors.map(e => e.message).join("; "));
  return data.data || data;
}

// ---- Optional worker-based sign-in (if you need username/password flow)
async function workerSignin(login, password) {
  if (!WORKER_BASE) throw new Error("WORKER_BASE not set.");
  const url = WORKER_BASE.replace(/\/$/, "") + "/signin";
  const { res, data, text } = await httpJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login, password })
  });
  const hAuth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
  let raw = hAuth && /bearer\s+/i.test(hAuth) ? hAuth.split(/\s+/).pop()
           : (data && (data.token || data.jwt)) || text || "";
  const jwt = saveTokenFrom(raw);
  return jwt;
}

// ---- Export to window
window.GraphQL = {
  GRAPHQL_URL,
  WORKER_BASE,
  getToken,
  saveTokenFrom,
  clearToken,
  httpJson,
  gql,
  workerSignin,
  // Queries (keep here so app.js stays clean)
  Q: {
    USER: `query{ user{ id login auditRatio } }`,
    TX_PRIMARY: `query{
      transaction(where:{type:{_eq:"xp"}}, order_by:{createdAt:asc}){
        amount createdAt path type
      }
    }`,
    TX_ALT: `query{
      transactions(where:{type:{_eq:"xp"}}, order_by:{createdAt:asc}){
        amount createdAt path type
      }
    }`,
    TX_NOFILTER_PRIMARY: `query{
      transaction(order_by:{createdAt:asc}){ amount createdAt path type }
    }`,
    TX_NOFILTER_ALT: `query{
      transactions(order_by:{createdAt:asc}){ amount createdAt path type }
    }`
  }
};
