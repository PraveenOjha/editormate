import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { MockSSHClient } from '../ssh/SSHClient';

export default function Terminal({ host, port, username, privateKey, onClose }: any) {
  const [output, setOutput] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const scrollRef = useRef<ScrollView | null>(null);
  const clientRef = useRef<any>(null);

  useEffect(() => {
    const client = new MockSSHClient();
    clientRef.current = client;
    client.onData((chunk) => setOutput((s) => s + chunk));
    client.connect({ host, port, username, privateKey }).catch((e) => setOutput((s) => s + `\nError: ${e}\n`));

    return () => client.close();
  }, [host, port, username, privateKey]);

  useEffect(() => scrollRef.current?.scrollToEnd({ animated: true }), [output]);

  function send() {
    if (!clientRef.current) return;
    clientRef.current.write(input);
    setInput('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>In-App SSH Terminal</Text>
      <ScrollView style={styles.output} ref={scrollRef}>
        <Text style={styles.outputText}>{output}</Text>
      </ScrollView>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a command"
          onSubmitEditing={send}
        />
        <Pressable style={styles.button} onPress={send}>
          <Text style={styles.buttonText}>Send</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.button, { marginTop: 8, backgroundColor: '#ef4444' }]} onPress={() => { clientRef.current?.close(); onClose && onClose(); }}>
        <Text style={styles.buttonText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, backgroundColor: '#0b1220', borderRadius: 12 },
  title: { color: '#38bdf8', fontWeight: '700', marginBottom: 8 },
  output: { height: 300, backgroundColor: '#011627', padding: 10, borderRadius: 8 },
  outputText: { color: '#cbd5e1', fontFamily: 'monospace' as any },
  row: { flexDirection: 'row', marginTop: 10 },
  input: { flex: 1, backgroundColor: '#1e293b', color: '#fff', padding: 10, borderRadius: 8, marginRight: 8 },
  button: { backgroundColor: '#38bdf8', padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#071124', fontWeight: '700' }
});
