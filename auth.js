// auth.js
// Sign-in (Basic -> JWT), token storage, logout (no cross-origin credentials)

const R01_AUTH_ENDPOINT = "https://learn.reboot01.com/api/auth/signin";
const TOKEN_KEY = "r01_jwt";

/* ---------------- Token utils ---------------- */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setToken(jwt) {
  if (typeof jwt !== "string" || !jwt.includes(".")) throw new Error("Invalid JWT");
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
    if (!exp) return true; // if no exp, assume valid
    return Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

/** Safe JWT parser (base64url decode) */
export function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");
  const payloadB64 = parts[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
  const json = atob(payloadB64);
  return JSON.parse(json);
}

/* -------------- helpers: extract token -------------- */
function tokenFromHeaders(resp) {
  const auth = resp.headers.get("authorization") || resp.headers.get("Authorization");
  if (auth && /^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, "").trim();

  const headerKeys = ["x-access-token", "x-token", "x-jwt", "jwt", "token", "access_token"];
  for (const k of headerKeys) {
    const v = resp.headers.get(k);
    if (v && v.includes(".")) return v.trim();
  }
  return null;
}

function tokenFromBodyText(text) {
  if (!text) return null;
  const trimmed = text.trim();

  // Raw JWT as plain text?
  if (trimmed.split(".").length === 3) return trimmed;

  // JSON? parse and check common fields
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed);
      const cand = data?.token || data?.jwt || data?.access_token || data?.Authorization || null;
      if (typeof cand === "string" && cand.includes(".")) return cand;
      const deep = data?.data?.token || data?.data?.jwt || data?.data?.access_token;
      if (typeof deep === "string" && deep.includes(".")) return deep;
    } catch { /* ignore */ }
  }
  return null;
}

// base64 for potential non-ASCII credentials (RFC 7617 UTF-8)
function b64utf8(str) {
  // eslint-disable-next-line no-undef
  return btoa(unescape(encodeURIComponent(str)));
}

/* ---------------- Sign-in / out ---------------- */

/**
 * Sign in using Basic auth (username:password OR email:password).
 * Returns the JWT string on success.
 */
export async function signIn(loginId, password) {
  if (!loginId || !password) {
    throw new Error("Please enter both login and password.");
  }

  const basic = b64utf8(`${loginId}:${password}`);

  const resp = await fetch(R01_AUTH_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Accept": "application/json, text/plain, */*"
    },
    body: "" // explicit empty body (no credentials; avoids CORS + wildcard issue)
    // NOTE: do NOT set credentials:'include' for cross-origin here
  });

  if (!resp.ok) {
    let message = `Sign-in failed (${resp.status})`;
    try {
      const t = await resp.text();
      if (t && t.length < 400) message = t;
    } catch {}
    if (resp.status === 401 || resp.status === 403) {
      message = "Invalid credentials. Please check your username/email and password.";
    }
    throw new Error(message);
  }

  // 1) Try headers
  let jwt = tokenFromHeaders(resp);

  // 2) Try body (json or text)
  if (!jwt) {
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const data = await resp.json();
        jwt = data?.token || data?.jwt || data?.access_token || null;
      } catch {}
    }
    if (!jwt) {
      const text = await resp.text().catch(() => "");
      jwt = tokenFromBodyText(text);
    }
  }

  if (!jwt || !jwt.includes(".")) {
    throw new Error("Unexpected sign-in response: missing JWT.");
  }

  setToken(jwt);
  return jwt;
}

export function signOut() {
  clearToken();
}

/* ---------------- DOM helpers (used by app.js) ---------------- */
export function mountAuthUI() {
  const form = document.getElementById("loginForm");
  const errEl = document.getElementById("loginError");
  const loginInput = document.getElementById("loginId");
  const passInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginSection = document.getElementById("loginSection");
  const profileSection = document.getElementById("profileSection");
  const authedNav = document.getElementById("authedNav");

  const showError = (msg) => {
    errEl.textContent = msg || "Something went wrong.";
    errEl.classList.remove("hidden");
  };
  const clearError = () => {
    errEl.textContent = "";
    errEl.classList.add("hidden");
  };
  const setLoading = (loading) => {
    loginBtn.disabled = loading;
    loginBtn.textContent = loading ? "Signing in…" : "Sign in";
  };

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
    signOut();
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
