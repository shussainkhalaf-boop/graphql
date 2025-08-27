// app.js — JWT auto-fix + robust charts (no UI changes)
(function () {
  const $ = (id) => document.getElementById(id);
  const setStatus = (msg, isError=false) => {
    const el = $("signinStatus");
    if (el) { el.textContent = msg || ""; el.style.color = isError ? "#ff9aa5" : ""; }
    else console.log("[status]", msg);
  };

  // ---- Config
  const GRAPHQL_URL = (window.CONFIG && window.CONFIG.GRAPHQL_URL)
    || "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
  const WORKER_BASE = (window.CONFIG && window.CONFIG.WORKER_BASE)
    || localStorage.getItem("WORKER_BASE") || "";

  // ---- Token helpers (auto-extract + validate)
  function isWellFormedJwt(tok){
    if (!tok || typeof tok !== "string") return false;
    const parts = tok.split(".");
    if (parts.length !== 3) return false;
    try {
      const b64u = s => s.replace(/-/g, "+").replace(/_/g, "/");
      // header + payload must be base64url-decodable
      atob(b64u(parts[0])); atob(b64u(parts[1]));
      return true;
    } catch { return false; }
  }
  function extractJwtFrom(text){
    if (!text) return "";
    const m = String(text).match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    return m ? m[0] : "";
  }
  function getToken(){
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
    for (const src of sources){
      const candidate = extractJwtFrom(src);
      if (isWellFormedJwt(candidate)) return candidate;
    }
    return "";
  }
  function saveTokenFrom(text){
    const jwt = extractJwtFrom(text);
    if (!isWellFormedJwt(jwt)) throw new Error("Invalid JWT: not base64url.");
    localStorage.setItem("JWT", jwt);
    return jwt;
  }

  // ---- Utils
  function formatNumber(n){ return new Intl.NumberFormat().format(Math.round(n||0)); }
  const dayKey = (iso) => new Date(iso).toISOString().slice(0,10);
  function extractProjectName(path){
    if (!path || typeof path !== "string") return "Unknown";
    const parts = path.split("/").filter(Boolean);
    let last = parts[parts.length-1] || "Unknown";
    if (/^(ex|exercise)?\d+$/i.test(last)) last = parts[parts.length-2] || last;
    return last;
  }
  async function httpJson(url, options={}){
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok){
      const msg = (data && data.error) || text || `HTTP ${res.status}`;
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return {res, data, text};
  }
  async function gql(query, variables={}){
    const token = getToken();
    if (!token) throw new Error("Missing or invalid JWT. Save a valid token, then reload.");
    const {data} = await httpJson(GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type":"application/json", "authorization":`Bearer ${token}` },
      body: JSON.stringify({ query, variables })
    });
    if (data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
    return data.data || data;
  }

  // ---- Queries
  const Q_ME = `query{ user{ id login auditRatio } }`;
  const Q_XP = `query{
    transaction(where:{type:{_eq:"xp"}}, order_by:{createdAt:asc}){
      amount createdAt path
    }
  }`;

  // ---- Render
  async function loadAll(){
    setStatus("Loading...");
    const xpSvg = $("xpChart"), prjSvg = $("projectsChart");
    if (!xpSvg || !prjSvg){ setStatus("Missing #xpChart and/or #projectsChart in HTML.", true); return; }

    const [me, xp] = await Promise.all([gql(Q_ME), gql(Q_XP)]);

    const u = Array.isArray(me.user) ? me.user[0] : me.user;
    if ($("userLogin"))  $("userLogin").textContent  = u?.login ?? "—";
    if ($("userId"))     $("userId").textContent     = u?.id ?? "—";
    if ($("auditRatio")) $("auditRatio").textContent = (u?.auditRatio!=null ? Number(u.auditRatio).toFixed(2) : "—");

    const tx = xp.transaction || [];

    // total XP
    const totalXp = tx.reduce((s,t)=>s+(t.amount||0), 0);
    if ($("totalXp")) $("totalXp").textContent = formatNumber(totalXp);

    // XP by day
    const perDay = {};
    for (const t of tx){
      const k = dayKey(t.createdAt);
      perDay[k] = (perDay[k]||0) + (t.amount||0);
    }
    const points = Object.entries(perDay)
      .sort((a,b)=>a[0]<b[0]?-1:1)
      .map(([k,v],i)=>({x:i,y:v}));
    if (typeof window.drawAreaChart === "function") window.drawAreaChart(xpSvg, points);

    // Projects
    const bag = {};
    for (const t of tx){
      const name = extractProjectName(t.path);
      bag[name] = (bag[name]||0) + (t.amount||0);
    }
    const all = Object.entries(bag)
      .map(([label,value])=>({label,value}))
      .sort((a,b)=>b.value-a.value);
    if ($("projectsCount")) $("projectsCount").textContent = String(Object.keys(bag).length || 0);
    const top10 = all.slice(0,10);
    if (typeof window.drawBarChart === "function") window.drawBarChart(prjSvg, top10);

    const listEl = $("projectsList");
    if (listEl){
      listEl.innerHTML = "";
      top10.forEach(it=>{
        const div=document.createElement("div");
        div.className="item";
        div.innerHTML=`<div class="left"><span class="tag">${it.label}</span></div><div>${formatNumber(it.value)} XP</div>`;
        listEl.appendChild(div);
      });
    }

    setStatus("Done.");
  }

  // ---- Sign-in (no direct /api/auth/signin calls)
  async function handleSignin(e){
    e.preventDefault();
    const login = $("login")?.value?.trim();
    const password = $("password")?.value || "";
    try{
      setStatus("Signing in...");
      $("signinBtn").disabled = true;

      if (WORKER_BASE){
        const url = WORKER_BASE.replace(/\/$/,"") + "/signin";
        const {res, data, text} = await httpJson(url, {
          method:"POST",
          headers:{ "content-type":"application/json" },
          body: JSON.stringify({login, password})
        });
        const hAuth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
        let raw = hAuth && /bearer\s+/i.test(hAuth) ? hAuth.split(/\s+/).pop() : (data && (data.token||data.jwt)) || text || "";
        saveTokenFrom(raw);
        setStatus("Signed in.");
        await loadAll();
      } else {
        // no worker: treat password as raw string; extract JWT automatically
        saveTokenFrom(password);
        setStatus("JWT saved.");
        await loadAll();
      }
    }catch(err){
      console.error(err);
      setStatus("Sign-in failed: " + err.message, true);
    }finally{
      $("signinBtn").disabled = false;
    }
  }

  function logout(){
    ["JWT","jwt","token","authToken"].forEach(k=>{localStorage.removeItem(k); sessionStorage.removeItem(k);});
    setStatus("Logged out.");
    ["userLogin","userId","totalXp","auditRatio","projectsCount"].forEach(id=>{ if ($(id)) $(id).textContent="—"; });
    if ($("projectsList")) $("projectsList").innerHTML="";
    const xc=$("xpChart"), pc=$("projectsChart");
    if (xc) while(xc.firstChild) xc.removeChild(xc.firstChild);
    if (pc) while(pc.firstChild) pc.removeChild(pc.firstChild);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = $("signinForm");
    if (form) form.addEventListener("submit", handleSignin);
    const lb = $("logoutBtn");
    if (lb) lb.addEventListener("click", logout);

    const token = getToken();
    if (token) {
      loadAll().catch(e=>setStatus(e.message,true));
    } else {
      setStatus(WORKER_BASE
        ? "Missing/invalid JWT. Use the sign-in form."
        : "Missing/invalid JWT. Paste your JWT in the password field and submit.", true);
    }
  });
})();
