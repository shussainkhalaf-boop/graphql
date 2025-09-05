// app.js — glue UI + data + charts
const token = getToken();
if(!token){ setScreen(false); return; }
const payload = decodeJWT(token);
const uid = payload?.userId || payload?.sub || payload?.id; // schema varies
if(!uid){ clearToken(); setScreen(false); return; }


setScreen(true);


try{
// 1. Who am I?
const me = await gql(Q_ME, {});
const user = Array.isArray(me.user) ? me.user[0] : me.user;
uLogin.textContent = user?.login || 'me';
uId.textContent = String(user?.id ?? uid);


// 2. XP transactions
const xpData = await gql(Q_XP, { uid: +uid });
const tx = xpData.transaction || [];


// 3. Progress (pass/fail)
const pr = (await gql(Q_PROGRESS, { uid: +uid })).progress || [];
const pass = pr.filter(p=> Number(p.grade) === 1).length;
const fail = pr.filter(p=> Number(p.grade) === 0).length;
uPass.textContent = pass; uFail.textContent = fail;
pfNote.textContent = pass+fail ? `${Math.round(pass*100/(pass+fail))}% pass out of ${pass+fail}` : '—';


// 4. Compute totals & series
const totalXP = tx.reduce((s,t)=> s + (t.amount|0), 0);
uXP.textContent = new Intl.NumberFormat().format(totalXP);


// XP over time (cumulative)
let cum = 0;
const series = tx.map(t=>({ x:new Date(t.createdAt).getTime(), y:(cum += (t.amount|0)) }));
renderLineChart(svgXPTime, series);
if(tx.length){
const first = formatDate(tx[0].createdAt), last = formatDate(tx[tx.length-1].createdAt);
xpTimeNote.textContent = `${first} → ${last}`;
} else { xpTimeNote.textContent = '—'; }


// Projects by XP (sum by label)
const grouped = groupBy(tx, t=> parseProjectLabel(t.path));
const bars = Array.from(grouped, ([label,items]) => ({
label,
value: items.reduce((s,t)=>s+(t.amount|0),0)
}));
renderBarChart(svgXPProj, bars, { top: 10 });


// Donut
renderDonut(svgPassFail, pass, fail);


// Latest results (nested query demo)
const rw = await gql(Q_RESULTS_WITH_USER, { uid:+uid, limit: 8 });
const list = rw.result || [];
latestList.innerHTML = '';
list.forEach(r=>{
const li = document.createElement('li');
const when = new Date(r.createdAt).toLocaleString();
const name = r.object?.name || parseProjectLabel(r.path);
li.innerHTML = `<span>${name}</span><span class="${Number(r.grade)===1?'ok':'bad'}">${Number(r.grade)===1?'PASS':'FAIL'}</span><span class="muted small">${when}</span>`;
latestList.appendChild(li);
});
noResultsEl.style.display = list.length ? 'none' : '';
}catch(err){
console.error(err);
alert('Data load failed: ' + (err.message||'unknown'));
}
}


// kick
boot();
