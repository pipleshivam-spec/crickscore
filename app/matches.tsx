import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppTheme } from '../src/theme/ThemeContext';
import { localDb } from '../src/lib/localDb';
import { supabase } from '../src/lib/supabase';
import { BottomNavBar } from '../src/components/BottomNavBar';

const { width } = Dimensions.get('window');

export default function MatchesHistory() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const localRaw = await localDb.getMatches();
      const local = localRaw.map((m: any) => ({ ...m, isLocal: true }));
      
      const { data: remote } = await supabase
        .from('matches')
        .select('*, innings(*)')
        .order('created_at', { ascending: false });

      const combined = [...local, ...(remote || [])].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setMatches(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const MatchItem = ({ m, index }: { m: any, index: number }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(20)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: index * 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: index * 100, useNativeDriver: true }),
      ]).start();
    }, []);

    const isMatchActive = m.innings?.some((i: any) => i.status === 'active');
    
    return (
      <Animated.View style={[styles.matchCardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity 
          style={styles.matchCard} 
          onPress={() => handleResume(m)}
          activeOpacity={0.9}
        >
          <LinearGradient 
            colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']} 
            style={styles.cardInner}
          >
            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, m.isLocal ? styles.badgeLocal : styles.badgeCloud]}>
                  <Text style={styles.badgeText}>{m.isLocal ? 'LOCAL' : 'CLOUD'}</Text>
                </View>
                {isMatchActive && (
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.dateText}>{new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
            </View>
            
            <View style={styles.teamsSection}>
              <View style={styles.teamEntry}>
                <Text style={styles.teamName} numberOfLines={1}>{(m.team_a || 'TEAM A').toUpperCase()}</Text>
                <Text style={styles.teamScore}>
                  {m.innings?.[0]?.total_runs ?? 0}/{m.innings?.[0]?.total_wickets ?? 0}
                </Text>
              </View>
              
              <View style={styles.vsCircle}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              <View style={[styles.teamEntry, { alignItems: 'flex-end' }]}>
                <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>{(m.team_b || 'TEAM B').toUpperCase()}</Text>
                <Text style={styles.teamScore}>
                  {m.innings?.[1]?.total_runs ?? 0}/{m.innings?.[1]?.total_wickets ?? 0}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.matchMeta}>
                <Text style={styles.metaLabel}>FORMAT</Text>
                <Text style={styles.metaVal}>{m.overs} OVERS</Text>
              </View>
              <TouchableOpacity style={styles.miniDelete} onPress={() => handleDelete(m)}>
                <Text style={styles.miniDeleteText}>PURGE</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleResume = (m: any) => {
    const activeInnings = m.innings?.find((i: any) => i.status === 'active') || m.innings?.[0];
    router.push({ 
      pathname: '/scoring', 
      params: { 
        matchId: m.id, 
        inningsId: activeInnings?.id, 
        isLocal: m.isLocal ? 'true' : 'false',
        autoShowSummary: 'true'
      } 
    });
  };

  const handleDelete = (m: any) => {
    const type = m.isLocal ? 'LOCAL' : 'CLOUD SERVER';
    Alert.alert(
      `DELETE ${type} MATCH?`, 
      `This will permanently purge this match from the ${type === 'LOCAL' ? 'device' : 'Elite Cloud'}. This action is irreversible.`, 
      [
        { text: 'ABORT', style: 'cancel' },
        { 
          text: 'CONFIRM PURGE', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (m.isLocal) {
                await localDb.deleteMatch(m.id);
              } else {
                // ELITE RECURSIVE CLEANUP: Delete child records first to bypass FK constraints
                // 1. Delete all balls associated with this match's innings
                const { data: innings } = await supabase.from('innings').select('id').eq('match_id', m.id);
                if (innings && innings.length > 0) {
                  const inningsIds = innings.map(i => i.id);
                  await supabase.from('balls').delete().in('innings_id', inningsIds);
                  // 2. Delete the innings
                  await supabase.from('innings').delete().eq('match_id', m.id);
                }
                // 3. Finally delete the match
                const { error } = await supabase.from('matches').delete().eq('id', m.id);
                if (error) throw error;
              }
              loadMatches();
              Alert.alert('System Purged', 'Record successfully removed from archive.');
            } catch (err) {
              Alert.alert('Purge Failed', 'Protocol error during data deletion.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.surfaceAlt]} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>MATCH ARENA</Text>
          <Text style={styles.subtitle}>HISTORY & RECORDS</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.arenaInfo}>
            <Text style={styles.arenaStatTitle}>TOTAL FIXTURES</Text>
            <Text style={styles.arenaStatVal}>{matches.length}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.statusText}>RETRIEVING ARCHIVES...</Text>
            </View>
          ) : matches.length > 0 ? (
            matches.map((m, idx) => <MatchItem key={m.id} m={m} index={idx} />)
          ) : (
            <View style={styles.emptyBox}>
              <LinearGradient colors={[theme.colors.surface, 'transparent']} style={styles.emptyInner}>
                <Text style={styles.emptyIcon}>🏟️</Text>
                <Text style={styles.emptyText}>NO ARCHIVES FOUND</Text>
                <Text style={styles.emptySub}>Initialize your first session to begin tracking history</Text>
              </LinearGradient>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomNavBar />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1, paddingTop: 10 },
  header: { padding: 32, paddingBottom: 24 },
  title: { 
    fontSize: 32, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.text, 
    letterSpacing: -1 
  },
  subtitle: { 
    fontSize: 9, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.accent, 
    letterSpacing: 4, 
    marginTop: 6, 
    textTransform: 'uppercase' 
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  arenaInfo: { 
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  arenaStatTitle: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 2 },
  arenaStatVal: { fontSize: 32, fontWeight: '900', color: theme.colors.text, letterSpacing: -1 },
  loadingBox: { marginTop: 100, alignItems: 'center' },
  statusText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 24, fontWeight: '900', fontSize: 9, letterSpacing: 3 },
  
  matchCardContainer: { marginBottom: 20 },
  matchCard: { 
    borderRadius: 24, 
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInner: { padding: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeLocal: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  badgeCloud: { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' },
  badgeText: { fontSize: 7, fontWeight: '900', color: theme.colors.text, letterSpacing: 1 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#EF4444' },
  liveText: { fontSize: 7, fontWeight: '900', color: '#EF4444', letterSpacing: 1 },
  dateText: { fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 0.5 },
  
  teamsSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  teamEntry: { flex: 1 },
  teamName: { 
    fontSize: 18, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.text, 
    letterSpacing: -0.5
  },
  teamScore: { 
    fontSize: 22, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.accent, 
    marginTop: 6 
  },
  vsCircle: { 
    width: 32, height: 32, borderRadius: 16, 
    backgroundColor: theme.colors.surfaceAlt, 
    alignItems: 'center', justifyContent: 'center', 
    borderWidth: 1, borderColor: theme.colors.border, 
    marginHorizontal: 16 
  },
  vsText: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted },
  
  cardFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: theme.colors.border 
  },
  matchMeta: { flexDirection: 'row', gap: 12 },
  metaLabel: { 
    fontSize: 8, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.textMuted, 
    letterSpacing: 1 
  },
  metaVal: { 
    fontSize: 10, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.text, 
  },
  miniDelete: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.03)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.05)' },
  miniDeleteText: { fontSize: 8, fontWeight: '900', color: '#EF4444', letterSpacing: 0.5 },
  emptyBox: { marginTop: 40, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
  emptyInner: { padding: 48, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 16, opacity: 0.3 },
  emptyText: { color: theme.colors.text, fontSize: 13, fontWeight: '900', letterSpacing: 2, opacity: 0.8 },
  emptySub: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 12, textAlign: 'center', lineHeight: 18 },
});
