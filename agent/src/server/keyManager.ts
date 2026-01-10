import { generateKeyPairSync } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as sshpk from 'sshpk';

const AUTH_KEYS_PATH = path.join(process.cwd(), 'authorized_keys');

type TokenEntry = {
  token: string;
  privateKeyPem: string;
  publicKeyOpenSsh: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
};

const tokens = new Map<string, TokenEntry>();

export function createEphemeralKeyPair(ttlMs: number = 5 * 60 * 1000): TokenEntry {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  });

  // Convert PEM public key to OpenSSH format using sshpk
  const key = sshpk.parseKey(publicKey, 'pem');
  const publicOpenSsh = key.toString('ssh');

  const token = uuidv4();
  const now = Date.now();
  const entry: TokenEntry = {
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

export function consumeToken(token: string): TokenEntry | null {
  const entry = tokens.get(token);
  if (!entry) return null;
  if (entry.used) return null;
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

function appendPublicKey(publicKeyOpenSsh: string, token: string) {
  const line = `${publicKeyOpenSsh} # EditorMate-ephemeral ${token}\n`;
  fs.appendFileSync(AUTH_KEYS_PATH, line, { encoding: 'utf8', flag: 'a' });
}

function removePublicKeyForToken(token: string) {
  if (!fs.existsSync(AUTH_KEYS_PATH)) return;
  const content = fs.readFileSync(AUTH_KEYS_PATH, 'utf8');
  const lines = content.split(/\r?\n/);
  const filtered = lines.filter(l => !l.includes(`# EditorMate-ephemeral ${token}`));
  fs.writeFileSync(AUTH_KEYS_PATH, filtered.join('\n'), 'utf8');
}

export function listActiveTokens() {
  return Array.from(tokens.values()).map(t => ({ token: t.token, expiresAt: t.expiresAt, used: t.used }));
}
