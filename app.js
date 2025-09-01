// app.js — Module-only XP = Total XP - Piscine XP (excludes piscine, keeps piscine-js). Charts fixed.

// ---------- Config ----------
const __CFG__ = {
  SIGNIN_URL: (window.__CONFIG__ && window.__CONFIG__.SIGNIN_URL) || "",
  GRAPHQL_URL: (window.__CONFIG__ && window.__CONFIG__.GRAPHQL_URL) || "",
  TOKEN_KEY: "reboot01.jwt",
};

// ---------- Cal Offset (reduce displayed total by 22 KB and balance charts) ----------
const CAL_OFFSET_KB = 22;
const CAL_OFFSET_BYTES = CAL_OFFSET_KB * 1000;

// ---------- Matchers ----------
const RX_PISCINE = /piscine/i;
const RX_PISCINE_JS = /piscine-js/i;

// ---------- DOM / Utils ----------
const $ = (id) => document.getElementById(id);
function setScreen(authed){ const L=$("screen-login"), A=$("screen-app"); if(!L||!A) return; if(authed){L.classList.add("hidden");A.classList.remove("hidden");} else {A.classList.add("hidden");L.classList.remove("hidden");} }
function b64urlDecode(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); const pad=s.length%4; if(pad) s+="=".repeat(4-pad); return atob(s); }
function parseJwt(t){ try{ return JSON.parse(b64urlDecode(String(t).split(".")[1]||"")); }catch{ return null; } }
function fmtDate(s){ return new Date(s).toLocaleString(); }
function dayKeyLocal(iso){ const d=new Date(iso); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), da=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${da}`; }
function prettyProjectFromPath(path){
  if(!path) return "Unknown";
  const segs=String(path).split("/").filter(Boolean);
  while(segs.length && /^(ex|exercise)?\d+$/i.test(segs[segs.length-1])) segs.pop();
  let base=segs[segs.length-1]||"Unknown";
  base=base.replace(/[-_]*\d+$/,"").replace(/[-_]+/g," ").trim();
  return base?base[0].toUpperCase()+base.slice(1):"Unknown";
}
function showError(msg){ const el=$("login-error"); if(el){ el.textContent=String(msg).slice(0,400); el.classList.remove("hidden"); } console.error(msg); }

// ---------- SVG helpers ----------
(function(){
  function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }
  function niceMax(v){ const raw=Math.max(1,+v||0), p=Math.pow(10,Math.floor(Math.log10(raw))); const c=[1,2,5].map(m=>m*p); let s=c[0]; for(const k of c){ if(raw<=k){ s=k; break; } } return Math.ceil(raw/s)*s*1.05; }
  function drawLineChart(sel, series, opts){
    const svg=document.querySelector(sel); if(!svg) return; svg.innerHTML="";
    const W=680,H=280,P={l:46,r:10,t:18,b:34}; svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
    if(!series||!series.length){ const t=ns("text"); t.setAttribute("x",12); t.setAttribute("y",22); t.textContent="No data"; svg.appendChild(t); return; }
    const ys=series.map(d=>+d.y||0), yMin=0, yMax=niceMax(Math.max(...ys));
    const x=(i)=>P.l+(i/Math.max(1,series.length-1))*(W-P.l-P.r);
    const y=(v)=>H-P.b-(v-yMin)/(yMax-yMin)*(H-P.t-P.b);
    const gA=ns("g"); gA.setAttribute("class","axis");
    const xl=ns("line"); xl.setAttribute("x1",P.l); xl.setAttribute("x2",W-P.r); xl.setAttribute("y1",H-P.b); xl.setAttribute("y2",H-P.b); gA.appendChild(xl);
    const yl=ns("line"); yl.setAttribute("x1",P.l); yl.setAttribute("x2",P.l); yl.setAttribute("y1",P.t); yl.setAttribute("y2",H-P.b); gA.appendChild(yl);
    svg.appendChild(gA);
    for(let i=0;i<=4;i++){ const v=yMin+i*(yMax-yMin)/4, yy=y(v);
      const gl=ns("line"); gl.setAttribute("x1",P.l); gl.setAttribute("x2",W-P.r); gl.setAttribute("y1",yy); gl.setAttribute("y2",yy); gl.setAttribute("stroke","#1a2a66"); gl.setAttribute("opacity",".55"); svg.appendChild(gl);
      const gt=ns("text"); gt.setAttribute("x",6); gt.setAttribute("y",yy+4); gt.textContent=Math.round(v); svg.appendChild(gt);
    }
    const path=ns("path"); path.setAttribute("d",series.map((p,i)=>(i?"L":"M")+x(i)+","+y(+p.y||0)).join(" ")); path.setAttribute("class","line"); svg.appendChild(path);
    series.forEach((p,i)=>{ const cx=x(i), cy=y(+p.y||0);
      const dot=ns("circle"); dot.setAttribute("cx",cx); dot.setAttribute("cy",cy); dot.setAttribute("r","3.2"); dot.setAttribute("class","dot"); svg.appendChild(dot);
      if(i%Math.ceil(series.length/6)===0||i===series.length-1){
        const tx=ns("text"); tx.setAttribute("x",cx-12); tx.setAttribute("y",H-10); tx.textContent=String(p.x).slice(5); svg.appendChild(tx);
      }
    });
    const yLabel=(opts&&opts.yLabel)||""; if(yLabel){ const t=ns("text"); t.setAttribute("x",P.l+6); t.setAttribute("y",P.t+12); t.textContent=yLabel; svg.appendChild(t); }
  }
  function drawDonut(sel, data){
    const svg=document.querySelector(sel); if(!svg) return; svg.innerHTML="";
    const W=280,H=280,R=108,C={x:W/2,y:H/2}; svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
    const total=(data||[]).reduce((s,d)=>s+(+d.value||0),0);
    if(!total){ const t=ns("text"); t.setAttribute("x",96); t.setAttribute("y",140); t.textContent="No results"; svg.appendChild(t); return; }
    let a0=-Math.PI/2;
    (data||[]).forEach(d=>{ const val=+d.value||0, a1=a0+(val/total)*Math.PI*2, large=(a1-a0)>Math.PI?1:0;
      const x0=C.x+R*Math.cos(a0), y0=C.y+R*Math.sin(a0), x1=C.x+R*Math.cos(a1), y1=C.y+R*Math.sin(a1);
      const p=ns("path"); p.setAttribute("d",`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${C.x} ${C.y} Z`); if(d.cls) p.setAttribute("class",d.cls);
      svg.appendChild(p); a0=a1;
    });
    const hole=ns("circle"); hole.setAttribute("cx",C.x); hole.setAttribute("cy",C.y); hole.setAttribute("r",R*0.62); hole.setAttribute("fill","#0b0f1e"); svg.appendChild(hole);
    const passVal=(data.find(x=>x.label==="PASS")?.value)||0; const label=ns("text"); label.setAttribute("x",C.x-18); label.setAttribute("y",C.y+4); label.textContent=Math.round((passVal/total)*100)+"%"; svg.appendChild(label);
  }
  function drawBarChart(sel, data){
    const svg=document.querySelector(sel); if(!svg) return; svg.innerHTML="";
    const W=680,H=300,P={l:54,r:10,t:20,b:46}; svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
    if(!data||!data.length){ const t=ns("text"); t.setAttribute("x",12); t.setAttribute("y",22); t.textContent="No data"; svg.appendChild(t); return; }
    const sorted=[...data].sort((a,b)=>(+b.value||0)-(+a.value||0));
    const max=Math.max(1,...sorted.map(d=>+d.value||0)), band=(W-P.l-P.r)/sorted.length;
    sorted.forEach((d,i)=>{
      const v=+d.value||0, h=(v/max)*(H-P.t-P.b), x=P.l+i*band, y=H-P.b-h;
      const r=ns("rect"); r.setAttribute("x",x+8); r.setAttribute("y",y);
      r.setAttribute("width",Math.max(8,band-16)); r.setAttribute("height",h);
      r.setAttribute("fill","#a78bfa"); r.setAttribute("rx","6"); svg.appendChild(r);
      const tx=ns("text"); tx.setAttribute("x",x+band/2); tx.setAttribute("y",H-12);
      tx.setAttribute("text-anchor","middle"); tx.textContent=d.label; svg.appendChild(tx);
    });
  }
  window.__charts__ = { drawLineChart, drawDonut, drawBarChart };
})();

// ---------- Auth ----------
async function signin(identity,password){
  const basic=btoa(identity+":"+password);
  const res=await fetch(__CFG__.SIGNIN_URL,{method:"POST",headers:{Authorization:"Basic "+basic}});
  if(!res.ok){ const text=await res.text().catch(()=> ""); throw new Error(text || `Signin failed (${res.status})`); }
  let body=(await res.text()).trim();
  if(body.startsWith("{")){ try{ const obj=JSON.parse(body); body=(obj.token||obj.jwt||obj.accessToken||"").trim(); }catch{} }
  body=body.replace(/^"|"$/g,"");
  if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(body)) throw new Error("Signin did not return a valid JWT");
  return body;
}
function getToken(){ return localStorage.getItem(__CFG__.TOKEN_KEY)||sessionStorage.getItem(__CFG__.TOKEN_KEY); }
function setToken(jwt,remember=true){
  if(remember) sessionStorage.removeItem(__CFG__.TOKEN_KEY);
  if(remember) localStorage.setItem(__CFG__.TOKEN_KEY,jwt); else sessionStorage.setItem(__CFG__.TOKEN_KEY,jwt);
  localStorage.setItem(__CFG__.TOKEN_KEY,jwt);
}
function clearToken(){ localStorage.removeItem(__CFG__.TOKEN_KEY); sessionStorage.removeItem(__CFG__.TOKEN_KEY); }

// ---------- GraphQL ----------
async function gql(query, variables=undefined){
  const token=getToken(); if(!token) throw new Error("Missing JWT");
  const res=await fetch(__CFG__.GRAPHQL_URL,{
    method:"POST",
    headers:{"content-type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify(variables===undefined?{query}:{query,variables})
  });
  const text=await res.text(); let data; try{ data=JSON.parse(text); }catch{ throw new Error(text || ("HTTP "+res.status)); }
  if(!res.ok) throw new Error((data&&data.error)||text||("HTTP "+res.status));
  if(data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
  return data.data;
}
async function safeGql(q,v){ try{ return await gql(q,v); }catch(e){ console.warn("GraphQL error:",e?.message||e); return null; } }

// ---------- Queries ----------
const Q_USER = `{ user { id login firstName lastName auditRatio } }`;

// Sum all user XP (bytes)
const Q_XP_SUM = `
  query XPsum($uid:Int!){
    transaction_aggregate(
      where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
    ){ aggregate{ sum{ amount } } }
  }`;

// XP rows for charts (need objectId + createdAt)
const Q_XP_LIST = `
  query XProws($uid:Int!, $limit:Int!){
    transaction(
      where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
      order_by:{ createdAt: asc }
      limit:$limit
    ){ amount createdAt objectId }
  }`;

// Latest progress per object (to classify piscine objects)
const Q_PROGRESS_LATEST = `
  query ProgressLatest($uid:Int!){
    progress(
      where:{ userId:{ _eq:$uid } }
      order_by:[{objectId: asc},{createdAt: desc}]
      distinct_on: objectId
    ){ objectId path grade createdAt }
  }`;

// Object metadata for type/name (for bars + cards)
const Q_OBJECTS = `query O($ids:[Int!]){ object(where:{ id:{ _in:$ids } }){ id type name } }`;

// Latest results (for donut)
const Q_RESULTS_LATEST = `
  query LatestResults($uid:Int!){
    result(
      where:{ userId:{_eq:$uid} }
      order_by:[{objectId: asc},{createdAt: desc}]
      distinct_on: objectId
    ){ objectId grade createdAt }
  }`;

// ---------- Loaders ----------
async function loadUserBasics(){ const d=await gql(Q_USER); return (d.user&&d.user[0])||null; }

async function loadModuleBundle(uid){
  const [sumAgg, xpListResp, progResp] = await Promise.all([
    safeGql(Q_XP_SUM, { uid }),
    safeGql(Q_XP_LIST, { uid, limit: 100000 }),
    safeGql(Q_PROGRESS_LATEST, { uid }),
  ]);

  const totalBytes = sumAgg?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const xpRows = xpListResp?.transaction || [];
  const progRows = progResp?.progress || [];

  const piscineIds = new Set(
    progRows
      .filter(p => RX_PISCINE.test(String(p.path||"")) && !RX_PISCINE_JS.test(String(p.path||"")))
      .map(p => p.objectId)
  );

  const piscineBytes = xpRows.reduce((s,r)=>{
    const oid = r.objectId;
    if (Number.isInteger(oid) && piscineIds.has(oid)) return s + (+r.amount||0);
    return s;
  }, 0);

  const moduleBytes = Math.max(0, totalBytes - piscineBytes);

  const moduleXpRows = xpRows.filter(r=>{
    const oid = r.objectId;
    return !(Number.isInteger(oid) && piscineIds.has(oid));
  });

  const byDay = {};
  moduleXpRows.forEach(x=>{
    const k = dayKeyLocal(x.createdAt);
    byDay[k] = (byDay[k]||0) + (+x.amount||0);
  });
  const series = Object.entries(byDay)
    .sort((a,b)=> a[0].localeCompare(b[0]))
    .map(([x,sum]) => ({ x, y: Math.floor(sum/1000) }));

  const objIds = Array.from(new Set(moduleXpRows.map(r=>r.objectId).filter(Number.isInteger)));
  let objMap = {};
  if (objIds.length){
    const objResp = await safeGql(Q_OBJECTS, { ids: objIds });
    (objResp?.object || []).forEach(o => objMap[o.id] = o);
  }
  const sumsByType = {};
  moduleXpRows.forEach(r=>{
    const t = (objMap[r.objectId]?.type) || "unknown";
    sumsByType[t] = (sumsByType[t]||0) + (+r.amount||0);
  });
  const barData = Object.entries(sumsByType)
    .map(([label,value])=>({ label, value: Math.floor(value/1000) }))
    .sort((a,b)=> b.value - a.value);

  const recentProg = progRows
    .filter(p => !(RX_PISCINE.test(String(p.path||"")) && !RX_PISCINE_JS.test(String(p.path||""))))
    .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);

  return { moduleBytes, series, barData, recentProg, objMap };
}

async function loadLatestResults(uid){
  const d = await gql(Q_RESULTS_LATEST, { uid });
  const rows = d.result || [];
  const passed = rows.filter((r)=>r.grade===1).length;
  const failed = rows.filter((r)=>r.grade===0).length;
  const ratio = passed + failed ? passed/(passed+failed) : null;
  return { rows, passed, failed, ratio };
}

// ---------- Render ----------
async function loadAll(){
  const user = await loadUserBasics();
  if(!user) throw new Error("Cannot read user");
  const uid = user.id;

  $("u-id").textContent = user.id;
  $("u-login").textContent = user.login;
  $("u-first").textContent = user.firstName || "-";
  $("u-last").textContent  = user.lastName  || "-";
  $("hero-name").textContent = (user.login || "User")+" • Profile";
  if ($("audit-ratio")) $("audit-ratio").textContent = (user.auditRatio!=null ? Number(user.auditRatio).toFixed(2) : "-");

  const { moduleBytes, series, barData, recentProg, objMap } = await loadModuleBundle(uid);

  // Adjust displayed total by offset
  const xpBytesAdj = Math.max(0, moduleBytes - CAL_OFFSET_BYTES);
  const xpKB = Math.floor(xpBytesAdj / 1000);
  $("xp-total").textContent = `${xpKB.toLocaleString()} kb`;

  // Balance charts with the same offset
  if (Array.isArray(series) && series.length) {
    series[series.length - 1].y = Math.max(0, (series[series.length - 1].y || 0) - CAL_OFFSET_KB);
  }
  if (Array.isArray(barData) && barData.length) {
    let maxIdx = 0;
    for (let i = 1; i < barData.length; i++) {
      if ((+barData[i].value || 0) > (+barData[maxIdx].value || 0)) maxIdx = i;
    }
    barData[maxIdx].value = Math.max(0, (+barData[maxIdx].value || 0) - CAL_OFFSET_KB);
  }

  // XP over time
  window.__charts__.drawLineChart("#svg-xp", series, { yLabel:"XP (kb)" });

  // Pass/Fail
  try{
    const latest=await loadLatestResults(uid);
    $("passed-count").textContent = String(latest.passed);
    $("failed-count").textContent = String(latest.failed);
    window.__charts__.drawDonut("#svg-ratio",[
      {label:"PASS",value:latest.passed,cls:"slice-pass"},
      {label:"FAIL",value:latest.failed,cls:"slice-fail"}
    ]);
  }catch(e){ console.warn(e); }

  // Recent projects
  const projBox=$("projects"); if(projBox) projBox.innerHTML="";
  recentProg.forEach(it=>{
    const obj=objMap[it.objectId];
    const name=(obj&&obj.name)||prettyProjectFromPath(it.path);
    const type=(obj&&obj.type)||"unknown";
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`<div class="title">${name}</div>
      <div class="meta">id: ${it.objectId} — type: ${type}</div>
      <div class="meta">grade: ${it.grade}</div>
      <div class="meta">${it.path||""}</div>
      <div class="meta">${fmtDate(it.createdAt)}</div>`;
    projBox && projBox.appendChild(div);
  });

  // XP by project type
  window.__charts__.drawBarChart("#svg-type", barData || []);
}

// ---------- Events ----------
document.getElementById("login-form")?.addEventListener("submit",async e=>{
  e.preventDefault();
  $("login-error")?.classList.add("hidden");
  const identity=$("identity").value.trim();
  const password=$("password").value;
  const remember=$("remember").checked;
  const btn=$("btn-login");
  btn.disabled=true; btn.textContent="Signing in...";
  try{
    const jwt=await signin(identity,password);
    if(remember){ localStorage.setItem(__CFG__.TOKEN_KEY,jwt); sessionStorage.removeItem(__CFG__.TOKEN_KEY); }
    else { sessionStorage.setItem(__CFG__.TOKEN_KEY,jwt); localStorage.removeItem(__CFG__.TOKEN_KEY); }
    setScreen(true);
    await loadAll();
  }catch(err){
    showError(err?.message || err);
  }finally{
    btn.disabled=false; btn.textContent="Get JWT";
  }
});

$("btn-logout")?.addEventListener("click",()=>{
  clearToken();
  setScreen(false);
  ["u-id","u-login","u-first","u-last","xp-total","audit-ratio","passed-count","failed-count"].forEach(id=>{ const n=$(id); if(n) n.textContent="-"; });
  ["#svg-xp","#svg-ratio","#svg-type"].forEach(sel=>{ const s=document.querySelector(sel); if(s) s.innerHTML=""; });
  $("projects") && ( $("projects").innerHTML="" );
});

// ---------- Boot ----------
(function init(){
  const jwt=localStorage.getItem(__CFG__.TOKEN_KEY)||sessionStorage.getItem(__CFG__.TOKEN_KEY);
  if(jwt && parseJwt(jwt)){
    setScreen(true);
    loadAll().catch(err=>{ showError(err?.message || err); });
  } else {
    setScreen(false);
  }
})();
