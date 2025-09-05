// charts.js — tiny SVG chart helpers (no libs)


function select(el){ return (typeof el === 'string') ? document.querySelector(el) : el; }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
function fmt(n){ return new Intl.NumberFormat().format(n|0); }


export function renderLineChart(svg, points, {pad=40, yLabel="XP"}={}){
svg = select(svg); svg.innerHTML = "";
if(!points?.length){ svg.innerHTML = labelCenter("No data"); return; }
const W = svg.viewBox.baseVal.width || 800, H = svg.viewBox.baseVal.height || 360;
const xmin = +points[0].x, xmax = +points[points.length-1].x;
const ymin = 0, ymax = Math.max(...points.map(p=>p.y)) * 1.1;
const x = (t)=> pad + ( ( (t - xmin) / (xmax - xmin || 1) ) * (W - pad*2) );
const y = (v)=> H - pad - ( (v - ymin) / (ymax - ymin || 1) ) * (H - pad*2);


// axes
svg.appendChild(line(pad, H-pad, W-pad, H-pad, '#394155'));
svg.appendChild(line(pad, pad, pad, H-pad, '#394155'));


// path
const d = points.map((p,i)=> (i?"L":"M") + x(+p.x) + "," + y(p.y)).join(" ");
const path = el('path', { d, fill:'none', stroke:'url(#lg)', 'stroke-width':3 });


// gradient
const defs = el('defs');
const lg = el('linearGradient', { id:'lg', x1:'0', y1:'0', x2:'1', y2:'0' });
lg.appendChild(el('stop', { offset:'0%', stop-color:'#7c3aed' }));
lg.appendChild(el('stop', { offset:'100%', stop-color:'#06b6d4' }));
defs.appendChild(lg);
svg.appendChild(defs);


svg.appendChild(path);


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
function labelCenter(msg){ return `<text x="50%" y="50%" text-anchor="middle">${msg}</text>`; }
