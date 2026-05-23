import React, { useState, useEffect } from 'react';

// Simple type definitions for a player record
type Player = {
  id: string;
  name: string;
  runs: number;
  wickets: number;
  matches: number;
  balls?: number;
};

// Simple type definitions for overview stats
type StatsOverview = {
  totalPlayers: number;
  topScorer: Player | null;
  topWicketTaker: Player | null;
};
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { localDb } from '../src/lib/localDb';
import { useAppTheme } from '../src/theme/ThemeContext';
import { router } from 'expo-router';
import { BottomNavBar } from '../src/components/BottomNavBar';

const { width } = Dimensions.get('window');

export default function CareerVault() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [statsOverview, setStatsOverview] = React.useState<StatsOverview>({ totalPlayers: 0, topScorer: null, topWicketTaker: null });
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'runs' | 'wickets' | 'matches'>('runs');

    useEffect(() => {
    // Compute summary stats whenever the player list changes
    const totalPlayers = players.length;
    const topScorer = totalPlayers > 0 ? [...players].sort((a, b) => (b.runs || 0) - (a.runs || 0))[0] : null;
    const topWicketTaker = totalPlayers > 0 ? [...players].sort((a, b) => (b.wickets || 0) - (a.wickets || 0))[0] : null;
    setStatsOverview({ totalPlayers, topScorer, topWicketTaker });
  }, [players]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await localDb.getPlayers();
      setPlayers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load players on component mount
  useEffect(() => {
    loadPlayers();
  }, []);


  const handleDeletePlayer = async (id: string, name: string) => {
    Alert.alert(
      "DELETE PLAYER",
      `Are you sure you want to delete ${(name || 'PLAYER').toUpperCase()}? This action cannot be undone.`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            await localDb.deletePlayer(id);
            loadPlayers();
          }
        }
      ]
    );
  };

  const filteredPlayers = [...players]
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));

  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.surfaceAlt]} style={StyleSheet.absoluteFill} />

      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: theme.colors.accent + '05' }]} />
      <View style={[styles.glow, { bottom: -100, left: -100, backgroundColor: theme.colors.success + '03' }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>CAREER VAULT</Text>
            <Text style={styles.subtitle}>GLOBAL PLAYER REGISTRY & HALL OF FAME</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.legendContainer}>
            <View style={styles.legendRow}>
              {/* Top Scorer Card */}
              <LinearGradient colors={[theme.colors.surface, theme.colors.surfaceAlt]} style={styles.legendCardHalf}>
                <Text style={styles.legendLabel}>🏏 MOST RUNS</Text>
                {(statsOverview?.topScorer?.runs || 0) > 0 ? (
                  <View style={styles.legendContentHalf}>
                    <View style={[styles.legendInitialBoxSmall, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.legendInitialSmall}>{statsOverview.topScorer?.name?.[0]?.toUpperCase() ?? ''}</Text>
                    </View>
                    <View style={styles.legendTextContainer}>
                      <Text style={styles.legendNameSmall} numberOfLines={1}>{(statsOverview.topScorer?.name || 'PLAYER').toUpperCase()}</Text>
                      <Text style={styles.legendStatsSmall}>{statsOverview.topScorer?.runs ?? 0} RUNS</Text>
                      <Text style={styles.legendMatchesSmall}>{statsOverview.topScorer?.matches ?? 0} MATCHES</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.emptyLegendSmall}>NO DATA</Text>
                )}
              </LinearGradient>

              {/* Top Wicket Taker Card */}
              <LinearGradient colors={[theme.colors.surface, theme.colors.surfaceAlt]} style={styles.legendCardHalf}>
                <Text style={styles.legendLabel}>⚡ MOST WICKETS</Text>
                {(statsOverview?.topWicketTaker?.wickets || 0) > 0 ? (
                  <View style={styles.legendContentHalf}>
                    <View style={[styles.legendInitialBoxSmall, { backgroundColor: theme.colors.success || '#2E7D32' }]}>
                      <Text style={styles.legendInitialSmall}>{statsOverview.topWicketTaker?.name?.[0]?.toUpperCase() ?? ''}</Text>
                    </View>
                    <View style={styles.legendTextContainer}>
                      <Text style={styles.legendNameSmall} numberOfLines={1}>{(statsOverview.topWicketTaker?.name || 'PLAYER').toUpperCase()}</Text>
                      <Text style={styles.legendStatsSmall}>{statsOverview.topWicketTaker?.wickets ?? 0} WKTS</Text>
                      <Text style={styles.legendMatchesSmall}>{statsOverview.topWicketTaker?.matches ?? 0} MATCHES</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.emptyLegendSmall}>NO DATA</Text>
                )}
              </LinearGradient>
            </View>
          </View>

          <View style={styles.filterSection}>
            <View style={styles.searchBar}>
              <TextInput
                placeholder="SEARCH PLAYER..."
                placeholderTextColor={theme.colors.textMuted + '80'}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearch}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '900' }}>✕ CLEAR</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {['runs', 'wickets', 'matches'].map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, sortBy === key && styles.chipActive]}
                  onPress={() => setSortBy(key as any)}
                >
                  <Text style={[styles.chipText, sortBy === key && styles.chipTextActive]}>
                    {key === 'runs' ? 'MOST RUNS' : key === 'wickets' ? 'MOST WICKETS' : 'EXPERIENCE'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.listContainer}>
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player, index) => (
                <View key={player.id} style={styles.playerCard}>
                  <View style={styles.rankBox}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.playerMain}>
                    <Text style={styles.playerName}>{(player.name || 'PLAYER').toUpperCase()}</Text>
                    <View style={styles.playerMetrics}>
                      <View style={styles.metric}>
                        <Text style={styles.metricVal}>{player.runs || 0}</Text>
                        <Text style={styles.metricLab}>RUNS</Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.metricVal}>{player.wickets || 0}</Text>
                        <Text style={styles.metricLab}>WKTS</Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.metricVal}>{player.matches || 0}</Text>
                        <Text style={styles.metricLab}>MAT</Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.metricVal}>{player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}</Text>
                        <Text style={styles.metricLab}>SR</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.playerRight} onPress={() => handleDeletePlayer(player.id, player.name)}>
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>NO PLAYERS FOUND</Text>
                <Text style={styles.emptySub}>START SCORING MATCHES TO BUILD THE VAULT</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNavBar />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1, paddingTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  glow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.2 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: { fontSize: 32, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, letterSpacing: -1.2 },
  subtitle: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' },
  backBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  backText: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  scroll: { paddingBottom: 130 },

  legendContainer: { paddingHorizontal: 24, marginBottom: 32 },
  legendRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  legendCardHalf: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  legendLabel: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
  legendContentHalf: { flexDirection: 'column', alignItems: 'center', gap: 8 },
  legendInitialBoxSmall: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  legendInitialSmall: { fontSize: 18, fontFamily: theme.typography.fontFamily.bold, color: '#FFF' },
  legendTextContainer: { alignItems: 'center' },
  legendNameSmall: { fontSize: 13, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, letterSpacing: -0.2, textAlign: 'center' },
  legendStatsSmall: { fontSize: 14, fontFamily: theme.typography.fontFamily.manrope, color: theme.colors.text, fontWeight: '800', marginTop: 4 },
  legendMatchesSmall: { fontSize: 9, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, marginTop: 2 },
  emptyLegendSmall: { color: theme.colors.textMuted, fontSize: 11, fontFamily: theme.typography.fontFamily.bold, textAlign: 'center', paddingVertical: 12 },

  filterSection: { paddingHorizontal: 24, marginBottom: 28 },
  searchBar: {
    height: 56,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold },
  clearSearch: { padding: 8 },
  chipsRow: { flexDirection: 'row' },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.colors.surface, marginRight: 10, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1 },
  chipTextActive: { color: '#FFF' },

  listContainer: { paddingHorizontal: 24 },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  rankBox: { width: 44, alignItems: 'center' },
  rankText: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, opacity: 0.6 },
  playerMain: { flex: 1, marginLeft: 12 },
  playerName: { fontSize: 16, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, marginBottom: 12, letterSpacing: -0.2 },
  playerMetrics: { flexDirection: 'row', gap: 20 },
  metric: { alignItems: 'flex-start' },
  metricVal: { fontSize: 18, fontFamily: theme.typography.fontFamily.manrope, color: theme.colors.text, fontWeight: '800' },
  metricLab: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1.5, marginTop: 4, textTransform: 'uppercase' },
  playerRight: { marginLeft: 16, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)' },
  deleteIcon: { fontSize: 18, opacity: 0.6 },

  emptyBox: { marginTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 2 },
  emptySub: { fontSize: 11, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, marginTop: 12, textAlign: 'center', lineHeight: 18 },
});
