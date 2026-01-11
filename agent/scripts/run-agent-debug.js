process.on('uncaughtException', (err) => { console.error('UNCAUGHT EXCEPTION', err && err.stack ? err.stack : err); process.exit(1); });
process.on('unhandledRejection', (r) => { console.error('UNHANDLED REJECTION', r); process.exit(1); });
console.log('Starting agent with debug handlers...');
require('../dist/index.js');
console.log('dist/index.js require returned');
