const http = require('http');
const opts = { method: 'GET' , hostname: '127.0.0.1', port: 3000, path: '/events' };
const req = http.request(opts, (res) => {
  res.on('data', (chunk) => {
    const s = chunk.toString();
    process.stdout.write(s);
  });
  res.on('end', () => console.log('\nSSE connection ended'));
});
req.on('error', (e) => console.error('SSE error', e));
req.end();
