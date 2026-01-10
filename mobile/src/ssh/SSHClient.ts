export type SSHConnectOptions = {
  host: string;
  port?: number;
  username?: string;
  privateKey?: string; // OpenSSH private key text
};

export type SSHEventHandler = (chunk: string) => void;

export interface SSHClient {
  connect(opts: SSHConnectOptions): Promise<void>;
  onData(handler: SSHEventHandler): void;
  write(data: string): void;
  close(): void;
}

// A mock implementation for development and testing. This simulates a shell.
export class MockSSHClient implements SSHClient {
  private handler: SSHEventHandler | null = null;
  private closed = true;

  async connect(opts: SSHConnectOptions) {
    this.closed = false;
    this.emit(`Connecting to ${opts.username || 'user'}@${opts.host}:${opts.port || 22}...\n`);
    await new Promise((r) => setTimeout(r, 500));
    this.emit('Welcome to EditorMate in-app shell (mock)\n$ ');
  }

  onData(handler: SSHEventHandler) {
    this.handler = handler;
  }

  write(data: string) {
    if (this.closed) return;
    // echo back input as fake output
    this.emit(`${data}\n$ `);
  }

  close() {
    this.closed = true;
    this.emit('\n(disconnected)\n');
  }

  private emit(chunk: string) {
    if (this.handler) this.handler(chunk);
  }
}
