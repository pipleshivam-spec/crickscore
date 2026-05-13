import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function JoinSession() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (code.length !== 6) {
      Alert.alert('INVALID NODE', 'Please enter a 6-character access code.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (error || !data) {
        Alert.alert('ACCESS DENIED', 'Invalid or expired node code. Please verify with the host.');
        return;
      }

      router.push({
        pathname: '/lobby',
        params: { sessionId: data.id, code: data.code, role: 'viewer' }
      });
    } catch (err) {
      Alert.alert('ERROR', 'Elite cloud sync failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Global ProfessionalBackground provides the depth here */}
      
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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
  header: { marginTop: 20 },
  title: { fontSize: 36, fontWeight: '900', color: theme.colors.text, letterSpacing: -1 },
  badge: {
    backgroundColor: 'rgba(255, 126, 95, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 126, 95, 0.2)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(255, 126, 95, 0.05)',
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
  joinBtn: { width: '100%', height: 64, borderRadius: 24, overflow: 'hidden', ...theme.shadows.glow },
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
  versionText: { fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: '800', letterSpacing: 2 },
});
