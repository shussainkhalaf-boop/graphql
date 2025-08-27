// app.js — single-file fix (no UI changes)
(function () {
  const $ = (id) => document.getElementById(id);

  function setStatus(msg, isError = false) {
    const el = $("signinStatus");
    if (!el) return console.log("[status]", msg);
    el.textContent = msg || "";
    el.style.color = isError ? "#ff9aa5" : "";
  }

  function formatNumber(n) {
    return new Intl.NumberFormat().format(Math.round(n || 0));
  }

  function dayKey(iso) {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  }

  function extractProjectName(path) {
    if (!path || typeof path !== "string") return "Unknown";
    const parts = path.split("/").filter(Boolean);
    let last = parts[parts.length - 1] || "Unknown";
    // If last looks like ex00/ex12/etc, use the parent folder as project name
    if (/^(ex|exercise)?\d+$/i.test(last)) last = parts[parts.length - 2] || last;
    return last;
  }

  function getToken() {
    const keys = ["JWT", "jwt", "token", "authToken"];
    for (const k of keys) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v && v.split(".").length === 3) return v;
    }
    const m = (document.cookie || "").match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    return m ? m[0] : "";
  }

  const GRAPHQL_URL = (window.CONFIG && window.CONFIG.GRAPHQL_URL) ||
    "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

  async function gql(query) {
    const token = getToken();
    if (!token) throw new Error("Missing JWT in localStorage/session/cookie.");
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(text || `HTTP ${res.status}`); }
    if (!res.ok) throw new Error(json.error || text || `HTTP ${res.status}`);
    if (json.errors) throw new Error(json.errors.map(e => e.message).join("; "));
    return json.data;
  }

  const Q_ME = `query{ user{ id login auditRatio } }`;
  const Q_XP = `query{
    transaction(where:{type:{_eq:"xp"}}, order_by:{createdAt:asc}){
      amount createdAt path
    }
  }`;

  async function loadAll() {
    setStatus("Loading...");

    // Ensure required SVGs are present
    const xpSvg = $("xpChart");
    const prjSvg = $("projectsChart");
    if (!xpSvg || !prjSvg) {
      setStatus("Missing #xpChart and/or #projectsChart in HTML.", true);
      return;
    }

    // Fetch data
    const [me, xp] = await Promise.all([gql(Q_ME), gql(Q_XP)]);

    // User
    const u = Array.isArray(me.user) ? me.user[0] : me.user;
    if ($("userLogin")) $("userLogin").textContent = u?.login ?? "—";
    if ($("userId")) $("userId").textContent = u?.id ?? "—";
    if ($("auditRatio")) $("auditRatio").textContent =
      (u?.auditRatio != null ? Number(u.auditRatio).toFixed(2) : "—");

    // Transactions (XP)
    const tx = xp.transaction || [];

    // Total XP
    const totalXp = tx.reduce((s, t) => s + (t.amount || 0), 0);
    if ($("totalXp")) $("totalXp").textContent = formatNumber(totalXp);

    // XP by day (area chart)
    const perDay = {};
    for (const t of tx) {
      const k = dayKey(t.createdAt);
      perDay[k] = (perDay[k] || 0) + (t.amount || 0);
    }
    const points = Object.entries(perDay)
      .sort((a, b) => a[0] < b[0] ? -1 : 1)
      .map(([k, v], i) => ({ x: i, y: v }));

    if (typeof window.drawAreaChart === "function") {
      window.drawAreaChart(xpSvg, points);
    } else {
      setStatus("graphs.js not loaded (drawAreaChart missing).", true);
    }

    // Projects (top 10 by total XP)
    const bag = {};
    for (const t of tx) {
      const name = extractProjectName(t.path);
      bag[name] = (bag[name] || 0) + (t.amount || 0);
    }
    const allProjects = Object.entries(bag)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    if ($("projectsCount")) $("projectsCount").textContent = String(Object.keys(bag).length || 0);

    const top10 = allProjects.slice(0, 10);
    if (typeof window.drawBarChart === "function") {
      window.drawBarChart(prjSvg, top10);
    } else {
      setStatus("graphs.js not loaded (drawBarChart missing).", true);
    }

    // Optional: projects list if present in your HTML
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

  document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = $("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", () => {
      ["JWT", "jwt", "token", "authToken"].forEach(k => {
        localStorage.removeItem(k); sessionStorage.removeItem(k);
      });
      setStatus("Logged out.");
    });

    const token = getToken();
    if (!token) {
      setStatus("Missing JWT. Run: localStorage.setItem('JWT','PASTE.YOUR.JWT.HERE'); then reload.", true);
      return;
    }
    loadAll().catch(err => { console.error(err); setStatus(err.message || String(err), true); });
  });
})();
