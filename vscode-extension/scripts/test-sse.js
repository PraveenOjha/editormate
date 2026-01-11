const EventSource = require('../../vscode-extension/node_modules/eventsource');
const url = process.argv[2] || 'http://127.0.0.1:3000/events';
console.log('Connecting to', url);
const es = new EventSource(url);
es.onmessage = (e) => { console.log('SSE RECEIVED:', e.data); };
es.onerror = (err) => { console.error('SSE ERROR', err); };
setTimeout(() => { console.log('Exiting SSE client'); es.close(); process.exit(0); }, 30000);
