import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { API_URL } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function HealthScreen() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [latency, setLatency] = useState(0);

  const check = async () => {
    setStatus('loading');
    const start = Date.now();
    try {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      setLatency(Date.now() - start);
      setMessage(JSON.stringify(data, null, 2));
      setStatus(res.ok ? 'ok' : 'error');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Connection failed');
      setLatency(Date.now() - start);
    }
  };

  useEffect(() => {
    check();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Health Check</Text>
      <Text style={styles.url}>{API_URL}/health</Text>

      {status === 'loading' ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <Text style={[styles.badge, status === 'ok' ? styles.ok : styles.error]}>
            {status === 'ok' ? 'Connected' : 'Failed'}
          </Text>
          <Text style={styles.latency}>{latency}ms</Text>
          <Text style={styles.response}>{message}</Text>
        </>
      )}

      <Pressable style={styles.button} onPress={check}>
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>

      <Text style={styles.hint}>
        Set EXPO_PUBLIC_API_URL to your Mac LAN IP (e.g. http://192.168.x.x:3000) in .env.development
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  url: { color: colors.textMuted, marginTop: 8, fontSize: 12 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 24,
    fontWeight: '700',
    overflow: 'hidden',
  },
  ok: { backgroundColor: '#14532d', color: colors.primary },
  error: { backgroundColor: '#450a0a', color: colors.danger },
  latency: { color: colors.textMuted, marginTop: 8 },
  response: {
    color: colors.text,
    marginTop: 16,
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: colors.bg, fontWeight: '700' },
  hint: { color: colors.textMuted, marginTop: 24, lineHeight: 20, fontSize: 13 },
});
