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
exports.generateEphemeralKey = generateEphemeralKey;
exports.getAndConsumeToken = getAndConsumeToken;
exports.listActivePairs = listActivePairs;
exports.revokeToken = revokeToken;
exports.revokePublicKey = revokePublicKey;
exports.rotateKey = rotateKey;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const STORE = new Map();
const TTL_MS = 1000 * 60 * 5; // 5 minutes
function genToken() {
    return (0, crypto_1.randomBytes)(12).toString('hex');
}
function ensureSshDir() {
    const sshDir = path.join(os.homedir(), '.ssh');
    if (!fs.existsSync(sshDir))
        fs.mkdirSync(sshDir, { mode: 0o700 });
    return sshDir;
}
function appendAuthorizedKey(pubKey, token) {
    const sshDir = ensureSshDir();
    const authPath = path.join(sshDir, 'authorized_keys');
    const entry = `no-port-forwarding,no-X11-forwarding,no-agent-forwarding,permit-pty ${pubKey} # EditorMate ${token}\n`;
    fs.appendFileSync(authPath, entry, { encoding: 'utf8', mode: 0o600 });
    return authPath;
}
function removeAuthorizedKey(pubKey) {
    const sshDir = ensureSshDir();
    const authPath = path.join(sshDir, 'authorized_keys');
    if (!fs.existsSync(authPath))
        return;
    const contents = fs.readFileSync(authPath, 'utf8');
    const filtered = contents
        .split(/\r?\n/)
        .filter(line => line.trim() && !line.includes(pubKey) && !line.includes('# EditorMate'))
        .join('\n') + '\n';
    fs.writeFileSync(authPath, filtered, { encoding: 'utf8', mode: 0o600 });
}
async function generateEphemeralKey(token) {
    const t = token || genToken();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `editormate-${t}-`));
    const keyPath = path.join(tmp, `id_ed25519`);
    // Use ssh-keygen if available for reliable OpenSSH format keys
    try {
        (0, child_process_1.execSync)(`ssh-keygen -t ed25519 -f "${keyPath}" -N "" -C "editormate-${t}"`, { stdio: 'ignore' });
        const priv = fs.readFileSync(keyPath, 'utf8');
        const pub = fs.readFileSync(`${keyPath}.pub`, 'utf8').trim();
        // Register public key
        appendAuthorizedKey(pub, t);
        const rec = {
            token: t,
            privateKey: priv,
            publicKey: pub,
            createdAt: Date.now(),
            expiresAt: Date.now() + TTL_MS,
            used: false,
        };
        STORE.set(t, rec);
        // Schedule cleanup
        setTimeout(() => {
            const r = STORE.get(t);
            if (r && !r.used) {
                STORE.delete(t);
                try {
                    removeAuthorizedKey(r.publicKey);
                }
                catch (e) {
                    console.warn('Failed to remove key during expiration', e);
                }
            }
        }, TTL_MS + 1000);
        return rec;
    }
    catch (err) {
        // Fallback: generate RSA key pair via Node crypto (less preferable but works)
        console.warn('ssh-keygen failed, falling back to crypto RSA generation', err);
        const { generateKeyPairSync } = await Promise.resolve().then(() => __importStar(require('crypto')));
        const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs1', format: 'pem' } });
        // Note: publicKey here is PEM; for OpenSSH authorized_keys we need a different format. We'll store it as-is but it won't work with SSH client by default. Warn the caller.
        const rec = {
            token: t,
            privateKey,
            publicKey,
            createdAt: Date.now(),
            expiresAt: Date.now() + TTL_MS,
            used: false,
        };
        STORE.set(t, rec);
        setTimeout(() => { if (STORE.get(t) && !STORE.get(t).used) {
            STORE.delete(t);
        } }, TTL_MS + 1000);
        return rec;
    }
}
function getAndConsumeToken(token) {
    const r = STORE.get(token);
    if (!r)
        return null;
    if (r.used)
        return null;
    if (Date.now() > r.expiresAt) {
        STORE.delete(token);
        try {
            removeAuthorizedKey(r.publicKey);
        }
        catch (e) {
            console.warn('Failed to remove key after expiration', e);
        }
        return null;
    }
    r.used = true;
    STORE.set(token, r);
    // remove public key from authorized_keys immediately to prevent reuse
    try {
        removeAuthorizedKey(r.publicKey);
    }
    catch (e) {
        console.warn('Failed to remove key after consumption', e);
    }
    // Also clear the record after returning (keep a copy in memory until served)
    STORE.delete(token);
    return r;
}
function listActivePairs() {
    return Array.from(STORE.values());
}
function revokeToken(token) {
    const r = STORE.get(token);
    if (!r)
        return false;
    try {
        removeAuthorizedKey(r.publicKey);
    }
    catch (e) {
        console.warn('Failed to remove key during revoke', e);
    }
    STORE.delete(token);
    return true;
}
function revokePublicKey(publicKey) {
    try {
        removeAuthorizedKey(publicKey);
        // also remove any matching store entries that reference the public key
        for (const [k, v] of STORE.entries()) {
            if (v.publicKey === publicKey)
                STORE.delete(k);
        }
        return true;
    }
    catch (e) {
        console.warn('Failed to revoke publicKey', e);
        return false;
    }
}
// Rotate keys: generate a fresh ephemeral keypair and optionally revoke an old public key.
// Returns the newly created PairRecord which includes the token and privateKey.
async function rotateKey(oldPublicKey) {
    // Generate a new ephemeral pair (this also appends the new public key to authorized_keys)
    const newPair = await generateEphemeralKey();
    if (oldPublicKey) {
        try {
            revokePublicKey(oldPublicKey);
        }
        catch (e) {
            console.warn('Failed to revoke old public key during rotate', e);
        }
    }
    return newPair;
}
