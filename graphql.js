// graphs.js — simple SVG helpers for charts
(function () {
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function mk(tag, attrs = {}, parent = null) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  }
  function scale(v, d0, d1, r0, r1) {
    if (d1 === d0) return (r0 + r1) / 2;
    const t = (v - d0) / (d1 - d0);
    return r0 + t * (r1 - r0);
  }
  function drawAxes(svg, pad) {
    const g = mk("g", { stroke: "#2b3f5b", "stroke-width": "1", fill: "none" }, svg);
    mk("line", { x1: pad, y1: 200 - pad, x2: 600 - pad, y2: 200 - pad }, g);
    mk("line", { x1: pad, y1: 20, x2: pad, y2: 200 - pad }, g);
  }

  window.drawAreaChart = function (svg, points) {
    clear(svg);
    if (!points || !points.length) return;
    const pad = 36;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = 0, yMax = Math.max(10, Math.max(...ys));
    drawAxes(svg, pad);

    const path = mk("path", { fill: "#173c6a", stroke: "#2c7be5", "stroke-width": "1.5", "fill-opacity": "0.4" }, svg);
    let d = "";
    points.forEach((p, i) => {
      const px = scale(p.x, xMin, xMax, pad, 600 - pad);
      const py = scale(p.y, yMin, yMax, 200 - pad, 20);
      d += (i ? ` L ${px} ${py}` : `M ${px} ${py}`);
    });
    const lastX = scale(points[points.length - 1].x, xMin, xMax, pad, 600 - pad);
    const firstX = scale(points[0].x, xMin, xMax, pad, 600 - pad);
    const baseY = 200 - pad;
    d += ` L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    path.setAttribute("d", d);
  };

  window.drawBarChart = function (svg, items) {
    clear(svg);
    if (!items || !items.length) return;
    const pad = 36, w = 600 - pad * 2, h = 200 - pad * 2;
    const max = Math.max(10, Math.max(...items.map(i => i.value)));
    const gap = 8;
    const bw = Math.max(8, (w - gap * (items.length - 1)) / items.length);
    drawAxes(svg, pad);
    const g = mk("g", {}, svg);
    items.forEach((it, i) => {
      const x = pad + i * (bw + gap);
      const colH = (it.value / max) * h;
      const y = pad + (h - colH);
      const r = mk("rect", { x, y, width: bw, height: colH, fill: "#2c7be5", rx: 4 }, g);
      mk("title", {}, r).textContent = `${it.label}: ${it.value}`;
    });
  };
})();
