import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function CreateSession() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startRotation();
    createSession();
  }, []);

  const startRotation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createSession = async () => {
    try {
      setLoading(true);
      const code = generateCode();
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ code, status: 'waiting' }])
        .select()
        .single();

      if (error) throw error;

      // Artificial delay for premium feel
      setTimeout(() => {
        router.replace({
          pathname: '/lobby',
          params: { sessionId: data.id, code: data.code, role: 'host' }
        });
      }, 2000);

    } catch (err) {
      setError('ELITE CLOUD CONNECTION FAILED');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={[theme.colors.gradientStart, theme.colors.background, '#000']} 
        style={StyleSheet.absoluteFill} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
            <Text style={styles.backIcon}>✕</Text>
          </TouchableOpacity>

          <View style={styles.centerSection}>
            <View style={styles.scannerContainer}>
              <Animated.View style={[styles.scannerRing, { transform: [{ rotate: spin }] }]}>
                <LinearGradient 
                  colors={[theme.colors.accent, 'transparent']} 
                  style={styles.ringGradient}
                />
              </Animated.View>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>🏏</Text>
              </View>
            </View>

            <View style={styles.textGroup}>
              <Text style={styles.title}>INITIALIZING</Text>
              <Text style={styles.subtitle}>ESTABLISHING SECURE SCORING NODE</Text>
            </View>
          </View>

          <View style={styles.footer}>
            {error ? (
              <TouchableOpacity style={styles.retryBtn} onPress={createSession}>
                <LinearGradient colors={[theme.colors.danger, '#920000']} style={styles.retryInner}>
                  <Text style={styles.retryText}>RETRY CONNECTION</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.statusBox}>
                <View style={styles.pulseDot} />
                <Text style={styles.statusText}>ENCRYPTING MATCH DATA...</Text>
              </View>
            )}
            <Text style={styles.versionText}>LAZYCRIC ENGINE v2.0 PRO</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 32, justifyContent: 'space-between' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backIcon: { color: theme.colors.text, fontSize: 18 },
  centerSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scannerContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  scannerRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 126, 95, 0.2)',
    borderStyle: 'dashed',
  },
  ringGradient: {
    flex: 1,
    borderRadius: 100,
    opacity: 0.5,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  logoText: { fontSize: 32 },
  textGroup: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: theme.colors.text, letterSpacing: 4 },
  subtitle: { fontSize: 10, color: theme.colors.accent, fontWeight: '800', letterSpacing: 2, marginTop: 8 },
  footer: { width: '100%', alignItems: 'center', gap: 20 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
    marginRight: 10,
    opacity: 0.8,
  },
  statusText: { fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1 },
  retryBtn: { width: '100%', height: 60, borderRadius: 20, overflow: 'hidden' },
  retryInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  versionText: { fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: '800', letterSpacing: 2 },
});
