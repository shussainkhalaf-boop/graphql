// app.js — Total XP = Module XP (passed + max-per-object; exclude piscine except piscine-js)
// Audit ratio = sum(up)/sum(down) with 2 decimals (0.00 if down==0)

// -------------------- Config --------------------
const CFG = {
  SIGNIN_URL: (window.__CONFIG__ && window.__CONFIG__.SIGNIN_URL) ||
              "https://learn.reboot01.com/api/auth/signin",
  GRAPHQL_URL: (window.__CONFIG__ && window.__CONFIG__.GRAPHQL_URL) ||
               "https://learn.reboot01.com/api/graphql-engine/v1/graphql",
  TOKEN_KEY: "jwt",
};

// -------------------- DOM --------------------
const $ = (id) => document.getElementById(id);

const scrLogin = $("screen-login");
const scrApp   = $("screen-app");
const btnLogout= $("btn-logout");

const form     = $("login-form");
const inpId    = $("identity");
const inpPw    = $("password");
const inpRem   = $("remember");
const errEl    = $("login-error");

const heroName = $("hero-name");
const uId      = $("u-id");
const uLogin   = $("u-login");
const uFirst   = $("u-first");
const uLast    = $("u-last");

const xpTotalEl   = $("xp-total");
const auditRatioEl= $("audit-ratio");
const passedEl    = $("passed-count");
const failedEl    = $("failed-count");

const projectsEl  = $("projects");

const svgXP    = $("svg-xp");
const svgRatio = $("svg-ratio");
const svgType  = $("svg-type");

// -------------------- Helpers --------------------
const fmtKB = (bytes) => `${Math.ceil((+bytes || 0) / 1000)} kB`;
const day   = (ts) => new Date(ts).toISOString().slice(0,10);
const lastSeg = (p="") => p.split("/").filter(Boolean).pop() || "project";

function toggle(authed){
  if(authed){ scrLogin.classList.add("hidden"); scrApp.classList.remove("hidden"); }
  else { scrApp.classList.add("hidden"); scrLogin.classList.remove("hidden"); }
}

function storeSet(key, val, remember){
  (remember ? localStorage : sessionStorage).setItem(key, val);
  (remember ? sessionStorage : localStorage).removeItem(key);
}
function storeGet(key){ return localStorage.getItem(key) || sessionStorage.getItem(key); }
function storeDel(key){ localStorage.removeItem(key); sessionStorage.removeItem(key); }

function safeAtob(b64){
  b64 = String(b64 || "").replace(/-/g,"+").replace(/_/g,"/");
  const pad = b64.length % 4; if (pad) b64 += "=".repeat(4 - pad);
  return atob(b64);
}
function decodeJWT(token){
  try{
    const mid = token.split(".")[1];
    const json = safeAtob(mid);
    return JSON.parse(decodeURIComponent(escape(json)));
  }catch{ return null; }
}

// -------------------- HTTP/GraphQL --------------------
async function signin(identity, password){
  const basic = btoa(unescape(encodeURIComponent(`${identity}:${password}`)));
  const res = await fetch(CFG.SIGNIN_URL, {
    method: "POST",
    headers: { "Authorization": `Basic ${basic}` }
  });
  const text = await res.text().catch(()=> "");
  if(!res.ok){
    const msg = text?.trim() || `Signin failed (${res.status})`;
    throw new Error(msg);
  }
  const m = String(text).match(/[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/);
  if(!m) throw new Error("Signin returned no token.");
  return m[0];
}

async function gql(query, variables={}){
  const token = storeGet(CFG.TOKEN_KEY);
  if(!token) throw new Error("Missing token");
  const res = await fetch(CFG.GRAPHQL_URL, {
    method:"POST",
    headers:{
      "content-type":"application/json",
      "authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });
  let body;
  try{ body = await res.json(); }
  catch{
    const raw = await res.text().catch(()=> "");
    throw new Error(raw?.trim() || `GraphQL HTTP ${res.status}`);
  }
  if(!res.ok) throw new Error(body?.errors?.[0]?.message || `GraphQL HTTP ${res.status}`);
  if(body?.errors?.length) throw new Error(body.errors[0].message || "GraphQL error");
  return body.data;
}

// -------------------- Queries --------------------
const Q_USER = `
query Me {
  user { id login firstName lastName }
}`;

const Q_XP = `
query XP($uid:Int!){
  transaction(
    where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
    order_by:{ createdAt: asc }
    limit: 20000
  ){
    amount objectId createdAt path
    object{ id name type }
  }
}`;

const Q_RESULTS = `
query Results($uid:Int!){
  result(
    where:{ userId:{_eq:$uid} }
    order_by:[{objectId: asc},{createdAt: desc}]
    distinct_on: objectId
  ){ objectId grade createdAt path }
}`;

const Q_AUDIT = `
query AuditTx($uid:Int!){
  transaction(
    where:{ userId:{_eq:$uid}, type:{_in:["up","down"]}, amount:{_gt:0} }
  ){ type amount }
}`;

// -------------------- Rules for "Module" --------------------
// keep piscine-js as module; exclude other piscine
const RX_PISCINE_JS  = /piscine-js/i;
const RX_PISCINE_ALL = /piscine(?!-js)/i;
function classifyPath(path=""){
  if (RX_PISCINE_JS.test(path)) return "piscine-js";
  if (RX_PISCINE_ALL.test(path)) return "piscine";
  return "module";
}

// -------------------- SVG charts --------------------
function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }
function clear(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }

function lineChart(svg, series){
  clear(svg);
  const W=+svg.viewBox.baseVal.width||680,H=+svg.viewBox.baseVal.height||280;
  const P={l:44,r:18,t:16,b:34};
  if(!series.length){ const t=ns("text"); t.setAttribute("x",10); t.setAttribute("y",22); t.textContent="No data"; svg.appendChild(t); return; }
  const xs=series.map(d=>d.x), ys=series.map(d=>d.y);
  const x0=Math.min(...xs), x1=Math.max(...xs), y1=Math.max(1, ...ys), y0=0;
  const sx=v=>P.l+((v-x0)/Math.max(1,(x1-x0)))*(W-P.l-P.r);
  const sy=v=>H-P.b-(v/(y1-y0))*(H-P.t-P.b);

  const ax=ns("path");
  ax.setAttribute("d",`M${P.l},${H-P.b} H${W-P.r} M${P.l},${P.t} V${H-P.b}`);
  ax.setAttribute("class","axis"); ax.setAttribute("stroke","#202a57"); svg.appendChild(ax);

  let d=""; series.forEach((p,i)=>{ d+=(i?" L":"M")+sx(p.x)+" "+sy(p.y); });
  const path=ns("path"); path.setAttribute("class","line"); path.setAttribute("d",d); svg.appendChild(path);
  series.forEach(p=>{ const c=ns("circle"); c.setAttribute("class","dot"); c.setAttribute("r","2.8"); c.setAttribute("cx",sx(p.x)); c.setAttribute("cy",sy(p.y)); svg.appendChild(c); });

  const t1=ns("text"); t1.textContent=new Date(x0).toISOString().slice(0,10); t1.setAttribute("x",P.l); t1.setAttribute("y",H-8); svg.appendChild(t1);
  const t2=ns("text"); t2.textContent=new Date(x1).toISOString().slice(0,10); t2.setAttribute("x",W-P.r-64); t2.setAttribute("y",H-8); svg.appendChild(t2);
  const t3=ns("text"); t3.textContent=fmtKB(y1); t3.setAttribute("x",10); t3.setAttribute("y",P.t+12); svg.appendChild(t3);
}

function donut(svg, pass, fail){
  clear(svg);
  const W=+svg.viewBox.baseVal.width||280,H=+svg.viewBox.baseVal.height||280;
  const cx=W/2, cy=H/2, R=Math.min(W,H)/2-10;
  const total=Math.max(1,pass+fail);
  const arc=(start,val,cls)=>{
    const a0=(start/total)*Math.PI*2-Math.PI/2, a1=((start+val)/total)*Math.PI*2-Math.PI/2;
    const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0), x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
    const large=val/total>0.5?1:0;
    const p=ns("path"); p.setAttribute("d",`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${cx} ${cy} Z`);
    p.setAttribute("class",cls); svg.appendChild(p); return start+val;
  };
  let s=0; s=arc(s,pass,"slice-pass"); s=arc(s,fail,"slice-fail");
  const lbl=ns("text"); lbl.textContent=`${Math.round((pass/total)*100)}% pass`; lbl.setAttribute("x",cx); lbl.setAttribute("y",cy+4); lbl.setAttribute("text-anchor","middle"); svg.appendChild(lbl);
}

function bars(svg, entries){
  clear(svg);
  const W=+svg.viewBox.baseVal.width||680,H=+svg.viewBox.baseVal.height||300;
  const P={l:28,r:16,t:16,b:64};
  if(!entries.length){ const t=ns("text"); t.setAttribute("x",10); t.setAttribute("y",22); t.textContent="No data"; svg.appendChild(t); return; }
  const max=Math.max(1, ...entries.map(e=>e.value));
  const band=(W-P.l-P.r)/entries.length;

  const ax=ns("line"); ax.setAttribute("x1",P.l); ax.setAttribute("y1",H-P.b); ax.setAttribute("x2",W-P.r); ax.setAttribute("y2",H-P.b); ax.setAttribute("stroke","#202a57"); svg.appendChild(ax);

  entries.forEach((e,i)=>{
    const v=e.value, h=(v/max)*(H-P.t-P.b), x=P.l+i*band, y=H-P.b-h;
    const r=ns("rect"); r.setAttribute("x",x+8); r.setAttribute("y",y); r.setAttribute("width",Math.max(10,band-16)); r.setAttribute("height",h); r.setAttribute("fill","#7aa2ff"); r.setAttribute("rx","7"); svg.appendChild(r);
    const tx=ns("text"); tx.setAttribute("x",x+band/2); tx.setAttribute("y",H-12); tx.setAttribute("text-anchor","middle"); tx.textContent=e.label; svg.appendChild(tx);
  });
}

// -------------------- Aggregations (Module XP) --------------------

// Build PASSED set + pass date from latest results
function extractPassInfo(results){
  const passedIds = new Set();
  const passDateByObj = new Map();
  for(const r of results){
    const oid = +r.objectId;
    if(!Number.isFinite(oid)) continue;
    if(+r.grade === 1){
      passedIds.add(oid);
      if (!passDateByObj.has(oid)) passDateByObj.set(oid, r.createdAt);
    }
  }
  return { passedIds, passDateByObj };
}

// Max XP per PASSED object + classification (module / piscine / piscine-js)
function maxPerPassedObject(xpRows, passedIds){
  const maxByObj = new Map();          // oid -> max amount
  const clsByObj = new Map();          // oid -> "module" | "piscine" | "piscine-js"
  const nameByObj= new Map();          // oid -> label
  for(const r of xpRows){
    const oid = +r.objectId, amt = +r.amount || 0;
    if(!Number.isFinite(oid) || amt<=0) continue;
    if(!passedIds.has(oid)) continue;
    if(amt > (maxByObj.get(oid) || 0)) {
      maxByObj.set(oid, amt);
      const p = (r.path || "").toLowerCase();
      clsByObj.set(oid, classifyPath(p));
      nameByObj.set(oid, (r.object && r.object.name) || lastSeg(r.path || "") || `#${oid}`);
    }
  }
  return { maxByObj, clsByObj, nameByObj };
}

// Module totals (exclude piscine, keep piscine-js)
function moduleTotals(maxByObj, clsByObj){
  let totalAll=0, totalPiscine=0;
  maxByObj.forEach((amt, oid)=>{
    totalAll += amt;
    if (clsByObj.get(oid) === "piscine") totalPiscine += amt;
  });
  const module = totalAll - totalPiscine; // piscine-js included here
  return { totalAll, totalPiscine, module };
}

// Series: cumulative Module XP by day using pass date
function moduleSeries(maxByObj, clsByObj, passDateByObj){
  const byDay = new Map();
  maxByObj.forEach((amt, oid)=>{
    if (clsByObj.get(oid) === "piscine") return; // exclude piscine
    const when = passDateByObj.get(oid);
    const d = day(when);
    byDay.set(d, (byDay.get(d) || 0) + amt);
  });
  const daily = [...byDay.entries()].sort((a,b)=> a[0].localeCompare(b[0]));
  let run = 0;
  return daily.map(([d,amt]) => { run += amt; return { x: new Date(d).getTime(), y: run }; });
}

// By type (project/exercise) but Module-only
function moduleByType(maxByObj, clsByObj, nameByObj, xpRows){
  // need object type per oid (from any sample row)
  const typeByObj = new Map();
  for(const r of xpRows){
    const oid = +r.objectId;
    if (!maxByObj.has(oid)) continue; // only passed set
    if (!typeByObj.has(oid)) {
      const t = (r.object && r.object.type) || "unknown";
      typeByObj.set(oid, t);
    }
  }
  const sum = new Map();
  maxByObj.forEach((amt, oid)=>{
    if (clsByObj.get(oid) === "piscine") return; // exclude piscine
    const t = typeByObj.get(oid) || "unknown";
    sum.set(t, (sum.get(t) || 0) + amt);
  });
  return [...sum.entries()].map(([label,value])=>({label,value}))
                           .sort((a,b)=> b.value - a.value);
}

// Recent Module projects (exclude piscine, sort by pass date desc)
function recentModule(maxByObj, clsByObj, nameByObj, passDateByObj, limit=9){
  const items = [];
  maxByObj.forEach((amt, oid)=>{
    if (clsByObj.get(oid) === "piscine") return;
    items.push({
      title: nameByObj.get(oid) || `#${oid}`,
      date:  passDateByObj.get(oid) || "",
      amount: amt
    });
  });
  items.sort((a,b)=> (a.date < b.date ? 1 : -1));
  return items.slice(0, limit).map(it => ({
    title: it.title,
    meta: `${(it.date||"").slice(0,10)} · ${fmtKB(it.amount)}`
  }));
}

// -------------------- Load all --------------------
async function loadAll(){
  // user
  const u = await gql(Q_USER);
  const me = u.user && u.user[0];
  if(!me) throw new Error("Failed to load user.");
  uId.textContent    = me.id ?? "—";
  uLogin.textContent = me.login ?? "—";
  uFirst.textContent = me.firstName ?? "—";
  uLast.textContent  = me.lastName ?? "—";
  heroName.textContent = me.login ? `${me.login}'s profile` : "Your profile";

  const uid = me.id;

  // parallel data
  const [xpRes, resRes, audRes] = await Promise.all([
    gql(Q_XP, { uid }),
    gql(Q_RESULTS, { uid }),
    gql(Q_AUDIT, { uid }),
  ]);

  const xpRows   = xpRes.transaction || [];
  const results  = resRes.result || [];
  const audits   = audRes.transaction || [];

  // --- Pass info ---
  const { passedIds, passDateByObj } = extractPassInfo(results);

  // --- Max-per-object for passed only (with classification) ---
  const { maxByObj, clsByObj, nameByObj } = maxPerPassedObject(xpRows, passedIds);

  // --- Module totals (this is your "Total XP") ---
  const totals = moduleTotals(maxByObj, clsByObj);
  xpTotalEl.textContent = fmtKB(totals.module);

  // --- Pass / Fail counts (from latest per object) ---
  const pass = results.filter(r => +r.grade === 1).length;
  const fail = results.filter(r => +r.grade !== 1).length;
  passedEl.textContent = String(pass);
  failedEl.textContent = String(fail);

  // --- Audit ratio: sum(up)/sum(down) with 2 decimals; 0.00 if no down ---
  let up=0, down=0;
  audits.forEach(a=>{
    const t=(a.type||"").toLowerCase();
    const amt=+a.amount||0;
    if(t==="up") up+=amt;
    else if(t==="down") down+=amt;
  });
  const ratio = down > 0 ? (up / down) : 0;
  auditRatioEl.textContent = ratio.toFixed(2);

  // --- Charts (Module only) ---
  const series = moduleSeries(maxByObj, clsByObj, passDateByObj);
  lineChart(svgXP, series);

  donut(svgRatio, pass, fail);

  const byType = moduleByType(maxByObj, clsByObj, nameByObj, xpRows);
  bars(svgType, byType);

  // --- Recent projects (Module only) ---
  projectsEl.innerHTML = "";
  recentModule(maxByObj, clsByObj, nameByObj, passDateByObj, 9).forEach(it=>{
    const div=document.createElement("div"); div.className="item";
    const t=document.createElement("div"); t.className="title"; t.textContent=it.title;
    const m=document.createElement("div"); m.className="meta"; m.textContent=it.meta;
    div.appendChild(t); div.appendChild(m); projectsEl.appendChild(div);
  });
}

// -------------------- Events --------------------
btnLogout.addEventListener("click", (e)=>{
  e.preventDefault();
  storeDel(CFG.TOKEN_KEY);
  toggle(false);
  errEl.classList.add("hidden");
});

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  errEl.classList.add("hidden");
  const id = inpId.value.trim();
  const pw = inpPw.value;
  if(!id || !pw){
    errEl.textContent="Please enter both fields."; errEl.classList.remove("hidden"); return;
  }
  try{
    const jwt = await signin(id, pw);
    storeSet(CFG.TOKEN_KEY, jwt, !!inpRem.checked);
    toggle(true);
    await loadAll();
  }catch(err){
    errEl.textContent = err?.message || "Signin failed.";
    errEl.classList.remove("hidden");
  }
});

// -------------------- Boot --------------------
(function init(){
  const jwt = storeGet(CFG.TOKEN_KEY);
  const ok = jwt && decodeJWT(jwt);
  if(ok){ toggle(true); loadAll().catch(e=>{ errEl.textContent = e?.message || String(e); errEl.classList.remove("hidden"); }); }
  else { toggle(false); }
})();
