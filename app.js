// js/app.js (variant) — visual/logic tweaks without breaking API
import { signinBasic, saveToken, getToken, clearToken, decodeJWT, gql } from './api.js';
import { Q_ME, Q_RESULTS_WITH_USER, Q_XP, Q_OBJECT_NAMES, Q_PASSED_OBJECTS } from './queries.js';
import { renderLineChart, renderBarChart } from './charts.js';

const loginView   = document.getElementById('login-view');
const profileView = document.getElementById('profile-view');
const logoutBtn   = document.getElementById('logout-btn');

const loginForm   = document.getElementById('login-form');
const idInput     = document.getElementById('identifier');
const pwInput     = document.getElementById('password');
const loginError  = document.getElementById('login-error');

const uLogin = document.getElementById('u-login');
const uEmail = document.getElementById('u-email');
const uId    = document.getElementById('u-id');
const uXP    = document.getElementById('u-xp');

const latestList   = document.getElementById('latest-results');
const noResultsEl  = document.getElementById('no-results');

const svgXPTime    = document.getElementById('xp-over-time');
const noXPTime     = document.getElementById('no-xp-time');
const svgXPProject = document.getElementById('xp-by-project');
const noXPProject  = document.getElementById('no-xp-project');

const loadingEl = document.getElementById('loading');
const toastEl   = document.getElementById('toast');

/* ------------------ rules (renamed for clarity) ------------------ */
const DROP_TOKENS   = ['checkpoint', 'raid', '/audit'];
const TAG_PISCINE   = 'piscine';
const EXAM_TOKENS   = ['exam'];
const EXAM_MAX_KB   = 300;

/* ------------------ UX helpers ------------------ */
function show(view){
  const toLogin = view === 'login';
  loginView.classList.toggle('active', toLogin);
  profileView.classList.toggle('active', !toLogin);
  loginView.setAttribute('aria-hidden', String(!toLogin));
  profileView.setAttribute('aria-hidden', String(toLogin));
  logoutBtn.hidden = toLogin;
}

function startLoading(msg='Loading…'){
  loadingEl.querySelector('p').textContent = msg;
  loadingEl.classList.remove('hidden');
  loadingEl.setAttribute('aria-hidden','false');
}
function stopLoading(){
  loadingEl.classList.add('hidden');
  loadingEl.setAttribute('aria-hidden','true');
}

let toastTimer = null;
function toast(message, ms=2400){
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  requestAnimationFrame(()=> toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{
    toastEl.classList.remove('show');
    setTimeout(()=> toastEl.classList.add('hidden'), 220);
  }, ms);
}

const nf = new Intl.NumberFormat();
const fmtNum = (n)=> nf.format(n);
const toDay  = (ts)=> new Date(ts).toISOString().slice(0,10);
const isMobile = ()=> window.matchMedia('(max-width: 600px)').matches;

/* ------------------ init ------------------ */
document.addEventListener('DOMContentLoaded', async () => {
  if(getToken()){
    show('profile');
    startLoading('Fetching your profile…');
    try { await loadProfile(); }
    catch(err){ toast(err.message || String(err), 4000); }
    finally{ stopLoading(); }
  }else{
    show('login');
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  show('login');
  loginForm.reset();
  idInput.focus();
  toast('Logged out');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const identifier = idInput.value.trim();
  const password   = pwInput.value;

  if(!identifier || !password){
    loginError.textContent = 'Please enter both identifier and password.';
    loginError.hidden = false; return;
  }

  try{
    loginForm.querySelector('button[type="submit"]').disabled = true;
    startLoading('Signing you in…');
    const jwt = await signinBasic(identifier, password);
    saveToken(jwt);
    show('profile');
    startLoading('Loading your data…');
    await loadProfile();
    toast('Welcome 👋');
  }catch(err){
    loginError.textContent = err.message || 'Sign in failed.';
    loginError.hidden = false;
    toast('Signin failed', 2400);
  }finally{
    stopLoading();
    loginForm.querySelector('button[type="submit"]').disabled = false;
  }
});

/* ------------------ loadProfile ------------------ */
let isLoadingProfile = false;
async function loadProfile(){
  if (isLoadingProfile) return;
  isLoadingProfile = true;
  try{
    // whoami
    const me = await gql(Q_ME);
    const user = me?.user?.[0];
    if(!user) throw new Error('Failed to load user.');
    uLogin.textContent = user.login ?? '—';
    uEmail.textContent = user.email ?? '—';
    uId.textContent    = user.id ?? '—';

    // parallel data
    const [xpData, passedData, feedData] = await Promise.all([
      gql(Q_XP, { userId: user.id }),
      gql(Q_PASSED_OBJECTS, { userId: user.id }),
      gql(Q_RESULTS_WITH_USER)
    ]);

    // feed
    const results = feedData?.result ?? [];
    latestList.replaceChildren();
    if(!results.length){
      noResultsEl.hidden = false;
    }else{
      noResultsEl.hidden = true;
      results.forEach(r => {
        const li = document.createElement('li');
        const left = document.createElement('span');
        const right = document.createElement('strong');
        left.textContent = `${new Date(r.createdAt).toLocaleDateString()} • ${r.type || 'result'} #${r.id}`;
        right.textContent = String(r.grade);
        li.append(left, right);
        latestList.appendChild(li);
      });
    }

    // raw rows
    const txsAll       = xpData?.transaction ?? [];
    const passedRowsAll= passedData?.progress ?? [];

    if (!txsAll.length) {
      uXP.textContent = '0 kB';
      svgXPTime.replaceChildren(); noXPTime.hidden = false;
      svgXPProject.replaceChildren(); noXPProject.hidden = false;
      return;
    }

    // global exclude
    const txs = txsAll.filter(t => {
      const p = (t.path||'').toLowerCase();
      return !DROP_TOKENS.some(k => p.includes(k));
    });
    const passedRows = passedRowsAll.filter(p => {
      const path = (p.path||'').toLowerCase();
      return !DROP_TOKENS.some(k => path.includes(k));
    });

    // object aggregates
    const idsFromTx        = new Set();
    const firstTxDateByObj = new Map();
    const maxXPByObj       = new Map();
    const samplePathByObj  = new Map();

    txs.forEach(t => {
      const oid = Number(t.objectId);
      if (!Number.isFinite(oid)) return;
      idsFromTx.add(oid);

      const amt = Number(t.amount || 0);
      if (amt > (maxXPByObj.get(oid) || 0)) maxXPByObj.set(oid, amt);

      const ts = new Date(t.createdAt).getTime();
      const prev = firstTxDateByObj.get(oid) ?? Infinity;
      if (ts < prev) firstTxDateByObj.set(oid, ts);

      if (!samplePathByObj.has(oid) && t.path) samplePathByObj.set(oid, t.path.toLowerCase());
    });

    const allObjIds = [...idsFromTx];

    // object meta
    const objMeta = allObjIds.length ? await gql(Q_OBJECT_NAMES, { ids: allObjIds }) : { object: [] };
    const typeById       = new Map((objMeta?.object || []).map(o => [Number(o.id), (o.type || '').toLowerCase()]));
    const rawNameById    = new Map((objMeta?.object || []).map(o => [Number(o.id), (o.name || '')]));
    const nameLowerById  = new Map((objMeta?.object || []).map(o => [Number(o.id), (o.name || '').toLowerCase()]));

    // earliest pass date
    const passDateByObj = new Map();
    passedRows.forEach(p => {
      const oid = Number(p.objectId);
      if (!Number.isFinite(oid)) return;
      const ts = new Date(p.createdAt).getTime();
      const prev = passDateByObj.get(oid) ?? Infinity;
      if (ts < prev) passDateByObj.set(oid, ts);
    });

    /* ---------------- Inclusion logic ----------------
       1) Include all projects
       2) Include one piscine root (largest XP)
       3) Include exam micro exercises (<= 300 bytes or 'exam' hinted)
    --------------------------------------------------- */
    const projectIds = allObjIds.filter(oid => typeById.get(oid) === 'project');
    const includedIdsSet = new Set(projectIds);

    const piscineCandidates = allObjIds
      .filter(oid => {
        const n = (nameLowerById.get(oid) || '');
        const p = (samplePathByObj.get(oid) || '');
        return n.includes(TAG_PISCINE) || p.includes(TAG_PISCINE);
      })
      .map(oid => ({ oid, amt: maxXPByObj.get(oid) || 0 }))
      .filter(x => x.amt > 0)
      .sort((a,b)=> b.amt - a.amt);
    if (piscineCandidates.length) includedIdsSet.add(piscineCandidates[0].oid);

    allObjIds.forEach(oid => {
      if (includedIdsSet.has(oid)) return;
      if (typeById.get(oid) !== 'exercise') return;
      const amt  = maxXPByObj.get(oid) || 0;
      const name = (nameLowerById.get(oid) || '');
      const path = (samplePathByObj.get(oid) || '');
      const isExam = EXAM_TOKENS.some(h => name.includes(h) || path.includes(h));
      const isTiny = amt > 0 && amt <= EXAM_MAX_KB;
      if (isExam || isTiny) includedIdsSet.add(oid);
    });

    const includedIds = [...includedIdsSet];

    // build entries & totals
    const officialEntries = [];
    let officialTotal = 0;
    includedIds.forEach(oid => {
      const amt = maxXPByObj.get(oid) || 0;
      if (amt <= 0) return;
      const ts = passDateByObj.get(oid) ?? firstTxDateByObj.get(oid);
      if (ts == null) return;
      officialEntries.push({ objectId: oid, amount: amt, passedAt: new Date(ts).toISOString() });
      officialTotal += amt;
    });

    const kb = Math.ceil(officialTotal / 1000);
    uXP.textContent = kb + ' kB';

    // time series (cumulative)
    const byDay = new Map();
    officialEntries.forEach(e => {
      const day = toDay(e.passedAt);
      byDay.set(day, (byDay.get(day) || 0) + e.amount);
    });
    const dailySorted = [...byDay.entries()].sort((a,b)=> a[0].localeCompare(b[0]));
    let running = 0;
    const seriesTime = dailySorted.map(([d,amt]) => {
      running += amt;
      return { x: new Date(d).getTime(), y: running, label: `${d}: total ${fmtNum(running)} XP` };
    });

    if(seriesTime.length){
      noXPTime.hidden = true;
      renderLineChart(svgXPTime, seriesTime, {
        xAccessor: d => d.x,
        yAccessor: d => d.y,
        titles: seriesTime.map(d => d.label),
        yLabel: 'Cumulative XP',
        margin: isMobile() ? { t:16, r:12, b:44, l:54 } : { t:18, r:16, b:36, l:58 }
      });
    } else {
      noXPTime.hidden = false;
      svgXPTime.replaceChildren();
    }

    // bars
    let bars = officialEntries.map(e => ({
      id: e.objectId,
      name: (rawNameById.get(e.objectId) || String(e.objectId)).replace(/\bproject—|\bpiscine—/gi, ''),
      sum: e.amount
    }))
    .sort((a,b)=> b.sum - a.sum)
    .slice(0, 16);

    if(bars.length){
      noXPProject.hidden = true;
      renderBarChart(svgXPProject, bars, {
        xAccessor: d => d.name,
        yAccessor: d => d.sum,
        labelAccessor: d => d.name,
        yLabel: 'XP',
        margin: isMobile() ? { t:16, r:12, b:78, l:54 } : { t:18, r:16, b:60, l:58 }
      });
    } else {
      noXPProject.hidden = false;
      svgXPProject.replaceChildren();
    }

    console.debug('[XP]', 'includedIds:', includedIds.length,
      'officialTotal:', officialTotal, 'displayKB(ceil):', kb);
  } finally {
    isLoadingProfile = false;
  }
}

/* ------------------ resize re-render ------------------ */
let rerenderTimer = null;
window.addEventListener('resize', () => {
  if (loginView.classList.contains('active')) return;
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(() => {
    loadProfile().catch(console.error);
  }, 200);
});
