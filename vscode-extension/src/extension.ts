import * as vscode from 'vscode';
import * as os from 'os';
import * as http from 'http';
const HTTP_PORT = 3000;

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('editormate.showPairing', async () => {
    // Try to discover the host automatically
    const discovered = await findAgentHost();
    let host: string | undefined = undefined;
    if (discovered) {
      host = discovered;
    } else {
      // try last used host
      const last = context.globalState.get<string>('editormate.lastHost');
      if (last) {
        const ok = await probeHost(last);
        if (ok) host = last;
      }
    }

    if (!host) {
      host = await vscode.window.showInputBox({ prompt: 'Enter host IP (e.g. 192.168.1.22)', value: undefined });
    }
    if (!host) return;

    // Save host for future convenience
    await context.globalState.update('editormate.lastHost', host);

    const panel = vscode.window.createWebviewPanel('editormate.pairing', 'EditorMate Pairing', vscode.ViewColumn.One, {
      enableScripts: true
    });

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === 'fetchPairing') {
        try {
          const url = `http://${host}:3000/pairing`;
          const data = await fetchJson(url, 4000);
          panel.webview.postMessage({ type: 'pairingData', data });
        } catch (err: any) {
          panel.webview.postMessage({ type: 'error', message: String(err) });
        }
      } else if (msg.command === 'copy') {
        await vscode.env.clipboard.writeText(msg.text || '');
        vscode.window.showInformationMessage('Copied to clipboard');
      } else if (msg.command === 'open') {
        const uri = vscode.Uri.parse(msg.url);
        vscode.env.openExternal(uri);
      }
    }, undefined, context.subscriptions);

    // Auto-fetch pairing info to avoid an extra click
    panel.webview.postMessage({ type: 'info', message: `Using host ${host}` });
    try {
      const data = await fetchJson(`http://${host}:3000/pairing`, 4000);
      panel.webview.postMessage({ type: 'pairingData', data });
    } catch (err) {
      // ignore; user can press Fetch
    }

  });

  context.subscriptions.push(disposable);
}

async function fetchJson(url: string, timeoutMs = 2000) {
  return new Promise<any>((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function probeHost(host: string) {
  try {
    const j = await fetchJson(`http://${host}:${HTTP_PORT}/`, 800);
    return j && j.agent && j.agent.indexOf('EditorMate') !== -1;
  } catch (e) {
    return false;
  }
}

async function findAgentHost() {
  const nets = os.networkInterfaces();
  const candidates: string[] = ['127.0.0.1', 'localhost'];
  for (const name of Object.keys(nets)) {
    const arr = nets[name] as any[];
    if (!arr) continue;
    for (const net of arr) {
      if (net.family === 'IPv4' && !net.internal) candidates.push(net.address);
    }
  }

  for (const ip of candidates) {
    const ok = await probeHost(ip);
    if (ok) return ip;
  }
  return null;
}

export function deactivate() {}


function getWebviewContent() {
  // Minimal webview html that posts message to extension to fetch pairing info
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>EditorMate Pairing</title>
<style>
  body { font-family: sans-serif; padding: 16px; color: #222 }
  #qr { width: 220px; height: 220px; border: 1px solid #ddd; margin-bottom: 8px; }
  button { margin-right: 8px; }
  pre { background: #f6f8fa; padding: 8px; border-radius: 6px; }
</style>
</head>
<body>
  <h2>EditorMate Pairing</h2>
  <div id="status">Press Fetch to request a pairing token from the host.</div>
  <div style="margin-top:12px">
    <button id="fetch">Fetch Pairing</button>
    <button id="open">Open random URL</button>
  </div>
  <div id="result" style="margin-top:12px; display:none">
    <img id="qr" src="" alt="QR" />
    <div id="info"></div>
    <div style="margin-top:8px"><pre id="commands"></pre></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('fetch').addEventListener('click', () => {
      document.getElementById('status').textContent = 'Fetching...';
      vscode.postMessage({ command: 'fetchPairing' });
    });
    document.getElementById('open').addEventListener('click', () => {
      const url = prompt('Open URL (randomUrl):');
      if (url) vscode.postMessage({ command: 'open', url });
    });

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'pairingData') {
        const d = msg.data;
        document.getElementById('status').textContent = 'Pairing fetched.';
        document.getElementById('result').style.display = 'block';
        document.getElementById('qr').src = d.qrDataUrl;
        document.getElementById('info').innerHTML = `<b>Deep Link:</b> <a href="#" id="openDeep">${d.deepLink}</a>`;
        document.getElementById('openDeep').addEventListener('click', () => vscode.postMessage({ command: 'open', url: d.deepLink }));
        document.getElementById('commands').textContent = d.sshCommands.join('\n');
      } else if (msg.type === 'error') {
        document.getElementById('status').textContent = 'Error: ' + msg.message;
      } else if (msg.type === 'info') {
        document.getElementById('status').textContent = msg.message;
      }
    });
  </script>
</body>
</html>`;
}
