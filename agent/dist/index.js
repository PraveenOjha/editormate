"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastToSse = broadcastToSse;
exports.registerSshSubsystem = registerSshSubsystem;
exports.unregisterSshSubsystem = unregisterSshSubsystem;
const http_1 = require("http");
const ssh_1 = require("./server/ssh");
const network_1 = require("./utils/network");
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const SSH_PORT = parseInt(process.env.SSH_PORT || '2222', 10);
// SSH server instance (populated when the server starts)
let sshServer = null;
// Start HTTP Server (for health checks / REST API later)
const qrcode_1 = __importDefault(require("qrcode"));
const keyManager_1 = require("./server/keyManager");
const httpServer = (0, http_1.createServer)(async (req, res) => {
    console.log('HTTP REQ', req.method, req.url);
    const online = await (0, network_1.checkInternetConnection)();
    // Pairing endpoints
    // GET /pairing/view -> Render human-friendly QR + info for browser
    if (req.url === '/pairing/view') {
        try {
            const ips = (0, network_1.getLocalIPs)();
            const pair = await (await Promise.resolve().then(() => __importStar(require('./pairing')))).generateEphemeralKey();
            const host = ips[0] || 'localhost';
            const randomUrl = `http://${host}:${HTTP_PORT}/random/${pair.token}`;
            const deepLink = `editormate://pair?host=${encodeURIComponent(host)}&port=${SSH_PORT}&token=${pair.token}`;
            const qrDataUrl = await qrcode_1.default.toDataURL(deepLink);
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
        }
        catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Failed to generate pairing view: ' + String(err));
            return;
        }
    }
    // GET /pairing -> basic info and qr for manual use
    if (req.url === '/pairing') {
        const ips = (0, network_1.getLocalIPs)();
        const sshCommands = ips.map(ip => `ssh ${process.env.USER || 'user'}@${ip} -p ${SSH_PORT}`);
        const payload = sshCommands[0] || `ssh user@localhost -p ${SSH_PORT}`;
        try {
            // Generate a deep-link token that mobile app can handle. We'll also create a one-time URL `/random/:token` to fetch the private key.
            const pair = await (await Promise.resolve().then(() => __importStar(require('./pairing')))).generateEphemeralKey();
            const randomUrl = `http://${ips[0] || 'localhost'}:${HTTP_PORT}/random/${pair.token}`;
            // Deep link: opens the mobile app and passes host + token
            const deepLink = `editormate://pair?host=${encodeURIComponent(ips[0] || 'localhost')}&port=${SSH_PORT}&token=${pair.token}`;
            const qrDataUrl = await qrcode_1.default.toDataURL(deepLink);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, sshCommands, deepLink, randomUrl, qrDataUrl }));
            return;
        }
        catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: String(err) }));
            return;
        }
    }
    // GET /pairing/qr/:token -> return PNG image for deep link (helpful for mobile to fetch an http URL instead of a data URI)
    if (req.url && req.url.startsWith('/pairing/qr/')) {
        const token = req.url.split('/').pop() || '';
        // Generate a PNG for the deep link for this token. We do NOT require the token to be active
        // to allow clients to display the pairing QR as a convenience; the one-time key fetch will still
        // validate the token when the client attempts to download the private key.
        try {
            const ips = (0, network_1.getLocalIPs)();
            const host = ips[0] || 'localhost';
            const deepLink = `editormate://pair?host=${encodeURIComponent(host)}&port=${SSH_PORT}&token=${token}`;
            const dataUrl = await qrcode_1.default.toDataURL(deepLink);
            const b64 = dataUrl.split(',')[1] || '';
            const buf = Buffer.from(b64, 'base64');
            res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': buf.length });
            res.end(buf);
            return;
        }
        catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: String(e) }));
            return;
        }
    }
    // Single-use download endpoint: GET /random/:token
    if (req.url && req.url.startsWith('/random/')) {
        const token = req.url.split('/').pop() || '';
        const pairing = (await Promise.resolve().then(() => __importStar(require('./pairing')))).getAndConsumeToken(token);
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
            const entry = (0, keyManager_1.createEphemeralKeyPair)();
            const ips = (0, network_1.getLocalIPs)();
            const host = ips[0] || 'localhost';
            const url = `http://${host}:${HTTP_PORT}/random/${entry.token}`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, token: entry.token, url }));
            return;
        }
        catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: String(err) }));
            return;
        }
    }
    // Admin: list active pairing tokens (localhost only)
    if (req.url === '/pairing/active' && req.method === 'GET') {
        const remote = (req.socket && req.socket.remoteAddress) || '';
        if (remote !== '127.0.0.1' && remote !== '::1') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'forbidden' }));
            return;
        }
        (async () => {
            const active = (await Promise.resolve().then(() => __importStar(require('./pairing')))).listActivePairs().map((p) => ({ token: p.token, createdAt: p.createdAt, expiresAt: p.expiresAt }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, active }));
        })();
        return;
    }
    // Admin: revoke pairing by token or publicKey (localhost only)
    if (req.url === '/pairing/revoke' && req.method === 'POST') {
        const remote = (req.socket && req.socket.remoteAddress) || '';
        if (remote !== '127.0.0.1' && remote !== '::1') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'forbidden' }));
            return;
        }
        let body = '';
        req.on('data', (c) => body += c);
        req.on('end', async () => {
            try {
                const j = JSON.parse(body || '{}');
                const token = j.token;
                const publicKey = j.publicKey;
                if (token) {
                    const ok = (await Promise.resolve().then(() => __importStar(require('./pairing')))).revokeToken(token);
                    if (ok) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                        return;
                    }
                }
                if (publicKey) {
                    const ok = (await Promise.resolve().then(() => __importStar(require('./pairing')))).revokePublicKey(publicKey);
                    if (ok) {
                        try {
                            sshServer.disconnectClientsByPublicKey(publicKey.split(/\s+/)[1]);
                        }
                        catch (e) { }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                        return;
                    }
                }
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'not-found' }));
            }
            catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'invalid-json' }));
            }
        });
        return;
    }
    // Admin: rotate pairing key (generate new ephemeral key and revoke an old key if provided)
    if (req.url === '/pairing/rotate' && req.method === 'POST') {
        const remote = (req.socket && req.socket.remoteAddress) || '';
        if (remote !== '127.0.0.1' && remote !== '::1') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'forbidden' }));
            return;
        }
        let body2 = '';
        req.on('data', (c) => body2 += c);
        req.on('end', async () => {
            try {
                const j2 = JSON.parse(body2 || '{}');
                const oldPublicKey = j2.publicKey;
                const { rotateKey } = await Promise.resolve().then(() => __importStar(require('./pairing')));
                const newPair = await rotateKey(oldPublicKey);
                const ips = (0, network_1.getLocalIPs)();
                const host = ips[0] || 'localhost';
                const url = `http://${host}:${HTTP_PORT}/random/${newPair.token}`;
                const deepLink = `editormate://pair?host=${encodeURIComponent(host)}&port=${SSH_PORT}&token=${newPair.token}`;
                let qrDataUrl = '';
                try {
                    qrDataUrl = await qrcode_1.default.toDataURL(deepLink);
                }
                catch (e) { /* ignore qr gen errors */ }
                // Broadcast a logout event to connected clients and include the new pairing URL
                try {
                    broadcastToSse({ type: 'logout', reason: 'key-rotated', time: Date.now(), newPairUrl: url, deepLink, qrDataUrl });
                }
                catch (e) { }
                // If we were given an old public key, try to disconnect any clients that used it
                if (oldPublicKey) {
                    try {
                        sshServer.disconnectClientsByPublicKey(oldPublicKey.split(/\s+/)[1]);
                    }
                    catch (e) { }
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, newPair: { token: newPair.token, publicKey: newPair.publicKey, deepLink, qrDataUrl }, url }));
                return;
            }
            catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'invalid-json' }));
            }
        });
        return;
    }
    // Deliver one-time private key
    if (req.url && req.url.startsWith('/random/') && req.method === 'GET') {
        const parts = req.url.split('/');
        const token = parts[2];
        const consumed = (0, keyManager_1.consumeToken)(token);
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
    // Simple in-memory SSE pub/sub for chat/messages
    const sseClients = httpServer.__sseClients = httpServer.__sseClients || new Set();
    if (req.url === '/events' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write('\n');
        sseClients.add(res);
        req.on('close', () => { sseClients.delete(res); });
        return;
    }
    if (req.url === '/messages' && req.method === 'POST') {
        // For security, disallow HTTP-based message posting in production.
        // This endpoint is available only when ALLOW_HTTP_MESSAGES_FOR_DEV=true (for development/testing).
        if (process.env.ALLOW_HTTP_MESSAGES_FOR_DEV !== 'true') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'HTTP messages disabled. Use SSH subsystem "editormate" to send messages.' }));
            return;
        }
        // Accept JSON body and broadcast to SSE clients (development mode only)
        let body = '';
        req.on('data', (chunk) => body += chunk);
        req.on('end', () => {
            try {
                const msg = JSON.parse(body || '{}');
                const payload = { sender: msg.sender || 'mobile', text: msg.text || msg.message || '', ts: Date.now() };
                for (const cl of sseClients) {
                    try {
                        cl.write(`data: ${JSON.stringify(payload)}\n\n`);
                    }
                    catch (e) { /* ignore */ }
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            }
            catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'invalid-json' }));
            }
        });
        return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        agent: 'EditorMate Host Agent',
        version: '0.0.1',
        network: {
            online,
            localIPs: (0, network_1.getLocalIPs)()
        },
        services: {
            ssh: { port: SSH_PORT, status: 'running' }
        }
    }));
});
httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP Server running on port ${HTTP_PORT}`);
});
// Helper to broadcast events to SSE clients (used by HTTP /messages and SSH subsystem)
function broadcastToSse(payload) {
    try {
        const sseClients = httpServer.__sseClients;
        if (sseClients) {
            for (const cl of sseClients) {
                try {
                    cl.write(`data: ${JSON.stringify(payload)}\n\n`);
                }
                catch (e) { /* ignore write errors */ }
            }
        }
        // Also broadcast to open SSH subsystem streams if any
        const sshStreams = httpServer.__sshSubsystems;
        if (sshStreams) {
            for (const st of sshStreams) {
                try {
                    st.write(JSON.stringify(payload) + '\n');
                }
                catch (e) { /* ignore */ }
            }
        }
    }
    catch (e) {
        console.error('broadcastToSse failed:', e);
    }
}
function registerSshSubsystem(stream) {
    const sshStreams = httpServer.__sshSubsystems = httpServer.__sshSubsystems || new Set();
    sshStreams.add(stream);
}
function unregisterSshSubsystem(stream) {
    const sshStreams = httpServer.__sshSubsystems;
    if (sshStreams)
        sshStreams.delete(stream);
}
// Start SSH Server
try {
    sshServer = new ssh_1.SSHAgentServer(SSH_PORT);
    // Requirement: User needs to know how to connect
    console.log('\n==========================================');
    console.log('  EditorMate Agent is Ready');
    console.log('==========================================');
    const ips = (0, network_1.getLocalIPs)();
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
    }
    else {
        console.warn('  WARNING: No active LAN connection detected.');
    }
    (0, network_1.checkInternetConnection)().then(isOnline => {
        console.log(`  Internet Status: ${isOnline ? 'Online' : 'Offline (Local Mode Only)'}`);
        console.log('==========================================\n');
    });
}
catch (error) {
    console.error('Failed to start SSH Server:', error);
}
console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
