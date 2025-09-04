// app.js — auth + GraphQL + SVG charts (no offsets)
// Module-only XP = All XP − Piscine (keeps piscine-js inside module)

// ---------- Config ----------
const __CFG__ = {
  SIGNIN_URL: (window.__CONFIG__ && window.__CONFIG__.SIGNIN_URL) || "",
  GRAPHQL_URL: (window.__CONFIG__ && window.__CONFIG__.GRAPHQL_URL) || "",
  TOKEN_KEY: "reboot01.jwt",
};

// ---------- Matchers ----------
const RX_PISCINE_JS   = /piscine-js/i;      // counted in module
const RX_PISCINE_ONLY = /piscine(?!-js)/i;  // excluded from module

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);
function setScreen(authed){
  const L = $("screen-login"), A = $("screen-app");
  if(!L || !A) return;
  if(authed){ L.classList.add("hidden"); A.classList.remove("hidden"); }
  else { A.classList.add("hidden"); L.classList.remove("hidden"); }
}
function fmtXP(n){ if(n==null) return "—"; const kb = Math.round(n/1000); return kb.toLocaleString()+" XP"; }
function tail(p){ return (p||"").split("/").filter(Boolean).pop() || "unknown"; }
function parseJwt(t){
  try{
    const p = t.split(".")[1];
    const json = atob(p.replace(/-/g,"+").replace(/_/g,"/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  }catch{ return null; }
}

// ---------- HTTP / GraphQL ----------
async function gql(query, variables={}){
  const token = localStorage.getItem(__CFG__.TOKEN_KEY) || sessionStorage.getItem(__CFG__.TOKEN_KEY) || "";
  const res = await fetch(__CFG__.GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": token ? `Bearer ${token}` : ""
    },
    body: JSON.stringify({ query, variables })
  });
  if(!res.ok){
    const txt = await res.text().catch(()=> "");
    throw new Error(`GraphQL ${res.status}: ${txt.slice(0,200)}`);
  }
  const data = await res.json();
  if(data.errors?.length) throw new Error(data.errors.map(e=>e.message).join("; "));
  return data.data;
}

async function signin(identity, password){
  const basic = btoa(`${identity}:${password}`);
  const res = await fetch(__CFG__.SIGNIN_URL, { method:"POST", headers:{ authorization:`Basic ${basic}` }});
  if(res.status===401) throw new Error("Invalid credentials");
  if(!res.ok) throw new Error(`Signin failed (${res.status})`);
  let token = res.headers.get("authorization") || "";
  if(!token){
    const body = await res.text().catch(()=> "");
    const m = body.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    token = m ? m[0] : "";
  }
  if(!token) throw new Error("Token not found");
  localStorage.setItem(__CFG__.TOKEN_KEY, token);
  return token;
}

// ---------- Queries ----------
const Q_USER = `query { user { id login } }`;

const Q_XP = `
  query XP($uid:Int!){
    transaction(
      where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
      order_by:{ createdAt: asc }
    ){
      amount createdAt path object{ name type }
    }
  }`;

const Q_RESULTS_LATEST = `
  query ResultsLatest($uid:Int!){
    result(
      where:{ userId:{_eq:$uid} }
      order_by:[{objectId: asc},{createdAt: desc}]
      distinct_on: objectId
    ){ objectId grade createdAt path }
  }`;

// ---------- Calculations ----------
function classifyPath(path=""){
  if(RX_PISCINE_JS.test(path))   return "piscine-js";
  if(RX_PISCINE_ONLY.test(path)) return "piscine";
  return "module";
}

function computeXpTotals(rows){
  let all=0, piscine=0, piscineJs=0, module=0;
  for(const r of rows){
    const amt = +r.amount || 0;
    const kind = classifyPath(r.path||"");
    all += amt;
    if(kind==="piscine") piscine += amt;
    else { module += amt; if(kind==="piscine-js") piscineJs += amt; }
  }
  return { all, piscine, piscineJs, module };
}

function accumulateByDate(rows){
  // accumulate daily cumulative for module-only
  const byDay = new Map();
  for(const r of rows){
    const day = (r.createdAt||"").slice(0,10);
    const amt = +r.amount || 0;
    const kind = classifyPath(r.path||"");
    const entry = byDay.get(day) || { all:0, module:0 };
    entry.all += amt;
    entry.module += (kind==="piscine") ? 0 : amt;
    byDay.set(day, entry);
  }
  const days = [...byDay.keys()].sort();
  let ca=0, cm=0;
  return days.map(d=>{
    const v = byDay.get(d);
    ca += v.all; cm += v.module;
    return { date:d, all:ca, module:cm };
  });
}

function groupLastProjects(rows, limit=12){
  return rows.slice(-limit).map(r => ({
    label: r.object?.name || tail(r.path||""),
    value: +r.amount || 0
  }));
}

// ---------- SVG helpers ----------
function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }

function drawLineChart(sel, series){
  const svg = document.querySelector(sel); if(!svg) return;
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  const W = svg.viewBox.baseVal.width || 600, H = svg.viewBox.baseVal.height || 260;
  const P = {l:36,r:14,t:14,b:28};
  if(!series.length){ const t=ns("text"); t.setAttribute("x",8); t.setAttribute("y",18); t.textContent="No data"; svg.appendChild(t); return; }

  const xs = series.map(d=> new Date(d.date+"T00:00:00Z").getTime());
  const ys = series.map(d=> d.module);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMax = Math.max(1, ...ys);
  const xScale = x => P.l + ((x-xMin)/Math.max(1,(xMax-xMin))) * (W-P.l-P.r);
  const yScale = y => H - P.b - (y/yMax) * (H-P.t-P.b);

  const ax = ns("path");
  ax.setAttribute("d", `M${P.l},${H-P.b} H${W-P.r} M${P.l},${P.t} V${H-P.b}`);
  ax.setAttribute("class","axis"); ax.setAttribute("stroke","#253061"); svg.appendChild(ax);

  let d = "";
  series.forEach((p,i)=>{
    const x = xScale(new Date(p.date+"T00:00:00Z").getTime());
    const y = yScale(p.module);
    d += (i ? " L" : "M") + x + " " + y;
  });
  const path = ns("path"); path.setAttribute("class","line"); path.setAttribute("d", d); svg.appendChild(path);

  series.forEach(p=>{
    const cx = xScale(new Date(p.date+"T00:00:00Z").getTime());
    const cy = yScale(p.module);
    const c = ns("circle"); c.setAttribute("class","dot"); c.setAttribute("r","2.8"); c.setAttribute("cx",cx); c.setAttribute("cy",cy); svg.appendChild(c);
  });

  const t1 = ns("text"); t1.textContent = (new Date(xMin)).toISOString().slice(0,10); t1.setAttribute("x",P.l); t1.setAttribute("y",H-6); svg.appendChild(t1);
  const t2 = ns("text"); t2.textContent = (new Date(xMax)).toISOString().slice(0,10); t2.setAttribute("x",W-P.r-60); t2.setAttribute("y",H-6); svg.appendChild(t2);
  const t3 = ns("text"); t3.textContent = fmtXP(yMax); t3.setAttribute("x",6); t3.setAttribute("y",P.t+12); svg.appendChild(t3);
}

function drawDonut(sel, pass, fail){
  const svg = document.querySelector(sel); if(!svg) return;
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  const W = svg.viewBox.baseVal.width || 220, H = svg.viewBox.baseVal.height || 140;
  const cx=W/2, cy=H/2, R=Math.min(W,H)/2-8;
  const total = Math.max(1, pass+fail);

  function arc(start, val, cls){
    const a0 = (start/total)*Math.PI*2 - Math.PI/2;
    const a1 = ((start+val)/total)*Math.PI*2 - Math.PI/2;
    const x0 = cx + R*Math.cos(a0), y0 = cy + R*Math.sin(a0);
    const x1 = cx + R*Math.cos(a1), y1 = cy + R*Math.sin(a1);
    const large = val/total > 0.5 ? 1 : 0;
    const p = ns("path");
    p.setAttribute("d", `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${cx} ${cy} Z`);
    p.setAttribute("class", cls);
    svg.appendChild(p);
    return start+val;
  }

  let s=0; s=arc(s, pass, "slice-pass"); s=arc(s, fail, "slice-fail");
  const lbl = ns("text"); lbl.textContent = `${Math.round((pass/total)*100)}% pass`; lbl.setAttribute("x",cx); lbl.setAttribute("y",cy+4); lbl.setAttribute("text-anchor","middle"); svg.appendChild(lbl);
}

function drawBars(sel, data){
  const svg = document.querySelector(sel); if(!svg) return;
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  const W = svg.viewBox.baseVal.width || 600, H = svg.viewBox.baseVal.height || 260;
  const P = {l:24,r:14,t:14,b:36};
  if(!data.length){ const t=ns("text"); t.setAttribute("x",8); t.setAttribute("y",18); t.textContent="No data"; svg.appendChild(t); return; }
  const sorted = [...data].sort((a,b)=>(+b.value||0)-(+a.value||0));
  const max = Math.max(1, ...sorted.map(d=>+d.value||0));
  const band = (W-P.l-P.r)/sorted.length;

  sorted.forEach((d,i)=>{
    const v=+d.value||0, h=(v/max)*(H-P.t-P.b), x=P.l+i*band, y=H-P.b-h;
    const r=ns("rect"); r.setAttribute("x",x+8); r.setAttribute("y",y);
    r.setAttribute("width",Math.max(8,band-16)); r.setAttribute("height",h);
    r.setAttribute("fill","#a78bfa"); r.setAttribute("rx","6"); svg.appendChild(r);
    const tx=ns("text"); tx.setAttribute("x",x+band/2); tx.setAttribute("y",H-12);
    tx.setAttribute("text-anchor","middle"); tx.textContent=d.label; svg.appendChild(tx);
  });
}

// ---------- Loaders ----------
async function loadBasics(){ const d = await gql(Q_USER); return (d.user && d.user[0]) || null; }

async function loadAll(){
  const basics = await loadBasics();
  if(!basics) throw new Error("No user");
  const uid = basics.id;

  const [xpResp, resResp] = await Promise.all([
    gql(Q_XP, { uid }),
    gql(Q_RESULTS_LATEST, { uid }),
  ]);
  const xpRows = xpResp.transaction || [];

  // totals
  const totals = computeXpTotals(xpRows);
  $("user-login").textContent = basics.login;
  $("user-id").textContent = basics.id;
  $("xp-all").textContent = fmtXP(totals.all);
  $("xp-module").textContent = fmtXP(totals.module);

  // charts
  drawLineChart("#svg-xp", accumulateByDate(xpRows));
  const pass = (resResp.result||[]).filter(r=> +r.grade===1).length;
  const fail = (resResp.result||[]).filter(r=> +r.grade!==1).length;
  drawDonut("#svg-ratio", pass, fail);
  drawBars("#svg-projects", groupLastProjects(xpRows, 12));

  // recent projects list
  const list = $("projects"); if(list){
    list.innerHTML = "";
    xpRows.slice(-12).reverse().forEach(r=>{
      const div = document.createElement("div"); div.className="item";
      const t = document.createElement("div"); t.className="title"; t.textContent = r.object?.name || tail(r.path||"");
      const m = document.createElement("div"); m.className="meta";  m.textContent = `${(r.createdAt||"").slice(0,10)} · ${fmtXP(r.amount)}`;
      div.appendChild(t); div.appendChild(m); list.appendChild(div);
    });
  }
}

// ---------- Events ----------
const loginForm = $("form-login");
if(loginForm){
  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const id = $("login-identity").value.trim();
    const pw = $("login-password").value;
    $("login-error").textContent = "";
    try{
      await signin(id, pw);
      setScreen(true);
      await loadAll();
    }catch(err){
      $("login-error").textContent = err?.message || String(err);
    }
  });
}

const btnLogout = $("btn-logout");
if(btnLogout){
  btnLogout.addEventListener("click", ()=>{
    localStorage.removeItem(__CFG__.TOKEN_KEY);
    sessionStorage.removeItem(__CFG__.TOKEN_KEY);
    setScreen(false);
    ["#svg-xp","#svg-ratio","#svg-projects"].forEach(sel=>{
      const s=document.querySelector(sel); if(s) s.innerHTML="";
    });
    const list=$("projects"); if(list) list.innerHTML="";
  });
}

// ---------- Boot ----------
(function init(){
  const jwt = localStorage.getItem(__CFG__.TOKEN_KEY) || sessionStorage.getItem(__CFG__.TOKEN_KEY);
  const payload = jwt && parseJwt(jwt);
  if(payload){
    setScreen(true);
    loadAll().catch(e=>{ $("login-error").textContent = e?.message || String(e); });
  }else{
    setScreen(false);
  }
})();
