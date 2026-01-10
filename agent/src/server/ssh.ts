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

  constructor(port: number = 2222) {
    this.port = port;
    this.server = new Server({
      hostKeys: [getHostKey()]
    }, (client) => {
      console.log('Client connected!');

      client.on('authentication', (ctx) => {
        // Password fallback for DEV convenience
        if (ctx.method === 'password' && ctx.password === 'editormate') {
          ctx.accept();
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
        });
      });

      client.on('end', () => {
        console.log('Client disconnected');
      });
      
      client.on('error', (err) => {
        console.error('Client error:', err);
      });
    });
  }

  public start() {
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`SSH Agent listening on port ${this.port}`);
    });
  }
}
