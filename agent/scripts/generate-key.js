const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

const keyPath = path.join(__dirname, '../host.key');

if (fs.existsSync(keyPath)) {
  console.log('host.key already exists.');
  process.exit(0);
}

console.log('Generating RSA host key...');
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  }
});

fs.writeFileSync(keyPath, privateKey);
console.log('host.key generated successfully at', keyPath);
