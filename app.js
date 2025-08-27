// app.js — fetch data, compute stats, render charts

const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);

function formatNumber(n) {
  return new Intl.NumberFormat().format(Math.round(n || 0));
}

function getToken() {
  const keys = ["JWT", "jwt", "token", "authToken"];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v && v.split(".").length === 3) return v;
  }
  const m = (document.cookie || "").match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (m) return m[0];
  return "";
}

function setStatus(msg, isError = false) {
  const el = $("signinStatus") || qs(".status");
  if (el) {
    el.textContent = msg || "";
    el.style.color = isError ? "#ff9aa5" : "";
  }
}

function dayKey(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function extractProjectName(path) {
  if (!path || typeof path !== "string") return "Unknown";
  const parts = path.split("/").filter(Boolean);
  let last = parts[parts.length - 1] || "Unknown";
  if (/^(ex|exercise)?\d+$/i.test(last)) {
    last = parts[parts.length - 2] || last;
  }
  return last;
}

const GRAPHQL_URL = (window.CONFIG && window.CONFIG.GRAPHQL_URL) ||
  "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

async function gql(query, variables = {}) {
  const token = getToken();
  if (!token) throw new Error("Missing JWT.");
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(text || `HTTP ${res.status}`); }
  if (!res.ok) throw new Error(json.error || text || `HTTP ${res.status}`);
  if (json.errors) throw new Error(json.errors.map(e => e.message).join("; "));
  return json.data;
}

const QUERY_ME = `
query {
  user { id login auditRatio }
}
`;

const QUERY_XP = `
query {
  transaction(where: {type: {_eq: "xp"}}, order_by: {createdAt: asc}) {
    amount createdAt path
  }
}
`;

const QUERY_TOP = `
query {
  transaction(where: {type: {_eq: "xp"}}, order_by: {amount: desc}, limit: 200) {
    amount path createdAt
  }
}
`;

async function loadAll() {
  setStatus("Loading...");
  const [me, xp, top] = await Promise.all([
    gql(QUERY_ME),
    gql(QUERY_XP),
    gql(QUERY_TOP),
  ]);

  const u = Array.isArray(me.user) ? me.user[0] : me.user;
  if ($("userLogin")) $("userLogin").textContent = u?.login ?? "—";
  if ($("userId")) $("userId").textContent = u?.id ?? "—";
  if ($("auditRatio")) $("auditRatio").textContent =
    (u?.auditRatio != null ? Number(u.auditRatio).toFixed(2) : "—");

  const tx = xp.transaction || [];
  const totalXp = tx.reduce((s, t) => s + (t.amount || 0), 0);
  if ($("totalXp")) $("totalXp").textContent = formatNumber(totalXp);

  const perDay = {};
  for (const t of tx) {
    const k = dayKey(t.createdAt);
    perDay[k] = (perDay[k] || 0) + (t.amount || 0);
  }
  const points = Object.entries(perDay)
    .sort((a, b) => a[0] < b[0] ? -1 : 1)
    .map(([k, v], i) => ({ x: i, y: v }));
  if (window.drawAreaChart && $("xpChart")) {
    window.drawAreaChart($("xpChart"), points);
  }

  const bag = {};
  for (const t of (top.transaction || [])) {
    const name = extractProjectName(t.path);
    bag[name] = (bag[name] || 0) + (t.amount || 0);
  }
  const list = Object.entries(bag)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  if ($("projectsCount")) $("projectsCount").textContent = String(Object.keys(bag).length || 0);
  const top10 = list.slice(0, 10);
  if (window.drawBarChart && $("projectsChart")) {
    window.drawBarChart($("projectsChart"), top10);
  }
  const listEl = $("projectsList");
  if (listEl) {
    listEl.innerHTML = "";
    top10.forEach(it => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<div class="left"><span class="tag">${it.label}</span></div><div>${formatNumber(it.value)} XP</div>`;
      listEl.appendChild(div);
    });
  }
  setStatus("Done.");
}

(function init() {
  const lb = $("logoutBtn");
  if (lb) lb.addEventListener("click", () => {
    ["JWT", "jwt", "token", "authToken"].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k);
    });
    setStatus("Logged out.");
    ["userLogin","userId","totalXp","auditRatio","projectsCount"].forEach(id => { if ($(id)) $(id).textContent = "—"; });
    if ($("projectsList")) $("projectsList").innerHTML = "";
    if (window.drawAreaChart && $("xpChart")) window.drawAreaChart($("xpChart"), []);
    if (window.drawBarChart && $("projectsChart")) window.drawBarChart($("projectsChart"), []);
  });

  if (!getToken()) setStatus("Sign in first (token not found).", true);
  else loadAll().catch(e => setStatus(e.message, true));
})();
