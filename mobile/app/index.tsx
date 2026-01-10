import { Text, View, StyleSheet, TextInput, Pressable, ActivityIndicator, Image, Alert } from "react-native";
import { useEffect, useState } from "react";
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

export default function Index() {
  const [hostIp, setHostIp] = useState("192.168.1.X");
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [logs, setLogs] = useState<string[]>([]);

  const [details, setDetails] = useState<any>(null);
  const [pairing, setPairing] = useState<any>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairedKeyInfo, setPairedKeyInfo] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState<any>(null);

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
              <Image source={{ uri: pairing.qrDataUrl }} style={{ width: 180, height: 180, alignSelf: 'center', marginBottom: 8 }} />
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
          {React.createElement(require('../src/components/Terminal').default, { ...showTerminal, onClose: () => setShowTerminal(null) })}
        </View>
      )}

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
