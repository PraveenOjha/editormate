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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEphemeralKeyPair = createEphemeralKeyPair;
exports.consumeToken = consumeToken;
exports.listActiveTokens = listActiveTokens;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const sshpk = __importStar(require("sshpk"));
const AUTH_KEYS_PATH = path.join(process.cwd(), 'authorized_keys');
const tokens = new Map();
function createEphemeralKeyPair(ttlMs = 5 * 60 * 1000) {
    const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });
    // Convert PEM public key to OpenSSH format using sshpk
    const key = sshpk.parseKey(publicKey, 'pem');
    const publicOpenSsh = key.toString('ssh');
    const token = (0, uuid_1.v4)();
    const now = Date.now();
    const entry = {
        token,
        privateKeyPem: privateKey,
        publicKeyOpenSsh: publicOpenSsh,
        createdAt: now,
        expiresAt: now + ttlMs,
        used: false
    };
    tokens.set(token, entry);
    // Append public key to authorized_keys with a comment so we can remove it later
    appendPublicKey(publicOpenSsh, token);
    // Schedule cleanup for expiry
    setTimeout(() => {
        const e = tokens.get(token);
        if (e && !e.used) {
            // Remove public key line
            removePublicKeyForToken(token);
            tokens.delete(token);
        }
    }, ttlMs + 1000);
    return entry;
}
function consumeToken(token) {
    const entry = tokens.get(token);
    if (!entry)
        return null;
    if (entry.used)
        return null;
    if (Date.now() > entry.expiresAt) {
        tokens.delete(token);
        removePublicKeyForToken(token);
        return null;
    }
    entry.used = true;
    // Remove public key after consumption
    removePublicKeyForToken(token);
    tokens.delete(token);
    return entry;
}
function appendPublicKey(publicKeyOpenSsh, token) {
    const line = `${publicKeyOpenSsh} # EditorMate-ephemeral ${token}\n`;
    fs.appendFileSync(AUTH_KEYS_PATH, line, { encoding: 'utf8', flag: 'a' });
}
function removePublicKeyForToken(token) {
    if (!fs.existsSync(AUTH_KEYS_PATH))
        return;
    const content = fs.readFileSync(AUTH_KEYS_PATH, 'utf8');
    const lines = content.split(/\r?\n/);
    const filtered = lines.filter(l => !l.includes(`# EditorMate-ephemeral ${token}`));
    fs.writeFileSync(AUTH_KEYS_PATH, filtered.join('\n'), 'utf8');
}
function listActiveTokens() {
    return Array.from(tokens.values()).map(t => ({ token: t.token, expiresAt: t.expiresAt, used: t.used }));
}
