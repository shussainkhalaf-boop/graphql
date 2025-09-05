// charts.js — tiny SVG chart helpers (no libs)


// y ticks (4)
for(let i=0;i<=4;i++){
const v = (ymax/4)*i; const yy = y(v);
svg.appendChild(line(pad, yy, W-pad, yy, '#1f2433'));
svg.appendChild(text(pad-8, yy+4, fmt(v), 'end'));
}
}


export function renderBarChart(svg, entries, {pad=40, top=10}={}){
svg = select(svg); svg.innerHTML = "";
const data = (entries||[]).slice().sort((a,b)=>b.value-a.value).slice(0, top);
if(!data.length){ svg.innerHTML = labelCenter("No data"); return; }
const W = svg.viewBox.baseVal.width || 800, H = svg.viewBox.baseVal.height || 360;
const maxv = Math.max(...data.map(d=>d.value)) * 1.1;
const barW = (W - pad*2) / data.length * 0.8;
data.forEach((d,i)=>{
const x = pad + i * ((W - pad*2)/data.length) + (( (W - pad*2)/data.length - barW)/2);
const h = ( (d.value / (maxv||1)) * (H - pad*2) );
const y = H - pad - h;
const rect = el('rect', { x, y, width:barW, height:h, rx:6, fill:'#2f3b57' });
const val = text(x + barW/2, y - 6, fmt(d.value), 'middle');
const lbl = text(x + barW/2, H - pad + 16, d.label, 'middle');
lbl.setAttribute('font-size','12');
svg.appendChild(rect); svg.appendChild(val); svg.appendChild(lbl);
});
// axis
svg.appendChild(line(pad, H-pad, W-pad, H-pad, '#394155'));
}


export function renderDonut(svg, a, b){
svg = select(svg); svg.innerHTML = "";
const total = (a|0)+(b|0); if(!total){ svg.innerHTML = labelCenter("No data"); return; }
const cx=160, cy=160, r=110, stroke=28, C=2*Math.PI*r;
const pA = a/total, pB = b/total;
const ring = (dash, rot, color)=>{
const c = el('circle', { cx, cy, r, fill:'none', 'stroke-width':stroke, stroke:color });
c.setAttribute('stroke-dasharray', `${dash} ${C-dash}`);
c.setAttribute('transform', `rotate(${rot} ${cx} ${cy})`);
return c;
};
// background ring
svg.appendChild(el('circle', { cx, cy, r, fill:'none', 'stroke-width':stroke, stroke:'#1f2536', opacity:.8 }));
// segments (start at -90deg)
svg.appendChild(ring(C*pA, -90, '#10b981'));
svg.appendChild(ring(C*pB, -90 + 360*pA, '#ef4444'));
svg.appendChild(text(cx, cy, `${Math.round(pA*100)}%`, 'middle'));
}


// --- tiny SVG helpers ---
function el(tag, attrs={}){ const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for(const k in attrs){ n.setAttribute(k, attrs[k]); } return n; }
function line(x1,y1,x2,y2,stroke){ return el('line', { x1,y1,x2,y2, stroke, 'stroke-width':1 }); }
function text(x,y,content,anchor='start'){ const t = el('text', { x,y, 'text-anchor':anchor }); t.textContent = content; return t; }
function labelCenter(msg){ return `<text x="50%" y="50%" text-anchor="middle">${msg}</text>`; }
