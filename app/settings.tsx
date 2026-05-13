import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppTheme, THEME_PRESETS, ThemeId } from '../src/theme/ThemeContext';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { localDb } from '../src/lib/localDb';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const { theme, themeId, setTheme } = useAppTheme();
  const [preferences, setPreferences] = useState({
    keepAwake: true,
    showCelebrations: true,
    professionalCommentary: true,
    wideRun: '1',
  });

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    Alert.alert(
      'MASTER DATA RESET',
      'This will permanently delete all matches, players, and local history. Are you absolutely sure?',
      [
        { text: 'CANCEL', style: 'cancel' },
        { 
          text: 'WIPE EVERYTHING', 
          style: 'destructive', 
          onPress: async () => {
            await localDb.clearAllMatches();
            Alert.alert('System Purged', 'All local data has been removed.');
          } 
        }
      ]
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.background, '#020617']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>ELITE COMMAND</Text>
              <Text style={styles.subtitle}>SYSTEM CONFIGURATION & PREFERENCES</Text>
            </View>
          </View>

          {/* Theme Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VISUAL PROTOCOL</Text>
            <View style={styles.themeGrid}>
              {(Object.keys(THEME_PRESETS) as ThemeId[]).map((id) => (
                <TouchableOpacity 
                  key={id} 
                  style={[styles.themeCard, themeId === id && styles.themeCardActive]}
                  onPress={() => setTheme(id)}
                >
                  <View style={[styles.swatch, { backgroundColor: THEME_PRESETS[id].accent }]} />
                  <Text style={styles.themeName}>{id.replace('_', ' ').toUpperCase()}</Text>
                  {themeId === id && <View style={styles.activeDot} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Experience Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP EXPERIENCE</Text>
            <View style={styles.glassCard}>
              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>KEEP SCREEN AWAKE</Text>
                  <Text style={styles.settingSub}>Prevent sleep during live scoring</Text>
                </View>
                <Switch 
                  value={preferences.keepAwake} 
                  onValueChange={() => togglePreference('keepAwake')}
                  trackColor={{ false: '#1e293b', true: theme.colors.accent + '80' }}
                  thumbColor={preferences.keepAwake ? theme.colors.accent : '#94a3b8'}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>ELITE CELEBRATIONS</Text>
                  <Text style={styles.settingSub}>Animated milestones (50, 100, Wicket)</Text>
                </View>
                <Switch 
                  value={preferences.showCelebrations} 
                  onValueChange={() => togglePreference('showCelebrations')}
                  trackColor={{ false: '#1e293b', true: theme.colors.accent + '80' }}
                  thumbColor={preferences.showCelebrations ? theme.colors.accent : '#94a3b8'}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>PRO COMMENTARY</Text>
                  <Text style={styles.settingSub}>AI-generated ball-by-ball insights</Text>
                </View>
                <Switch 
                  value={preferences.professionalCommentary} 
                  onValueChange={() => togglePreference('professionalCommentary')}
                  trackColor={{ false: '#1e293b', true: theme.colors.accent + '80' }}
                  thumbColor={preferences.professionalCommentary ? theme.colors.accent : '#94a3b8'}
                />
              </View>
            </View>
          </View>

          {/* Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
            <TouchableOpacity style={styles.dangerCard} onPress={handleReset}>
              <Text style={styles.dangerTitle}>PURGE ALL LOCAL DATA</Text>
              <Text style={styles.dangerSub}>Permanently delete all matches and players</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>LAZYCRIC ENGINE v2.5.4</Text>
            <Text style={styles.footerSub}>STABLE BUILD • ENCRYPTED PROTOCOL</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <BottomNavBar />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  scroll: { paddingBottom: 120 },
  header: { padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  backText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  subtitle: { fontSize: 9, fontWeight: '800', color: theme.colors.accent, letterSpacing: 2, marginTop: 4 },
  section: { paddingHorizontal: 24, marginTop: 32 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 16 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: { width: (width - 60) / 2, padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  themeCardActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '10' },
  swatch: { width: 30, height: 30, borderRadius: 15, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  themeName: { fontSize: 10, fontWeight: '900', color: '#FFF' },
  activeDot: { position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent },
  glassCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  settingLabel: { fontSize: 13, fontWeight: '900', color: '#FFF' },
  settingSub: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 20 },
  dangerCard: { padding: 20, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.1)' },
  dangerTitle: { fontSize: 13, fontWeight: '900', color: '#ef4444' },
  dangerSub: { fontSize: 9, fontWeight: '700', color: 'rgba(239, 68, 68, 0.4)', marginTop: 2 },
  footer: { padding: 40, alignItems: 'center' },
  footerText: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 2 },
  footerSub: { fontSize: 7, fontWeight: '800', color: 'rgba(255,255,255,0.1)', letterSpacing: 1, marginTop: 6 },
});
