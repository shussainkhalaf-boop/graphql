// Neon SVG helpers
function drawLineChart(selector, series, opts){
  const svg = document.querySelector(selector); svg.innerHTML = "";
  const W=680,H=280,P={l:46,r:10,t:18,b:34}; svg.setAttribute("viewBox","0 0 "+W+" "+H);
  const yLabel = (opts && opts.yLabel) || "";
  if(!series || !series.length){ const t=ns("text"); t.setAttribute("x",12); t.setAttribute("y",22); t.textContent="No data"; svg.appendChild(t); return; }
  const ys=series.map(d=>d.y); const yMin=0, yMax=Math.max(1, Math.max.apply(null, ys)*1.15);
  const x=(i)=> P.l + (i/Math.max(1,series.length-1)) * (W-P.l-P.r);
  const y=(v)=> H-P.b - (v-yMin)/(yMax-yMin) * (H-P.t-P.b);
  const gA = ns("g"); gA.setAttribute("class","axis");
  const xl=ns("line"); xl.setAttribute("x1",P.l); xl.setAttribute("x2",W-P.r); xl.setAttribute("y1",H-P.b); xl.setAttribute("y2",H-P.b); gA.appendChild(xl);
  const yl=ns("line"); yl.setAttribute("x1",P.l); yl.setAttribute("x2",P.l); yl.setAttribute("y1",P.t); yl.setAttribute("y2",H-P.b); gA.appendChild(yl);
  svg.appendChild(gA);
  for(let i=0;i<=4;i++){ const v=yMin+i*(yMax-yMin)/4, yy=y(v); const l=ns("line"); l.setAttribute("x1",P.l); l.setAttribute("x2",W-P.r); l.setAttribute("y1",yy); l.setAttribute("y2",yy); l.setAttribute("stroke","#1a2a66"); l.setAttribute("opacity",".55"); svg.appendChild(l); const t=ns("text"); t.setAttribute("x",6); t.setAttribute("y",yy+4); t.textContent=Math.round(v); svg.appendChild(t); }
  const path = ns("path"); path.setAttribute("d", series.map((p,i)=> (i?"L":"M")+x(i)+","+y(p.y)).join(" ")); path.setAttribute("class","line"); svg.appendChild(path);
  series.forEach((p,i)=>{ const cx=x(i), cy=y(p.y); const dot=ns("circle"); dot.setAttribute("cx",cx); dot.setAttribute("cy",cy); dot.setAttribute("r","3.2"); dot.setAttribute("class","dot"); svg.appendChild(dot); if(i%Math.ceil(series.length/6)===0 || i===series.length-1){ const tx=ns("text"); tx.setAttribute("x",cx-12); tx.setAttribute("y",H-10); tx.textContent=series[i].x.slice(5); svg.appendChild(tx);} });
  if(yLabel){ const t=ns("text"); t.setAttribute("x",P.l+6); t.setAttribute("y",P.t+12); t.textContent=yLabel; svg.appendChild(t); }
  function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }
}

function drawDonut(selector, data){
  const svg = document.querySelector(selector); svg.innerHTML = "";
  const W=280,H=280,R=108,C={x:W/2,y:H/2}; svg.setAttribute("viewBox","0 0 "+W+" "+H);
  const total = data.reduce((s,d)=>s+d.value,0); if(!total){ const t=ns("text"); t.setAttribute("x",96); t.setAttribute("y",140); t.textContent="No results"; svg.appendChild(t); return; }
  let a0=-Math.PI/2; data.forEach(d=>{ const a1=a0 + (d.value/total)*Math.PI*2; const large=(a1-a0)>Math.PI?1:0; const x0=C.x+R*Math.cos(a0), y0=C.y+R*Math.sin(a0), x1=C.x+R*Math.cos(a1), y1=C.y+R*Math.sin(a1); const p=ns("path"); p.setAttribute("d","M "+x0+" "+y0+" A "+R+" "+R+" 0 "+large+" 1 "+x1+" "+y1+" L "+C.x+" "+C.y+" Z"); p.setAttribute("class", d.cls); svg.appendChild(p); a0=a1; });
  const hole=ns("circle"); hole.setAttribute("cx",C.x); hole.setAttribute("cy",C.y); hole.setAttribute("r",R*0.62); hole.setAttribute("fill","#0b0f1e"); hole.setAttribute("stroke","#26307a"); svg.appendChild(hole);
  const label=ns("text"); label.setAttribute("x",C.x-18); label.setAttribute("y",C.y+4); label.textContent=Math.round((data[0].value/total)*100)+"%"; svg.appendChild(label);
  function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }
}

function drawBarChart(selector, data){
  const svg=document.querySelector(selector); svg.innerHTML=""; const W=680,H=300,P={l:54,r:10,t:20,b:46}; svg.setAttribute("viewBox","0 0 "+W+" "+H);
  if(!data || !data.length){ const t=ns("text"); t.setAttribute("x",12); t.setAttribute("y",22); t.textContent="No data"; svg.appendChild(t); return; }
  const max=Math.max.apply(null, data.map(d=>d.value))||1;
  const band=(W-P.l-P.r)/data.length;
  data.forEach((d,i)=>{ const h=(d.value/max)*(H-P.t-P.b); const x=P.l + i*band; const y=H-P.b-h; const r=ns("rect"); r.setAttribute("x",x+8); r.setAttribute("y",y); r.setAttribute("width",Math.max(8,band-16)); r.setAttribute("height",h); r.setAttribute("fill","#a78bfa"); r.setAttribute("rx","6"); svg.appendChild(r); const tx=ns("text"); tx.setAttribute("x",x+band/2); tx.setAttribute("y",H-12); tx.setAttribute("text-anchor","middle"); tx.textContent=d.label; svg.appendChild(tx); });
  function ns(tag){ return document.createElementNS("http://www.w3.org/2000/svg", tag); }
}
