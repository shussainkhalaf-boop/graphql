// app.js
const $ = (id) => document.getElementById(id);
function setStatus(msg, isError = false) {
  const el = $("signinStatus");
  if (el) {
    el.textContent = msg;
    el.style.color = isError ? "#ff9aa5" : "";
  }
}
function formatNumber(n) {
  return new Intl.NumberFormat().format(Math.round(n || 0));
}
function dayKey(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}
function extractProjectName(path) {
  if (!path) return "Unknown";
  const parts = path.split("/").filter(Boolean);
  let last = parts[parts.length - 1] || "Unknown";
  if (/^(ex|exercise)?\d+$/i.test(last)) last = parts[parts.length - 2] || last;
  return last;
}
function getToken() {
  const v = localStorage.getItem("JWT") || "";
  return v && v.split(".").length === 3 ? v : "";
}

const GRAPHQL_URL = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

async function gql(query) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${getToken()}` },
    body: JSON.stringify({ query }),
  });
  const j = await res.json();
  if (j.errors) throw new Error(j.errors.map(e => e.message).join("; "));
  return j.data;
}

const QUERY_ME = `query{ user{ id login auditRatio } }`;
const QUERY_XP = `query{ transaction(where:{type:{_eq:"xp"}},order_by:{createdAt:asc}){amount createdAt path} }`;

async function loadAll() {
  setStatus("Loading...");
  const [me, xp] = await Promise.all([gql(QUERY_ME), gql(QUERY_XP)]);

  const u = Array.isArray(me.user) ? me.user[0] : me.user;
  $("userLogin").textContent = u?.login ?? "—";
  $("userId").textContent = u?.id ?? "—";
  $("auditRatio").textContent = u?.auditRatio?.toFixed(2) ?? "—";

  const tx = xp.transaction || [];
  const totalXp = tx.reduce((s, t) => s + (t.amount || 0), 0);
  $("totalXp").textContent = formatNumber(totalXp);

  const perDay = {};
  tx.forEach(t => { perDay[dayKey(t.createdAt)] = (perDay[dayKey(t.createdAt)] || 0) + t.amount; });
  const points = Object.entries(perDay).map(([k, v], i) => ({ x: i, y: v }));
  drawAreaChart($("xpChart"), points);

  const bag = {};
  tx.forEach(t => { const name = extractProjectName(t.path); bag[name] = (bag[name] || 0) + t.amount; });
  const top10 = Object.entries(bag).map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value).slice(0, 10);
  $("projectsCount").textContent = Object.keys(bag).length;
  drawBarChart($("projectsChart"), top10);

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
  if (getToken()) loadAll().catch(e => setStatus(e.message, true));
  else setStatus("Missing JWT", true);
})();
