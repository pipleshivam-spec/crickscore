import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions } from 'react-native';
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

  const filteredPlayers = players
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));

  const statsOverview = {
    totalPlayers: players.length,
    topScorer: players.length > 0 ? players.sort((a, b) => b.runs - a.runs)[0] : null,
    topWicketTaker: players.length > 0 ? players.sort((a, b) => b.wickets - a.wickets)[0] : null,
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
      
      {/* Glow Elements */}
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
          {/* Legend Stats */}
          <View style={styles.legendContainer}>
            <LinearGradient colors={['rgba(255, 126, 95, 0.1)', 'rgba(254, 180, 123, 0.02)']} style={styles.legendCard}>
              <Text style={styles.legendLabel}>ALL-TIME LEGEND</Text>
              {statsOverview.topScorer ? (
                <View style={styles.legendContent}>
                  <View style={styles.legendInitialBox}>
                    <Text style={styles.legendInitial}>{statsOverview.topScorer.name[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.legendName}>{statsOverview.topScorer.name.toUpperCase()}</Text>
                    <Text style={styles.legendStats}>{statsOverview.topScorer.runs} RUNS • {statsOverview.topScorer.matches} MATCHES</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyLegend}>NO DATA RECORDED</Text>
              )}
            </LinearGradient>
          </View>

          {/* Search & Filter */}
          <View style={styles.filterSection}>
            <View style={styles.searchBar}>
              <TextInput
                placeholder="SEARCH PLAYER..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              <TouchableOpacity 
                style={[styles.chip, sortBy === 'runs' && styles.chipActive]} 
                onPress={() => setSortBy('runs')}
              >
                <Text style={[styles.chipText, sortBy === 'runs' && styles.chipTextActive]}>MOST RUNS</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, sortBy === 'wickets' && styles.chipActive]} 
                onPress={() => setSortBy('wickets')}
              >
                <Text style={[styles.chipText, sortBy === 'wickets' && styles.chipTextActive]}>MOST WICKETS</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, sortBy === 'matches' && styles.chipActive]} 
                onPress={() => setSortBy('matches')}
              >
                <Text style={[styles.chipText, sortBy === 'matches' && styles.chipTextActive]}>EXPERIENCE</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Player List */}
          <View style={styles.listContainer}>
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player, index) => (
                <View key={player.id} style={styles.playerCard}>
                  <View style={styles.rankBox}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.playerMain}>
                    <Text style={styles.playerName}>{player.name.toUpperCase()}</Text>
                    <View style={styles.playerMetrics}>
                      <View style={styles.metric}>
                        <Text style={styles.metricVal}>{player.runs}</Text>
                        <Text style={styles.metricLab}>RUNS</Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.metricVal}>{player.wickets}</Text>
                        <Text style={styles.metricLab}>WKTS</Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.metricVal}>{player.matches}</Text>
                        <Text style={styles.metricLab}>MAT</Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.metricVal}>{player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}</Text>
                        <Text style={styles.metricLab}>SR</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.playerRight}>
                    <Text style={styles.chevron}>→</Text>
                  </View>
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
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.3 },
  header: { padding: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -1 },
  subtitle: { fontSize: 8, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2, marginTop: 4 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  scroll: { paddingBottom: 120 },

  legendContainer: { paddingHorizontal: 24, marginBottom: 32 },
  legendCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  legendLabel: { fontSize: 8, fontWeight: '900', color: '#FE6B8B', letterSpacing: 3, marginBottom: 16 },
  legendContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legendInitialBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FE6B8B', alignItems: 'center', justifyContent: 'center' },
  legendInitial: { fontSize: 24, fontWeight: '900', color: '#000' },
  legendName: { fontSize: 18, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  legendStats: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  emptyLegend: { color: 'rgba(255,255,255,0.1)', fontSize: 12, fontWeight: '800', textAlign: 'center' },

  filterSection: { paddingHorizontal: 24, marginBottom: 24 },
  searchBar: { height: 54, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, paddingHorizontal: 20, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16 },
  searchInput: { fontSize: 14, color: '#FFF', fontWeight: '700' },
  chipsRow: { flexDirection: 'row' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.4)' },
  chipTextActive: { color: '#000' },

  listContainer: { paddingHorizontal: 24 },
  playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  rankBox: { width: 40, alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: '900', color: theme.colors.accent, opacity: 0.5 },
  playerMain: { flex: 1, marginLeft: 8 },
  playerName: { fontSize: 14, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  playerMetrics: { flexDirection: 'row', gap: 16 },
  metric: { alignItems: 'flex-start' },
  metricVal: { fontSize: 14, fontWeight: '900', color: '#FFF' },
  metricLab: { fontSize: 7, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 1 },
  playerRight: { marginLeft: 12 },
  chevron: { fontSize: 18, color: 'rgba(255,255,255,0.1)' },

  emptyBox: { marginTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 1 },
  emptySub: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.05)', marginTop: 8, textAlign: 'center' },
});
