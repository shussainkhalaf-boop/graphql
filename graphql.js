// graphql.js — token handling + GraphQL requests (no UI changes)

(function (global) {
  // ---- Config
  const GRAPHQL_URL = (global.CONFIG && global.CONFIG.GRAPHQL_URL)
    || "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
  const WORKER_BASE = (global.CONFIG && global.CONFIG.WORKER_BASE)
    || localStorage.getItem("WORKER_BASE") || "";

  // ---- JWT utilities
  const b64u2b64 = (s) => s.replace(/-/g, "+").replace(/_/g, "/");
  function isWellFormedJwt(tok) {
    if (!tok || typeof tok !== "string") return false;
    const parts = tok.split(".");
    if (parts.length !== 3) return false;
    try { atob(b64u2b64(parts[0])); atob(b64u2b64(parts[1])); return true; } catch { return false; }
  }
  function extractJwt(str) {
    const m = String(str || "").match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
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
    for (const s of sources) {
      const j = extractJwt(s);
      if (isWellFormedJwt(j)) return j;
    }
    return "";
  }
  function saveTokenFrom(raw) {
    const j = extractJwt(raw);
    if (!isWellFormedJwt(j)) throw new Error("Invalid JWT");
    localStorage.setItem("JWT", j);
    return j;
  }

  // ---- HTTP / GraphQL
  async function httpJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) {
      const msg = (data && data.error) || text || `HTTP ${res.status}`;
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return { res, data, text };
  }

  async function gql(query, variables = {}) {
    const token = getToken();
    if (!token) throw new Error("Missing/invalid JWT");
    const { data } = await httpJson(GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${token}` },
      body: JSON.stringify({ query, variables })
    });
    if (data.errors) throw new Error(data.errors.map(e => e.message).join("; "));
    return data.data || data;
  }

  // ---- Queries (with schema fallbacks)
  const Q_USER = `query{ user{ id login auditRatio } }`;

  const Q_TX_PRIMARY = `query{
    transaction(where:{type:{_eq:"xp"}}, order_by:{createdAt:asc}){
      amount createdAt path type
    }
  }`;
  const Q_TX_ALT = `query{
    transactions(where:{type:{_eq:"xp"}}, order_by:{createdAt:asc}){
      amount createdAt path type
    }
  }`;
  const Q_TX_NOFILTER_PRIMARY = `query{
    transaction(order_by:{createdAt:asc}){ amount createdAt path type }
  }`;
  const Q_TX_NOFILTER_ALT = `query{
    transactions(order_by:{createdAt:asc}){ amount createdAt path type }
  }`;

  async function fetchUser() {
    const d = await gql(Q_USER);
    return Array.isArray(d.user) ? d.user[0] : d.user;
  }

  async function fetchXP() {
    // primary
    try { const d = await gql(Q_TX_PRIMARY); if (d.transaction) return d.transaction; } catch {}
    // alt
    try { const d = await gql(Q_TX_ALT); if (d.transactions) return d.transactions; } catch {}
    // no filter then client-filter
    try { const d = await gql(Q_TX_NOFILTER_PRIMARY); if (d.transaction) return d.transaction.filter(t => !t.type || t.type === "xp"); } catch {}
    try { const d = await gql(Q_TX_NOFILTER_ALT); if (d.transactions) return d.transactions.filter(t => !t.type || t.type === "xp"); } catch {}
    throw new Error("XP query failed");
  }

  // ---- Optional: sign-in via worker (if you have one)
  async function workerSignin(login, password) {
    if (!WORKER_BASE) throw new Error("WORKER_BASE not set");
    const url = WORKER_BASE.replace(/\/$/, "") + "/signin";
    const { res, data, text } = await httpJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login, password })
    });
    const hAuth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
    let raw = hAuth && /bearer\s+/i.test(hAuth) ? hAuth.split(/\s+/).pop() : (data && (data.token || data.jwt)) || text || "";
    return saveTokenFrom(raw);
  }

  // ---- Expose
  global.api = {
    GRAPHQL_URL,
    WORKER_BASE,
    getToken,
    saveTokenFrom,
    isWellFormedJwt,
    extractJwt,
    gql,
    fetchUser,
    fetchXP,
    workerSignin,
  };
})(window);
