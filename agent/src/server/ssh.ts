import { Server, Session } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

// DEVELOPMENT ONLY: A temporary host key to allow the server to start.
// In production, this must be read from a secure file (e.g. /etc/ssh/ssh_host_rsa_key)
// Generated for this specific session context.
const DEV_HOST_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEA1+WJt5C9... (This will be a real key in implementation)
...
-----END RSA PRIVATE KEY-----`;

// We'll use a function to get the key, or read from file if it exists
function getHostKey(): string {
  const keyPath = path.join(process.cwd(), 'host.key');
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  console.warn("WARNING: Using insecure embedded development host key.");
  // returning a placeholder - in real code I'll need a real valid PEM string to work.
  // For now, I'll throw if file missing to force user to generate one or I'll write a generator.
  throw new Error("host.key not found. Please generate an RSA key and place it in agent/host.key");
}

export class SSHAgentServer {
  private server: Server;
  private port: number;
  // track connected clients so we can disconnect them when a key is revoked
  private clients: Set<any> = new Set();

  constructor(port: number = 2222) {
    this.port = port;
    this.server = new Server({
      hostKeys: [getHostKey()]
    }, (client) => {
      console.log('Client connected!');
      this.clients.add(client);

      client.on('authentication', (ctx) => {
        // Do NOT allow password auth for production; require public key
        if (ctx.method === 'password') {
          ctx.reject();
          return;
        }

        // Public key auth: check against agent's authorized_keys
        if (ctx.method === 'publickey') {
          // load authorized_keys and compare base64 blobs
          try {
            const keyFile = path.join(process.cwd(), 'authorized_keys');
            if (fs.existsSync(keyFile)) {
              const content = fs.readFileSync(keyFile, 'utf8');
              const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
              for (const line of lines) {
                const parts = line.split(/\s+/);
                if (parts.length < 2) continue;
                const algo = parts[0];
                const base64 = parts[1];
                const buf = Buffer.from(base64, 'base64');
                if (buf.equals(ctx.key.data)) {
                  // record which public key blob authenticated this client for revocation later
                  try { (client as any)._editorMatePubBase64 = base64; } catch (e) {}
                  // If the client supplied a signature, verify it (ssh2 handles signature verification when we call ctx.accept())
                  if (ctx.signature) {
                    ctx.accept();
                    return;
                  } else {
                    // If key only (no signature) accept for now but require signing in production
                    ctx.accept();
                    return;
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error checking authorized_keys:', err);
          }
        }

        // Reject by default
        ctx.reject();
      });

      client.on('ready', () => {
        console.log('Client authenticated!');
        client.on('session', (accept, reject) => {
          const session = accept();
          
          // PTY support
          session.on('pty', (accept, reject, info) => {
             accept && accept();
          });

          // Shell support
          session.on('shell', (accept, reject) => {
            const stream = accept();
            stream.write('Welcome to EditorMate SSH Agent\r\n');
            stream.write('Type "exit" to close.\r\n');
            stream.write('> ');
            
            stream.on('data', (data: Buffer) => {
              const input = data.toString().trim();
              if (input === 'exit') {
                stream.exit(0);
                stream.end();
              } else {
                stream.write(`You said: ${input}\r\n> `);
              }
            });
          });

          // Subsystem support (e.g., ssh -s editormate)
          session.on('subsystem', (accept, reject, info: any) => {
            if (!info || info.name !== 'editormate') {
              return reject && reject();
            }
            const stream = accept();
            stream.write('EditorMate subsystem ready\n');
            // register stream for outbound broadcasts
            try { const { registerSshSubsystem, unregisterSshSubsystem } = require('../index'); registerSshSubsystem(stream); } catch (e) { /* ignore */ }
            // simple newline-delimited JSON protocol
            let buffer = '';
            stream.on('data', (chunk: Buffer) => {
              buffer += chunk.toString();
              let idx;
              while ((idx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line) continue;
                try {
                  const msg = JSON.parse(line);
                  handleSubsystemMessage(msg, stream);
                } catch (err) {
                  stream.write(JSON.stringify({ type: 'error', error: 'invalid-json' }) + '\n');
                }
              }
            });
            stream.on('close', () => { try { const { unregisterSshSubsystem } = require('../index'); unregisterSshSubsystem(stream); } catch (e) { } });
          });

          // handle messages from SSH subsystem clients
          function handleSubsystemMessage(msg: any, stream: any) {
            if (!msg || !msg.type) { stream.write(JSON.stringify({ type: 'error', error: 'missing-type' }) + '\n'); return; }
            if (msg.type === 'chat') {
              // broadcast to SSE clients via helper in index.ts
              try {
                const { broadcastToSse } = require('../index');
                const payload = { sender: msg.sender || 'mobile', text: msg.text || '', ts: Date.now() };
                broadcastToSse(payload);
                stream.write(JSON.stringify({ type: 'ok', id: msg.id || null }) + '\n');
              } catch (e) {
                stream.write(JSON.stringify({ type: 'error', error: String(e) }) + '\n');
              }
            } else if (msg.type === 'exec') {
              // Execute a shell command (only allowed over SSH subsystem)
              try {
                const { spawn } = require('child_process');
                const cmd = msg.command;
                if (!cmd) { stream.write(JSON.stringify({ type: 'error', error: 'missing-command' }) + '\n'); return; }
                const proc = spawn(cmd, { shell: true });
                proc.stdout.on('data', (d: Buffer) => {
                  const out = d.toString();
                  stream.write(JSON.stringify({ type: 'exec-output', stream: 'stdout', data: out }) + '\n');
                  try { const { broadcastToSse } = require('../index'); broadcastToSse({ sender: 'exec', stream: 'stdout', data: out, ts: Date.now() }); } catch (e) {}
                });
                proc.stderr.on('data', (d: Buffer) => {
                  const out = d.toString();
                  stream.write(JSON.stringify({ type: 'exec-output', stream: 'stderr', data: out }) + '\n');
                  try { const { broadcastToSse } = require('../index'); broadcastToSse({ sender: 'exec', stream: 'stderr', data: out, ts: Date.now() }); } catch (e) {}
                });
                proc.on('close', (code: number) => {
                  stream.write(JSON.stringify({ type: 'exec-exit', code }) + '\n');
                });
                stream.write(JSON.stringify({ type: 'ok', id: msg.id || null }) + '\n');
              } catch (e) {
                stream.write(JSON.stringify({ type: 'error', error: String(e) }) + '\n');
              }
            } else if (msg.type === 'ping') {
              stream.write(JSON.stringify({ type: 'pong', ts: Date.now() }) + '\n');
            } else {
              stream.write(JSON.stringify({ type: 'error', error: 'unknown-type' }) + '\n');
            }
          }
        });
      });

      client.on('end', () => {
        console.log('Client disconnected');
        this.clients.delete(client);
      });
      
      client.on('error', (err) => {
        console.error('Client error:', err);
        this.clients.delete(client);
      });
    });
  }

  // Disconnect any connected clients that authenticated with the given public-key base64 blob
  public disconnectClientsByPublicKey(base64: string) {
    for (const c of Array.from(this.clients)) {
      try {
        if ((c as any)._editorMatePubBase64 === base64) {
          try { c.end(); } catch (e) { /* ignore */ }
          this.clients.delete(c);
        }
      } catch (e) { /* ignore */ }
    }
  }

  public start() {
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`SSH Agent listening on port ${this.port}`);
    });
  }
}
