import { Text, View, StyleSheet, TextInput, Pressable, ActivityIndicator, Image, Alert } from "react-native";
import { useEffect, useState } from "react";
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

export default function Index() {
  const [screen, setScreen] = useState<'home'|'sessions'|'scanner'>('home');

  const [hostIp, setHostIp] = useState("192.168.1.X");
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [logs, setLogs] = useState<string[]>([]);

  const [details, setDetails] = useState<any>(null);
  const [pairing, setPairing] = useState<any>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairedKeyInfo, setPairedKeyInfo] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState<any>(null);
  const [qrFallbackUrl, setQrFallbackUrl] = useState<string | null>(null);

  const connectToHost = async () => {
    setStatus("connecting");
    setLogs(prev => [...prev, `Attempting to connect to http://${hostIp}:3000...`]);

    try {
      // Phase 1: Simple HTTP check to verify LAN visibility before SSH handshake
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`http://${hostIp}:3000`, { signal: controller.signal });
      clearTimeout(timeout);

      const data = await response.json();

      if (data.status === 'ok') {
        setStatus("connected");
        setDetails(data);
        setLogs(prev => [...prev, `Connected to ${data.agent} v${data.version}`]);
        // TODO: Initiate SSH / Socket Handshake here
      } else {
        throw new Error("Invalid agent response");
      }
    } catch (error: any) {
      setStatus("failed");
      const message = error.name === 'AbortError' ? 'Timed out' : (error.message || String(error));
      setLogs(prev => [...prev, `Connection failed: ${message}`]);
    }
  };

  useEffect(() => {
    // Handle incoming deep links while the app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle initial URL if the app was launched by a link
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) handleDeepLink(initial);
    })();

    return () => subscription.remove();
  }, []);

  // Debug: log pairing object for visibility when it changes
  useEffect(() => {
    if (pairing) {
      try { setLogs(prev => [...prev, `pairing loaded: ${JSON.stringify({ deepLink: pairing.deepLink, qr: !!pairing.qrDataUrl })}`]); } catch (e) { }
    }
  }, [pairing]);

  // Session & scanner handlers
  const onOpenSession = async (host: string) => {
    setHostIp(host);
    setScreen('home');
    await connectToHost();
  };

  const onScan = () => setScreen('scanner');

  const handleScannedData = async (data: string) => {
    // If the QR provides a deep link, attempt to handle it via the existing deep link handler
    setScreen('home');
    handleDeepLink(data);
  };

  async function handleDeepLink(url: string) {
    try {
      const parsed = Linking.parse(url);
      // expected format: editormate://pair?host=1.2.3.4&port=2222&token=abc
      if (parsed.hostname === 'pair' || parsed.path === 'pair') {
        const { queryParams } = parsed;
        const host = (queryParams as any).host;
        const token = (queryParams as any).token;
        if (!host || !token) {
          Alert.alert('Invalid pairing link', url);
          return;
        }

        setLogs(prev => [...prev, `Received pairing token from link for ${host}`]);

        // Fetch the private key from the host's one-time URL
        try {
          const r = await fetch(`http://${host}:3000/random/${token}`);
          if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
          const keyText = await r.text();

          // Store the key securely
          await SecureStore.setItemAsync(`sshkey-${host}`, keyText, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
          // Update index of saved keys for Sessions screen
          try {
            const idxRaw = await SecureStore.getItemAsync('sshkey-index');
            const idx = idxRaw ? JSON.parse(idxRaw) as string[] : [];
            if (!idx.includes(host)) {
              idx.unshift(host);
              await SecureStore.setItemAsync('sshkey-index', JSON.stringify(idx));
            }
          } catch (e) { /* ignore */ }
          setPairedKeyInfo(`sshkey-${host}`);
          Alert.alert('Paired', `Private key saved for ${host}`);
        } catch (err: any) {
          Alert.alert('Pairing failed', String(err));
          setLogs(prev => [...prev, `Pairing fetch failed: ${err.message || err}`]);
        }
      }
    } catch (e: any) {
      console.warn('Deep link parse error', e);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EditorMate</Text>
      <Text style={styles.subtitle}>Mobile Control Layer</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Host IP Address</Text>
        <TextInput 
          style={styles.input} 
          value={hostIp}
          onChangeText={setHostIp}
          placeholder="192.168.1.X"
        />
        
        <Pressable 
          style={[styles.button, status === 'connecting' && styles.buttonDisabled]} 
          onPress={connectToHost}
          disabled={status === 'connecting'}
        >
          {status === 'connecting' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect to Agent</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.logs}>
        <Text style={styles.logTitle}>Activity Log:</Text>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>• {log}</Text>
        ))}
      </View>

      {status === 'connected' && details && (
        <View style={[styles.card, { marginTop: 20 }] }>
          <Text style={[styles.label, { marginBottom: 8 }]}>Agent Details</Text>
          <Text style={styles.logText}>Agent: {details.agent} v{details.version}</Text>
          {details.network && details.network.localIPs && (
            <Text style={styles.logText}>Local IPs: {details.network.localIPs.join(', ')}</Text>
          )}
          <Text style={[styles.logText, { marginTop: 10 }]}>SSH Command:</Text>
          <Text style={styles.logText}>ssh user@{hostIp} -p 2222</Text>

          <Pressable style={[styles.button, { marginTop: 12 }]} onPress={async () => {
            setPairingLoading(true);
            try {
              const r = await fetch(`http://${hostIp}:3000/pairing`);
              const j = await r.json();
              setPairing(j);
          // Log pairing keys for debugging QR issues
          setLogs(prev => [...prev, `Pairing data received: qrDataUrl=${!!j.qrDataUrl}, deepLink=${j.deepLink ? j.deepLink.slice(0,80) : 'none'}`]);
          console.debug('Pairing response', j);
            } catch (err: any) {
              Alert.alert('Pairing failed', String(err));
            } finally {
              setPairingLoading(false);
            }
          }}>
            {pairingLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Show Pairing QR</Text>}
          </Pressable>

          {pairing && (
            <View style={[styles.card, { marginTop: 12 }] }>
              <Text style={[styles.label, { marginBottom: 8 }]}>Pairing</Text>
              {/* QR image: show and log errors; fallback to deepLink if image missing */}
              {qrFallbackUrl ? (
                <Image source={{ uri: qrFallbackUrl }} style={{ width: 180, height: 180, alignSelf: 'center', marginBottom: 8 }} onError={(e:any) => { setLogs(prev => [...prev, 'Fallback QR Image failed to load']); console.warn('QR Image fallback error', e); }} resizeMode='contain' />
              ) : pairing.qrDataUrl ? (
                <Image source={{ uri: pairing.qrDataUrl }} style={{ width: 180, height: 180, alignSelf: 'center', marginBottom: 8 }} onError={(e:any) => { setLogs(prev => [...prev, 'QR Image failed to load, switching to http endpoint']); console.warn('QR Image error', e); try { const token = (pairing.randomUrl||'').split('/').pop(); if (token) setQrFallbackUrl(`http://${hostIp}:3000/pairing/qr/${token}`); } catch (ee) {} }} resizeMode='contain' />
              ) : (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <Text style={styles.logText}>QR not available</Text>
                  {pairing.deepLink && (
                    <Pressable style={[styles.button, { marginTop: 8 }]} onPress={() => { Linking.openURL(pairing.deepLink); }}>
                      <Text style={styles.buttonText}>Open Deep Link</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {pairing.sshCommands.map((cmd: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.logText}>{cmd}</Text>
                  <Pressable style={[styles.button, { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#334155' }]} onPress={async () => { await Clipboard.setStringAsync(cmd); Alert.alert('Copied', 'SSH command copied to clipboard'); }}>
                    <Text style={[styles.buttonText, { color: '#fff', fontSize: 12 }]}>Copy</Text>
                  </Pressable>
                </View>
              ))}

              {pairedKeyInfo ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.logText}>Private key stored securely: {pairedKeyInfo}</Text>

                  <Pressable style={[styles.button, { marginTop: 12 }]} onPress={async () => {
                    // Launch in-app terminal using mock client for now
                    const key = await SecureStore.getItemAsync(pairedKeyInfo!);
                    setLogs(prev => [...prev, `Launching in-app terminal for ${hostIp}`]);
                    setShowTerminal({ host: hostIp, port: 2222, username: 'user', privateKey: key });
                  }}>
                    <Text style={styles.buttonText}>Open In-App Terminal</Text>
                  </Pressable>

                  <Pressable style={[styles.button, { marginTop: 12 }]} onPress={async () => {
                    const key = await SecureStore.getItemAsync(pairedKeyInfo!);
                    setLogs(prev => [...prev, 'Attempting SSH chat connection (native) ...']);
                    try {
                      // Native SSH module (not available in Expo), this is a stub that will be replaced by a native implementation.
                      // If native SSH is available, it should expose a method to open the 'editormate' subsystem and deliver JSON lines in both directions.
                      // Fallback: subscribe to SSE via HTTP and log messages
                      // @ts-ignore
                      const SSHSubsystem = (global as any).SSHSubsystem;
                      if (SSHSubsystem && SSHSubsystem.open) {
                        SSHSubsystem.open({ host: hostIp, port: 2222, username: 'user', privateKey: key, subsystem: 'editormate' }, (msg: any) => {
                          setLogs(prev => [...prev, `SSH msg: ${JSON.stringify(msg)}`]);
                        });
                      } else {
                        setLogs(prev => [...prev, 'Native SSH module not found; using HTTP fallback (SSE + POST)']);
                        try {
                          // dynamic import to avoid bundling EventSource in expo if not present
                          const EventSource = (global as any).EventSource || (await import('eventsource')).default;
                          const es = new EventSource(`http://${hostIp}:3000/events` as any);
                          es.onmessage = (e: any) => setLogs(prev => [...prev, `SSE: ${e.data}`]);
                          es.onerror = (err: any) => setLogs(prev => [...prev, `SSE error: ${String(err)}`]);
                        } catch (e) {
                          setLogs(prev => [...prev, `SSE subscription failed: ${String(e)}`]);
                        }
                      }
                    } catch (err: any) {
                      setLogs(prev => [...prev, `SSH chat setup failed: ${err.message || String(err)}`]);
                    }
                  }}>
                    <Text style={styles.buttonText}>Connect Chat (SSH)</Text>
                  </Pressable>

                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.logText}>Scan QR using the VS Code plugin to pair; when the app opens it will fetch and store the key.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {showTerminal && (
        <View style={{ marginTop: 20 }}>
          {/* Lazy-load the terminal so it doesn't affect bundle size too much */}
          {(() => {
            try {
              const Terminal = require('../src/components/Terminal').default;
              return React.createElement(Terminal, { ...showTerminal, onClose: () => setShowTerminal(null) });
            } catch (e) {
              // Terminal not implemented yet; show friendly placeholder
              return (
                <View style={{ padding: 12, backgroundColor: '#111827', borderRadius: 8 }}>
                  <Text style={{ color: '#94a3b8' }}>Terminal is not available in this build.</Text>
                  <Pressable style={[styles.button, { marginTop: 8 }]} onPress={() => setShowTerminal(null)}>
                    <Text style={styles.buttonText}>Close</Text>
                  </Pressable>
                </View>
              );
            }
          })()}
        </View>
      )}

      {/* Sessions and Scanner screens */}
      {screen === 'sessions' && (
        React.createElement(require('../src/screens/Sessions').default, { onOpenSession, onScan })
      )}

      {screen === 'scanner' && (
        React.createElement(require('../src/components/QRScanner').default, { onScanned: handleScannedData, onCancel: () => setScreen('home') })
      )}

      {/* Simple floating controls */}
      <View style={{ position: 'absolute', right: 16, bottom: 16 }}>
        <Pressable style={{ backgroundColor: '#0ea5a3', padding: 10, borderRadius: 8, marginBottom: 8 }} onPress={() => setScreen('sessions')}>
          <Text style={{ color: '#002022' }}>Sessions</Text>
        </Pressable>
        <Pressable style={{ backgroundColor: '#38bdf8', padding: 10, borderRadius: 8 }} onPress={() => setScreen('scanner')}>
          <Text style={{ color: '#08263b' }}>Scan QR</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark slate
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: '#38bdf8', // Sky blue
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: "center",
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    color: '#e2e8f0',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: '#334155',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#38bdf8',
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: "bold",
    fontSize: 16,
  },
  logs: {
    marginTop: 30,
    padding: 10,
  },
  logTitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  logText: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  }
});
