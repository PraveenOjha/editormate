import { createServer } from 'http';
import { SSHAgentServer } from './server/ssh';
import { getLocalIPs, checkInternetConnection } from './utils/network';

const HTTP_PORT = process.env.HTTP_PORT || 3000;
const SSH_PORT = parseInt(process.env.SSH_PORT || '2222', 10);

// Start HTTP Server (for health checks / REST API later)
import QRCode from 'qrcode';
import { createEphemeralKeyPair, consumeToken } from './server/keyManager';

const httpServer = createServer(async (req, res) => {
  const online = await checkInternetConnection();



  // Pairing endpoints
  // GET /pairing/view -> Render human-friendly QR + info for browser
  if (req.url === '/pairing/view') {
    try {
      const ips = getLocalIPs();
      const pair = await (await import('./pairing')).generateEphemeralKey();
      const host = ips[0] || 'localhost';
      const randomUrl = `http://${host}:${HTTP_PORT}/random/${pair.token}`;
      const deepLink = `editormate://pair?host=${encodeURIComponent(host)}&port=${SSH_PORT}&token=${pair.token}`;
      const qrDataUrl = await QRCode.toDataURL(deepLink);

      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EditorMate Pairing</title>
        <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:20px;color:#0f172a} .card{padding:16px;border:1px solid #e6edf3;border-radius:8px;max-width:480px} img{display:block;margin:0 auto} pre{background:#f3f6f9;padding:12px;border-radius:6px}</style>
        </head><body>
        <h2>EditorMate Pairing</h2>
        <div class="card">
          <p>Scan this QR with your EditorMate mobile app to pair (one-time token).</p>
          <img src="${qrDataUrl}" width="220" height="220" alt="QR" />
          <h4>Deep Link</h4>
          <pre>${deepLink}</pre>
          <h4>One-time download URL</h4>
          <pre>${randomUrl}</pre>
          <h4>SSH Command</h4>
          <pre>ssh ${process.env.USER || 'user'}@${host} -p ${SSH_PORT}</pre>
          <p style="margin-top:12px;color:#6b7280;font-size:13px">Note: Token expires in 5 minutes and is single-use.</p>
        </div>
        </body></html>`;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to generate pairing view: ' + String(err));
      return;
    }
  }

  // GET /pairing -> basic info and qr for manual use
  if (req.url === '/pairing') {
    const ips = getLocalIPs();
    const sshCommands = ips.map(ip => `ssh ${process.env.USER || 'user'}@${ip} -p ${SSH_PORT}`);
    const payload = sshCommands[0] || `ssh user@localhost -p ${SSH_PORT}`;
    try {
      // Generate a deep-link token that mobile app can handle. We'll also create a one-time URL `/random/:token` to fetch the private key.
      const pair = await (await import('./pairing')).generateEphemeralKey();
      const randomUrl = `http://${ips[0] || 'localhost'}:${HTTP_PORT}/random/${pair.token}`;

      // Deep link: opens the mobile app and passes host + token
      const deepLink = `editormate://pair?host=${encodeURIComponent(ips[0] || 'localhost')}&port=${SSH_PORT}&token=${pair.token}`;

      const qrDataUrl = await QRCode.toDataURL(deepLink);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, sshCommands, deepLink, randomUrl, qrDataUrl }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: String(err) }));
      return;
    }
  }

  // Single-use download endpoint: GET /random/:token
  if (req.url && req.url.startsWith('/random/')) {
    const token = req.url.split('/').pop() || '';
    const pairing = (await import('./pairing')).getAndConsumeToken(token);
    if (!pairing) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'token-not-found-or-used' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="id_ed25519"` });
    res.end(pairing.privateKey);
    return;
  }

  // Create ephemeral keypair and return one-time URL
  if (req.url === '/pairing/random' && req.method === 'POST') {
    try {
      const entry = createEphemeralKeyPair();
      const ips = getLocalIPs();
      const host = ips[0] || 'localhost';
      const url = `http://${host}:${HTTP_PORT}/random/${entry.token}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, token: entry.token, url }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: String(err) }));
      return;
    }
  }

  // Deliver one-time private key
  if (req.url && req.url.startsWith('/random/') && req.method === 'GET') {
    const parts = req.url.split('/');
    const token = parts[2];
    const consumed = consumeToken(token);
    if (!consumed) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Token not found or expired' }));
      return;
    }

    // return private key as plain text for convenience, with a note
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, privateKeyPem: consumed.privateKeyPem, publicKey: consumed.publicKeyOpenSsh }));
    return;
  }



  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    agent: 'EditorMate Host Agent',
    version: '0.0.1',
    network: {
      online,
      localIPs: getLocalIPs()
    },
    services: {
      ssh: { port: SSH_PORT, status: 'running' }
    }
  }));
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP Server running on port ${HTTP_PORT}`);
});

// Start SSH Server
try {
  const sshServer = new SSHAgentServer(SSH_PORT);
  sshServer.start();
  
  // Requirement: User needs to know how to connect
  console.log('\n==========================================');
  console.log('  EditorMate Agent is Ready');
  console.log('==========================================');
  const ips = getLocalIPs();
  if (ips.length > 0) {
    console.log('  Mobile Connection Address:');
    ips.forEach(ip => {
      console.log(`  -> ssh ${process.env.USER || 'user'}@${ip} -p ${SSH_PORT}`);
    });

    // Also print pairing URL(s) so mobile can fetch the QR and commands
    console.log('\n  Pairing Endpoints:');
    ips.forEach(ip => {
      console.log(`  -> http://${ip}:${HTTP_PORT}/pairing`);
      console.log(`  -> http://${ip}:${HTTP_PORT}/pairing/view`);
    });
  } else {
    console.warn('  WARNING: No active LAN connection detected.');
  }
  
  checkInternetConnection().then(isOnline => {
    console.log(`  Internet Status: ${isOnline ? 'Online' : 'Offline (Local Mode Only)'}`);
    console.log('==========================================\n');
  });

} catch (error) {
  console.error('Failed to start SSH Server:', error);
}

console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
