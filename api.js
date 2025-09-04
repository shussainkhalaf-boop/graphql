// js/api.js (variant) — small refactors, same behavior

// Endpoints (keep overridable from outside if needed)
const SIGNIN_URL = 'https://learn.reboot01.com/api/auth/signin';
const GQL_URL    = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';

/* ------------------------------------------------------------------ */
/* Storage                                                            */
/* ------------------------------------------------------------------ */
export function saveToken(jwt)  { localStorage.setItem('jwt', String(jwt)); }
export function getToken()      { return localStorage.getItem('jwt'); }
export function clearToken()    { localStorage.removeItem('jwt'); }

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

// btoa that handles non-ASCII safely
function toBase64Utf8(str) {
  return btoa(unescape(encodeURIComponent(String(str))));
}

// Pull a JWT from any noisy string (quotes/newlines ok)
function pickJWT(text) {
  const s = String(text ?? '').trim();
  const body = (s.startsWith('"') && s.endsWith('"')) ? s.slice(1, -1) : s;
  const m = body.match(/[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/);
  return m ? m[0] : null;
}

/* ------------------------------------------------------------------ */
/* JWT utils                                                          */
/* ------------------------------------------------------------------ */
export function decodeJWT(token){
  try{
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    let b64 = parts[1].replace(/-/g,'+').replace(/_/g,'/');
    const pad = b64.length % 4; if (pad) b64 += '='.repeat(4 - pad);
    const json = atob(b64);
    const utf8 = decodeURIComponent(escape(json));
    return JSON.parse(utf8);
  }catch{
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */
export async function signinBasic(identifier, password){
  const id = String(identifier ?? '').trim();
  const pw = String(password ?? '');
  if(!id || !pw) throw new Error('Please enter both identifier and password.');

  const cred = toBase64Utf8(`${id}:${pw}`);

  const res = await fetch(SIGNIN_URL, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${cred}` }
  });

  const raw = await res.text().catch(()=> '');
  if(!res.ok){
    const msg = raw?.trim() || `Signin failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  const token = pickJWT(raw);
  if(!token){
    console.warn('[signin] Unexpected response body:', raw);
    throw new Error('Signin returned no token.');
  }
  return token;
}

/* ------------------------------------------------------------------ */
/* GraphQL                                                            */
/* ------------------------------------------------------------------ */
export async function gql(query, variables = {}){
  const token = getToken();
  if(!token) throw new Error('Missing token');

  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  // Prefer JSON; fallback to text for clearer errors
  let body;
  try { body = await res.json(); }
  catch {
    const raw = await res.text().catch(()=> '');
    throw new Error(raw?.trim() || `GraphQL HTTP ${res.status}`);
  }

  if(!res.ok) throw new Error(body?.errors?.[0]?.message || `GraphQL HTTP ${res.status}`);
  if(body?.errors?.length) throw new Error(body.errors[0].message || 'GraphQL error');

  return body?.data;
}
