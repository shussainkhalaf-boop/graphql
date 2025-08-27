// auth.js
// Handles sign-in (Basic -> JWT), token storage, and logout

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
    // exp is in seconds since epoch
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

/* ---------------- Sign-in / out ---------------- */

/**
 * Sign in using Basic auth (username:password OR email:password)
 * Returns the JWT string when successful.
 */
export async function signIn(loginId, password) {
  if (!loginId || !password) {
    throw new Error("Please enter both login and password.");
  }

  // Construct Basic header
  const basic = btoa(`${loginId}:${password}`);

  const resp = await fetch(R01_AUTH_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`
    },
    // Some servers require an explicit empty body for POST with Basic
    body: ""
  });

  // Network/HTTP handling
  if (!resp.ok) {
    let message = `Sign-in failed (${resp.status})`;
    try {
      const text = await resp.text();
      // Many backends return plain text on error; surface it if present
      if (text && text.length < 400) message = text;
    } catch { /* ignore */ }

    // Friendly mapped errors
    if (resp.status === 401 || resp.status === 403) {
      message = "Invalid credentials. Please check your username/email and password.";
    }
    throw new Error(message);
  }

  // Expect a JWT in response (either JSON or raw text)
  const contentType = resp.headers.get("content-type") || "";
  let jwt = "";
  if (contentType.includes("application/json")) {
    const data = await resp.json();
    // Common field names: token / jwt / access_token
    jwt = data.token || data.jwt || data.access_token || "";
  } else {
    jwt = (await resp.text()).trim();
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

/**
 * Wire login form events. Call this once in app.js.
 * Expects:
 *  - #loginForm, #loginError, #loginId, #password, #loginBtn
 *  - #loginSection, #profileSection, #authedNav, #logoutBtn
 */
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
      // Toggle UI on success
      loginSection.classList.add("hidden");
      profileSection.classList.remove("hidden");
      authedNav.classList.remove("hidden");
      // app.js will detect token and fetch data
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
    // Toggle UI back to login
    profileSection.classList.add("hidden");
    authedNav.classList.add("hidden");
    loginSection.classList.remove("hidden");
    // Let app know
    document.dispatchEvent(new CustomEvent("auth:signout"));
  });

  // Initial state
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
