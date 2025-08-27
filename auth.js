// auth.js — sign-in via same-origin /api/signin (rewritten in vercel.json)

const R01_AUTH_ENDPOINT = "/api/signin";
const TOKEN_KEY = "r01_jwt";

/* Token utils */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}
export function setToken(jwt) {
  if (typeof jwt !== "string" || jwt.split(".").length !== 3) {
    throw new Error("Invalid JWT");
  }
  localStorage.setItem(TOKEN_KEY, jwt);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function isAuthed() {
  const t = getToken();
  if (!t) return false;
  try {
    const { exp } = parseJwt(t);
    return exp ? Date.now() < exp * 1000 : true;
  } catch {
    return false;
  }
}
export function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");
  const p = parts[1];
  const padded = p.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(p.length / 4) * 4, "=");
  const json = atob(padded);
  return JSON.parse(json);
}

/* Helpers */
function b64utf8(s) {
  return btoa(unescape(encodeURIComponent(s)));
}
function findJwtInText(t = "") {
  const m = t.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return m ? m[0] : "";
}
function tokenFromHeaders(resp) {
  const names = ["authorization", "Authorization", "x-access-token", "x-token", "x-jwt", "jwt", "token", "access_token"];
  for (const n of names) {
    const v = resp.headers.get(n);
    if (!v) continue;
    const raw = /^bearer\s+/i.test(v) ? v.replace(/^bearer\s+/i, "").trim() : v.trim();
    const tok = findJwtInText(raw);
    if (tok) return tok;
  }
  return "";
}

/* Sign in */
export async function signIn(loginId, password) {
  if (!loginId || !password) throw new Error("Please enter both login and password.");
  const basic = b64utf8(`${loginId}:${password}`);

  const resp = await fetch(R01_AUTH_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Accept": "application/json, text/plain, */*"
    },
    body: ""
  });

  if (!resp.ok) {
    let msg = `Sign-in failed (${resp.status})`;
    try {
      const t = await resp.text();
      if (t && t.length < 400) msg = t;
    } catch {}
    if (resp.status === 401 || resp.status === 403) {
      msg = "Invalid credentials. Please check your username/email and password.";
    }
    throw new Error(msg);
  }

  // 1) headers
  let token = tokenFromHeaders(resp);

  // 2) body (json or text)
  if (!token) {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const j = await resp.json();
        token = j?.token || j?.jwt || j?.access_token || "";
        if (!token) {
          // nested fallback
          const deep = j?.data?.token || j?.data?.jwt || j?.data?.access_token || "";
          if (deep) token = deep;
        }
      } catch {}
    }
    if (!token) {
      const txt = await resp.text().catch(() => "");
      const raw = findJwtInText(txt);
      if (raw) token = raw;
      else if (txt.trim().startsWith("{")) {
        try {
          const j = JSON.parse(txt);
          token = j?.token || j?.jwt || j?.access_token || "";
        } catch {}
      }
    }
  }

  if (!token) throw new Error("Unexpected sign-in response: missing JWT.");
  setToken(token);
  return token;
}

/* UI wiring */
export function mountAuthUI() {
  const form = document.getElementById("loginForm");
  const errEl = document.getElementById("loginError");
  const loginSection = document.getElementById("loginSection");
  const profileSection = document.getElementById("profileSection");
  const authedNav = document.getElementById("authedNav");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");
  const passInput = document.getElementById("password");
  const loginInput = document.getElementById("loginId");

  const showError = (m) => { errEl.textContent = m || "Something went wrong."; errEl.classList.remove("hidden"); };
  const clearError = () => { errEl.textContent = ""; errEl.classList.add("hidden"); };
  const setLoading = (v) => { loginBtn.disabled = v; loginBtn.textContent = v ? "Signing in…" : "Sign in"; };

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      await signIn(loginInput.value.trim(), passInput.value);
      loginSection.classList.add("hidden");
      profileSection.classList.remove("hidden");
      authedNav.classList.remove("hidden");
      document.dispatchEvent(new CustomEvent("auth:signin"));
    } catch (err) {
      showError(err.message || String(err));
      passInput.value = "";
      passInput.focus();
    } finally {
      setLoading(false);
    }
  });

  logoutBtn?.addEventListener("click", () => {
    clearToken();
    profileSection.classList.add("hidden");
    authedNav.classList.add("hidden");
    loginSection.classList.remove("hidden");
    document.dispatchEvent(new CustomEvent("auth:signout"));
  });

  if (isAuthed()) {
    loginSection.classList.add("hidden");
    profileSection.classList.remove("hidden");
    authedNav.classList.remove("hidden");
    document.dispatchEvent(new CustomEvent("auth:signin"));
  } else {
    profileSection.classList.add("hidden");
    authedNav.classList.add("hidden");
    loginSection.classList.remove("hidden");
  }
}
