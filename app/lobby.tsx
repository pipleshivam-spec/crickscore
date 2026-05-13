import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Share, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAppTheme } from '../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function Lobby() {
  const { theme } = useAppTheme();
  const { sessionId, code, role } = useLocalSearchParams<{ sessionId: string, code: string, role: string }>();
  const [loading, setLoading] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startPulse();
    if (role === 'viewer') {
      const subscription = supabase
        .channel(`session:${sessionId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (payload) => {
          if (payload.new.status === 'active') {
            router.push({ pathname: '/scoring', params: { sessionId } });
          }
        })
        .subscribe();
      return () => { subscription.unsubscribe(); };
    }
  }, [sessionId, role]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  };

  const handleStartMatch = async () => {
    try {
      setLoading(true);
      await supabase.from('sessions').update({ status: 'active' }).eq('id', sessionId);
      router.push({ pathname: '/match-setup', params: { sessionId } });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    try {
      await Share.share({ message: `Join my LazyCricScore match! Code: ${code}` });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient 
        colors={[theme.colors.gradientStart, theme.colors.background, theme.colors.background]} 
        style={StyleSheet.absoluteFill} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
              <Text style={styles.backIcon}>✕</Text>
            </TouchableOpacity>
            <View style={styles.statusBox}>
              <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.statusText}>LOBBY ACTIVE</Text>
            </View>
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>MATCH LOBBY</Text>
            <Text style={styles.heroSub}>WAITING FOR SYNCHRONIZATION</Text>
          </View>

          <View style={styles.centerCard}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.cardInner}>
              <Text style={styles.cardLabel}>SESSION ACCESS KEY</Text>
              <View style={styles.codeWrapper}>
                {code?.split('').map((char, i) => (
                  <View key={i} style={styles.charBox}>
                    <Text style={styles.charText}>{char}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.inviteBtn} onPress={onShare} activeOpacity={0.7}>
                <LinearGradient colors={['rgba(255, 126, 95, 0.2)', 'rgba(255, 126, 95, 0.1)']} style={styles.inviteInner}>
                  <Text style={styles.inviteText}>INVITE SCORERS</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={styles.footer}>
            {role !== 'viewer' ? (
              <TouchableOpacity 
                style={[styles.primaryBtn, loading && styles.disabledBtn]} 
                onPress={handleStartMatch} 
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient 
                  colors={[theme.colors.accent, theme.colors.accentSecondary]} 
                  style={styles.btnInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={[styles.btnText, { color: '#FFF' }]}>INITIALIZE SETUP</Text>
                      <Text style={[styles.btnIcon, { color: '#FFF' }]}>→</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.waitingContainer}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text style={styles.waitingLabel}>Waiting for host to initialize...</Text>
              </View>
            )}
            <Text style={[styles.versionText, { color: theme.colors.textMuted, opacity: 0.3 }]}>LAZYCRIC SECURE PROTOCOL v2.0</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 32, justifyContent: 'space-between' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
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
  backIcon: { color: '#FFF', fontSize: 18 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(72, 187, 120, 0.2)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  statusText: { color: '#10B981', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  heroSection: { alignItems: 'center', marginTop: 40 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', letterSpacing: -1 },
  heroSub: { fontSize: 10, color: '#E2E8F0', fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  centerCard: { width: '100%' },
  cardInner: { 
    borderRadius: 32, 
    padding: 24, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  cardLabel: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 24 },
  codeWrapper: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  charBox: {
    width: (width - 120) / 6,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  charText: { fontSize: 24, fontWeight: '900', color: '#E2E8F0' },
  inviteBtn: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  inviteInner: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  inviteText: { fontSize: 12, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  footer: { width: '100%', alignItems: 'center', gap: 24 },
  primaryBtn: { width: '100%', height: 64, borderRadius: 24, overflow: 'hidden' },
  btnInner: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12,
  },
  btnText: { color: '#0F172A', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  btnIcon: { color: '#0F172A', fontSize: 22, fontWeight: '900' },
  waitingContainer: { alignItems: 'center', gap: 12 },
  waitingLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontStyle: 'italic' },
  disabledBtn: { opacity: 0.5 },
  versionText: { fontSize: 8, color: 'rgba(255,255,255,0.15)', fontWeight: '800', letterSpacing: 2 },
});
