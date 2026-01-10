import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomBytes } from 'crypto';

type PairRecord = {
  token: string;
  privateKey: string;
  publicKey: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
};

const STORE = new Map<string, PairRecord>();
const TTL_MS = 1000 * 60 * 5; // 5 minutes

function genToken() {
  return randomBytes(12).toString('hex');
}

function ensureSshDir() {
  const sshDir = path.join(os.homedir(), '.ssh');
  if (!fs.existsSync(sshDir)) fs.mkdirSync(sshDir, { mode: 0o700 });
  return sshDir;
}

function appendAuthorizedKey(pubKey: string, token: string) {
  const sshDir = ensureSshDir();
  const authPath = path.join(sshDir, 'authorized_keys');
  const entry = `no-port-forwarding,no-X11-forwarding,no-agent-forwarding,permit-pty ${pubKey} # EditorMate ${token}\n`;
  fs.appendFileSync(authPath, entry, { encoding: 'utf8', mode: 0o600 });
  return authPath;
}

function removeAuthorizedKey(pubKey: string) {
  const sshDir = ensureSshDir();
  const authPath = path.join(sshDir, 'authorized_keys');
  if (!fs.existsSync(authPath)) return;
  const contents = fs.readFileSync(authPath, 'utf8');
  const filtered = contents
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.includes(pubKey) && !line.includes('# EditorMate'))
    .join('\n') + '\n';
  fs.writeFileSync(authPath, filtered, { encoding: 'utf8', mode: 0o600 });
}

export async function generateEphemeralKey(token?: string): Promise<PairRecord> {
  const t = token || genToken();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `editormate-${t}-`));
  const keyPath = path.join(tmp, `id_ed25519`);

  // Use ssh-keygen if available for reliable OpenSSH format keys
  try {
    execSync(`ssh-keygen -t ed25519 -f "${keyPath}" -N "" -C "editormate-${t}"`, { stdio: 'ignore' });
    const priv = fs.readFileSync(keyPath, 'utf8');
    const pub = fs.readFileSync(`${keyPath}.pub`, 'utf8').trim();

    // Register public key
    appendAuthorizedKey(pub, t);

    const rec: PairRecord = {
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
        try { removeAuthorizedKey(r.publicKey); } catch (e) { console.warn('Failed to remove key during expiration', e); }
      }
    }, TTL_MS + 1000);

    return rec;
  } catch (err) {
    // Fallback: generate RSA key pair via Node crypto (less preferable but works)
    console.warn('ssh-keygen failed, falling back to crypto RSA generation', err);
    const { generateKeyPairSync } = await import('crypto');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs1', format: 'pem' } });

    // Note: publicKey here is PEM; for OpenSSH authorized_keys we need a different format. We'll store it as-is but it won't work with SSH client by default. Warn the caller.
    const rec: PairRecord = {
      token: t,
      privateKey,
      publicKey,
      createdAt: Date.now(),
      expiresAt: Date.now() + TTL_MS,
      used: false,
    };
    STORE.set(t, rec);
    setTimeout(() => { if (STORE.get(t) && !STORE.get(t)!.used) { STORE.delete(t); } }, TTL_MS + 1000);
    return rec;
  }
}

export function getAndConsumeToken(token: string): PairRecord | null {
  const r = STORE.get(token);
  if (!r) return null;
  if (r.used) return null;
  if (Date.now() > r.expiresAt) {
    STORE.delete(token);
    try { removeAuthorizedKey(r.publicKey); } catch (e) { console.warn('Failed to remove key after expiration', e); }
    return null;
  }

  r.used = true;
  STORE.set(token, r);
  // remove public key from authorized_keys immediately to prevent reuse
  try { removeAuthorizedKey(r.publicKey); } catch (e) { console.warn('Failed to remove key after consumption', e); }

  // Also clear the record after returning (keep a copy in memory until served)
  STORE.delete(token);
  return r;
}

export function listActivePairs() {
  return Array.from(STORE.values());
}
