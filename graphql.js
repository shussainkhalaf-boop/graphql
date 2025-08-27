// Simple SVG charts (no dependencies).
// Exposes: drawAreaChart(svg, data), drawBarChart(svg, data)
(function(){
  function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }

  function mk(tag, attrs={}, parent=null){
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k,v] of Object.entries(attrs)){ el.setAttribute(k, v); }
    if (parent) parent.appendChild(el);
    return el;
  }

  function scale(value, domainMin, domainMax, rangeMin, rangeMax){
    if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
    const t = (value - domainMin) / (domainMax - domainMin);
    return rangeMin + t * (rangeMax - rangeMin);
  }

  function drawAxes(svg, {xMin,xMax,yMin,yMax,pad}){
    // axes group
    const g = mk("g", {stroke:"#2b3f5b","stroke-width":"1","fill":"none"}, svg);
    // x axis
    mk("line", {x1:pad, y1:200-pad, x2:600-pad, y2:200-pad}, g);
    // y axis
    mk("line", {x1:pad, y1:20, x2:pad, y2:200-pad}, g);
  }

  function drawAreaChart(svg, points){
    clear(svg);
    if (!Array.isArray(points) || points.length===0) return;

    const pad = 36;
    const xs = points.map(p=>p.x);
    const ys = points.map(p=>p.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = 0, yMax = Math.max(10, Math.max(...ys));

    drawAxes(svg, {xMin,xMax,yMin,yMax,pad});

    const path = mk("path", {fill:"#173c6a", stroke:"#2c7be5","stroke-width":"1.5","fill-opacity":"0.4"}, svg);
    let d = "";
    points.forEach((p,i)=>{
      const px = scale(p.x, xMin, xMax, pad, 600-pad);
      const py = scale(p.y, yMin, yMax, 200-pad, 20);
      d += (i===0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
    });
    // close to baseline
    const lastX = scale(points[points.length-1].x, xMin, xMax, pad, 600-pad);
    const firstX = scale(points[0].x, xMin, xMax, pad, 600-pad);
    const baseY = 200 - pad;
    d += ` L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    path.setAttribute("d", d);
  }

  function drawBarChart(svg, items){
    clear(svg);
    if (!Array.isArray(items) || items.length===0) return;

    const pad = 36;
    const yMax = Math.max(10, Math.max(...items.map(i=>i.value)));
    const w = 600 - pad*2;
    const h = 200 - pad*2;
    const barGap = 8;
    const barW = Math.max(8, (w - barGap*(items.length-1)) / items.length);

    // axes
    drawAxes(svg, {xMin:0,xMax:items.length,yMin:0,yMax:yMax,pad});

    const g = mk("g", {}, svg);
    items.forEach((it, i)=>{
      const x = pad + i*(barW+barGap);
      const y = pad + (h - (it.value / yMax) * h);
      const rect = mk("rect", {x, y, width:barW, height: pad + h - y, fill:"#2c7be5", rx:4}, g);
      mk("title", {}, rect).textContent = `${it.label}: ${it.value}`;
    });
  }

  window.drawAreaChart = drawAreaChart;
  window.drawBarChart = drawBarChart;
})();
