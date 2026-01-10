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
const http_1 = require("http");
const ssh_1 = require("./server/ssh");
const network_1 = require("./utils/network");
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const SSH_PORT = parseInt(process.env.SSH_PORT || '2222', 10);
// Start HTTP Server (for health checks / REST API later)
const qrcode_1 = __importDefault(require("qrcode"));
const keyManager_1 = require("./server/keyManager");
const httpServer = (0, http_1.createServer)(async (req, res) => {
    const online = await (0, network_1.checkInternetConnection)();
    // Pairing endpoints
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
// Start SSH Server
try {
    const sshServer = new ssh_1.SSHAgentServer(SSH_PORT);
    sshServer.start();
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
