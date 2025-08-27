// Minimal, robust frontend for Reboot01 profile (no external libs).
// 1) Sign in via worker (preferred) or use an existing JWT.
// 2) Query GraphQL for user, XP, projects.
// 3) Render SVG charts using graphs.js.

const qs = (sel) => document.querySelector(sel);
const $ = (id) => document.getElementById(id);

const STATE = {
  token: localStorage.getItem("JWT") || "",
  workerBase: (window.CONFIG && window.CONFIG.WORKER_BASE) || "",
  graphqlUrl: (window.CONFIG && window.CONFIG.GRAPHQL_URL) || "",
};

function setStatus(msg, isError=false){
  const box = $("signinStatus");
  box.textContent = msg || "";
  box.style.color = isError ? "#ff9aa5" : "#9cd67c";
}

function saveToken(jwt){
  STATE.token = jwt;
  localStorage.setItem("JWT", jwt);
}

function authHeaders(){
  return STATE.token ? {"Authorization": `Bearer ${STATE.token}`} : {};
}

async function httpJson(url, options={}){
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : {}; } catch(e){ /* not json */ }
  if (!res.ok){
    const msg = data && data.error ? data.error : text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return {res, data, text};
}

// Sign-in flow:
// - If workerBase is set, POST {login, password} to `${workerBase}/signin`
//   The worker should return 200 and include an Authorization header with JWT.
// - Otherwise, user can paste a valid JWT into the password field (advanced).
async function handleSignin(e){
  e.preventDefault();
  const login = $("login").value.trim();
  const password = $("password").value;

  try {
    setStatus("Signing in...");
    $("signinBtn").disabled = true;

    if (STATE.workerBase){
      const url = STATE.workerBase.replace(/\/$/, "") + "/signin";
      const {res, data, text} = await httpJson(url, {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({login, password})
      });
      // JWT from header or body
      const hAuth = res.headers.get("authorization") || res.headers.get("Authorization") || "";
      let jwt = "";
      if (hAuth && /bearer\s+/i.test(hAuth)) jwt = hAuth.split(/\s+/).pop();
      if (!jwt){
        // try body
        jwt = (data && data.token) || (data && data.jwt) || "";
        if (!jwt){
          // last attempt: text search
          jwt = (text.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)||[])[0] || "";
        }
      }
      if (!jwt || !jwt.includes(".")){
        throw new Error("Could not extract JWT from sign-in response.");
      }
      saveToken(jwt);
      setStatus("Signed in successfully.");
    } else {
      // expert mode: treat password field as raw JWT
      if (password.split(".").length === 3){
        saveToken(password);
        setStatus("JWT saved locally.");
      } else {
        throw new Error("Worker is not configured. Set WORKER_BASE or paste a valid JWT as password.");
      }
    }

    await loadAll();
  } catch (err){
    console.error(err);
    setStatus("Sign-in failed: " + err.message, true);
  } finally {
    $("signinBtn").disabled = false;
  }
}

function logout(){
  localStorage.removeItem("JWT");
  STATE.token = "";
  setStatus("Logged out.");
  ["userLogin","userId","totalXp","auditRatio","projectsCount"].forEach(id=>$(id).textContent = "—");
  $("projectsList").innerHTML = "";
  window.drawAreaChart($("xpChart"), []);
  window.drawBarChart($("projectsChart"), []);
}

async function gql(query, variables={}){
  const body = JSON.stringify({query, variables});
  const url = STATE.workerBase ? STATE.workerBase.replace(/\/$/, "") + "/graphql" : STATE.graphqlUrl;
  const {data} = await httpJson(url, {
    method: "POST",
    headers: {"content-type":"application/json", ...authHeaders()},
    body
  });
  if (data.errors){
    throw new Error(data.errors.map(e=>e.message).join("; "));
  }
  return data.data || data;
}

// GraphQL queries (Hasura-like schema)
const QUERY_USER = `
query Me {
  user {
    id
    login
    auditRatio
  }
}
`;

const QUERY_XP = `
query XpByDay {
  transaction(where: {type: {_eq: "xp"}}, order_by: {createdAt: asc}) {
    amount
    createdAt
    path
  }
}
`;

const QUERY_PROJECTS = `
query MyProjects {
  transaction(where: {type: {_eq: "xp"}}, order_by: {amount: desc}, limit: 20) {
    amount
    path
    createdAt
  }
}
`;

function formatNumber(n){
  return new Intl.NumberFormat().format(Math.round(n));
}

function dayKey(iso){
  const d = new Date(iso);
  return d.toISOString().slice(0,10);
}

function extractProjectName(path){
  // typical path example: /johndoe/div-01/c-piscine-js/ex00
  if (!path || typeof path !== "string") return "Unknown";
  const parts = path.split("/").filter(Boolean);
  // last project folder under cohort - heuristic: take last non-numeric-ish
  const last = parts[parts.length-1];
  const name = last || parts.at(-2) || "Unknown";
  return name;
}

async function loadAll(){
  if (!STATE.token){
    setStatus("Please sign in to load data.", true);
    return;
  }
  setStatus("Loading data...");
  try {
    const [me, xp, prj] = await Promise.all([
      gql(QUERY_USER),
      gql(QUERY_XP),
      gql(QUERY_PROJECTS),
    ]);

    // User
    const user = me.user && me.user[0] ? me.user[0] : (Array.isArray(me.user)? me.user[0] : me.user);
    $("userLogin").textContent = user?.login || "—";
    $("userId").textContent   = user?.id ?? "—";
    $("auditRatio").textContent = (user?.auditRatio != null) ? Number(user.auditRatio).toFixed(2) : "—";

    // XP totals & chart
    const tx = xp.transaction || [];
    const totalXp = tx.reduce((sum,t)=>sum + (t.amount||0), 0);
    $("totalXp").textContent = formatNumber(totalXp);

    const grouped = {};
    for (const t of tx){
      const k = dayKey(t.createdAt);
      grouped[k] = (grouped[k]||0) + (t.amount||0);
    }
    const points = Object.entries(grouped)
      .sort((a,b)=>a[0]<b[0]?-1:1)
      .map(([k,v],i)=>({x:i, y:v}));
    drawAreaChart($("xpChart"), points);

    // Projects list + bar chart
    const items = {};
    for (const t of prj.transaction || []){
      const name = extractProjectName(t.path);
      items[name] = (items[name]||0) + (t.amount||0);
    }
    const top = Object.entries(items)
      .map(([label,value])=>({label, value}))
      .sort((a,b)=>b.value-a.value)
      .slice(0,10);
    $("projectsCount").textContent = Object.keys(items).length || "0";
    drawBarChart($("projectsChart"), top);

    const list = $("projectsList");
    list.innerHTML = "";
    top.forEach(it=>{
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `<div class="left"><span class="tag">${it.label}</span></div><div>${formatNumber(it.value)} XP</div>`;
      list.appendChild(el);
    });

    setStatus("Done.");
  } catch (err){
    console.error(err);
    setStatus("Load failed: " + err.message, true);
  }
}

function init(){
  $("signinForm").addEventListener("submit", handleSignin);
  $("logoutBtn").addEventListener("click", logout);
  if (STATE.token){
    loadAll();
  }
}
init();
