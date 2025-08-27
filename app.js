// app.js — render user info + XP charts
(function(){
  const $=id=>document.getElementById(id);
  const fmt=n=>new Intl.NumberFormat().format(Math.round(n||0));
  const dayKey=iso=>new Date(iso).toISOString().slice(0,10);

  async function loadAll(){
    try{
      $("signinStatus").textContent="Loading...";

      // User
      const me=await api.gql(`query{ user{ id login auditRatio } }`);
      const u=me.user[0]||me.user;
      $("userLogin").textContent=u.login;
      $("userId").textContent=u.id;
      $("auditRatio").textContent=Number(u.auditRatio).toFixed(2);

      // Transactions (XP)
      let tx;
      try{tx=(await api.gql(`query{ transaction(where:{type:{_eq:"xp"}},order_by:{createdAt:asc}){amount createdAt path}}`)).transaction;}
      catch{tx=(await api.gql(`query{ transactions(order_by:{createdAt:asc}){amount createdAt path type}}`)).transactions;}

      const totalXp=tx.reduce((s,t)=>s+(t.amount||0),0);
      $("totalXp").textContent=fmt(totalXp);

      // XP by day
      const perDay={};
      tx.forEach(t=>{const k=dayKey(t.createdAt);perDay[k]=(perDay[k]||0)+t.amount;});
      const pts=Object.entries(perDay).map(([k,v],i)=>({x:i,y:v}));
      (window.drawAreaChart||fallbackArea)($("xpChart"),pts);

      // Projects
      const bag={};
      tx.forEach(t=>{const p=(t.path||"").split("/").filter(Boolean).slice(-2)[0]||"Unknown";bag[p]=(bag[p]||0)+t.amount;});
      const top10=Object.entries(bag).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,10);
      $("projectsCount").textContent=Object.keys(bag).length;
      (window.drawBarChart||fallbackBars)($("projectsChart"),top10);

      // List
      const list=$("projectsList");list.innerHTML="";
      top10.forEach(it=>{
        const div=document.createElement("div");div.className="item";
        div.innerHTML=`<div class="left"><span class="tag">${it.label}</span></div><div>${fmt(it.value)} XP</div>`;
        list.appendChild(div);
      });

      $("signinStatus").textContent="Done.";
    }catch(e){
      $("signinStatus").textContent="Error: "+e.message;
    }
  }

  // simple SVG fallbacks if graphs.js missing
  function clear(s){while(s.firstChild)s.removeChild(s.firstChild);}
  function mk(tag,attrs,p){const el=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(p)p.appendChild(el);return el;}
  function fallbackArea(svg,pts){clear(svg);if(!pts.length)return;const pad=30;const max=Math.max(...pts.map(p=>p.y),10);const d=pts.map((p,i)=>`${i?"L":"M"}${pad+p.x*20},${200-pad-(p.y/max*150)}`).join(" ");mk("path",{d,stroke:"#2c7be5",fill:"none"},svg);}
  function fallbackBars(svg,items){clear(svg);if(!items.length)return;const pad=30;const max=Math.max(...items.map(i=>i.value),10);items.forEach((it,i)=>{const h=(it.value/max)*150;mk("rect",{x:pad+i*40,y:200-pad-h,width:30,height:h,fill:"#2c7be5"},svg);});}

  document.addEventListener("DOMContentLoaded",loadAll);
})();
