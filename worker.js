export default {
async fetch(req){
const u = new URL(req.url);
const target = u.searchParams.get('t');
if(!target) return new Response('Missing ?t=', { status: 400 });


if(req.method === 'OPTIONS'){
return new Response(null, { status:204, headers: cors() });
}


const init = {
method: req.method,
headers: new Headers(req.headers),
body: req.method === 'GET' || req.method === 'HEAD' ? null : await req.arrayBuffer()
};
// Force CORS clean headers
init.headers.delete('host');
const res = await fetch(target, init);
const hdrs = new Headers(res.headers);
hdrs.set('Access-Control-Allow-Origin','*');
hdrs.set('Access-Control-Expose-Headers','authorization');
return new Response(res.body, { status: res.status, headers: hdrs });
}
}
function cors(){ return {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
'Access-Control-Allow-Headers': 'authorization,content-type',
'Access-Control-Expose-Headers': 'authorization'
}; }
