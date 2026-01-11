import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

export default function Sessions({ onOpenSession, onScan }: { onOpenSession: (host: string) => void, onScan: () => void }) {
  const [keys, setKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    (async () => {
      // List keys saved in SecureStore with the prefix 'sshkey-'
      const all: string[] = [];
      try {
        // expo SecureStore doesn't have list method; we store a known index key
        const idx = await SecureStore.getItemAsync('sshkey-index');
        if (idx) {
          const arr = JSON.parse(idx) as string[];
          setKeys(arr);
        }
      } catch (e) {}
    })();
  }, []);

  async function onLongPressFile(host: string) {
    // For MVP, open pairing view for this host
    try {
      onOpenSession(host);
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sessions</Text>
      <Text style={styles.subtitle}>Saved pairings and available hosts</Text>

      <Pressable style={styles.scanButton} onPress={onScan}>
        <Text style={styles.scanText}>Scan QR to Pair</Text>
      </Pressable>

      <FlatList
        data={keys}
        keyExtractor={(i) => i}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpenSession(item)} onLongPress={() => onLongPressFile(item)} style={styles.item}>
            <Text style={styles.itemText}>{item}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No saved sessions. Scan a QR to pair.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0f172a' },
  title: { color: '#38bdf8', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#94a3b8', marginBottom: 12 },
  scanButton: { backgroundColor: '#38bdf8', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  scanText: { color: '#08263b', fontWeight: '700' },
  item: { padding: 12, backgroundColor: '#1e293b', borderRadius: 8, marginBottom: 8 },
  itemText: { color: '#e2e8f0' },
  empty: { color: '#94a3b8', marginTop: 20 }
});