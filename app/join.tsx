import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAppTheme } from '../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function JoinSession() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (code.length !== 6) {
      Alert.alert('INVALID NODE', 'Please enter a 6-character access code.');
      return;
    }

    try {
      setLoading(true);

      // Accept sessions in both 'waiting' and 'active' state
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code.toUpperCase())
        .in('status', ['waiting', 'active'])
        .single();

      if (error || !data) {
        Alert.alert(
          'CODE NOT FOUND',
          'No live session found with this code.\n\n' +
          '• Make sure the host created an ONLINE match (not local)\n' +
          '• The code is case-insensitive\n' +
          '• Ask the host to re-share the code',
          [{ text: 'GOT IT', style: 'default' }]
        );
        return;
      }

      // If the session is already active, go straight to scoring view
      if (data.status === 'active') {
        router.replace({
          pathname: '/scoring',
          params: {
            sessionId: data.id,
            role: 'viewer',
            isLocal: 'false',
            matchId: data.match_id,
            inningsId: data.innings_id,
          },
        });
        return;
      }

      // Otherwise, go to lobby to wait for host to start the match
      router.push({
        pathname: '/lobby',
        params: { sessionId: data.id, code: data.code, role: 'viewer' }
      });
    } catch (err) {
      Alert.alert(
        'CONNECTION ERROR',
        'Could not reach the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.surfaceAlt]} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
            <Text style={styles.backIcon}>✕</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>JOIN LIVE SERVER</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ELITE BROADCAST SYNC</Text>
            </View>
            <Text style={styles.subtitle}>Enter the 6-character match code to join the live scoring broadcast.</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>This requires the host to create an <Text style={styles.infoBold}>Online Match</Text> (not a local match) and share their session code.</Text>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>ACCESS KEY</Text>
            <View style={styles.codeContainer}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={[styles.codeBox, code.length > i && styles.codeBoxFilled]}>
                  <Text style={styles.codeChar}>{code[i] || ''}</Text>
                </View>
              ))}
              <TextInput
                style={styles.hiddenInput}
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase().slice(0, 6))}
                maxLength={6}
                autoFocus
                keyboardType="default"
              />
            </View>
            <Text style={styles.hintText}>Codes are case-insensitive</Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.joinBtn, (loading || code.length < 6) && styles.disabledBtn]} 
              onPress={handleJoin}
              disabled={loading || code.length < 6}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={[theme.colors.accent, theme.colors.accentSecondary]} 
                style={styles.btnInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <>
                    <Text style={styles.joinText}>SYNCHRONIZE</Text>
                    <Text style={styles.joinIcon}>→</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.versionText}>LAZYCRIC SECURE PROTOCOL v2.0</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 32, justifyContent: 'space-between' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backIcon: { color: theme.colors.text, fontSize: 18 },
  header: { marginTop: 20 },
  title: { fontSize: 36, fontWeight: '900', color: theme.colors.text, letterSpacing: -1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  infoIcon: { fontSize: 14 },
  infoText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, lineHeight: 18, fontWeight: '500' },
  infoBold: { fontWeight: '900', color: theme.colors.text },
  badge: {
    backgroundColor: 'rgba(162, 28, 60, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(162, 28, 60, 0.1)',
  },
  badgeText: { fontSize: 8, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2 },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 16, lineHeight: 22, fontWeight: '500' },
  inputSection: { flex: 1, justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 2, marginBottom: 20 },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  codeBox: {
    flex: 1,
    height: 60,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(162, 28, 60, 0.05)',
  },
  codeChar: { fontSize: 24, fontWeight: '900', color: theme.colors.text },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  hintText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: { width: '100%', alignItems: 'center', gap: 20 },
  joinBtn: { width: '100%', height: 64, borderRadius: 24, overflow: 'hidden' },
  btnInner: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12,
  },
  joinText: { color: theme.colors.background, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  joinIcon: { color: theme.colors.background, fontSize: 22, fontWeight: '900' },
  disabledBtn: { opacity: 0.4 },
  versionText: { fontSize: 8, color: theme.colors.textMuted, fontWeight: '800', letterSpacing: 2 },
});
