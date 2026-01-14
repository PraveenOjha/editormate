import * as vscode from 'vscode';
import * as os from 'os';
import * as http from 'http';
/*
  If you see "Cannot find module 'vscode'" when running the built file directly (e.g. `node dist/extension.js`),
  it's because the extension must run inside VS Code's Extension Development Host (press F5). The compiled file
  includes a runtime guard that prints a friendly message and exits if executed with plain node.
*/
const HTTP_PORT = 3000;

// Diagnostic channel used by detection & SSE helpers (initialized in activate)
let detectionChannel: vscode.OutputChannel | null = null;

export function activate(context: vscode.ExtensionContext) {
  // Status bar item for quick access & status (opens pairing QR)
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.text = '$(device-mobile) EditorMate';
  statusItem.tooltip = 'EditorMate: click to open pairing QR';
  statusItem.command = 'editormate.openPairing';
  statusItem.show();
  context.subscriptions.push(statusItem);

  // Tree provider for Pairing view (shows Pairing, Tunnel, and Chat-to-track)
  class PairingProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: vscode.TreeItem) { return element; }
    getChildren() {
      const items = [] as vscode.TreeItem[];
      const pairing = new vscode.TreeItem('Open Pairing', vscode.TreeItemCollapsibleState.None);
      pairing.command = { command: 'editormate.openPairing', title: 'Open Pairing' };
      items.push(pairing);

      const tunnel = new vscode.TreeItem('Tunnel', vscode.TreeItemCollapsibleState.None);
      tunnel.command = { command: 'editormate.openTunnel', title: 'Open Tunnel' };
      items.push(tunnel);

      const chatTrack = new vscode.TreeItem('Chat to Track', vscode.TreeItemCollapsibleState.None);
      chatTrack.command = { command: 'editormate.selectChatToTrack', title: 'Select Chat to Track' };
      items.push(chatTrack);

      return items;
    }
  }
  vscode.window.registerTreeDataProvider('editormate.pairingView', new PairingProvider());

  // Command: open pairing (QR only)
  const openPairing = vscode.commands.registerCommand('editormate.openPairing', async () => {
    // Ensure agent is running (auto-start if configured), then open pairing
    const cfgAuto = vscode.workspace.getConfiguration().get<boolean>('editormate.autoStartAgent', true);
    let host = await findAgentHost();
    if (!host && cfgAuto) {
      try {
        await ensureAgentStartedAndReady();
        host = await findAgentHost();
      } catch (e) {
        // ignore; we'll still open pairing and let user start agent manually
        console.error('ensureAgentStartedAndReady failed:', e);
      }
    }
    // Call pairing flow which will fetch pairing from host if available
    await vscode.commands.executeCommand('editormate.showPairing');
  });
  context.subscriptions.push(openPairing);

  // Tunnel command (opens a small UI to show tunnel status / instructions)
  const openTunnel = vscode.commands.registerCommand('editormate.openTunnel', async () => {
    const panel = vscode.window.createWebviewPanel('editormate.tunnel', 'EditorMate Tunnel', vscode.ViewColumn.One, { enableScripts: true });
    panel.webview.html = `<!doctype html><html><body style="font-family:system-ui;padding:12px"><h2>EditorMate Tunnel</h2><p>EditorMate supports creating tunnels (Cloudflare Tunnel, ngrok, etc.) to expose your agent to the internet. This panel is a placeholder to show tunnel status and controls.</p><p><button id=refresh>Refresh status</button></p><script>const vscode=acquireVsCodeApi();document.getElementById('refresh').addEventListener('click',()=>vscode.postMessage({command:'refresh'}));window.addEventListener('message',e=>{console.log(e.data)});</script></body></html>`;
    panel.webview.onDidReceiveMessage(async (m) => {
      if (m.command === 'refresh') {
        // simple probe to show agent status
        const host = await findAgentHost();
        panel.webview.postMessage({ status: host ? 'Agent reachable at ' + host : 'Agent not found' });
      }
    }, undefined, context.subscriptions);
  });
  context.subscriptions.push(openTunnel);
  // Helper: ensure the local agent is built and started, wait until it responds
  async function ensureAgentStartedAndReady(timeoutMs = 10000) {
    const wf = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    if (!wf) throw new Error('No workspace');
    const agentCwd = vscode.Uri.joinPath(wf.uri, 'agent').fsPath;
    const fs = require('fs');
    if (!fs.existsSync(agentCwd)) throw new Error('No agent folder');
    const agentDist = require('path').join(agentCwd, 'dist', 'index.js');
    const { exec, spawn } = require('child_process');
    if (!fs.existsSync(agentDist)) {
      await new Promise((resolve, reject) => exec('npm run build', { cwd: agentCwd }, (err: any) => err ? reject(err) : resolve(null)));
    }
    // Start agent as a detached child to persist even if extension reloads
    const nodePath = process.execPath || 'node';
    const proc = spawn(nodePath, [agentDist], { cwd: agentCwd, env: process.env, detached: true, stdio: 'ignore' });
    proc.unref();
    // wait for findAgentHost to return
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const h = await findAgentHost();
      if (h) return h;
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Agent did not become ready within timeout');
  }

  // Command: select chat to track
  const selectChatToTrack = vscode.commands.registerCommand('editormate.selectChatToTrack', async () => {
    const editors = vscode.window.visibleTextEditors.map(e => ({ label: e.document.fileName.split(/\\|\//).pop() || e.document.fileName, description: e.document.uri.toString(), uri: e.document.uri }));
    // add special option to track Copilot mirror
    const options = [{ label: 'Mirror: Copilot Chat', description: 'Open EditorMate Copilot Mirror Webview', type: 'mirror', id: 'copilot' }, ...editors.map(e => ({ label: e.label, description: e.description, type: 'text', uri: e.uri }))];
    const pick = await vscode.window.showQuickPick(options as any[], { placeHolder: 'Select editor or mirror to track for mobile chat' });
    if (!pick) return;
    if ((pick as any).type === 'mirror') {
      await context.globalState.update('editormate.trackedChat', { type: 'mirror', id: (pick as any).id });
      vscode.window.showInformationMessage(`Now tracking mirror: ${pick.label}`);
      // open mirror webview
      await vscode.commands.executeCommand('editormate.openCopilotMirror');
    } else {
      await context.globalState.update('editormate.trackedChat', { type: 'text', uri: (pick as any).uri.toString() });
      vscode.window.showInformationMessage(`Now tracking ${pick.label}`);
    }
  });
  context.subscriptions.push(selectChatToTrack);

  // Diagnostic channel for host detection
  detectionChannel = vscode.window.createOutputChannel('EditorMate Detection');

  // SSE subscription handle
  let sseConn: any = null;
  const startSSE = async (host: string | undefined) => {
    if (!host) return;
    if (sseConn && typeof sseConn.close === 'function') sseConn.close();
    detectionChannel?.appendLine(`Starting SSE subscription to http://${host}:3000/events`);
    sseConn = subscribeToAgentEvents(host, (data: any) => handleAgentMessage(data));
    if (!sseConn) detectionChannel?.appendLine('SSE subscription failed to start (EventSource not available).');
  };

  // File index: maintain a snapshot of workspace filenames for quick reference
  async function indexWorkspaceFiles(maxFiles = 2000) {
    const wf = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    if (!wf) return [] as string[];
    const uris = await vscode.workspace.findFiles('**/*', '{**/node_modules/**,**/.git/**,**/.vscode/**}', maxFiles);
    const base = wf.uri.fsPath;
    const path = require('path');
    const files = uris.map((u: any) => path.relative(base, u.fsPath).replace(/\\/g, '/'));
    await context.globalState.update('editormate.fileIndex', files);
    await context.globalState.update('editormate.fileIndexUpdatedAt', Date.now());
    return files;
  }

  const refreshFileIndexCmd = vscode.commands.registerCommand('editormate.refreshFileIndex', async () => {
    const files = await indexWorkspaceFiles();
    vscode.window.showInformationMessage(`EditorMate: indexed ${files.length} files`);
  });
  context.subscriptions.push(refreshFileIndexCmd);

  // Watch workspace and refresh index on changes (debounced)
  const fsWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  let indexTimeout: NodeJS.Timeout | null = null;
  const scheduleIndex = () => { if (indexTimeout) clearTimeout(indexTimeout); indexTimeout = setTimeout(() => indexWorkspaceFiles(), 1000); };
  fsWatcher.onDidCreate(scheduleIndex, null, context.subscriptions);
  fsWatcher.onDidChange(scheduleIndex, null, context.subscriptions);
  fsWatcher.onDidDelete(scheduleIndex, null, context.subscriptions);
  context.subscriptions.push(fsWatcher);

  // Command: insert file reference into copilot mirror input or send to agent
  const insertFileReference = vscode.commands.registerCommand('editormate.insertFileReference', async () => {
    const files: string[] = context.globalState.get('editormate.fileIndex') || await indexWorkspaceFiles();
    if (!files || files.length === 0) { vscode.window.showInformationMessage('No files indexed in workspace'); return; }
    const pick = await vscode.window.showQuickPick(files, { placeHolder: 'Select a file to reference' });
    if (!pick) return;
    const tracked = context.globalState.get<any>('editormate.trackedChat');
    if (copilotPanel && tracked && tracked.type === 'mirror' && tracked.id === 'copilot') {
      // insert into mirror input via postMessage
      copilotPanel.webview.postMessage({ type: 'insertFile', file: pick });
      vscode.window.showInformationMessage(`Inserted file reference into Copilot Mirror: ${pick}`);
    } else {
      // send to agent as a message
      const hostVal = context.globalState.get<string>('editormate.lastHost') || await findAgentHost() || 'localhost';
      try {
        await postJson(`http://${hostVal}:3000/messages`, { sender: 'vscode', text: `@agent file:${pick}` });
        vscode.window.showInformationMessage(`Sent file reference to agent: ${pick}`);
      } catch (e) { vscode.window.showErrorMessage('Failed to send file reference: ' + String(e)); }
    }
  });
  context.subscriptions.push(insertFileReference);

  // Copilot mirror webview
  let copilotPanel: vscode.WebviewPanel | null = null;
  const openCopilotMirror = vscode.commands.registerCommand('editormate.openCopilotMirror', async () => {
    if (copilotPanel) { copilotPanel.reveal(); return; }
    copilotPanel = vscode.window.createWebviewPanel('editormate.copilotMirror', 'EditorMate Copilot Mirror', vscode.ViewColumn.Beside, { enableScripts: true });
    copilotPanel.webview.html = getCopilotMirrorHtml();
    copilotPanel.onDidDispose(() => { copilotPanel = null; }, null, context.subscriptions);
    // ensure SSE is connected
    const hostVal = context.globalState.get<string>('editormate.lastHost') || await findAgentHost();
    if (hostVal) startSSE(hostVal);
    // send file index info to webview
    const files: string[] = context.globalState.get('editormate.fileIndex') || await indexWorkspaceFiles();
    const updatedAt = context.globalState.get<number>('editormate.fileIndexUpdatedAt') || Date.now();
    copilotPanel.webview.postMessage({ type: 'fileIndexInfo', filesCount: files.length, updatedAt });
    copilotPanel.webview.onDidReceiveMessage(async (m) => {
      if (m.command === 'send') {
        try {
          const hostVal2 = context.globalState.get<string>('editormate.lastHost') || await findAgentHost() || 'localhost';
          await postJson(`http://${hostVal2}:3000/messages`, { sender: 'vscode', text: m.text });
        } catch (e) { vscode.window.showErrorMessage('Failed to send to agent: ' + String(e)); }
      } else if (m.command === 'requestFiles') {
        const f: string[] = context.globalState.get('editormate.fileIndex') || await indexWorkspaceFiles();
        copilotPanel!.webview.postMessage({ type: 'fileList', files: f });
      }
    }, undefined, context.subscriptions);
  });
  context.subscriptions.push(openCopilotMirror);

  // When SSE messages arrive, write them into tracked chat
  const lastAgentInserts = new Set<string>();
  async function handleAgentMessage(data: any) {
    try {
      // Log incoming SSE messages to the detection output for easier debugging
      try { detectionChannel && detectionChannel.appendLine(`SSE MESSAGE: ${JSON.stringify(data)}`); } catch (e) { /* ignore */ }
      if (!data || data.sender === 'vscode') return; // ignore our own messages
      const tracked = context.globalState.get<any>('editormate.trackedChat');
      if (tracked && tracked.type === 'text') {
        const uri = vscode.Uri.parse(tracked.uri);
        const doc = await vscode.workspace.openTextDocument(uri);
        const edit = await vscode.window.showTextDocument(doc, { preview: false });
        const textToInsert = `\n[Mobile ${new Date().toLocaleTimeString()}] ${data.text}`;
        lastAgentInserts.add(textToInsert);
        await edit.edit(e => { e.insert(new vscode.Position(doc.lineCount, 0), textToInsert); });
      }
      // Always forward messages to Copilot mirror if it's open
      if (copilotPanel) {
        copilotPanel.webview.postMessage({ type: 'message', data });
      }
      // Additionally, if user chose copilot mirror as tracked target, keep tracked document in sync
      if (tracked && tracked.type === 'mirror' && tracked.id === 'copilot') {
        // no-op here as the copilotPanel already receives messages
      }
    } catch (e) {
      console.error('handleAgentMessage failed:', e);
    }
  }

  // Watch for edits to tracked document and send appended lines to agent
  const changeListener = vscode.workspace.onDidChangeTextDocument(async (ev) => {
    try {
      const tracked = context.globalState.get<any>('editormate.trackedChat');
      if (!tracked || tracked.type !== 'text') return;
      if (ev.document.uri.toString() !== tracked.uri) return;
      for (const ch of ev.contentChanges) {
        const inserted = ch.text;
        if (!inserted || inserted.trim().length === 0) continue;
        if (lastAgentInserts.has(inserted)) { lastAgentInserts.delete(inserted); continue; }
        // send to agent
        const hostVal = context.globalState.get<string>('editormate.lastHost') || await findAgentHost() || 'localhost';
        try { await postJson(`http://${hostVal}:3000/messages`, { sender: 'vscode', text: inserted }); } catch (e) { /* ignore */ }
      }
    } catch (e) { console.error(e); }
  });
  context.subscriptions.push(changeListener);

  // existing pairing command
  const disposable = vscode.commands.registerCommand('editormate.showPairing', async () => {
    // Present recent hosts, auto-detect, or manual entry
    const lastHosts = context.globalState.get<string[]>('editormate.hosts') || [];
    const pickItems = ['Auto-detect', ...lastHosts, 'Enter host manually'];
    const pick = await vscode.window.showQuickPick(pickItems, { placeHolder: 'Select host or Auto-detect' });
    if (!pick) return;

    let host: string | undefined;
    if (pick === 'Auto-detect') {
      host = (await findAgentHost()) || undefined;
      if (!host) {
        vscode.window.showWarningMessage('Auto-detect failed; please enter host manually.');
        host = await vscode.window.showInputBox({ prompt: 'Enter host IP (e.g. 192.168.1.22)' });
      }
    } else if (pick === 'Enter host manually') {
      host = await vscode.window.showInputBox({ prompt: 'Enter host IP (e.g. 192.168.1.22)' });
    } else {
      host = pick;
    }

    if (!host) return;

    // Save host for future convenience (dedupe & keep recent 5)
    const hostsArr = [host, ...lastHosts.filter(h => h !== host)].slice(0, 5);
    await context.globalState.update('editormate.hosts', hostsArr);
    await context.globalState.update('editormate.lastHost', host);

    const panel = vscode.window.createWebviewPanel('editormate.pairing', 'EditorMate Pairing', vscode.ViewColumn.One, {
      enableScripts: true
    });

    panel.webview.html = getWebviewContent();

    // Agent output channel and proc reference
    let agentProc: import('child_process').ChildProcessWithoutNullStreams | null = null;
    const outputChannel = vscode.window.createOutputChannel('EditorMate Agent');

    // Send existing history to the webview immediately
    const existingHistory = context.globalState.get<any[]>('editormate.pairings') || [];
    panel.webview.postMessage({ type: 'history', data: existingHistory });
    // send agent current state (not running)
    panel.webview.postMessage({ type: 'agentStatus', status: 'stopped' });

    // helper to save pairing to history (recent first, max 10)
    function savePairingToHistory(entry: any) {
      const cur = context.globalState.get<any[]>('editormate.pairings') || [];
      // avoid duplicates by token
      const filtered = cur.filter((e: any) => e.token !== entry.token);
      const next = [entry, ...filtered].slice(0, 10);
      context.globalState.update('editormate.pairings', next);
      panel.webview.postMessage({ type: 'history', data: next });
    }

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === 'fetchPairing') {
        try {
          const url = `http://${host}:3000/pairing`;
          const data = await fetchJson(url, 4000);
          panel.webview.postMessage({ type: 'pairingData', data });
          // record history: include host and timestamp and token if available
          try {
            const entry = {
              host,
              token: data && data.randomUrl ? (data.randomUrl.split('/').pop() || '') : '',
              deepLink: data.deepLink,
              randomUrl: data.randomUrl,
              createdAt: Date.now()
            };
            savePairingToHistory(entry);
          } catch (e) { /* ignore history failures */ }
        } catch (err: any) {
          panel.webview.postMessage({ type: 'error', message: String(err) });
        }
      } else if (msg.command === 'copy') {
        await vscode.env.clipboard.writeText(msg.text || '');
        vscode.window.showInformationMessage('Copied to clipboard');
      } else if (msg.command === 'open') {
        const uri = vscode.Uri.parse(msg.url);
        vscode.env.openExternal(uri);
      } else if (msg.command === 'rotateKey') {
        // Rotate the pairing key via admin endpoint (localhost-only)
        try {
          const url = `http://${host}:3000/pairing/rotate`;
          const res = await postJson(url, {});
          if (res && res.success && res.newPair) {
            panel.webview.postMessage({ type: 'pairingData', data: { deepLink: res.newPair.deepLink, randomUrl: res.url, qrDataUrl: res.newPair.qrDataUrl } });
            vscode.window.showInformationMessage('Pairing key rotated. Device(s) will be logged out and will need to re-pair.');
          } else {
            panel.webview.postMessage({ type: 'error', message: 'Rotation failed' });
          }
        } catch (e: any) { panel.webview.postMessage({ type: 'error', message: String(e) }); }
      } else if (msg.command === 'openPairingView') {
        // open http://<host>/pairing/view in external browser
        const viewUrl = `http://${host}:3000/pairing/view`;
        vscode.env.openExternal(vscode.Uri.parse(viewUrl));
      } else if (msg.command === 'clearHistory') {
        await context.globalState.update('editormate.pairings', []);
        panel.webview.postMessage({ type: 'history', data: [] });
      } else if (msg.command === 'startAgent') {
        if (agentProc) { panel.webview.postMessage({ type: 'agentStatus', status: 'already-running' }); return; }
        const wf = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
        if (!wf) { panel.webview.postMessage({ type: 'agentStatus', status: 'no-workspace' }); return; }
        const agentCwd = vscode.Uri.joinPath(wf.uri, 'agent').fsPath;
        const agentDist = require('path').join(agentCwd, 'dist', 'index.js');
        const fs = require('fs');
        const { spawn, exec } = require('child_process');

        const buildIfNecessary = async () => {
          if (!fs.existsSync(agentDist)) {
            panel.webview.postMessage({ type: 'agentStatus', status: 'building' });
            await new Promise((resolve, reject) => {
              exec('npm run build', { cwd: agentCwd }, (err: any, stdout: string, stderr: string) => {
                outputChannel.append(stdout || '');
                outputChannel.append(stderr || '');
                if (err) reject(err); else resolve(null);
              });
            });
          }
        };

        try {
          await buildIfNecessary();
        } catch (e: any) {
          panel.webview.postMessage({ type: 'agentStatus', status: 'build-failed', message: String(e) });
          return;
        }

        panel.webview.postMessage({ type: 'agentStatus', status: 'starting' });
        agentProc = spawn('node', [agentDist], { cwd: agentCwd, env: process.env });
        outputChannel.show(true);
        outputChannel.appendLine('=== EditorMate Agent (started by VS Code) ===');
        agentProc!.stdout.on('data', (b: Buffer) => { const s = b.toString(); outputChannel.append(s); panel.webview.postMessage({ type: 'agentLog', text: s }); });
        agentProc!.stderr.on('data', (b: Buffer) => { const s = b.toString(); outputChannel.append(s); panel.webview.postMessage({ type: 'agentLog', text: s }); });
        agentProc!.on('exit', (code: number | null) => { outputChannel.appendLine(`Agent exited: code=${code}`); panel.webview.postMessage({ type: 'agentStatus', status: 'stopped', code }); agentProc = null; });
        panel.webview.postMessage({ type: 'agentStatus', status: 'running' });

      } else if (msg.command === 'stopAgent') {
        if (!agentProc) { panel.webview.postMessage({ type: 'agentStatus', status: 'not-running' }); return; }
        agentProc.kill('SIGTERM');
        panel.webview.postMessage({ type: 'agentStatus', status: 'stopping' });
      }
    }, undefined, context.subscriptions);

    // Auto-fetch pairing info to avoid an extra click
    panel.webview.postMessage({ type: 'info', message: `Using host ${host}` });
    try {
      const data = await fetchJson(`http://${host}:3000/pairing`, 4000);
      panel.webview.postMessage({ type: 'pairingData', data });
      // record history for the auto-fetch as well
      try {
        const entry = {
          host,
          token: data && data.randomUrl ? (data.randomUrl.split('/').pop() || '') : '',
          deepLink: data.deepLink,
          randomUrl: data.randomUrl,
          createdAt: Date.now()
        };
        savePairingToHistory(entry);
      } catch (e) { /* ignore */ }
    } catch (err) {
      // ignore; user can press Fetch
    }

  });

  context.subscriptions.push(disposable);

  // Auto-open EditorMate view and Pairing on activation (convenience for dev/testing)
  setTimeout(() => {
    try {
      // Reveal the activity view container
      vscode.commands.executeCommand('workbench.view.extension.editormate');
      // Open the Pairing panel
      vscode.commands.executeCommand('editormate.openPairing');
    } catch (e) {
      console.error('Auto-open EditorMate failed', e);
    }
  }, 500);

  // Auto-start agent if setting enabled and agent not detected
  (async () => {
    try {
      const auto = vscode.workspace.getConfiguration().get<boolean>('editormate.autoStartAgent', true);
      if (!auto) return;
      const host = await findAgentHost();
      if (host) {
        statusItem.text = '$(device-mobile) EditorMate (connected)';
        return; // agent already present on LAN
      }
      // If no host but workspace has an agent folder, try to start it
      const wf = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
      if (!wf) return;
      const agentCwd = vscode.Uri.joinPath(wf.uri, 'agent').fsPath;
      const fs = require('fs');
      const { spawn } = require('child_process');
      if (!fs.existsSync(agentCwd)) return;
      // build if necessary
      const agentDist = require('path').join(agentCwd, 'dist', 'index.js');
      if (!fs.existsSync(agentDist)) {
        // run npm run build
        const { exec } = require('child_process');
        statusItem.text = '$(sync~spin) EditorMate (building)';
        await new Promise((resolve, reject) => exec('npm run build', { cwd: agentCwd }, (err: any, stdout: string, stderr: string) => err ? reject(err) : resolve(null)));
      }
      statusItem.text = '$(sync~spin) EditorMate (starting)';
      const proc = spawn('node', [require('path').join(agentCwd, 'dist', 'index.js')], { cwd: agentCwd, env: process.env });
      proc.stdout.on('data', (b: Buffer) => { statusItem.text = '$(device-mobile) EditorMate (running)'; console.log(b.toString()); });
      proc.stderr.on('data', (b: Buffer) => { console.error(b.toString()); });
      proc.on('exit', () => { statusItem.text = '$(device-mobile) EditorMate'; });
    } catch (e) {
      console.error('Auto-start agent failed:', e);
    }
  })();
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

async function probeHost(host: string, timeoutMs = 4000) {
  // try probing /pairing (preferred) then root
  try {
    detectionChannel?.appendLine(`probeHost: probing ${host}`);
    try {
      const j = await fetchJson(`http://${host}:3000/pairing`, timeoutMs);
      detectionChannel?.appendLine(`probeHost: ${host} /pairing -> ${j && j.success ? 'ok' : 'no'} `);
      if (j && j.success) return true;
    } catch (e) {
      detectionChannel?.appendLine(`probeHost: ${host} /pairing failed: ${String(e)}`);
      // ignore pairing probe failures and fallback to root
    }
    const j2 = await fetchJson(`http://${host}:3000/`, timeoutMs);
    detectionChannel?.appendLine(`probeHost: ${host} / -> ${j2 && j2.agent ? 'ok' : 'no'}`);
    return j2 && j2.agent && j2.agent.indexOf('EditorMate') !== -1;
  } catch (e) {
    detectionChannel?.appendLine(`probeHost(${host}) failed: ${String(e)}`);
    return false;
  }
}

async function findAgentHost(retries = 5, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const nets = os.networkInterfaces();
    const candidates: string[] = ['127.0.0.1', 'localhost'];
    for (const name of Object.keys(nets)) {
      const arr = nets[name] as any[];
      if (!arr) continue;
      for (const net of arr) {
        if (net.family === 'IPv4' && !net.internal) candidates.push(net.address);
      }
    }

    detectionChannel?.appendLine(`findAgentHost: attempt ${attempt}, probing ${candidates.join(', ')}`);

    // Probe hosts in parallel with a slightly larger timeout to be robust on slow networks
    const checks = candidates.map(ip => ({ ip, p: probeHost(ip, 4000) }));
    const results = await Promise.all(checks.map(c => c.p.then(ok => ({ ip: c.ip, ok })).catch(()=>({ ip: c.ip, ok: false }))));
    for (const r of results) {
      if (r.ok) {
        detectionChannel?.appendLine(`findAgentHost: found agent at ${r.ip} (attempt ${attempt})`);
        return r.ip;
      }
    }

    if (attempt < retries) {
      detectionChannel?.appendLine(`findAgentHost: no agent found (attempt ${attempt}), retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  detectionChannel?.appendLine('findAgentHost: no agent found after retries');
  return null;
}

async function postJson(url: string, body: any, timeoutMs = 4000) {
  return new Promise<any>((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = require('url').parse(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: timeoutMs
    } as any;
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve(d); } });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// Subscribe to server-sent events (SSE) from agent to receive chat messages
function subscribeToAgentEvents(host: string, onMessage: (data: any) => void) {
  try {
    const EventSource = require('eventsource');
    const es = new EventSource(`http://${host}:3000/events`);
    es.onmessage = (e: any) => {
      try { onMessage(JSON.parse(e.data)); } catch (err) { onMessage(e.data); }
    };
    es.onerror = (err: any) => { /* ignore or reconnect logic */ };
    return es;
  } catch (e) {
    // eventsource not installed
    return null;
  }
}

export function deactivate() {}

function getCopilotMirrorHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>EditorMate Copilot Mirror</title><style>body{font-family:system-ui;padding:12px}#msgs{height:360px;overflow:auto;background:#fff;border:1px solid #e6edf3;padding:8px;border-radius:6px}#controls{display:flex;margin-top:8px}#controls input{flex:1;padding:8px}#controls button{margin-left:8px;padding:8px}#meta{font-size:12px;color:#64748b;margin-top:8px}</style></head><body><h2>EditorMate — Copilot Mirror</h2><div id="msgs"></div><div id="controls"><input id="t" placeholder="Reply..."/><button id="s">Send</button><button id="attach">Attach File</button></div><div id="meta">Indexed files: <span id="fileCount">0</span> (updated: <span id="fileUpdated">-</span>)</div><script>const vscode=acquireVsCodeApi();document.getElementById('s').addEventListener('click',()=>{const t=document.getElementById('t').value||''; if(!t) return; vscode.postMessage({command:'send',text:t}); document.getElementById('t').value='';}); document.getElementById('attach').addEventListener('click',()=>{vscode.postMessage({command:'requestFiles'});} ); window.addEventListener('message',event=>{const msg=event.data; if(msg.type==='message'){const m=msg.data; const el=document.getElementById('msgs'); const n=document.createElement('div'); n.textContent=(m.sender?m.sender+': ':'') + (m.text || JSON.stringify(m)); el.appendChild(n); el.scrollTop=el.scrollHeight;} else if(msg.type==='fileList'){ const choice = msg.files[0]; /* fallback: the extension will send a file via insertFile message instead */ } else if(msg.type==='fileIndexInfo'){ document.getElementById('fileCount').textContent = String(msg.filesCount); document.getElementById('fileUpdated').textContent = new Date(msg.updatedAt).toLocaleString(); } else if(msg.type === 'insertFile'){ document.getElementById('t').value = (document.getElementById('t').value || '') + ' ' + msg.file; } });</script></body></html>`;
}

function getChatWebview() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>EditorMate Chat</title>
<style>body{font-family:sans-serif;padding:12px}#messages{height:300px;overflow:auto;background:#f6f8fa;padding:8px;border-radius:6px}#input{display:flex;margin-top:8px}#input input{flex:1;padding:8px}#input button{margin-left:8px;padding:8px 12px}</style>
</head>
<body>
  <h2>EditorMate Chat</h2>
  <div id="messages"></div>
  <div id="input"><input id="txt" placeholder="Type message to send to agent..."/><button id="send">Send</button></div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('send').addEventListener('click', ()=>{
      const t = document.getElementById('txt').value || '';
      if (!t) return; vscode.postMessage({ command: 'sendMessage', text: t });
      document.getElementById('txt').value = '';
    });
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'message') {
        const el = document.getElementById('messages');
        const d = msg.data;
        const node = document.createElement('div');
        node.textContent = (d.sender ? d.sender+': ' : '') + (d.text || JSON.stringify(d));
        el.appendChild(node);
        el.scrollTop = el.scrollHeight;
      }
    });
  </script>
</body>
</html>`;
}


function getWebviewContent() {
  // Polished pairing-only webview: large QR, refresh & copy buttons
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>EditorMate Pairing</title>
<style>
  body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #0f172a; display:flex; flex-direction:column; align-items:center }
  .card { max-width:540px; width:100%; text-align:center; border-radius:12px; padding:16px; box-shadow:0 6px 20px rgba(2,6,23,0.08); border:1px solid #e6edf3 }
  img#qr { width:320px; height:320px; border-radius:8px; background:#fff; display:block; margin: 8px auto }
  .meta { margin-top:12px; color:#64748b; font-size:13px }
  .controls { margin-top:12px }
  .controls button{ margin:6px; padding:8px 12px; border-radius:8px; border:1px solid #e6edf3; background:#fff }
</style>
</head>
<body>
  <div class="card">
    <h2>Pair with EditorMate</h2>
    <p class="meta">Scan the QR with the EditorMate mobile app or tap Copy to use the deep link.</p>
    <img id="qr" src="" alt="Pairing QR" />
    <div class="controls">
      <button id="refresh">Refresh QR</button>
      <button id="rotateKey">Rotate Key</button>
      <button id="copyDeep">Copy Deep Link</button>
      <button id="copyUrl">Copy One‑time URL</button>
      <button id="openInBrowser">Open pairing view</button>
    </div>
    <div class="meta" id="tokenInfo">Token: <span id="token">—</span></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    async function fetchPairing(){
      document.getElementById('token').textContent = 'Fetching...';
      vscode.postMessage({ command: 'fetchPairing' });
    }
    document.getElementById('refresh').addEventListener('click', fetchPairing);
    document.getElementById('rotateKey').addEventListener('click', () => { vscode.postMessage({ command: 'rotateKey' }); });
    document.getElementById('copyDeep').addEventListener('click', () => { const v = document.getElementById('copyDeep').dataset.deep; if (v) vscode.postMessage({ command: 'copy', text: v }); });
    document.getElementById('copyUrl').addEventListener('click', () => { const v = document.getElementById('copyUrl').dataset.url; if (v) vscode.postMessage({ command: 'copy', text: v }); });
    document.getElementById('openInBrowser').addEventListener('click', () => { const v = document.getElementById('openInBrowser').dataset.url; if (v) vscode.postMessage({ command: 'open', url: v }); });

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'pairingData') {
        const d = msg.data;
        if (!d) return;
        document.getElementById('qr').src = d.qrDataUrl || '';
        document.getElementById('token').textContent = (d.randomUrl || '').split('/').pop() || '—';
        document.getElementById('copyDeep').dataset.deep = d.deepLink || '';
        document.getElementById('copyUrl').dataset.url = d.randomUrl || '';
        document.getElementById('openInBrowser').dataset.url = d.randomUrl ? d.randomUrl.replace('/random/', '/pairing/view') : '';
      } else if (msg.type === 'error') {
        document.getElementById('token').textContent = 'Error';
      }
    });

    // Auto-fetch when the webview loads
    fetchPairing();
  </script>
</body>
</html>`;
}
