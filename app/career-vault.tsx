import React, { useState, useEffect } from 'react';
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
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'runs' | 'wickets' | 'matches'>('runs');

  useEffect(() => {
    loadPlayers();
  }, []);

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

  const statsOverview = {
    totalPlayers: players.length,
    topScorer: players.length > 0 ? [...players].sort((a, b) => (b.runs || 0) - (a.runs || 0))[0] : null,
    topWicketTaker: players.length > 0 ? [...players].sort((a, b) => (b.wickets || 0) - (a.wickets || 0))[0] : null,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#000']} style={StyleSheet.absoluteFill} />

      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: 'rgba(59, 130, 246, 0.1)' }]} />
      <View style={[styles.glow, { bottom: -100, left: -100, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]} />

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
            <LinearGradient colors={['rgba(255, 126, 95, 0.1)', 'rgba(254, 180, 123, 0.02)']} style={styles.legendCard}>
              <Text style={styles.legendLabel}>ALL-TIME LEGEND</Text>
              {statsOverview.topScorer ? (
                <View style={styles.legendContent}>
                  <View style={styles.legendInitialBox}>
                    <Text style={styles.legendInitial}>{statsOverview.topScorer.name[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.legendName}>{(statsOverview.topScorer.name || 'PLAYER').toUpperCase()}</Text>
                    <Text style={styles.legendStats}>{statsOverview.topScorer.runs} RUNS • {statsOverview.topScorer.matches} MATCHES</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyLegend}>NO DATA RECORDED</Text>
              )}
            </LinearGradient>
          </View>

          <View style={styles.filterSection}>
            <View style={styles.searchBar}>
              <TextInput
                placeholder="SEARCH PLAYER..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearch}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900' }}>✕ CLEAR</Text>
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
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, paddingTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  glow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.2 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: { fontSize: 32, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -1.2 },
  subtitle: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' },
  backBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  scroll: { paddingBottom: 130 },

  legendContainer: { paddingHorizontal: 24, marginBottom: 32 },
  legendCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  legendLabel: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: '#FE6B8B', letterSpacing: 4, marginBottom: 20, textTransform: 'uppercase' },
  legendContent: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  legendInitialBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FE6B8B', alignItems: 'center', justifyContent: 'center', shadowColor: '#FE6B8B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10 },
  legendInitial: { fontSize: 28, fontFamily: theme.typography.fontFamily.bold, color: '#000' },
  legendName: { fontSize: 22, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -0.5 },
  legendStats: { fontSize: 11, fontFamily: theme.typography.fontFamily.semiBold, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  emptyLegend: { color: 'rgba(255,255,255,0.15)', fontSize: 14, fontFamily: theme.typography.fontFamily.bold, textAlign: 'center', paddingVertical: 10 },

  filterSection: { paddingHorizontal: 24, marginBottom: 28 },
  searchBar: {
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20
  },
  searchInput: { flex: 1, fontSize: 15, color: '#FFF', fontFamily: theme.typography.fontFamily.semiBold },
  clearSearch: { padding: 8 },
  chipsRow: { flexDirection: 'row' },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  chipTextActive: { color: '#000' },

  listContainer: { paddingHorizontal: 24 },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  rankBox: { width: 44, alignItems: 'center' },
  rankText: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, opacity: 0.6 },
  playerMain: { flex: 1, marginLeft: 12 },
  playerName: { fontSize: 16, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', marginBottom: 12, letterSpacing: -0.2 },
  playerMetrics: { flexDirection: 'row', gap: 20 },
  metric: { alignItems: 'flex-start' },
  metricVal: { fontSize: 18, fontFamily: theme.typography.fontFamily.manrope, color: '#FFF', fontWeight: '800' },
  metricLab: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginTop: 4, textTransform: 'uppercase' },
  playerRight: { marginLeft: 16, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)' },
  deleteIcon: { fontSize: 18, opacity: 0.6 },

  emptyBox: { marginTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
  emptySub: { fontSize: 11, fontFamily: theme.typography.fontFamily.semiBold, color: 'rgba(255,255,255,0.2)', marginTop: 12, textAlign: 'center', lineHeight: 18 },
});
