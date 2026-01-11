import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function QRScanner({ onScanned, onCancel }: { onScanned: (data: string) => void, onCancel: () => void }) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) return <View style={styles.center}><Text>Requesting camera permission...</Text></View>;
  if (hasPermission === false) return <View style={styles.center}><Text>No access to camera. Please enable camera permissions.</Text></View>;

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={({ type, data }) => {
          if (scanned) return;
          setScanned(true);
          try {
            onScanned(data);
          } catch (e) {
            Alert.alert('Scan error', String(e));
          }
        }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay}>
        <Text style={styles.hint}>Point the camera at the pairing QR or deep link</Text>
        <View style={styles.buttonsRow}>
          <Pressable style={styles.button} onPress={() => { setScanned(false); onCancel(); }}>
            <Text style={styles.buttonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' },
  hint: { color: '#fff', marginBottom: 12 },
  buttonsRow: { flexDirection: 'row' },
  button: { backgroundColor: '#38bdf8', padding: 12, borderRadius: 8 },
  buttonText: { color: '#08263b', fontWeight: '600' }
});