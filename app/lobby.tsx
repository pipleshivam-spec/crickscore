import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Share, Dimensions, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAppTheme } from '../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function Lobby() {
  const { theme } = useAppTheme();
  const { sessionId, code, role } = useLocalSearchParams<{ sessionId: string; code: string; role: string }>();

  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'unknown'>('unknown');
  const [checkingStatus, setCheckingStatus] = useState(role === 'viewer');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    startPulse();
    startDotAnimation();

    if (role === 'viewer') {
      checkAndListenForSession();
    }
  }, [sessionId, role]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  };

  const startDotAnimation = () => {
    const animateDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(800 - delay),
        ])
      ).start();

    animateDot(dotAnim1, 0);
    animateDot(dotAnim2, 266);
    animateDot(dotAnim3, 533);
  };

  const navigateToScore = (sid: string) => {
    router.replace({
      pathname: '/scoring',
      params: { sessionId: sid, role: 'viewer', isLocal: 'false' }
    });
  };

  // ─── KEY FIX: Check current status immediately, then subscribe to future changes ───
  const checkAndListenForSession = async () => {
    setCheckingStatus(true);
    try {
      const { data } = await supabase
        .from('sessions')
        .select('status')
        .eq('id', sessionId)
        .single();

      if (data?.status === 'active') {
        // Session already active — go straight to scoring
        navigateToScore(sessionId);
        return;
      }

      setSessionStatus(data?.status === 'waiting' ? 'waiting' : 'unknown');
    } catch (e) {
      console.warn('Could not fetch session status', e);
      setSessionStatus('unknown');
    } finally {
      setCheckingStatus(false);
    }

    // Subscribe for future status changes
    const subscription = supabase
      .channel(`session_lobby_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new.status === 'active') {
            navigateToScore(sessionId);
          }
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
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
      await Share.share({ message: `Join my LazyCricScore live match! Code: ${code}\n\nDownload: LazyCricScore App` });
    } catch (error) {
      console.error(error);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surfaceAlt]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow orbs */}
      <View style={[styles.glowOrb, { top: -80, left: -80, backgroundColor: theme.colors.accent + '08' }]} />
      <View style={[styles.glowOrb, { bottom: -80, right: -80, backgroundColor: theme.colors.accentSecondary + '06' }]} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
              style={styles.backBtn}
            >
              <Text style={styles.backIcon}>✕</Text>
            </TouchableOpacity>

            <View style={styles.statusPill}>
              <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.statusText}>LOBBY ACTIVE</Text>
            </View>
          </View>

          {/* ── Hero ── */}
          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>
              {role === 'viewer' ? 'SPECTATOR MODE' : 'HOST CONTROL'}
            </Text>
            <Text style={styles.heroTitle}>MATCH LOBBY</Text>
            <Text style={styles.heroSub}>
              {role === 'viewer'
                ? 'You are connected to this match session'
                : 'Share code & initialize the match'}
            </Text>
          </View>

          {/* ── Session Code Card ── */}
          <View style={styles.codeCard}>
            <Text style={styles.cardLabel}>SESSION ACCESS KEY</Text>
            <View style={styles.codeWrapper}>
              {code?.split('').map((char, i) => (
                <View key={i} style={styles.charBox}>
                  <Text style={styles.charText}>{char}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.inviteBtn} onPress={onShare} activeOpacity={0.7}>
              <Text style={styles.inviteIcon}>📤</Text>
              <Text style={styles.inviteText}>INVITE SCORERS</Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer Action ── */}
          <View style={styles.footer}>
            {role !== 'viewer' ? (
              // HOST: Start match button
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
                      <Text style={styles.btnText}>INITIALIZE MATCH</Text>
                      <Text style={styles.btnIcon}>→</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              // VIEWER: Waiting state
              checkingStatus ? (
                <View style={styles.waitingContainer}>
                  <ActivityIndicator color={theme.colors.accent} size="small" />
                  <Text style={styles.waitingLabel}>Connecting to server...</Text>
                </View>
              ) : sessionStatus === 'waiting' ? (
                // Still waiting for host
                <View style={styles.waitingCard}>
                  <View style={styles.waitingDots}>
                    {[dotAnim1, dotAnim2, dotAnim3].map((anim, i) => (
                      <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
                    ))}
                  </View>
                  <Text style={styles.waitingTitle}>Waiting for Host</Text>
                  <Text style={styles.waitingSubtitle}>
                    The match will begin once the host initializes the session.
                  </Text>

                  {/* Manual override button */}
                  <TouchableOpacity
                    style={styles.manualBtn}
                    onPress={() => navigateToScore(sessionId)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[theme.colors.accent + '20', theme.colors.accent + '10']}
                      style={styles.manualBtnInner}
                    >
                      <Text style={styles.manualBtnText}>📶 VIEW LIVE SCORE</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                // Unknown / error state — show direct entry
                <View style={styles.waitingCard}>
                  <Text style={styles.waitingTitle}>Ready to Watch</Text>
                  <Text style={styles.waitingSubtitle}>Tap below to enter the live scoring view.</Text>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => navigateToScore(sessionId)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[theme.colors.accent, theme.colors.accentSecondary]}
                      style={styles.btnInner}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.btnText}>VIEW LIVE SCORE</Text>
                      <Text style={styles.btnIcon}>→</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )
            )}

            <Text style={styles.versionText}>LAZYCRIC SECURE PROTOCOL v2.0</Text>
          </View>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  glowOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.8 },
  content: { flex: 1, paddingHorizontal: 28, paddingVertical: 16, justifyContent: 'space-between' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  backBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  backIcon: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 8,
  },
  pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  statusText: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // Hero
  heroSection: { alignItems: 'center', paddingVertical: 8 },
  heroLabel: {
    fontSize: 9, fontWeight: '900', letterSpacing: 3,
    color: theme.colors.accent, marginBottom: 8, textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 38, fontWeight: '900', color: theme.colors.text,
    letterSpacing: -1.5, textAlign: 'center',
    fontFamily: theme.typography.fontFamily.bold,
  },
  heroSub: {
    fontSize: 13, color: theme.colors.textMuted,
    fontWeight: '500', marginTop: 8, textAlign: 'center', lineHeight: 20,
  },

  // Code Card
  codeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 32, padding: 28,
    alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
  },
  cardLabel: {
    fontSize: 9, fontWeight: '900', color: theme.colors.textMuted,
    letterSpacing: 2.5, marginBottom: 24, textTransform: 'uppercase',
  },
  codeWrapper: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  charBox: {
    width: (width - 120) / 6,
    height: 58,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  charText: {
    fontSize: 24, fontWeight: '900', color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
  },
  inviteBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1, borderColor: theme.colors.border, gap: 8,
  },
  inviteIcon: { fontSize: 14 },
  inviteText: { fontSize: 12, fontWeight: '900', color: theme.colors.accent, letterSpacing: 1 },

  // Footer
  footer: { width: '100%', alignItems: 'center', gap: 20, paddingBottom: 8 },

  // Host button
  primaryBtn: { width: '100%', height: 64, borderRadius: 24, overflow: 'hidden' },
  btnInner: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  btnIcon: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  disabledBtn: { opacity: 0.5 },

  // Viewer waiting state
  waitingCard: {
    width: '100%', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 28, padding: 24,
    borderWidth: 1, borderColor: theme.colors.border,
    gap: 12,
  },
  waitingDots: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent },
  waitingTitle: {
    fontSize: 18, fontWeight: '900', color: theme.colors.text,
    letterSpacing: -0.3, fontFamily: theme.typography.fontFamily.bold,
  },
  waitingSubtitle: {
    fontSize: 12, color: theme.colors.textMuted,
    textAlign: 'center', lineHeight: 18, fontWeight: '500',
  },
  manualBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  manualBtnInner: {
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.accent + '30', borderRadius: 16,
  },
  manualBtnText: { fontSize: 13, fontWeight: '900', color: theme.colors.accent, letterSpacing: 1 },

  // Connecting spinner
  waitingContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitingLabel: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },

  versionText: {
    fontSize: 8, color: theme.colors.textMuted,
    fontWeight: '800', letterSpacing: 2, opacity: 0.4,
  },
});
