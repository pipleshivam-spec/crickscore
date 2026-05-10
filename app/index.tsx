import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { theme as staticTheme } from '../src/theme';
import { useAppTheme, THEME_PRESETS, ThemeId } from '../src/theme/ThemeContext';
import { localDb } from '../src/lib/localDb';
import { ProfileSettingsModal } from '../src/components/ProfileSettingsModal';
import { BottomNavBar as GlobalNav } from '../src/components/BottomNavBar';

const { width, height } = Dimensions.get('window');

export default function Home() {
  const { theme, themeId, setTheme } = useAppTheme();
  const [activeSession, setActiveSession] = React.useState<any>(null);
  const [showProfile, setShowProfile] = React.useState(false);
  const [stats, setStats] = React.useState({ matches: 0, runs: 0, wickets: 0 });
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    checkActiveSession();
    loadLifetimeStats();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, easing: (t) => t * (2 - t), useNativeDriver: true })
    ]).start();
  }, []);

  const checkActiveSession = async () => {
    try {
      const { data } = await supabase
        .from('sessions')
        .select('*, matches(*, innings(*))')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setActiveSession(data);
    } catch (err) { /* ignore single error */ }
  };

  const loadLifetimeStats = async () => {
    try {
      const matches = await localDb.getMatches();
      const totalRuns = matches.reduce((sum: number, m: any) => sum + (m.innings?.[0]?.total_runs || 0) + (m.innings?.[1]?.total_runs || 0), 0);
      const totalWickets = matches.reduce((sum: number, m: any) => sum + (m.innings?.[0]?.total_wickets || 0) + (m.innings?.[1]?.total_wickets || 0), 0);
      setStats({ matches: matches.length, runs: totalRuns, wickets: totalWickets });
    } catch (err) { console.error(err); }
  };

  const handleResume = (item?: any) => {
    const target = item || activeSession?.matches?.[0];
    if (!target) return;

    if (target.isLocal) {
      const activeInnings = target.innings?.find((i: any) => i.status === 'active') || target.innings[0];
      router.push({ 
        pathname: '/scoring', 
        params: { matchId: target.id, inningsId: activeInnings?.id, isLocal: 'true' } 
      });
      return;
    }

    // Remote Logic
    if (activeSession) {
      const match = activeSession.matches?.[0];
      if (!match) {
        router.push({ pathname: '/match-setup', params: { sessionId: activeSession.id } });
        return;
      }
      const innings = match.innings || [];
      if (innings.length === 0) {
        router.push({ pathname: '/toss', params: { matchId: match.id, team1Name: match.team_a, team2Name: match.team_b } });
      } else {
        const activeInnings = innings.find((i: any) => i.status === 'active') || innings[0];
        router.push({ pathname: '/scoring', params: { matchId: match.id, inningsId: activeInnings?.id } });
      }
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={[theme.colors.gradientStart, theme.colors.background, '#000']} 
        style={StyleSheet.absoluteFill} 
      />
      
      {/* Dynamic Background Elements */}
      <View style={[styles.glowBall, { top: height * 0.1, right: -50, backgroundColor: theme.colors.accent + '20' }]} />
      <View style={[styles.glowBall, { bottom: height * 0.2, left: -100, backgroundColor: theme.colors.success + '15' }]} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            <View style={styles.header}>
              <View style={styles.branding}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <View style={styles.titleWrapper}>
                  <Text style={styles.title}>LAZYCRIC</Text>
                  <Text style={styles.subtitle}>ELITE SCORING SYSTEM</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.profileBtn} 
                activeOpacity={0.7}
                onPress={() => setShowProfile(true)}
              >
                <Text style={styles.profileEmoji}>⚙️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mainHub}>
              <Text style={styles.hubLabel}>ACTIVE SESSION</Text>
              
              {activeSession ? (
                <TouchableOpacity style={styles.liveMatchCard} onPress={() => handleResume()} activeOpacity={0.9}>
                  <LinearGradient 
                    colors={['rgba(255, 65, 108, 0.2)', 'rgba(255, 65, 108, 0.05)']} 
                    style={styles.cardInner}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE NOW</Text>
                      </View>
                      <Text style={styles.matchType}>T20 SERIES</Text>
                    </View>
                    <View style={styles.matchInfo}>
                      <Text style={styles.teamsText} numberOfLines={1}>
                        {activeSession.matches?.[0]?.team_a} vs {activeSession.matches?.[0]?.team_b}
                      </Text>
                      <View style={styles.resumeBtn}>
                        <Text style={styles.resumeBtnText}>RESUME</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.emptyCard}>
                  <LinearGradient 
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} 
                    style={styles.cardInner}
                  >
                    <Text style={styles.emptyText}>No active matches. Ready for a new game?</Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            <View style={styles.statsBento}>
              <View style={styles.bentoSmall}>
                <LinearGradient colors={['rgba(59, 130, 246, 0.1)', 'transparent']} style={styles.bentoInner}>
                  <Text style={styles.bentoVal}>{stats.matches}</Text>
                  <Text style={styles.bentoLabel}>GAMES</Text>
                </LinearGradient>
              </View>
              <View style={styles.bentoSmall}>
                <LinearGradient colors={['rgba(16, 185, 129, 0.1)', 'transparent']} style={styles.bentoInner}>
                  <Text style={styles.bentoVal}>{stats.runs}</Text>
                  <Text style={styles.bentoLabel}>TOTAL RUNS</Text>
                </LinearGradient>
              </View>
              <View style={styles.bentoSmall}>
                <LinearGradient colors={['rgba(239, 68, 68, 0.1)', 'transparent']} style={styles.bentoInner}>
                  <Text style={styles.bentoVal}>{stats.wickets}</Text>
                  <Text style={styles.bentoLabel}>WKTS</Text>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/create')} activeOpacity={0.8}>
                <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.gridInner}>
                  <Text style={styles.gridIcon}>🏏</Text>
                  <Text style={styles.gridTitle}>START MATCH</Text>
                  <Text style={styles.gridSub}>Pro Session</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/local-setup')} activeOpacity={0.8}>
                <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.gridInner}>
                  <Text style={styles.gridIcon}>📶</Text>
                  <Text style={styles.gridTitle}>OFFLINE MODE</Text>
                  <Text style={styles.gridSub}>No Internet</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/matches')} activeOpacity={0.8}>
                <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.gridInner}>
                  <Text style={styles.gridIcon}>📜</Text>
                  <Text style={styles.gridTitle}>HISTORY</Text>
                  <Text style={styles.gridSub}>Past Results</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/join')} activeOpacity={0.8}>
                <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.gridInner}>
                  <Text style={styles.gridIcon}>🤝</Text>
                  <Text style={styles.gridTitle}>JOIN GAME</Text>
                  <Text style={styles.gridSub}>View Score</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>


            <View style={styles.footer}>
              <Text style={styles.footerText}>LAZYCRIC ENGINE v2.5 • PROFESSIONAL GRADE</Text>
              <Text style={styles.footerSub}>ELITE SCORING PROTOCOL ACTIVE</Text>
              
              <TouchableOpacity 
                style={styles.resetBtn} 
                onPress={() => {
                  import('react-native').then(({ Alert }) => {
                    Alert.alert(
                      'MASTER RESET?',
                      'This will permanently delete ALL local matches, teams, and history. This action cannot be undone.',
                      [
                        { text: 'CANCEL', style: 'cancel' },
                        { 
                          text: 'DELETE EVERYTHING', 
                          style: 'destructive', 
                          onPress: async () => {
                            await localDb.clearAllMatches();
                            setActiveSession(null);
                          }
                        }
                      ]
                    );
                  });
                }}
              >
                <Text style={styles.resetBtnText}>WIPE ALL LOCAL DATA</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      <GlobalNav />
      <ProfileSettingsModal 
        visible={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  glowBall: { position: 'absolute', width: 400, height: 400, borderRadius: 200 },
  safeArea: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 120 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 32,
  },
  branding: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  title: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: theme.colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.colors.accent,
    marginTop: 10,
  },
  logo: { width: 100, height: 32 },
  profileBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 15, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileEmoji: { fontSize: 16 },
  mainHub: { marginBottom: 32 },
  hubLabel: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textMuted,
    letterSpacing: theme.typography.letterSpacing.extraWide,
    marginBottom: 16,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  liveMatchCard: {
    height: 120,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${theme.colors.accent}40`,
    ...theme.shadows.card,
  },
  emptyCard: {
    height: 100,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    marginRight: 4,
  },
  liveText: { fontSize: 8, fontWeight: '900', color: '#FFF' },
  matchType: { fontSize: 9, fontWeight: '800', color: theme.colors.textMuted },
  matchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamsText: { 
    fontSize: theme.typography.size.lg, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.text, 
    flex: 1,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  resumeBtn: { 
    backgroundColor: '#FFF', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12 
  },
  resumeBtnText: { 
    fontSize: theme.typography.size.xs, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#000',
    letterSpacing: 1,
  },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },

  statsBento: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  bentoSmall: {
    flex: 1,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bentoInner: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  bentoVal: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#FFF',
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  bentoLabel: {
    fontSize: theme.typography.size.xs - 2,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textMuted,
    letterSpacing: theme.typography.letterSpacing.wide,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  gridBtn: {
    width: (width - 60) / 2,
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gridInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  gridIcon: {
    fontSize: 28,
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  gridSub: {
    fontSize: theme.typography.size.xs - 1,
    fontFamily: theme.typography.fontFamily.medium,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  themeSection: { marginBottom: 32 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  swatchBtn: { alignItems: 'center', gap: 8, padding: 8, borderRadius: 16, width: (width - 70) / 3 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  swatchRing: { position: 'absolute', top: 4, left: '50%', marginLeft: -20, width: 40, height: 40, borderRadius: 20, borderWidth: 1, opacity: 0.5 },
  swatchLabel: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1 },

  recentSection: { marginBottom: 32 },
  recentTeams: { 
    fontSize: theme.typography.size.md, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#FFF' 
  },
  recentDate: { 
    fontSize: theme.typography.size.xs - 1, 
    fontFamily: theme.typography.fontFamily.semiBold, 
    color: theme.colors.textMuted, 
    marginTop: 4 
  },
  recentItemContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  recentItem: { 
    flex: 1,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)' 
  },
  recentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  typeText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.4)' },
  deleteMiniBtn: {
    width: 44,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,65,108,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,65,108,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconText: { fontSize: 14 },
  arrowIcon: { color: theme.colors.textMuted, fontSize: 16 },
  noRecentBox: { 
    padding: 30, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  noRecentText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  footer: { alignItems: 'center', paddingBottom: 40 },
  footerText: { fontSize: 8, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 2 },
  footerSub: { fontSize: 6, color: `${theme.colors.accent}40`, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 4, marginTop: 4 },
  resetBtn: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,65,108,0.2)',
    backgroundColor: 'rgba(255,65,108,0.05)',
  },
  resetBtnText: {
    color: theme.colors.danger,
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 1,
  },
});
