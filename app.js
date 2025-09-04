// js/app.js — fixes Total XP + graphs, works with your js/ structure
// Module-only XP = All XP − Piscine (BUT keeps piscine-js inside module)

// ---------- Config ----------
const CFG = {
  SIGNIN_URL:
    (window.__CONFIG__ && window.__CONFIG__.SIGNIN_URL) ||
    "https://learn.reboot01.com/api/auth/signin",
  GRAPHQL_URL:
    (window.__CONFIG__ && window.__CONFIG__.GRAPHQL_URL) ||
    "https://learn.reboot01.com/api/graphql-engine/v1/graphql",
  TOKEN_KEY: "reboot01.jwt",
};

// ---------- DOM helpers ----------
const byId = (id) => document.getElementById(id);
const fmtXP = (n) => (n == null ? "—" : `${Math.round(n / 1000).toLocaleString()} XP`);
const lastSeg = (p = "") => p.split("/").filter(Boolean).pop() || "unknown";

function toggleScreens(authed) {
  const login = byId("screen-login");
  const app = byId("screen-app");
  if (!login || !app) return;
  if (authed) {
    login.classList.add("hidden");
    app.classList.remove("hidden");
  } else {
    app.classList.add("hidden");
    login.classList.remove("hidden");
  }
}

function readJwtPayload(token) {
  try {
    const mid = token.split(".")[1];
    const json = atob(mid.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

// ---------- GraphQL helpers ----------
async function gql(query, variables = {}) {
  // لو عندك window.API.gql في api.js بيتم استخدامه
  if (window.API && typeof window.API.gql === "function") {
    return window.API.gql(query, variables);
  }
  const token =
    localStorage.getItem(CFG.TOKEN_KEY) || sessionStorage.getItem(CFG.TOKEN_KEY) || "";
  const res = await fetch(CFG.GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GraphQL ${res.status}: ${txt.slice(0, 180)}`);
  }
  const data = await res.json();
  if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join("; "));
  return data.data;
}

async function signin(identity, password) {
  // لو عندك window.API.signin في api.js بيتم استخدامه
  if (window.API && typeof window.API.signin === "function") {
    return window.API.signin(identity, password);
  }
  const basic = btoa(`${identity}:${password}`);
  const res = await fetch(CFG.SIGNIN_URL, {
    method: "POST",
    headers: { authorization: `Basic ${basic}` },
  });
  if (res.status === 401) throw new Error("Invalid credentials");
  if (!res.ok) throw new Error(`Signin failed (${res.status})`);
  let token = res.headers.get("authorization") || "";
  if (!token) {
    const body = await res.text().catch(() => "");
    const m = body.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    token = m ? m[0] : "";
  }
  if (!token) throw new Error("Token not found");
  localStorage.setItem(CFG.TOKEN_KEY, token);
  return token;
}

// ---------- Queries ----------
const Q = {
  USER: `query { user { id login } }`,
  XP: `
    query XP($uid:Int!){
      transaction(
        where:{ userId:{_eq:$uid}, type:{_eq:"xp"}, amount:{_gt:0} }
        order_by:{ createdAt: asc }
      ){
        amount createdAt path object{ name type }
      }
    }`,
  RESULTS_LATEST: `
    query ResultsLatest($uid:Int!){
      result(
        where:{ userId:{_eq:$uid} }
        order_by:[{objectId: asc},{createdAt: desc}]
        distinct_on: objectId
      ){ objectId grade createdAt path }
    }`,
};

// لو عندك window.Queries (من queries.js) استخدمه بداله
const Queries = window.Queries || Q;

// ---------- XP classification ----------
const RX_PISCINE_JS = /piscine-js/i; // يُحتسب ضمن module
const RX_PISCINE_ONLY = /piscine(?!-js)/i; // يُستثنى من module

function classifyPath(path = "") {
  if (RX_PISCINE_JS.test(path)) return "piscine-js";
  if (RX_PISCINE_ONLY.test(path)) return "piscine";
  return "module";
}

function computeXpTotals(rows) {
  let all = 0,
    piscine = 0,
    piscineJs = 0,
    module = 0;
  for (const r of rows) {
    const amt = +r.amount || 0;
    const kind = classifyPath(r.path || "");
    all += amt;
    if (kind === "piscine") piscine += amt;
    else {
      module += amt;
      if (kind === "piscine-js") piscineJs += amt;
    }
  }
  return { all, piscine, piscineJs, module };
}

function accumulateByDate(rows) {
  const byDay = new Map();
  for (const r of rows) {
    const d = (r.createdAt || "").slice(0, 10);
    const amt = +r.amount || 0;
    const k = classifyPath(r.path || "");
    const entry = byDay.get(d) || { all: 0, module: 0 };
    entry.all += amt;
    entry.module += k === "piscine" ? 0 : amt;
    byDay.set(d, entry);
  }
  const days = [...byDay.keys()].sort();
  let ca = 0,
    cm = 0;
  return days.map((d) => {
    const v = byDay.get(d);
    ca += v.all;
    cm += v.module;
    return { date: d, all: ca, module: cm };
  });
}

function groupLastProjects(rows, limit = 12) {
  return rows.slice(-limit).map((r) => ({
    label: r.object?.name || lastSeg(r.path || ""),
    value: +r.amount || 0,
  }));
}

// ---------- Charts (from charts.js if present) ----------
const Charts = window.Charts || {
  lineChart: (sel, series) => {
    const ns = (t) => document.createElementNS("http://www.w3.org/2000/svg", t);
    const svg = document.querySelector(sel);
    if (!svg) return;
    svg.innerHTML = "";
    const W = svg.viewBox.baseVal.width || 640,
      H = svg.viewBox.baseVal.height || 260;
    const P = { l: 38, r: 16, t: 16, b: 30 };
    if (!series.length) {
      const t = ns("text");
      t.setAttribute("x", 8);
      t.setAttribute("y", 18);
      t.textContent = "No data";
      svg.appendChild(t);
      return;
    }
    const xs = series.map((d) => new Date(d.date + "T00:00:00Z").getTime());
    const ys = series.map((d) => d.module);
    const xMin = Math.min(...xs),
      xMax = Math.max(...xs);
    const yMax = Math.max(1, ...ys);
    const x = (v) => P.l + ((v - xMin) / Math.max(1, xMax - xMin)) * (W - P.l - P.r);
    const y = (v) => H - P.b - (v / yMax) * (H - P.t - P.b);
    const ax = ns("path");
    ax.setAttribute("d", `M${P.l},${H - P.b} H${W - P.r} M${P.l},${P.t} V${H - P.b}`);
    ax.setAttribute("class", "axis");
    ax.setAttribute("stroke", "#26335f");
    svg.appendChild(ax);
    let d = "";
    series.forEach((p, i) => {
      d += (i ? " L" : "M") + x(new Date(p.date + "T00:00:00Z").getTime()) + " " + y(p.module);
    });
    const path = ns("path");
    path.setAttribute("class", "line");
    path.setAttribute("d", d);
    svg.appendChild(path);
    series.forEach((p) => {
      const c = ns("circle");
      c.setAttribute("class", "dot");
      c.setAttribute("r", "2.6");
      c.setAttribute("cx", x(new Date(p.date + "T00:00:00Z").getTime()));
      c.setAttribute("cy", y(p.module));
      svg.appendChild(c);
    });
    const t1 = ns("text");
    t1.textContent = new Date(xMin).toISOString().slice(0, 10);
    t1.setAttribute("x", P.l);
    t1.setAttribute("y", H - 6);
    svg.appendChild(t1);
    const t2 = ns("text");
    t2.textContent = new Date(xMax).toISOString().slice(0, 10);
    t2.setAttribute("x", W - P.r - 64);
    t2.setAttribute("y", H - 6);
    svg.appendChild(t2);
    const t3 = ns("text");
    t3.textContent = fmtXP(yMax);
    t3.setAttribute("x", 8);
    t3.setAttribute("y", P.t + 12);
    svg.appendChild(t3);
  },
  donut: (sel, pass, fail) => {
    const ns = (t) => document.createElementNS("http://www.w3.org/2000/svg", t);
    const svg = document.querySelector(sel);
    if (!svg) return;
    svg.innerHTML = "";
    const W = svg.viewBox.baseVal.width || 220,
      H = svg.viewBox.baseVal.height || 140;
    const cx = W / 2,
      cy = H / 2,
      R = Math.min(W, H) / 2 - 8;
    const total = Math.max(1, pass + fail);
    const arc = (start, val, cls) => {
      const a0 = (start / total) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((start + val) / total) * Math.PI * 2 - Math.PI / 2;
      const x0 = cx + R * Math.cos(a0),
        y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1),
        y1 = cy + R * Math.sin(a1);
      const large = val / total > 0.5 ? 1 : 0;
      const p = ns("path");
      p.setAttribute("d", `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${cx} ${cy} Z`);
      p.setAttribute("class", cls);
      svg.appendChild(p);
      return start + val;
    };
    let s = 0;
    s = arc(s, pass, "slice-pass");
    s = arc(s, fail, "slice-fail");
    const lbl = ns("text");
    lbl.textContent = `${Math.round((pass / total) * 100)}% pass`;
    lbl.setAttribute("x", cx);
    lbl.setAttribute("y", cy + 4);
    lbl.setAttribute("text-anchor", "middle");
    svg.appendChild(lbl);
  },
  bars: (sel, data) => {
    const ns = (t) => document.createElementNS("http://www.w3.org/2000/svg", t);
    const svg = document.querySelector(sel);
    if (!svg) return;
    svg.innerHTML = "";
    const W = svg.viewBox.baseVal.width || 640,
      H = svg.viewBox.baseVal.height || 260;
    const P = { l: 26, r: 14, t: 14, b: 36 };
    if (!data.length) {
      const t = ns("text");
      t.setAttribute("x", 8);
      t.setAttribute("y", 18);
      t.textContent = "No data";
      svg.appendChild(t);
      return;
    }
    const sorted = [...data].sort((a, b) => (+b.value || 0) - (+a.value || 0));
    const max = Math.max(1, ...sorted.map((d) => +d.value || 0));
    const band = (W - P.l - P.r) / sorted.length;
    sorted.forEach((d, i) => {
      const v = +d.value || 0;
      const h = (v / max) * (H - P.t - P.b);
      const x = P.l + i * band;
      const y = H - P.b - h;
      const rect = ns("rect");
      rect.setAttribute("x", x + 8);
      rect.setAttribute("y", y);
      rect.setAttribute("width", Math.max(8, band - 16));
      rect.setAttribute("height", h);
      rect.setAttribute("fill", "#9ab0ff");
      rect.setAttribute("rx", "7");
      svg.appendChild(rect);
      const tx = ns("text");
      tx.setAttribute("x", x + band / 2);
      tx.setAttribute("y", H - 12);
      tx.setAttribute("text-anchor", "middle");
      tx.textContent = d.label;
      svg.appendChild(tx);
    });
  },
};

// ---------- Loaders ----------
async function loadBasics() {
  const d = await gql(Queries.USER);
  return (d.user && d.user[0]) || null;
}

async function bootLoad() {
  const basics = await loadBasics();
  if (!basics) throw new Error("No user");
  const uid = basics.id;

  const [xpResp, resResp] = await Promise.all([
    gql(Queries.XP, { uid }),
    gql(Queries.RESULTS_LATEST, { uid }),
  ]);

  const xpRows = xpResp.transaction || [];
  const totals = computeXpTotals(xpRows);

  byId("user-login").textContent = basics.login;
  byId("user-id").textContent = basics.id;
  byId("xp-all").textContent = fmtXP(totals.all);
  byId("xp-module").textContent = fmtXP(totals.module);

  Charts.lineChart("#svg-xp", accumulateByDate(xpRows));
  const pass = (resResp.result || []).filter((r) => +r.grade === 1).length;
  const fail = (resResp.result || []).filter((r) => +r.grade !== 1).length;
  Charts.donut("#svg-ratio", pass, fail);
  Charts.bars("#svg-projects", groupLastProjects(xpRows, 12));

  const list = byId("projects");
  if (list) {
    list.innerHTML = "";
    xpRows
      .slice(-12)
      .reverse()
      .forEach((r) => {
        const div = document.createElement("div");
        div.className = "item";
        const t = document.createElement("div");
        t.className = "title";
        t.textContent = r.object?.name || lastSeg(r.path || "");
        const m = document.createElement("div");
        m.className = "meta";
        m.textContent = `${(r.createdAt || "").slice(0, 10)} · ${fmtXP(r.amount)}`;
        div.appendChild(t);
        div.appendChild(m);
        list.appendChild(div);
      });
  }
}

// ---------- Events ----------
const loginForm = byId("form-login");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = byId("login-identity").value.trim();
    const pw = byId("login-password").value;
    byId("login-error").textContent = "";
    try {
      await signin(id, pw);
      toggleScreens(true);
      await bootLoad();
    } catch (err) {
      byId("login-error").textContent = err?.message || String(err);
    }
  });
}

const btnLogout = byId("btn-logout");
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    localStorage.removeItem(CFG.TOKEN_KEY);
    sessionStorage.removeItem(CFG.TOKEN_KEY);
    toggleScreens(false);
    ["#svg-xp", "#svg-ratio", "#svg-projects"].forEach((sel) => {
      const s = document.querySelector(sel);
      if (s) s.innerHTML = "";
    });
    const list = byId("projects");
    if (list) list.innerHTML = "";
  });
}

// ---------- Boot ----------
(function init() {
  const jwt =
    localStorage.getItem(CFG.TOKEN_KEY) || sessionStorage.getItem(CFG.TOKEN_KEY);
  const ok = jwt && readJwtPayload(jwt);
  if (ok) {
    toggleScreens(true);
    bootLoad().catch((e) => {
      byId("login-error").textContent = e?.message || String(e);
    });
  } else {
    toggleScreens(false);
  }
})();
