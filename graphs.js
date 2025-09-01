// graph.js — auth + GraphQL + loaders (uses Queries from queries.js)

import { Queries } from './queries.js';

const CONFIG = {
  SIGNIN_URL: (window.__CONFIG__ && window.__CONFIG__.SIGNIN_URL) || '',
  GRAPHQL_URL: (window.__CONFIG__ && window.__CONFIG__.GRAPHQL_URL) || '',
};
const TOKEN_KEY = 'reboot01.jwt';

// ----- Auth -----
async function signin(identity, password) {
  const basic = btoa(`${identity}:${password}`);
  const res = await fetch(CONFIG.SIGNIN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Signin failed (${res.status})`);
  }
  let body = (await res.text()).trim();
  if (body.startsWith('{')) {
    try {
      const obj = JSON.parse(body);
      body = (obj.token || obj.jwt || obj.accessToken || '').trim();
    } catch {}
  }
  body = body.replace(/^"|"$/g, '');
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(body)) {
    throw new Error('Signin did not return a valid JWT');
  }
  return body;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}
function setToken(jwt, remember = true) {
  if (remember) sessionStorage.removeItem(TOKEN_KEY);
  if (remember) localStorage.setItem(TOKEN_KEY, jwt);
  else sessionStorage.setItem(TOKEN_KEY, jwt);
  localStorage.setItem(TOKEN_KEY, jwt);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

// ----- GraphQL core -----
async function gql(query, variables = {}) {
  const token = getToken();
  if (!token) throw new Error('Missing JWT');
  const res = await fetch(CONFIG.GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error((data && data.error) || text || `HTTP ${res.status}`);
  if (data.errors) throw new Error(data.errors.map((e) => e.message).join('; '));
  return data.data;
}

// ----- Loaders (using your queries) -----
async function loadUserBasics() {
  const d = await gql(Queries.GET_USER_INFO);
  return (d.user && d.user[0]) || null;
}

// Total XP for modules computed as: total_all - piscine_go - piscine_js
async function loadModuleTotalFromYourQueries(userId) {
  const [totalAgg, piscGoList, piscJsAgg] = await Promise.all([
    gql(Queries.GET_TOTAL_XP_ALL, { userId }),
    gql(Queries.GET_PISCINE_GO_XP, { userId }),
    gql(Queries.GET_PISCINE_JS_XP, { userId }),
  ]);

  const totalAll = totalAgg?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const piscineGo = (piscGoList?.transaction || []).reduce((s, r) => s + (+r.amount || 0), 0);
  const piscineJs = piscJsAgg?.transaction_aggregate?.aggregate?.sum?.amount || 0;

  const moduleBytes = Math.max(0, totalAll - piscineGo - piscineJs);
  return { totalAll, piscineGo, piscineJs, moduleBytes };
}

async function loadProjectsWithXP(userId) {
  const d = await gql(Queries.GET_PROJECTS_WITH_XP, { userId });
  return d?.transaction || [];
}

async function loadLatestProjectsWithXP(userId) {
  const d = await gql(Queries.GET_LATEST_PROJECTS_WITH_XP, { userId });
  return d?.transaction || [];
}

async function loadProjectsPassFail(userId) {
  const d = await gql(Queries.GET_PROJECTS_PASS_FAIL, { userId });
  const rows = d?.progress || [];
  const passed = rows.filter((r) => r.grade === 1).length;
  const failed = rows.filter((r) => r.grade === 0).length;
  return { rows, passed, failed };
}

// Expose on window for app.js
window.Graph = {
  TOKEN_KEY,
  signin,
  getToken,
  setToken,
  clearToken,
  gql,
  loadUserBasics,
  loadModuleTotalFromYourQueries,
  loadProjectsWithXP,
  loadLatestProjectsWithXP,
  loadProjectsPassFail,
};
