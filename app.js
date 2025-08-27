// app.js — loads data, computes exact numbers, renders charts
(function () {
  const $ = (id) => document.getElementById(id);
  const setStatus = (msg, isError = false) => {
    const el = $("signinStatus");
    if (el) { el.textContent = msg || ""; el.style.color = isError ? "#ff9aa5" : ""; }
    else console.log("[status]", msg);
  };

  const GRAPHQL_URL = (window.CONFIG && window.CONFIG.GRAPHQL_URL) ||
    "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

  function getToken() {
    const keys = ["JWT","jwt","token","authToken"];
    for (const k of keys) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v && v.split(".").length === 3) return v;
    }
    const m = (document.cookie || "").match(/[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+/);
    return m ? m[0] : "";
  }

  function formatNumber(n){ return new Intl.NumberFormat().format(Math.round(n||0)); }
  const dayKey = (iso) => new Date(iso).toISOString().slice(0,10);
  function extractProjectName(path){
    if (!path || typeof path !== "string") return "Unknown";
    const parts = path.split("/").filter(Boolean);
    let last = parts[parts.length-1] || "Unknown";
    if (/^(ex|exercise)?\\d+$/i.test(last)) last = parts[parts.length-2] || last;
    return last;
  }

  async function httpJson(url, options={}){
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null; try{ data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) {
      const msg = (data && data.error) || text || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return {res, data, text};
  }

  async function gql(query){
    const token = getToken();
    if (!token) throw new Error("Missing JWT. Set it then reload: localStorage.setItem('JWT','PASTE.JWT.HERE');");
    const {data} = await httpJson(GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type":"application/json", "authorization":`Bearer ${token}` },
      body: JSON.stringify({ query })
    });
    if (data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
    return data.data || data;
  }

  const Q_ME = `query{ user{ id login auditRatio } }`;
  const Q_XP = `query{
    transaction(where:{type:{_eq:"xp"}}, order_by:{createdAt:asc}) {
      amount createdAt path
    }
  }`;

  async function loadAll(){
    setStatus("Loading...");
    const xpSvg = $("xpChart"), prjSvg = $("projectsChart");
    if (!xpSvg || !prjSvg){ setStatus("Missing #xpChart and/or #projectsChart.", true); return; }

    const [me, xp] = await Promise.all([gql(Q_ME), gql(Q_XP)]);

    const u = Array.isArray(me.user) ? me.user[0] : me.user;
    if ($("userLogin"))  $("userLogin").textContent  = u?.login ?? "—";
    if ($("userId"))     $("userId").textContent     = u?.id ?? "—";
    if ($("auditRatio")) $("auditRatio").textContent = (u?.auditRatio!=null ? Number(u.auditRatio).toFixed(2) : "—");

    const tx = xp.transaction || [];

    const totalXp = tx.reduce((s,t)=>s+(t.amount||0), 0);
    if ($("totalXp")) $("totalXp").textContent = formatNumber(totalXp);

    const perDay = {};
    for (const t of tx){ const k = dayKey(t.createdAt); perDay[k] = (perDay[k]||0) + (t.amount||0); }
    const points = Object.entries(perDay).sort((a,b)=>a[0]<b[0]?-1:1).map(([k,v],i)=>({x:i,y:v}));
    if (typeof window.drawAreaChart==="function") window.drawAreaChart(xpSvg, points);
    else setStatus("graphs.js not loaded (drawAreaChart missing).", true);

    const bag = {};
    for (const t of tx){ const name = extractProjectName(t.path); bag[name] = (bag[name]||0) + (t.amount||0); }
    const all = Object.entries(bag).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
    const top10 = all.slice(0,10);
    if ($("projectsCount")) $("projectsCount").textContent = String(Object.keys(bag).length || 0);
    if (typeof window.drawBarChart==="function") window.drawBarChart(prjSvg, top10);
    else setStatus("graphs.js not loaded (drawBarChart missing).", true);

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

  async function handleSignin(e){
    e.preventDefault();
    const login = $("login")?.value?.trim();
    const password = $("password")?.value || "";
    try{
      setStatus("Signing in...");
      $("signinBtn").disabled = true;

      // If you have a worker proxy, set it once:
      // localStorage.setItem("WORKER_BASE", "https://your-worker.workers.dev")
      const workerBase = (window.CONFIG && window.CONFIG.WORKER_BASE) || localStorage.getItem("WORKER_BASE") || "";

      if (workerBase){
        const url = workerBase.replace(/\/$/,"") + "/signin";
        const {res, data, text} = await httpJson(url, {
          method:"POST",
          headers:{ "content-type":"application/json" },
          body: JSON.stringify({login, password})
        });
        const hAuth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
        let jwt = "";
        if (hAuth && /bearer\\s+/i.test(hAuth)) jwt = hAuth.split(/\\s+/).pop();
        if (!jwt) jwt = (data && (data.token || data.jwt)) || ((text.match(/[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+/)||[])[0]||"");
        if (!jwt) throw new Error("Could not extract JWT from sign-in response.");
        localStorage.setItem("JWT", jwt);
        setStatus("Signed in.");
      } else {
        // power user: paste raw JWT in password field if no worker is set
        if (password.split(".").length === 3) {
          localStorage.setItem("JWT", password);
          setStatus("JWT saved.");
        } else {
          throw new Error("No WORKER_BASE configured. Either set it or paste a valid JWT as password.");
        }
      }
      await loadAll();
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
    if (window.drawAreaChart && $("xpChart")) window.drawAreaChart($("xpChart"), []);
    if (window.drawBarChart && $("projectsChart")) window.drawBarChart($("projectsChart"), []);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = $("signinForm");
    if (form) form.addEventListener("submit", handleSignin);
    const lb = $("logoutBtn");
    if (lb) lb.addEventListener("click", logout);

    const token = getToken();
    if (token) loadAll().catch(e=>setStatus(e.message,true));
    else setStatus("Missing JWT. Sign in or set it: localStorage.setItem('JWT','PASTE.JWT.HERE'); then reload.", true);
  });
})();
