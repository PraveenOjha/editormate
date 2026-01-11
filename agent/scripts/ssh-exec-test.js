const { Client } = require('ssh2');
const fs = require('fs');
const c = new Client();
const key = fs.readFileSync('test_client');
c.on('ready', () => {
  console.log('ready');
  c.subsystem('editormate', (err, stream) => {
    if (err) return console.error('subsystem err', err);
    stream.on('data', d=>console.log('OUT:', d.toString()));
    stream.on('close', ()=>{ console.log('sub closed'); c.end(); });
    stream.write(JSON.stringify({ type:'exec', command: 'echo hello && uname -a' }) + '\n');
  });
}).on('error', e=>console.error('err',e)).connect({ host:'127.0.0.1', port:2222, username:'user', privateKey: key });
