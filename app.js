// app.js — renders numbers + charts using GraphQL.gql (no design changes)

(function () {
  const $ = (id) => document.getElementById(id);
  const setStatus = (msg, isError = false) => {
    const el = $("signinStatus");
    if (el) { el.textContent = msg || ""; el.style.color = isError ? "#ff9aa5" : ""; }
    else console.log("[status]", msg);
  };

  function formatNumber(n) { return new Intl.NumberFormat().format(Math.round(n || 0)); }
  const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);
  function extractProjectName(path) {
    if (!path || typeof path !== "string") return "Unknown";
    const parts = path.split("/").filter(Boolean);
    let last = parts[parts.length - 1] || "Unknown";
    if (/^(ex|exercise)?\d+$/i.test(last)) last = parts[parts.length - 2] || last;
    return last;
  }

  // SVG fallbacks if graphs.js is not present (no design changes)
  function clearSvg(svg) { while (svg && svg.firstChild) svg.removeChild(svg.firstChild); }
  function mk(tag, attrs = {}, parent = null) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (parent) parent.appendChild(el);
    return el;
  }
  function scale(v, d0, d1, r0, r1) { if (d1 === d0) return (r0 + r1) / 2; return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0); }
  function axes(svg, pad) {
    const g = mk("g", { stroke: "#2b3f5b", "stroke-width": "1", fill: "none" }, svg);
    mk("line", { x1: pad, y1: 200 - pad, x2: 600 - pad, y2: 200 - pad }, g);
    mk("line", { x1: pad, y1: 20, x2: pad, y2: 200 - pad }, g);
  }
  function drawAreaFallback(svg, points) {
    clearSvg(svg); if (!svg || !points?.length) return;
    const pad = 36, xs = points.map(p => p.x), ys = points.map(p => p.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs), yMax = Math.max(10, Math.max(...ys));
    axes(svg, pad);
    const path = mk("path", { fill: "#173c6a", stroke: "#2c7be5", "stroke-width": "1.5", "fill-opacity": "0.4" }, svg);
    let d = "";
    points.forEach((p, i) => {
      const px = scale(p.x, xMin, xMax, pad, 600 - pad);
      const py = scale(p.y, 0, yMax, 200 - pad, 20);
      d += i ? ` L ${px} ${py}` : `M ${px} ${py}`;
    });
    const lastX = scale(points[points.length - 1].x, xMin, xMax, pad, 600 - pad);
    const firstX = scale(points[0].x, xMin, xMax, pad, 600 - pad);
    const baseY = 200 - pad;
    d += ` L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    path.setAttribute("d", d);
  }
  function drawBarsFallback(svg, items) {
    clearSvg(svg); if (!svg || !items?.length) return;
    const pad = 36, w = 600 - pad * 2, h = 200 - pad * 2;
    const max = Math.max(10, Math.max(...items.map(i => i.value)));
    const gap = 8, bw = Math.max(8, (w - gap * (items.length - 1)) / items.length);
    axes(svg, pad);
    const g = mk("g", {}, svg);
    items.forEach((it, i) => {
      const x = pad + i * (bw + gap);
      const colH = (it.value / max) * h;
      const y = pad + (h - colH);
      const r = mk("rect", { x, y, width: bw, height: colH, fill: "#2c7be5", rx: 4 }, g);
      mk("title", {}, r).textContent = `${it.label}: ${it.value}`;
    });
  }

  // Prefer graphs.js if loaded
  const drawArea = typeof window.drawAreaChart === "function" ? window.drawAreaChart : drawAreaFallback;
  const drawBars = typeof window.drawBarChart === "function" ? window.drawBarChart : drawBarsFallback;

  async function fetchUser() {
    const d = await window.GraphQL.gql(window.GraphQL.Q.USER);
    const u = Array.isArray(d.user) ? d.user[0] : d.user;
    if (!u) throw new Error("No user returned.");
    return u;
  }

  async function fetchXP() {
    const Q = window.GraphQL.Q;
    // Try primary
    try { const d = await window.GraphQL.gql(Q.TX_PRIMARY); if (d.transaction) return d.transaction; } catch {}
    // Alternate
    try { const d = await window.GraphQL.gql(Q.TX_ALT); if (d.transactions) return d.transactions; } catch {}
    // No filter primary
    try { const d = await window.GraphQL.gql(Q.TX_NOFILTER_PRIMARY); if (d.transaction) return (d.transaction || []).filter(t => !t.type || t.type === "xp"); } catch {}
    // No filter alt
    try { const d = await window.GraphQL.gql(Q.TX_NOFILTER_ALT); if (d.transactions) return (d.transactions || []).filter(t => !t.type || t.type === "xp"); } catch {}
    throw new Error("XP query failed (schema mismatch).");
  }

  function render(user, tx) {
    const xpSvg = $("xpChart"), prjSvg = $("projectsChart");
    if (!xpSvg || !prjSvg) { setStatus("Missing #xpChart and/or #projectsChart in HTML.", true); return; }

    if ($("userLogin"))  $("userLogin").textContent  = user?.login ?? "—";
    if ($("userId"))     $("userId").textContent     = user?.id ?? "—";
    if ($("auditRatio")) $("auditRatio").textContent = (user?.auditRatio != null ? Number(user.auditRatio).toFixed(2) : "—");

    const totalXp = (tx || []).reduce((s, t) => s + (t.amount || 0), 0);
    if ($("totalXp")) $("totalXp").textContent = formatNumber(totalXp);

    const perDay = {};
    for (const t of (tx || [])) {
      if (!t.createdAt) continue;
      const k = dayKey(t.createdAt);
      perDay[k] = (perDay[k] || 0) + (t.amount || 0);
    }
    const points = Object.entries(perDay).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v], i) => ({ x: i, y: v }));
    drawArea(xpSvg, points);

    const bag = {};
    for (const t of (tx || [])) {
      const name = extractProjectName(t.path);
      bag[name] = (bag[name] || 0) + (t.amount || 0);
    }
    if ($("projectsCount")) $("projectsCount").textContent = String(Object.keys(bag).length || 0);
    const top10 = Object.entries(bag).map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 10);
    drawBars(prjSvg, top10);

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
  }

  async function boot() {
    try {
      setStatus("Loading...");
      const user = await fetchUser(); // validates token too
      const tx = await fetchXP();
      render(user, tx);
      setStatus("Done.");
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  }

  async function handleSignin(e) {
    e.preventDefault();
    const login = $("login")?.value?.trim();
    const password = $("password")?.value || "";
    try {
      setStatus("Signing in...");
      // If WORKER_BASE is configured, use worker; otherwise treat password as raw JWT
      if (window.GraphQL.WORKER_BASE) {
        await window.GraphQL.workerSignin(login, password);
      } else {
        window.GraphQL.saveTokenFrom(password);
      }
      setStatus("Signed in. Loading...");
      await boot();
    } catch (err) {
      setStatus("Sign-in failed: " + err.message, true);
    }
  }

  function wire() {
    const form = $("signinForm");
    if (form) form.addEventListener("submit", handleSignin);
    const lb = $("logoutBtn");
    if (lb) lb.addEventListener("click", () => {
      window.GraphQL.clearToken();
      setStatus("Logged out.");
      ["userLogin","userId","totalXp","auditRatio","projectsCount"].forEach(id => { if ($(id)) $(id).textContent = "—"; });
      const xc = $("xpChart"), pc = $("projectsChart");
      if (xc) clearSvg(xc);
      if (pc) clearSvg(pc);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    wire();
    const token = window.GraphQL.getToken();
    if (token) boot();
    else setStatus(window.GraphQL.WORKER_BASE
      ? "Missing/invalid JWT. Use the sign-in form."
      : "Missing/invalid JWT. Paste your JWT in the password field and press Sign in.", true);
  });
})();
