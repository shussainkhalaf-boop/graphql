// app.js — ES module entry
import { mountAuthUI, isAuthed } from "./auth.js";
import {
  fetchUserBasic,
  fetchUserAuditRatio,
  fetchXpTransactions,
  fetchRecentProgress,
  fetchRecentResults,
  fetchObjectsByIds,
} from "./graphql.js";
import {
  setText,
  setList,
  formatDate,
  sumBy,
  groupBy,
  toPairs,
  parseISO,
  clearSvg,
  niceNumber,
} from "./utils.js";
import { drawXpLineChart, drawDonut } from "./charts.js";

/* ---------------- Small helpers ---------------- */
function setStatus(svgEl, msg) {
  clearSvg(svgEl);
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", "50%");
  t.setAttribute("y", "50%");
  t.setAttribute("text-anchor", "middle");
  t.textContent = msg;
  svgEl.appendChild(t);
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/* --------------- Render sections --------------- */
async function renderBasicInfo() {
  const me = await fetchUserBasic(); // normal query
  setText("userId", me?.id ?? "—");
  setText("userLogin", me?.login ?? "—");

  const auditRatio = await fetchUserAuditRatio();
  setText("auditRatio", auditRatio == null ? "—" : `${(auditRatio * 100).toFixed(1)}%`);
}

async function renderXpAndCharts() {
  const xpSvg = document.getElementById("xpOverTime");
  const pfSvg = document.getElementById("passFailRatio");

  setStatus(xpSvg, "Loading…");
  setStatus(pfSvg, "Loading…");

  // XP transactions (type 'xp')
  const tx = await fetchXpTransactions({ limit: 1000 });

  // Total XP
  const totalXp = sumBy(tx, (t) => t.amount);
  setText("totalXp", niceNumber(totalXp));

  // Build cumulative daily series for the line chart
  const byDay = groupBy(tx, (t) => String(t.createdAt || "").slice(0, 10)); // YYYY-MM-DD
  const dayPairs = toPairs(byDay)
    .map(([day, arr]) => ({ day, sum: sumBy(arr, (t) => t.amount) }))
    .sort((a, b) => a.day.localeCompare(b.day));

  let running = 0;
  const xpSeries = dayPairs.map(({ day, sum }) => {
    running += sum;
    return { date: parseISO(day), value: running };
  });

  clearSvg(xpSvg);
  if (xpSeries.length) {
    drawXpLineChart(xpSvg, xpSeries);
  } else {
    setStatus(xpSvg, "No XP data yet.");
  }

  // Recent grades (prefer progress; fallback to result if empty)
  let progress = await fetchRecentProgress({ limit: 50 });
  if (!progress?.length) {
    const results = await fetchRecentResults({ limit: 50 }); // nested query usage
    progress = results.map(r => ({
      id: r.id,
      objectId: r.objectId,
      grade: r.grade,
      createdAt: r.createdAt,
      path: r.path,
    }));
  }

  // Grades list
  const items = progress.map((p) => ({
    when: formatDate(p.createdAt),
    grade: Number(p.grade) === 1 ? "PASS" : "FAIL",
    path: p.path || `#${p.objectId}`,
  }));
  setList("gradesList", items, (it) => {
    const ok = it.grade === "PASS";
    return `
      <span>${it.path}</span>
      <span class="${ok ? '' : 'muted'}">${it.grade}</span>
      <span class="muted">${it.when}</span>
    `;
  });

  // Pass/Fail donut
  const pass = progress.filter((p) => Number(p.grade) === 1).length;
  const fail = clamp(progress.length - pass, 0, Number.MAX_SAFE_INTEGER);
  clearSvg(pfSvg);
  drawDonut(pfSvg, pass, fail);

  // "Skills (Top)" — show top projects by XP (arguments query via object lookup)
  const byObject = groupBy(tx.filter(t => Number.isFinite(Number(t.objectId))), (t) => t.objectId);
  const topPairs = toPairs(byObject)
    .map(([objectId, arr]) => ({ objectId: Number(objectId), xp: sumBy(arr, a => a.amount) }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

  if (topPairs.length) {
    const ids = topPairs.map(p => p.objectId);
    const objs = await fetchObjectsByIds(ids); // query with arguments
    const nameById = new Map(objs.map(o => [o.id, o.name || `(object ${o.id})`]));
    setList("skillsList", topPairs, (p) => {
      const name = nameById.get(p.objectId) || `(object ${p.objectId})`;
      return `<span>${name}</span><span class="muted">${niceNumber(p.xp)} XP</span>`;
    });
  } else {
    setList("skillsList", []);
  }
}

async function loadProfile() {
  try {
    await renderBasicInfo();
  } catch (e) {
    console.error("Basic info error:", e);
    setText("userId", "—");
    setText("userLogin", "—");
    setText("auditRatio", "—");
  }

  try {
    await renderXpAndCharts();
  } catch (e) {
    console.error("Data/charts error:", e);
    // Graceful fallbacks on visible charts/sections
    const xpSvg = document.getElementById("xpOverTime");
    const pfSvg = document.getElementById("passFailRatio");
    setStatus(xpSvg, "Failed to load XP data");
    setStatus(pfSvg, "Failed to load ratio");
    setList("gradesList", []);
    setList("skillsList", []);
    setText("totalXp", "—");
  }
}

/* -------------------- Boot -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Wire the login/logout UI and initial state
  mountAuthUI();

  // If already authed, load profile
  if (isAuthed()) loadProfile();

  // React to auth changes
  document.addEventListener("auth:signin", loadProfile);
  document.addEventListener("auth:signout", () => {
    // Clear visible data on logout
    clearSvg(document.getElementById("xpOverTime"));
    clearSvg(document.getElementById("passFailRatio"));
    setText("userId", "—");
    setText("userLogin", "—");
    setText("auditRatio", "—");
    setText("totalXp", "—");
    setList("gradesList", []);
    setList("skillsList", []);
  });
});
