// app.js — single-file build (SVG helpers inline) + accurate numbers

// ================= SVG HELPERS =================
function drawLineChart(selector, series, opts){
  const svg = document.querySelector(selector); if(!svg) return; svg.innerHTML = "";
  const W=680,H=280,P={l:46,r:10,t:18,b:34}; svg.setAttribute("viewBox","0 0 "+W+" "+H);
  const yLabel = (opts && opts.yLabel) || "";
  if(!series || !series.length){
    const t=ns("text"); t.setAttribute("x",12); t.setAttribute("y",22); t.textContent="No data"; svg.appendChild(t); return;
  }
  const ys=series.map(d=>d.y); const yMin=0, yMax=Math.max(1, Math.max.apply(null, ys)*1.15);
  const x=(i)=> P.l + (i/Math.max(1,series.length-1)) * (W-P.l-P.r);
  const y=(v)=> H-P.b - (v-yMin)/(yMax-yMin) * (H-P.t-P.b);
  const gA = ns("g"); gA.setAttribute("class","axis");
  const xl=ns("line"); xl.setAttribute("x1",P.l); xl.setAttribute("x2",W-P.r); xl.setAttribute("y1",H-P.b); xl.setAttribute("y2",H-P.b); gA.appendChild(xl);
  const yl=ns("line"); yl.setAttribute("x1",P.l); yl.setAttribute("x2",P.l); yl.setAttribute("y1",P.t); yl.setAttribute("y2",H-P.b); gA.appendChild(yl);
  svg.appendChild(gA);
  for(let i=0;i<=4;i++){
    const v=yMin+i*(yMax-yMin)/4, yy=y(v);
    const l=ns("line"); l.setAttribute("x1",P.l); l.setAttribute("x2",W-P.r); l.setAttribute("y1",yy); l.setAttribute("y2",yy); l.setAttribute("stroke","#1a2a66"); l.setAttribute("opacity",".55"); svg.appendChild(l);
    const t=ns("text"); t.setAttribute("x",6); t.setAttribute("y",yy+4); t.textContent=Math.round(v); svg.appendChild(t);
  }
  const path = ns("path"); path.setAttribute("d", series.map((p,i)=> (i?"L":"M")+x(i)+","+y(p.y)).join(" ")); path.setAttribute("class","line"); svg.appendChild(path);
  series.forEach((p,i)=>{
    const cx=x(i), cy=y(p.y);
    const dot=ns("circle"); dot.setAttribute("cx",cx); dot.setAttribute("cy",cy); dot.setAttribute("r","3.2"); dot.setAttribute("class","dot"); svg.appendChild(dot);
    if(i%Math.ceil(series.length/6)===0 || i===series.length-1){
      const tx=ns("text"); tx.setAttribute("x",cx-12); tx.setAttribute("y",H-10); tx.textContent=series[i].x.slice(5); svg.appendChild(tx);
    }
  });
  if(yLabel){ const t=ns("text"); t.setAttribute("x",P.l+6); t.setAttribute("y",P.t+12); t.textContent=yLabel; svg.appendChild(t); }
  function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }
}

function drawDonut(selector, data){
  const svg = document.querySelector(selector); if(!svg) return; svg.innerHTML = "";
  const W=280,H=280,R=108,C={x:W/2,y:H/2}; svg.setAttribute("viewBox","0 0 "+W+" "+H);
  const total = data.reduce((s,d)=>s+d.value,0);
  if(!total){ const t=ns("text"); t.setAttribute("x",96); t.setAttribute("y",140); t.textContent="No results"; svg.appendChild(t); return; }
  let a0=-Math.PI/2;
  data.forEach(d=>{
    const a1=a0 + (d.value/total)*Math.PI*2; const large=(a1-a0)>Math.PI?1:0;
    const x0=C.x+R*Math.cos(a0), y0=C.y+R*Math.sin(a0), x1=C.x+R*Math.cos(a1), y1=C.y+R*Math.sin(a1);
    const p=ns("path"); p.setAttribute("d","M "+x0+" "+y0+" A "+R+" "+R+" 0 "+large+" 1 "+x1+" "+y1+" L "+C.x+" "+C.y+" Z");
    p.setAttribute("class", d.cls); svg.appendChild(p); a0=a1;
  });
  const hole=ns("circle"); hole.setAttribute("cx",C.x); hole.setAttribute("cy",C.y); hole.setAttribute("r",R*0.62); hole.setAttribute("fill","#0b0f1e"); hole.setAttribute("stroke","#26307a"); svg.appendChild(hole);
  const label=ns("text"); label.setAttribute("x",C.x-18); label.setAttribute("y",C.y+4);
  const pass = data.find(x=>x.label==="PASS")?.value || 0;
  label.textContent=Math.round((pass/total)*100)+"%"; svg.appendChild(label);
  function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }
}

function drawBarChart(selector, data){
  const svg=document.querySelector(selector); if(!svg) return; svg.innerHTML="";
  const W=680,H=300,P={l:54,r:10,t:20,b:46}; svg.setAttribute("viewBox","0 0 "+W+" "+H);
  if(!data || !data.length){ const t=ns("text"); t.setAttribute("x",12); t.setAttribute("y",22); t.textContent="No data"; svg.appendChild(t); return; }
  const max=Math.max.apply(null, data.map(d=>d.value))||1;
  const band=(W-P.l-P.r)/data.length;
  data.forEach((d,i)=>{
    const h=(d.value/max)*(H-P.t-P.b); const x=P.l + i*band; const y=H-P.b-h;
    const r=ns("rect"); r.setAttribute("x",x+8); r.setAttribute("y",y); r.setAttribute("width",Math.max(8,band-16)); r.setAttribute("height",h); r.setAttribute("fill","#a78bfa"); r.setAttribute("rx","6"); svg.appendChild(r);
    const tx=ns("text"); tx.setAttribute("x",x+band/2); tx.setAttribute("y",H-12); tx.setAttribute("text-anchor","middle"); tx.textContent=d.label; svg.appendChild(tx);
  });
  function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }
}

// ================= APP LOGIC =================
const { SIGNIN_URL, GRAPHQL_URL } = window.__CONFIG__;

const el = (id) => document.getElementById(id);
const $login = el("screen-login");
const $app = el("screen-app");
const $err = el("login-error");
const $btnLogout = el("btn-logout");
const TOKEN_KEY = "reboot01.jwt";

function setScreen(authed) {
  if (authed) { $login.classList.add("hidden"); $app.classList.remove("hidden"); }
  else { $app.classList.add("hidden"); $login.classList.remove("hidden"); }
}
function b64urlDecode(input){ input=input.replace(/-/g,"+").replace(/_/g,"/"); const pad=input.length%4; if(pad) input+="=".repeat(4-pad); return atob(input); }
function parseJwt(token){ try{ return JSON.parse(b64urlDecode(token.split(".")[1])); }catch{ return null; } }

// ---- Signin (robust parsing) ----
async function signin(identity, password) {
  const basic = btoa(identity + ":" + password);
  const res = await fetch(SIGNIN_URL, { method: "POST", headers: { Authorization: "Basic " + basic } });
  if (!res.ok) {
    const text = await res.text().catch(()=>"");
    throw new Error(text || "Signin failed (" + res.status + ")");
  }
  let body = await res.text();
  let jwt = body.trim();
  if (jwt.startsWith("{")) {
    try { const obj = JSON.parse(jwt); jwt = (obj.token || obj.jwt || obj.accessToken || "").trim(); } catch {}
  }
  jwt = jwt.replace(/^"|"$/g, "");
  const looksLikeJwt = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(jwt);
  if (!looksLikeJwt) throw new Error("Signin did not return a valid JWT");
  return jwt;
}

// ---- GraphQL helper ----
async function gql(query, variables = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
  return data.data;
}

// ---- Queries ----
const Q_USER = `{ user { id login firstName lastName } }`;

// Accurate XP (total + timeline)
const Q_XP_SUM = `
query XPsum($uid:Int!){
  transaction_aggregate(
    where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
  ){ aggregate{ sum{ amount } } }
}`;
const Q_XP_LIST = `
query XP($uid:Int!, $limit:Int!){
  transaction(
    where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
    order_by:{ createdAt: asc }
    limit: $limit
  ){ amount createdAt }
}`;

// Latest result per object (dedupe retries)
const Q_RESULTS_LATEST = `
query LatestResults($uid:Int!){
  result(
    where:{ userId:{_eq:$uid} }
    order_by:[{objectId: asc},{createdAt: desc}]
    distinct_on: objectId
  ){ objectId grade createdAt }
}`;

// Latest progress per object (for cards)
const Q_PROGRESS_LATEST = `
query LatestProgress($uid:Int!){
  progress(
    where:{ userId:{_eq:$uid} }
    order_by:[{objectId: asc},{createdAt: desc}]
    distinct_on: objectId
  ){ objectId grade createdAt path userId }
}`;

const Q_OBJECTS = `
query O($ids:[Int!]){
  object(where:{ id:{ _in:$ids } }){ id type name }
}`;

// ---- Rendering helpers ----
function fmtDate(s){ return new Date(s).toLocaleString(); }

// ---- Main loader ----
async function loadAll(){
  // User
  const u = await gql(Q_USER);
  const user = (u && u.user && u.user[0]) || null;
  if(!user) throw new Error("Cannot read user");
  el("u-id").textContent = user.id;
  el("u-login").textContent = user.login;
  el("u-first").textContent = user.firstName || "-";
  el("u-last").textContent = user.lastName || "-";
  const hero = document.getElementById("hero-name");
  if (hero) hero.textContent = (user.login || "User") + " • Profile";

  // XP total
  const xpSumData = await gql(Q_XP_SUM, { uid: user.id });
  const xpTotal = (xpSumData.transaction_aggregate.aggregate.sum.amount) || 0;
  document.getElementById("xp-total").textContent = xpTotal.toLocaleString();

  // XP timeline (daily buckets)
  const xpList = await gql(Q_XP_LIST, { uid: user.id, limit: 5000 });
  const byDay = {};
  (xpList.transaction || []).forEach(x=>{
    const d = new Date(x.createdAt).toISOString().slice(0,10); // UTC
    byDay[d] = (byDay[d] || 0) + (x.amount || 0);
  });
  const series = Object.entries(byDay)
    .map(([x,y])=>({x,y}))
    .sort((a,b)=> a.x.localeCompare(b.x));
  drawLineChart("#svg-xp", series, { yLabel: "XP" });

  // Pass/Fail using latest result per object
  const latest = await gql(Q_RESULTS_LATEST, { uid: user.id });
  const rows = latest.result || [];
  const passed = rows.filter(r=>r.grade === 1).length;
  const failed = rows.filter(r=>r.grade === 0).length;
  document.getElementById("passed-count").textContent = passed;
  document.getElementById("failed-count").textContent = failed;
  document.getElementById("audit-ratio").textContent =
    (passed+failed) ? (passed/(passed+failed)).toFixed(2) : "-";
  drawDonut("#svg-ratio", [
    { label: "PASS", value: passed, cls: "slice-pass" },
    { label: "FAIL", value: failed, cls: "slice-fail" }
  ]);

  // Projects (latest per object) + bar by type
  const pr = await gql(Q_PROGRESS_LATEST, { uid: user.id });
  const items = pr.progress || [];
  const projBox = document.getElementById("projects"); if (projBox) projBox.innerHTML = "";

  const ids = Array.from(new Set(items.map(it=>it.objectId))).slice(0, 120);
  let objMap = {};
  if (ids.length) {
    const objs = await gql(Q_OBJECTS, { ids });
    (objs.object || []).forEach(o => objMap[o.id] = o);
  }
  const typeCount = {};
  items.forEach(it=>{
    const t=(objMap[it.objectId] && objMap[it.objectId].type) || "unknown";
    typeCount[t]=(typeCount[t]||0)+1;
  });
  const typeData = Object.entries(typeCount).map(([label,value])=>({label,value}));
  drawBarChart("#svg-type", typeData);

  if (projBox) {
    items.slice(0,12).forEach(it=>{
      const o = objMap[it.objectId];
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML =
        '<div class="title">' + (o ? o.name : "Object " + it.objectId) + '</div>' +
        '<div class="meta">id: ' + it.objectId + ' — type: ' + ((o && o.type) || "n/a") + '</div>' +
        '<div class="meta">grade: ' + it.grade + '</div>' +
        '<div class="meta">' + (it.path || "") + '</div>' +
        '<div class="meta">' + fmtDate(it.createdAt) + '</div>';
      projBox.appendChild(div);
    });
  }
}

// ---- Events ----
document.getElementById("login-form").addEventListener("submit", async (e)=>{
  e.preventDefault();
  $err.classList.add("hidden");
  const identity=document.getElementById("identity").value.trim();
  const password=document.getElementById("password").value;
  const remember=document.getElementById("remember").checked;
  const btn=document.getElementById("btn-login");
  btn.disabled=true; btn.textContent="Signing in...";
  try{
    const jwt=await signin(identity,password);
    if(remember) localStorage.setItem(TOKEN_KEY,jwt);
    else sessionStorage.setItem(TOKEN_KEY,jwt);
    localStorage.setItem(TOKEN_KEY,jwt);
    setScreen(true); await loadAll();
  }catch(err){
    $err.textContent=(""+err.message).slice(0,400);
    $err.classList.remove("hidden");
  }finally{
    btn.disabled=false; btn.textContent="Get JWT";
  }
});

$btnLogout.addEventListener("click", ()=>{
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  setScreen(false);
  ["u-id","u-login","u-first","u-last","xp-total","audit-ratio","passed-count","failed-count"]
    .forEach(id => { const n=document.getElementById(id); if(n) n.textContent = "-"; });
  ["#svg-xp","#svg-ratio","#svg-type"].forEach(sel=>{ const svg=document.querySelector(sel); if(svg) svg.innerHTML=""; });
  const proj=document.querySelector("#projects"); if(proj) proj.innerHTML="";
});

// ---- Boot ----
(function init(){
  const jwt=localStorage.getItem(TOKEN_KEY);
  if(jwt && parseJwt(jwt)){
    setScreen(true);
    loadAll().catch(err=>{ console.error(err); localStorage.removeItem(TOKEN_KEY); setScreen(false); });
  } else setScreen(false);
})();
