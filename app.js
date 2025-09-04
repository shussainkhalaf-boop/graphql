// js/app.js
// Auto-detect SPA or Multi-page and work accordingly.
// - SPA: if both #login-view and #profile-view exist → keep show()/hide().
// - Multi-page: if only login form exists → sign in then redirect; if profile elements exist → require JWT then load data.

import { signinBasic, saveToken, getToken, clearToken, decodeJWT, gql } from './api.js';
import { Q_ME, Q_RESULTS_WITH_USER, Q_XP, Q_OBJECT_NAMES, Q_PASSED_OBJECTS } from './queries.js';
import { renderLineChart, renderBarChart } from './charts.js';

/* ------------------ Multi-page routes (edit if needed) ------------------ */
const LOGIN_URL   = 'login.html';    // غيّرها لو اسم صفحة الدخول غير
const PROFILE_URL = 'profile.html';  // غيّرها لو اسم صفحة البروفايل غير

/* ------------------ DOM ------------------ */
const loginView   = document.getElementById('login-view');   // SPA-only
const profileView = document.getElementById('profile-view'); // SPA-only
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

/* ------------------ Rules ------------------ */
const EXCLUDE_KEYWORDS = ['checkpoint', 'raid', '/audit'];
const PISCINE_KEYWORD  = 'piscine';
const EXAM_HINTS       = ['exam'];
const EXAM_MAX_BYTES   = 300;

/* ------------------ Utils ------------------ */
const nf = new Intl.NumberFormat();
function fmtNum(n){ return nf.format(n); }
function toDay(ts){ return new Date(ts).toISOString().slice(0,10); }
function isMobile(){ return window.matchMedia('(max-width: 600px)').matches; }

function startLoading(msg='Loading…'){
  if(!loadingEl) return;
  const p = loadingEl.querySelector('p');
  if (p) p.textContent = msg;
  loadingEl.classList.remove('hidden');
  loadingEl.setAttribute('aria-hidden','false');
}
function stopLoading(){
  if(!loadingEl) return;
  loadingEl.classList.add('hidden');
  loadingEl.setAttribute('aria-hidden','true');
}

let toastTimer = null;
function toast(message, ms=2500){
  if(!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  requestAnimationFrame(()=> toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{
    toastEl.classList.remove('show');
    setTimeout(()=> toastEl.classList.add('hidden'), 250);
  }, ms);
}

/* ------------------ Mode detection ------------------ */
const HAS_SPA_LOGIN   = !!loginView;
const HAS_SPA_PROFILE = !!profileView;
const SPA_MODE        = HAS_SPA_LOGIN && HAS_SPA_PROFILE;

const ON_LOGIN_PAGE   = !!loginForm && !HAS_SPA_PROFILE;   // multi-page login
const ON_PROFILE_PAGE = !!(uId || uLogin || svgXPTime || svgXPProject) && !HAS_SPA_LOGIN; // multi-page profile

/* ------------------ SPA helpers ------------------ */
function show(view){
  if(!SPA_MODE) return; // no-op in multi-page
  if(view === 'login'){
    loginView?.classList.add('active');
    profileView?.classList.remove('active');
    loginView?.setAttribute('aria-hidden','false');
    profileView?.setAttribute('aria-hidden','true');
    if (logoutBtn) logoutBtn.hidden = true;
  } else {
    profileView?.classList.add('active');
    loginView?.classList.remove('active');
    profileView?.setAttribute('aria-hidden','false');
    loginView?.setAttribute('aria-hidden','true');
    if (logoutBtn) logoutBtn.hidden = false;
  }
}

/* ------------------ Boot ------------------ */
document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  const authed = !!(token && decodeJWT(token));

  // ---- Multi-page routing
  if (ON_LOGIN_PAGE) {
    if (authed) {
      location.replace(PROFILE_URL);
      return;
    }
    wireLoginMulti();
    return;
  }
  if (ON_PROFILE_PAGE) {
    if (!authed) {
      location.replace(LOGIN_URL);
      return;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', onLogoutMulti);
    startLoading('Fetching your profile…');
    try { await loadProfile(); }
    catch(err){ toast(err?.message || String(err), 4000); }
    finally{ stopLoading(); }
    return;
  }

  // ---- SPA routing
  if (SPA_MODE) {
    if (authed) {
      show('profile');
      startLoading('Fetching your profile…');
      try { await loadProfile(); }
      catch(err){ toast(err?.message || String(err), 4000); }
      finally { stopLoading(); }
    } else {
      show('login');
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        clearToken();
        show('login');
        loginForm?.reset();
        idInput?.focus();
        toast('Logged out');
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', onLoginSPASubmit);
    }
  }
});

/* ------------------ Multi-page handlers ------------------ */
function onLogoutMulti(e){
  e?.preventDefault?.();
  clearToken();
  location.replace(LOGIN_URL);
}
function wireLoginMulti(){
  if (!loginForm) return;
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginError) loginError.hidden = true;
    const identifier = idInput?.value?.trim() || '';
    const password   = pwInput?.value || '';
    if(!identifier || !password){
      if(loginError){ loginError.textContent = 'Please enter both identifier and password.'; loginError.hidden = false; }
      return;
    }
    try{
      const btn = loginForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      startLoading('Signing you in…');
      const jwt = await signinBasic(identifier, password);
      saveToken(jwt);
      toast('Welcome 👋');
      location.replace(PROFILE_URL);
    }catch(err){
      if(loginError){ loginError.textContent = err?.message || 'Sign in failed.'; loginError.hidden = false; }
      toast('Signin failed', 2500);
    }finally{
      stopLoading();
      const btn = loginForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = false;
    }
  });
}

/* ------------------ SPA login handler ------------------ */
async function onLoginSPASubmit(e){
  e.preventDefault();
  if (loginError) loginError.hidden = true;
  const identifier = idInput?.value?.trim() || '';
  const password   = pwInput?.value || '';
  if(!identifier || !password){
    if(loginError){ loginError.textContent = 'Please enter both identifier and password.'; loginError.hidden = false; }
    return;
  }
  try{
    const btn = loginForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    startLoading('Signing you in…');
    const jwt = await signinBasic(identifier, password);
    saveToken(jwt);
    show('profile');
    startLoading('Loading your data…');
    await loadProfile();
    toast('Welcome 👋');
  }catch(err){
    if(loginError){ loginError.textContent = err?.message || 'Sign in failed.'; loginError.hidden = false; }
    toast('Signin failed', 2500);
  }finally{
    stopLoading();
    const btn = loginForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = false;
  }
}

/* ------------------ Profile loader (shared) ------------------ */
let isLoadingProfile = false;
async function loadProfile(){
  if (isLoadingProfile) return;
  isLoadingProfile = true;
  try{
    // Who am I
    const me = await gql(Q_ME);
    const user = me?.user?.[0];
    if(!user) throw new Error('Failed to load user.');
    if(uLogin) uLogin.textContent = user.login ?? '—';
    if(uEmail) uEmail.textContent = user.email ?? '—';
    if(uId)    uId.textContent    = user.id ?? '—';

    // Data
    const [xpData, passedData, feedData] = await Promise.all([
      gql(Q_XP, { userId: user.id }),
      gql(Q_PASSED_OBJECTS, { userId: user.id }),
      gql(Q_RESULTS_WITH_USER)
    ]);

    // Feed list
    if (latestList && noResultsEl){
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
    }

    // Transactions / progress
    const txsAll = xpData?.transaction ?? [];
    const passedRowsAll = passedData?.progress ?? [];

    if (!txsAll.length) {
      if(uXP) uXP.textContent = '0 kB';
      if(svgXPTime && noXPTime){ svgXPTime.replaceChildren(); noXPTime.hidden = false; }
      if(svgXPProject && noXPProject){ svgXPProject.replaceChildren(); noXPProject.hidden = false; }
      return;
    }

    // Global exclusions
    const txs = txsAll.filter(t => {
      const p = (t.path||'').toLowerCase();
      return !EXCLUDE_KEYWORDS.some(k => p.includes(k));
    });
    const passedRows = passedRowsAll.filter(p => {
      const path = (p.path||'').toLowerCase();
      return !EXCLUDE_KEYWORDS.some(k => path.includes(k));
    });

    // Per-object aggregates
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

    // Object meta
    const objMeta = allObjIds.length ? await gql(Q_OBJECT_NAMES, { ids: allObjIds }) : { object: [] };
    const typeById       = new Map((objMeta?.object || []).map(o => [Number(o.id), (o.type || '').toLowerCase()]));
    const rawNameById    = new Map((objMeta?.object || []).map(o => [Number(o.id), (o.name || '')]));
    const nameLowerById  = new Map((objMeta?.object || []).map(o => [Number(o.id), (o.name || '').toLowerCase()]));

    // Pass dates (earliest)
    const passDateByObj = new Map();
    passedRows.forEach(p => {
      const oid = Number(p.objectId);
      if (!Number.isFinite(oid)) return;
      const ts = new Date(p.createdAt).getTime();
      const prev = passDateByObj.get(oid) ?? Infinity;
      if (ts < prev) passDateByObj.set(oid, ts);
    });

    // ---------------- Inclusion logic (same as قبل) ----------------
    // 1) Include ALL projects
    const projectIds = allObjIds.filter(oid => typeById.get(oid) === 'project');
    const includedIdsSet = new Set(projectIds);

    // 2) Include ONE Piscine root project (largest XP)
    const piscineCandidates = allObjIds
      .filter(oid => {
        const n = (nameLowerById.get(oid) || '');
        const p = (samplePathByObj.get(oid) || '');
        return n.includes(PISCINE_KEYWORD) || p.includes(PISCINE_KEYWORD);
      })
      .map(oid => ({ oid, amt: maxXPByObj.get(oid) || 0 }))
      .filter(x => x.amt > 0)
      .sort((a,b)=> b.amt - a.amt);
    if (piscineCandidates.length) includedIdsSet.add(piscineCandidates[0].oid);

    // 3) Always include exam micro-exercises
    allObjIds.forEach(oid => {
      if (includedIdsSet.has(oid)) return;
      if (typeById.get(oid) !== 'exercise') return;
      const amt  = maxXPByObj.get(oid) || 0;
      const name = (nameLowerById.get(oid) || '');
      const path = (samplePathByObj.get(oid) || '');
      const hintsExam = EXAM_HINTS.some(h => name.includes(h) || path.includes(h));
      const tiny      = amt > 0 && amt <= EXAM_MAX_BYTES;
      if (hintsExam || tiny) includedIdsSet.add(oid);
    });

    const includedIds = [...includedIdsSet];

    // Build entries and totals
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

    // Display total in kB (same style you had: ceil)
    const kb = Math.ceil(officialTotal / 1000);
    if(uXP) uXP.textContent = kb + ' kB';

    // ---------------- Charts ----------------
    // XP over time
    if (svgXPTime && noXPTime) {
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
          margin: isMobile() ? { t:16, r:12, b:42, l:52 } : { t:18, r:16, b:34, l:56 }
        });
      } else {
        noXPTime.hidden = false;
        svgXPTime.replaceChildren();
      }
    }

    // XP by project (bars)
    if (svgXPProject && noXPProject){
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
          margin: isMobile() ? { t:16, r:12, b:76, l:52 } : { t:18, r:16, b:58, l:56 }
        });
      } else {
        noXPProject.hidden = false;
        svgXPProject.replaceChildren();
      }
    }

    console.debug('[XP]',
      'includedIds:', includedIds.length,
      'officialTotal:', officialTotal, 'displayKB(ceil):', Math.ceil(officialTotal/1000)
    );
  } finally {
    isLoadingProfile = false;
  }
}

/* ------------------ Re-render on resize (profile only) ------------------ */
let rerenderTimer = null;
window.addEventListener('resize', () => {
  // SPA: re-render فقط إذا كنا على الـprofile view
  if (SPA_MODE && !profileView?.classList.contains('active')) return;
  // Multi-page: اشتغل لو نحن بصفحة البروفايل
  if (!SPA_MODE && !ON_PROFILE_PAGE) return;

  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(() => {
    loadProfile().catch(console.error);
  }, 200);
});
