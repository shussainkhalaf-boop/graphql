// graphql.js — robust GraphQL client (JWT + cookie + worker), no design changes

(function (global) {
  // ---- Config
  global.CONFIG = global.CONFIG || {};
  const GRAPHQL_URL = global.CONFIG.GRAPHQL_URL || "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
  const WORKER_BASE  = global.CONFIG.WORKER_BASE  || localStorage.getItem("WORKER_BASE") || "";

  // ---- JWT helpers
  const b64u = s => s.replace(/-/g, "+").replace(/_/g, "/");
  function isJwt(tok){ if(!tok || typeof tok!=="string") return false; const p=tok.split("."); if(p.length!==3) return false; try{atob(b64u(p[0]));atob(b64u(p[1]));return true;}catch{return false;} }
  function extractJwt(str){ const m=String(str||"").match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/); return m?m[0]:""; }
  function getToken(){
    const srcs = [
      localStorage.getItem("JWT"), localStorage.getItem("jwt"), localStorage.getItem("token"), localStorage.getItem("authToken"),
      sessionStorage.getItem("JWT"), sessionStorage.getItem("jwt"), sessionStorage.getItem("token"), sessionStorage.getItem("authToken"),
      document.cookie || ""
    ].filter(Boolean);
    for (const s of srcs) { const j = extractJwt(s); if (isJwt(j)) return j; }
    return "";
  }
  function saveTokenFrom(raw){
    const j = extractJwt(raw);
    if (!isJwt(j)) throw new Error("Invalid JWT");
    localStorage.setItem("JWT", j);
    return j;
  }
  function clearToken(){ ["JWT","jwt","token","authToken"].forEach(k=>{localStorage.removeItem(k);sessionStorage.removeItem(k);}); }

  // ---- HTTP helpers
  async function httpJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
      const err = new Error(msg); err.status = res.status; err.body = text; throw err;
    }
    return { res, data, text };
  }

  // ---- GraphQL with fallbacks: Bearer -> Cookie -> Worker
  async function gql(query, variables = {}) {
    const token = getToken();

    // 1) Bearer JWT
    if (token) {
      try {
        const { data } = await httpJson(GRAPHQL_URL, {
          method: "POST",
          headers: { "content-type": "application/json", "authorization": `Bearer ${token}` },
          body: JSON.stringify({ query, variables })
        });
        if (data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
        return data.data || data;
      } catch (e) {
        // fall through to cookie/worker if auth error
        if (String(e.message).toLowerCase().includes("jwt") || e.status===401) {
          // continue to next strategy
        } else {
          throw e;
        }
      }
    }

    // 2) Cookie session (same-site). Works only if your page is served from the same domain.
    try {
      const { data } = await httpJson(GRAPHQL_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",             // send cookies if available
        body: JSON.stringify({ query, variables })
      });
      if (data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
      return data.data || data;
    } catch (e) {
      // continue to worker if configured
      if (!WORKER_BASE) { if (!token) throw new Error("No valid JWT and no cookie session. Set a JWT or configure WORKER_BASE."); }
    }

    // 3) Worker proxy (if set)
    if (WORKER_BASE) {
      const url = WORKER_BASE.replace(/\/$/,"") + "/graphql";
      const headers = { "content-type": "application/json" };
      if (token) headers.authorization = `Bearer ${token}`;
      const { data } = await httpJson(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables })
      });
      if (data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
      return data.data || data;
    }

    throw new Error("All auth strategies failed (JWT, cookie, worker).");
  }

  // ---- Expose
  global.GraphQL = {
    GRAPHQL_URL, WORKER_BASE,
    getToken, saveTokenFrom, clearToken,
    gql,
    // Queries
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
      }`,
    }
  };
})(window);
