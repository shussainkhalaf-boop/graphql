// utils.js
// Small helpers: DOM, formatting, collections

/* ---------- DOM ---------- */
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function setText(id, value = "—") {
  const el = typeof id === "string" ? document.getElementById(id) : id;
  if (el) el.textContent = value;
}

export function setList(ulId, items = [], render = (x) => String(x)) {
  const ul = typeof ulId === "string" ? document.getElementById(ulId) : ulId;
  if (!ul) return;
  ul.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No data yet.";
    ul.appendChild(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    const frag = render(item);
    if (frag instanceof Node) li.appendChild(frag);
    else li.innerHTML = frag;
    ul.appendChild(li);
  }
}

export function show(el) {
  (typeof el === "string" ? $(el) : el)?.classList.remove("hidden");
}
export function hide(el) {
  (typeof el === "string" ? $(el) : el)?.classList.add("hidden");
}

/* ---------- Dates & numbers ---------- */
export function parseISO(iso) {
  // Guard against invalid/nullable
  const d = iso ? new Date(iso) : null;
  return isNaN(d?.getTime?.()) ? null : d;
}

export function formatDate(d, opts) {
  const date = d instanceof Date ? d : parseISO(d);
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    ...(opts || {})
  });
}

export function niceNumber(x) {
  if (x == null || isNaN(x)) return "0";
  const n = Number(x);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

/* ---------- Collections ---------- */
export const sumBy = (arr, sel = (x) => x) =>
  arr.reduce((acc, v) => acc + Number(sel(v) || 0), 0);

export function groupBy(arr, keyFn) {
  const m = new Map();
  for (const it of arr) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
}

export function toPairs(mapOrObj) {
  if (mapOrObj instanceof Map) return Array.from(mapOrObj.entries());
  return Object.entries(mapOrObj || {});
}

export const uniq = (arr) => Array.from(new Set(arr));

/* ---------- SVG helpers (tiny) ---------- */
export function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

export function elNS(name, attrs = {}, children = []) {
  const svgNS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(svgNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const ch of [].concat(children)) {
    if (ch instanceof Node) el.appendChild(ch);
    else if (ch != null) el.appendChild(document.createTextNode(String(ch)));
  }
  return el;
}

export function line(x1, y1, x2, y2, cls = "") {
  return elNS("line", { x1, y1, x2, y2, class: cls });
}

export function path(d, cls = "path") {
  return elNS("path", { d, class: cls });
}

export function text(x, y, content, cls = "") {
  return elNS("text", { x, y, class: cls }, [content]);
}

