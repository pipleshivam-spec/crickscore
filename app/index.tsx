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
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, easing: (t) => t * (2 - t), useNativeDriver: false })
    ]).start();
  }, []);

  const checkActiveSession = async () => {
    try {
      // 1. Check Local Storage First (Priority for Offline Scorer)
      const localMatches = await localDb.getMatches();
      const localActive = localMatches.find((m: any) => m.status === 'live');
      
      if (localActive) {
        setActiveSession({
          id: 'local',
          matches: [localActive]
        });
        return;
      }

      // 2. Fallback to Supabase Remote Session
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

    if (activeSession?.id === 'local' || target.isLocal) {
      const activeInnings = target.innings?.find((i: any) => i.status === 'active') || (target.innings && target.innings[0]);
      const innId = activeInnings?.id || `${target.id}_inn1`;
      router.push({ 
        pathname: '/scoring', 
        params: { matchId: target.id, inningsId: innId, isLocal: 'true' } 
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
      <View style={[styles.glowBall, { backgroundColor: '#10B981', top: -100, left: -100 }]} />
      <View style={[styles.glowBall, { backgroundColor: '#3B82F6', bottom: -100, right: -100 }]} />

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
                onPress={() => router.push('/settings')}
              >
                <Text style={styles.profileEmoji}>⚙️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mainHub}>
              <Text style={styles.hubLabel}>ACTIVE SESSION</Text>
              
              {activeSession ? (
                <TouchableOpacity style={styles.liveMatchCard} onPress={() => handleResume()} activeOpacity={0.9}>
                  <LinearGradient 
                    colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)']} 
                    style={styles.cardInner}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE BROADCAST</Text>
                      </View>
                      <Text style={styles.matchType}>{activeSession.matches?.[0]?.matchType?.toUpperCase() || 'LIVE MATCH'}</Text>
                    </View>
                    
                    <View style={styles.matchInfo}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.teamsText} numberOfLines={1}>
                          {(activeSession.matches?.[0]?.teamA || activeSession.matches?.[0]?.team_a)} vs {(activeSession.matches?.[0]?.teamB || activeSession.matches?.[0]?.team_b)}
                        </Text>
                        <Text style={styles.liveScoreMini}>
                          {activeSession.matches?.[0]?.innings?.[0]?.total_runs || 0}/{activeSession.matches?.[0]?.innings?.[0]?.total_wickets || 0}
                          <Text style={{ opacity: 0.4 }}> ({Math.floor((activeSession.matches?.[0]?.innings?.[0]?.total_balls || 0) / 6)}.{ (activeSession.matches?.[0]?.innings?.[0]?.total_balls || 0) % 6 } ov)</Text>
                        </Text>
                      </View>
                      <View style={styles.resumeBtn}>
                        <Text style={styles.resumeBtnText}>GO LIVE</Text>
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
                <View style={[styles.bentoInner, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Text style={styles.bentoVal}>{stats.matches}</Text>
                  <Text style={styles.bentoLabel}>GAMES</Text>
                </View>
              </View>
              <View style={styles.bentoSmall}>
                <View style={[styles.bentoInner, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Text style={styles.bentoVal}>{stats.runs}</Text>
                  <Text style={styles.bentoLabel}>TOTAL RUNS</Text>
                </View>
              </View>
              <View style={styles.bentoSmall}>
                <View style={[styles.bentoInner, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Text style={styles.bentoVal}>{stats.wickets}</Text>
                  <Text style={styles.bentoLabel}>WICKETS</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/create')} activeOpacity={0.8}>
                    <View style={[styles.gridInner, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <Text style={styles.gridIcon}>🏆</Text>
                      <Text style={styles.gridTitle}>LOCAL MATCH</Text>
                      <Text style={styles.gridSub}>QUICK START</Text>
                    </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/tournaments')} activeOpacity={0.8}>
                <View style={[styles.gridInner, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Text style={styles.gridIcon}>📊</Text>
                  <Text style={styles.gridTitle}>TOURNAMENTS</Text>
                  <Text style={styles.gridSub}>LEAGUE MODE</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/join')} activeOpacity={0.8}>
                    <View style={[styles.gridInner, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                      <Text style={styles.gridIcon}>📶</Text>
                      <Text style={styles.gridTitle}>JOIN LIVE</Text>
                      <Text style={styles.gridSub}>SYNC BY CODE</Text>
                    </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/local-setup')} activeOpacity={0.8}>
                    <View style={[styles.gridInner, { backgroundColor: '#1e293b' }]}>
                      <Text style={styles.gridIcon}>📶</Text>
                      <Text style={styles.gridTitle}>OFFLINE MODE</Text>
                      <Text style={styles.gridSub}>NO INTERNET</Text>
                    </View>
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
  container: { flex: 1, backgroundColor: '#000' },
  glowBall: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15 },
  safeArea: { flex: 1, paddingTop: 10 },
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 120 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 40,
  },
  branding: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  title: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#FFF', 
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 8,
    fontWeight: '900',
    color: theme.colors.accent,
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase'
  },
  profileBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 16, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileEmoji: { fontSize: 16 },
  mainHub: { marginBottom: 32 },
  hubLabel: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 3,
    marginBottom: 16,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  liveMatchCard: {
    height: 140,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.01)'
  },
  emptyCard: {
    height: 100,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(255,255,255,0.01)'
  },
  cardInner: {
    flex: 1,
    padding: 24,
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
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)'
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveText: { fontSize: 8, fontWeight: '900', color: '#EF4444', letterSpacing: 1 },
  matchType: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5 },
  matchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamsText: { 
    fontSize: 20, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#FFF', 
    flex: 1,
    letterSpacing: -0.5,
  },
  resumeBtn: { 
    backgroundColor: theme.colors.accent, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12 
  },
  resumeBtnText: { 
    fontSize: 10, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#000',
    letterSpacing: 0.5,
  },
  liveScoreMini: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.accent,
    marginTop: 2,
  },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', textAlign: 'center' },

  statsBento: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  bentoSmall: {
    flex: 1,
    height: 84,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bentoInner: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  bentoVal: {
    fontSize: 24,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  bentoLabel: {
    fontSize: 7,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 40,
  },
  gridBtn: {
    width: (width - 52) / 2,
    height: 120,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(255,255,255,0.01)'
  },
  gridInner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  gridIcon: {
    fontSize: 28,
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    letterSpacing: 0,
  },
  gridSub: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  footer: { alignItems: 'center', paddingBottom: 40 },
  footerText: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: theme.typography.fontFamily.bold, letterSpacing: 2 },
  footerSub: { fontSize: 8, color: theme.colors.accent, opacity: 0.4, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 3, marginTop: 4 },
  resetBtn: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  resetBtnText: {
    color: 'rgba(239, 68, 68, 0.4)',
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 1,
  },
});
