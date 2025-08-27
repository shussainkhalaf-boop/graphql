// app.js — robust signin + accurate XP/PassFail

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

// ---- Signin (robust) ----
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
    try {
      const obj = JSON.parse(jwt);
      jwt = (obj.token || obj.jwt || obj.accessToken || "").trim();
    } catch {}
  }
  jwt = jwt.replace(/^"|"$/g, "");
  const looksLikeJwt = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(jwt);
  if (!looksLikeJwt) throw new Error("Signin did not return a valid JWT");
  return jwt;
}

// ---- GraphQL fetch ----
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

// Accurate XP total (no truncation)
const Q_XP_SUM = `
query XPsum($uid:Int!){
  transaction_aggregate(
    where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
  ){
    aggregate{ sum{ amount } }
  }
}`;

// XP list for timeline
const Q_XP_LIST = `
query XP($uid:Int!, $limit:Int!){
  transaction(
    where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
    order_by:{ createdAt: asc }
    limit: $limit
  ){
    amount createdAt
  }
}`;

// Latest result per object (dedupe retries)
const Q_RESULTS_LATEST = `
query LatestResults($uid:Int!){
  result(
    where:{ userId:{_eq:$uid} }
    order_by: [{objectId: asc}, {createdAt: desc}]
    distinct_on: objectId
  ){
    objectId grade createdAt type
  }
}`;

// Latest progress per object (for cards)
const Q_PROGRESS_LATEST = `
query LatestProgress($uid:Int!){
  progress(
    where:{ userId:{_eq:$uid} }
    order_by:[{objectId: asc}, {createdAt: desc}]
    distinct_on: objectId
  ){
    objectId grade createdAt path userId
  }
}`;

const Q_OBJECTS = `
query O($ids:[Int!]){
  object(where:{ id:{ _in:$ids } }){ id type name }
}`;

// ---- Helpers ----
function fmtDate(s){ return new Date(s).toLocaleString(); }

// ---- Main loader ----
async function loadAll(){
  // User basics
  const u = await gql(Q_USER);
  const user = (u && u.user && u.user[0]) || null;
  if(!user) throw new Error("Cannot read user");
  el("u-id").textContent = user.id;
  el("u-login").textContent = user.login;
  el("u-first").textContent = user.firstName || "-";
  el("u-last").textContent = user.lastName || "-";
  const hero = document.getElementById("hero-name");
  if (hero) hero.textContent = (user.login || "User") + " • Profile";

  // XP accurate total
  const xpSumData = await gql(Q_XP_SUM, { uid: user.id });
  const xpTotal = (xpSumData.transaction_aggregate.aggregate.sum.amount) || 0;
  const xpTotalEl = document.getElementById("xp-total");
  if (xpTotalEl) xpTotalEl.textContent = xpTotal.toLocaleString();

  // XP timeline
  const xpList = await gql(Q_XP_LIST, { uid: user.id, limit: 5000 });
  const series = (() => {
    const byDay = {};
    (xpList.transaction || []).forEach(x=>{
      const d = new Date(x.createdAt).toISOString().slice(0,10); // UTC bucket
      byDay[d] = (byDay[d] || 0) + (x.amount || 0);
    });
    return Object.entries(byDay)
      .sort((a,b)=> a[0].localeCompare(b[0]))
      .map(([x,y])=>({ x, y }));
  })();
  if (window.drawLineChart) drawLineChart("#svg-xp", series, { yLabel: "XP" });

  // Pass/Fail using latest result per object
  const latest = await gql(Q_RESULTS_LATEST, { uid: user.id });
  const rows = latest.result || [];
  const passed = rows.filter(r=>r.grade === 1).length;
  const failed = rows.filter(r=>r.grade === 0).length;
  const passedEl = document.getElementById("passed-count");
  const failedEl = document.getElementById("failed-count");
  const auditEl = document.getElementById("audit-ratio");
  if (passedEl) passedEl.textContent = passed;
  if (failedEl) failedEl.textContent = failed;
  if (auditEl) auditEl.textContent = (passed+failed) ? (passed/(passed+failed)).toFixed(2) : "-";
  if (window.drawDonut) drawDonut("#svg-ratio", [
    { label: "PASS", value: passed, cls: "slice-pass" },
    { label: "FAIL", value: failed, cls: "slice-fail" }
  ]);

  // Projects (latest per object) + types bar
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
  if (window.drawBarChart) drawBarChart("#svg-type", typeData);

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
  const identity = document.getElementById("identity").value.trim();
  const password = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;
  const btn = document.getElementById("btn-login");
  btn.disabled = true; btn.textContent = "Signing in...";
  try{
    const jwt = await signin(identity, password);
    if (remember) localStorage.setItem(TOKEN_KEY, jwt);
    else sessionStorage.setItem(TOKEN_KEY, jwt);
    localStorage.setItem(TOKEN_KEY, jwt);
    setScreen(true);
    await loadAll();
  }catch(err){
    $err.textContent = (""+err.message).slice(0,400);
    $err.classList.remove("hidden");
  }finally{
    btn.disabled = false; btn.textContent = "Get JWT";
  }
});

$btnLogout.addEventListener("click", ()=>{
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  setScreen(false);
  ["u-id","u-login","u-first","u-last","xp-total","audit-ratio","passed-count","failed-count"]
    .forEach(id => { const n=document.getElementById(id); if(n) n.textContent = "-"; });
  const xpSvg=document.querySelector("#svg-xp");
  const ratioSvg=document.querySelector("#svg-ratio");
  const typeSvg=document.querySelector("#svg-type");
  const proj=document.querySelector("#projects");
  if (xpSvg) xpSvg.innerHTML=""; if (ratioSvg) ratioSvg.innerHTML="";
  if (typeSvg) typeSvg.innerHTML=""; if (proj) proj.innerHTML="";
});

// ---- Boot ----
(function init(){
  const jwt = localStorage.getItem(TOKEN_KEY);
  if (jwt && parseJwt(jwt)) {
    setScreen(true);
    loadAll().catch(err=>{ console.error(err); localStorage.removeItem(TOKEN_KEY); setScreen(false); });
  } else setScreen(false);
})();
