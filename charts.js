// charts.js
// Pure-SVG chart helpers used by app.js

import { clearSvg, elNS, line, path, text } from "./utils.js";

/* =====================
   Small scale utilities
   ===================== */
function scaleLinear(dmin, dmax, rmin, rmax) {
  const d = (dmax - dmin) || 1;
  const r = rmax - rmin;
  return (x) => rmin + ((x - dmin) * r) / d;
}

function scaleTime(dmin, dmax, rmin, rmax) {
  const a = dmin instanceof Date ? dmin.getTime() : +dmin;
  const b = dmax instanceof Date ? dmax.getTime() : +dmax;
  return scaleLinear(a || 0, b || 1, rmin, rmax);
}

function nice(n) {
  const x = Number(n) || 0;
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(1) + "M";
  if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(1) + "k";
  return String(Math.round(x));
}

/* ==========================
   1) XP cumulative line chart
   ========================== */
export function drawXpLineChart(svg, series) {
  // series: [{ date: Date, value: number }, ...] (already cumulative)
  if (!svg || !series?.length) return;

  const vb = (svg.getAttribute("viewBox") || "0 0 640 280").split(" ").map(Number);
  const W = vb[2] || 640, H = vb[3] || 280;

  const m = { t: 20, r: 16, b: 36, l: 48 };
  const w = W - m.l - m.r;
  const h = H - m.t - m.b;

  // Domains
  let xMin = series[0].date;
  let xMax = series[series.length - 1].date;
  if (xMin.getTime() === xMax.getTime()) {
    // pad by 1 day to avoid zero-width domain
    xMin = new Date(xMin.getTime() - 12 * 3600 * 1000);
    xMax = new Date(xMax.getTime() + 12 * 3600 * 1000);
  }
  const yMin = 0;
  let yMax = Math.max(...series.map((s) => s.value));
  if (yMax <= 0) yMax = 1;

  const sx = scaleTime(xMin, xMax, m.l, m.l + w);
  const sy = scaleLinear(yMin, yMax, m.t + h, m.t);

  // Clear and draw
  clearSvg(svg);

  // Horizontal gridlines + y labels
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const v = yMin + ((yMax - yMin) * i) / yTicks;
    const yy = sy(v);
    svg.appendChild(line(m.l, yy, m.l + w, yy, "gridline"));
    const lbl = text(m.l - 8, yy + 4, nice(v), "axis");
    lbl.setAttribute("text-anchor", "end");
    svg.appendChild(lbl);
  }

  // X labels: start, mid, end
  const mid = new Date((xMin.getTime() + xMax.getTime()) / 2);
  [
    { d: xMin, x: sx(xMin), anchor: "start" },
    { d: mid,  x: sx(mid),  anchor: "middle" },
    { d: xMax, x: sx(xMax), anchor: "end"   },
  ].forEach(({ d, x, anchor }) => {
    const lbl = text(x, m.t + h + 22, d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }), "axis");
    lbl.setAttribute("text-anchor", anchor);
    svg.appendChild(lbl);
  });

  // Line path
  const dLine = series.map((p, i) => `${i ? "L" : "M"} ${sx(p.date)} ${sy(p.value)}`).join(" ");
  svg.appendChild(path(dLine, "path"));

  // Area under line (optional but nice)
  const first = series[0], last = series[series.length - 1];
  const dArea =
    `M ${sx(first.date)} ${sy(first.value)} ` +
    series.slice(1).map((p) => `L ${sx(p.date)} ${sy(p.value)}`).join(" ") +
    ` L ${sx(last.date)} ${sy(0)} L ${sx(first.date)} ${sy(0)} Z`;
  const areaEl = path(dArea, "area");
  svg.appendChild(areaEl);

  // Points (subtle)
  for (const p of series) {
    const dot = elNS("circle", { cx: sx(p.date), cy: sy(p.value), r: 3, class: "point" });
    svg.appendChild(dot);
  }
}

/* =======================
   2) Pass/Fail donut chart
   ======================= */
function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

/**
 * Draw a 2-slice donut for pass/fail.
 * @param {SVGElement} svg
 * @param {number} passCount
 * @param {number} failCount
 */
export function drawDonut(svg, passCount, failCount) {
  if (!svg) return;
  clearSvg(svg);

  const vb = (svg.getAttribute("viewBox") || "0 0 320 320").split(" ").map(Number);
  const W = vb[2] || 320, H = vb[3] || 320;
  const cx = W / 2, cy = H / 2;
  const rOuter = Math.min(W, H) * 0.42;
  const rInner = rOuter * 0.64;

  const total = Math.max(0, Number(passCount) || 0) + Math.max(0, Number(failCount) || 0);

  // Background ring
  const ring = elNS("circle", { cx, cy, r: rOuter, fill: "none", class: "slice", "stroke-width": rOuter - rInner });
  ring.setAttribute("stroke", "rgba(255,255,255,0.08)");
  svg.appendChild(ring);

  if (total === 0) {
    const lbl = text(cx, cy, "No data", "donut-label");
    lbl.setAttribute("text-anchor", "middle");
    svg.appendChild(lbl);
    return;
  }

  const passPct = passCount / total;
  const failPct = failCount / total;

  // Angles
  const start = 0;
  const passEnd = start + 360 * passPct;
  const failEnd = 360;

  // Pass arc
  if (passCount > 0) {
    const passArc = path(arcPath(cx, cy, rOuter, start, passEnd), "slice");
    passArc.setAttribute("stroke", "var(--accent)");
    passArc.setAttribute("fill", "none");
    passArc.setAttribute("stroke-width", rOuter - rInner);
    passArc.setAttribute("stroke-linecap", "butt");
    svg.appendChild(passArc);
  }

  // Fail arc
  if (failCount > 0) {
    const failArc = path(arcPath(cx, cy, rOuter, passEnd, failEnd), "slice");
    failArc.setAttribute("stroke", "var(--accent-2)");
    failArc.setAttribute("fill", "none");
    failArc.setAttribute("stroke-width", rOuter - rInner);
    failArc.setAttribute("stroke-linecap", "butt");
    svg.appendChild(failArc);
  }

  // Center label: PASS%
  const pct = Math.round(passPct * 100);
  const label = text(cx, cy, `${pct}%`, "donut-label");
  label.setAttribute("text-anchor", "middle");
  svg.appendChild(label);

  // Small sublabel
  const sub = text(cx, cy + 22, `PASS`, "axis");
  sub.setAttribute("text-anchor", "middle");
  svg.appendChild(sub);
}
