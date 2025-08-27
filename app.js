// same as previous neon version JS (no image refs), kept for brevity
// Neon version JS (ASCII only)
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
function parseJwt(token){ try{ return JSON.parse(b64urlDecode(token.split(".")[1])); }catch{return null;} }

async function signin(identity, password) {
  const basic = btoa(identity + ":" + password);
  const res = await fetch(SIGNIN_URL, { method: "POST", headers: { authorization: "Basic " + basic } });
  if (!res.ok) { const text = await res.text(); throw new Error(text || "Signin failed (" + res.status + ")"); }
  return await res.text();
}
async function gql(query, variables={}){
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type":"application/json", authorization: "Bearer " + token },
    body: JSON.stringify({ query, variables })
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors.map(e=>e.message).join("; "));
  return data.data;
}

// Queries
const Q_USER = "{ user { id login firstName lastName } }";
const Q_XP = `query XP($uid:Int!,$limit:Int!){ transaction(where:{userId:{_eq:$uid}, type:{_eq:"xp"}}, order_by:{createdAt:asc}, limit:$limit){ amount createdAt objectId path } }`;
const Q_RESULTS = "{ result(order_by:{createdAt:desc}, limit:200){ id grade type createdAt objectId user{ id login } } }";
const Q_PROGRESS = "query P($limit:Int!){ progress(order_by:{createdAt:desc}, limit:$limit){ objectId grade createdAt path userId } }";
const Q_OBJECTS = "query O($ids:[Int!]){ object(where:{ id:{ _in:$ids } }){ id type name } }";

function fmtDate(s){ return new Date(s).toLocaleString(); }

async function loadAll(){
  const u = await gql(Q_USER);
  const user = (u && u.user && u.user[0]) || null;
  if(!user) throw new Error("Cannot read user");
  el("u-id").textContent = user.id; el("u-login").textContent = user.login;
  el("u-first").textContent = user.firstName || "-"; el("u-last").textContent = user.lastName || "-";
  el("hero-name").textContent = user.login + " • Profile";

  const xpData = await gql(Q_XP, { uid: user.id, limit: 900 });
  const xp = xpData.transaction || [];
  const total = xp.reduce((s,x)=> s + (x.amount||0), 0);
  el("xp-total").textContent = total.toLocaleString();

  // series
  const byDay = {};
  xp.forEach(x=>{ const d=new Date(x.createdAt).toISOString().slice(0,10); byDay[d]=(byDay[d]||0)+x.amount; });
  const series = Object.entries(byDay).sort((a,b)=> a[0].localeCompare(b[0]))
                 .map(([date,value])=>({x:date,y:value}));
  drawLineChart("#svg-xp", series, { yLabel: "XP" });

  // results
  const r = await gql(Q_RESULTS);
  const results = r.result || [];
  const passed = results.filter(x=>x.grade===1).length;
  const failed = results.filter(x=>x.grade===0).length;
  el("passed-count").textContent = passed; el("failed-count").textContent = failed;
  el("audit-ratio").textContent = passed+failed>0 ? (passed/(passed+failed)).toFixed(2) : "-";
  drawDonut("#svg-ratio", [
    {label:"PASS", value:passed, cls:"slice-pass"},
    {label:"FAIL", value:failed, cls:"slice-fail"}
  ]);

  // progress + objects (project cards + bar chart)
  const pr = await gql(Q_PROGRESS, { limit: 24 });
  const items = pr.progress || [];
  const projBox = document.getElementById("projects"); projBox.innerHTML = "";
  const ids = Array.from(new Set(items.map(it=>it.objectId))).slice(0,120);
  let objMap = {};
  if (ids.length) {
    const objs = await gql(Q_OBJECTS, { ids });
    (objs.object || []).forEach(o => objMap[o.id] = o);
  }
  // Bar chart
  const typeCount = {};
  items.forEach(it=>{ const t=(objMap[it.objectId] && objMap[it.objectId].type) || "unknown"; typeCount[t]=(typeCount[t]||0)+1; });
  const typeData = Object.entries(typeCount).map(([label,value])=>({label,value}));
  drawBarChart("#svg-type", typeData);

  // project cards
  items.slice(0,12).forEach(it=>{
    const o = objMap[it.objectId];
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML =
      '<div class="title">' + (o ? o.name : "Object " + it.objectId) + '</div>' +
      '<div class="meta">id: ' + it.objectId + ' — type: ' + ((o && o.type) || "n/a") + "</div>" +
      '<div class="meta">grade: ' + it.grade + "</div>" +
      '<div class="meta">' + (it.path||"") + "</div>" +
      '<div class="meta">' + fmtDate(it.createdAt) + "</div>";
    projBox.appendChild(div);
  });
}

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
    $err.textContent = (""+err.message).slice(0,300);
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
    .forEach(id => (document.getElementById(id).textContent = "-"));
  document.querySelector("#svg-xp").innerHTML = "";
  document.querySelector("#svg-ratio").innerHTML = "";
  document.querySelector("#svg-type").innerHTML = "";
  document.querySelector("#projects").innerHTML = "";
});

(function init(){
  const jwt = localStorage.getItem(TOKEN_KEY);
  if (jwt && parseJwt(jwt)) { setScreen(true); loadAll().catch(err=>{ console.error(err); localStorage.removeItem(TOKEN_KEY); setScreen(false); }); }
  else setScreen(false);
})();
