// app.js — fixed: no direct call to /api/auth/signin (prevents 401)
(function(){
  const $ = (id) => document.getElementById(id);
  const setStatus = (msg, isError=false) => {
    const el = $("signinStatus");
    if (el) { el.textContent = msg || ""; el.style.color = isError ? "#ff9aa5" : ""; }
    else console.log("[status]", msg);
  };

  // --- Config
  const GRAPHQL_URL = (window.CONFIG && window.CONFIG.GRAPHQL_URL)
    || "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
  const WORKER_BASE = (window.CONFIG && window.CONFIG.WORKER_BASE)
    || localStorage.getItem("WORKER_BASE") || ""; // optional

  // --- Token helpers
  function getToken(){
    const keys = ["JWT","jwt","token","authToken"];
    for (const k of keys){
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v && v.split(".").length === 3) return v;
    }
    const m = (document.cookie || "").match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    return m ? m[0] : "";
  }
  function saveToken(jwt){
    localStorage.setItem("JWT", jwt);
  }

  // --- Utils
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
    let data = null; try{ data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok){
      const msg = (data && data.error) || text || `HTTP ${res.status}`;
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return {res, data, text};
  }

  async function gql(query, variables={}){
    const token = getToken();
    if (!token) throw new Error("Missing JWT. Set it then reload: localStorage.setItem('JWT','PASTE.JWT.HERE');");
    const {data} = await httpJson(GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type":"application/json", "authorization":`Bearer ${token}` },
      body: JSON.stringify({ query, variables })
    });
    if (data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
    return data.data || data;
  }

  // --- Queries
  const Q_ME = `query{ user{ id login auditRatio } }`;
  const Q_XP = `query{
    transaction(where:{type:{_eq:"xp"}}, order_by:{createdAt:asc}){
      amount createdAt path
    }
  }`;

  // --- Render
  async function loadAll(){
    setStatus("Loading...");

    const xpSvg = $("xpChart"), prjSvg = $("projectsChart");
    if (!xpSvg || !prjSvg){
      setStatus("Missing #xpChart and/or #projectsChart in HTML.", true);
      return;
    }

    const [me, xp] = await Promise.all([gql(Q_ME), gql(Q_XP)]);

    const u = Array.isArray(me.user) ? me.user[0] : me.user;
    if ($("userLogin"))  $("userLogin").textContent  = u?.login ?? "—";
    if ($("userId"))     $("userId").textContent     = u?.id ?? "—";
    if ($("auditRatio")) $("auditRatio").textContent = (u?.auditRatio!=null ? Number(u.auditRatio).toFixed(2) : "—";

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

    if (typeof window.drawAreaChart === "function") {
      window.drawAreaChart(xpSvg, points);
    } else {
      // Minimal inline fallback (no design change)
      drawAreaFallback(xpSvg, points);
    }

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

    if (typeof window.drawBarChart === "function") {
      window.drawBarChart(prjSvg, top10);
    } else {
      drawBarsFallback(prjSvg, top10);
    }

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

  // --- Sign-in (NO direct platform /api/auth/signin calls)
  async function handleSignin(e){
    e.preventDefault();
    const login = $("login")?.value?.trim();
    const password = $("password")?.value || "";

    try{
      setStatus("Signing in...");
      $("signinBtn").disabled = true;

      if (WORKER_BASE){
        // Use your own proxy worker for signin
        const url = WORKER_BASE.replace(/\/$/,"") + "/signin";
        const {res, data, text} = await httpJson(url, {
          method:"POST",
          headers:{ "content-type":"application/json" },
          body: JSON.stringify({login, password})
        });
        const hAuth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
        let jwt = "";
        if (hAuth && /bearer\s+/i.test(hAuth)) jwt = hAuth.split(/\s+/).pop();
        if (!jwt) jwt = (data && (data.token || data.jwt)) || ((text.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)||[])[0]||"");
        if (!jwt) throw new Error("Worker signin ok but no JWT found.");
        saveToken(jwt);
        setStatus("Signed in.");
        await loadAll();
      } else {
        // No worker: treat password as raw JWT to avoid 401 from platform signin
        if (password.split(".").length === 3){
          saveToken(password);
          setStatus("JWT saved.");
          await loadAll();
        } else {
          throw new Error("No WORKER_BASE. Either set WORKER_BASE or paste a valid JWT as password.");
        }
      }
    } catch(err){
      console.error(err);
      setStatus("Sign-in failed: " + err.message, true);
    } finally {
      $("signinBtn").disabled = false;
    }
  }

  function logout(){
    ["JWT","jwt","token","authToken"].forEach(k=>{localStorage.removeItem(k); sessionStorage.removeItem(k);});
    setStatus("Logged out.");
    ["userLogin","userId","totalXp","auditRatio","projectsCount"].forEach(id=>{ if ($(id)) $(id).textContent="—"; });
    if ($("projectsList")) $("projectsList").innerHTML="";
    const xc=$("xpChart"), pc=$("projectsChart");
    if (xc) clearSvg(xc);
    if (pc) clearSvg(pc);
  }

  // --- Minimal inline SVG fallbacks (only used if graphs.js not present)
  function clearSvg(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }
  function mk(tag, attrs={}, parent=null){
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
    if (parent) parent.appendChild(el);
    return el;
  }
  function scale(v,d0,d1,r0,r1){ if (d1===d0) return (r0+r1)/2; return r0+((v-d0)/(d1-d0))*(r1-r0); }
  function axes(svg,pad){ const g=mk("g",{stroke:"#2b3f5b","stroke-width":"1",fill:"none"},svg); mk("line",{x1:pad,y1:200-pad,x2:600-pad,y2:200-pad},g); mk("line",{x1:pad,y1:20,x2:pad,y2:200-pad},g); }
  function drawAreaFallback(svg, points){
    clearSvg(svg); if (!points?.length) return;
    const pad=36, xs=points.map(p=>p.x), ys=points.map(p=>p.y);
    const xMin=Math.min(...xs), xMax=Math.max(...xs), yMin=0, yMax=Math.max(10, Math.max(...ys));
    axes(svg,pad);
    const path=mk("path",{fill:"#173c6a",stroke:"#2c7be5","stroke-width":"1.5","fill-opacity":"0.4"},svg);
    let d=""; points.forEach((p,i)=>{ const px=scale(p.x,xMin,xMax,pad,600-pad); const py=scale(p.y,yMin,yMax,200-pad,20); d+= i?` L ${px} ${py}`:`M ${px} ${py}`; });
    const lastX=scale(points[points.length-1].x,xMin,xMax,pad,600-pad), firstX=scale(points[0].x,xMin,xMax,pad,600-pad), baseY=200-pad;
    d+=` L ${lastX} ${baseY} L ${firstX} ${baseY} Z`; path.setAttribute("d", d);
  }
  function drawBarsFallback(svg, items){
    clearSvg(svg); if (!items?.length) return;
    const pad=36, w=600-pad*2, h=200-pad*2, max=Math.max(10, Math.max(...items.map(i=>i.value)));
    const gap=8, bw=Math.max(8,(w-gap*(items.length-1))/items.length);
    axes(svg,pad);
    const g=mk("g",{},svg);
    items.forEach((it,i)=>{ const x=pad+i*(bw+gap), colH=(it.value/max)*h, y=pad+(h-colH); const r=mk("rect",{x,y,width:bw,height:colH,fill:"#2c7be5",rx:4},g); mk("title",{},r).textContent=`${it.label}: ${it.value}`;});
  }

  // --- Boot
  document.addEventListener("DOMContentLoaded", () => {
    const form = $("signinForm");
    if (form) form.addEventListener("submit", handleSignin);
    const lb = $("logoutBtn");
    if (lb) lb.addEventListener("click", logout);

    const token = getToken();
    if (token){
      loadAll().catch(e=>setStatus(e.message,true));
    } else {
      setStatus(WORKER_BASE
        ? "Missing JWT. Use the sign-in form (worker will return a JWT)."
        : "Missing JWT. Either set WORKER_BASE or paste JWT in password field and submit.", true);
    }
  });
})();
