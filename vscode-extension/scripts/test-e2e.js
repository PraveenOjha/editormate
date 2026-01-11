const EventSource = require('../../vscode-extension/node_modules/eventsource');
const http = require('http');
const es = new EventSource('http://127.0.0.1:3000/events');
console.log('SSE: waiting for messages...');
es.onmessage=(e)=>{ console.log('SSE RECEIVED:', e.data); process.exit(0); };
es.onerror=(err)=>{ console.error('SSE ERROR', err); };
// send a message after a short delay
setTimeout(()=>{
  const data = JSON.stringify({ text: 'Hello from simulated mobile test (e2e)' });
  const opts = { hostname:'127.0.0.1', port:3000, path:'/messages', method:'POST', headers: {'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(data)} };
  const req = http.request(opts, res=>{ console.log('POST status', res.statusCode); });
  req.on('error', (e)=>console.error('POST ERROR', e));
  req.write(data); req.end();
}, 1000);
// if nothing in 10s, exit
setTimeout(()=>{ console.error('E2E timeout'); process.exit(2); }, 10000);
