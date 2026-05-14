import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Dimensions, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../src/theme/ThemeContext';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { localDb } from '../src/lib/localDb';

const { width } = Dimensions.get('window');

interface Player {
  id: string;
  name: string;
  team?: string;
  stats?: {
    matches: number;
    runs: number;
    wickets: number;
    highestScore: number;
  };
}

export default function PlayersScreen() {
  const { theme } = useAppTheme();
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'BAT' | 'BOWL'>('ALL');

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const matches = await localDb.getMatches();
      const playerMap = new Map<string, Player>();

      // Aggregate players from all historical matches
      matches.forEach((m: any) => {
        m.innings?.forEach((inn: any) => {
          inn.players?.forEach((p: any) => {
            if (!playerMap.has(p.id)) {
              playerMap.set(p.id, {
                id: p.id,
                name: p.name,
                team: p.team,
                stats: { matches: 1, runs: p.runsScored, wickets: p.wicketsTaken, highestScore: p.runsScored }
              });
            } else {
              const existing = playerMap.get(p.id)!;
              existing.stats!.matches += 1;
              existing.stats!.runs += p.runsScored;
              existing.stats!.wickets += p.wicketsTaken;
              existing.stats!.highestScore = Math.max(existing.stats!.highestScore, p.runsScored);
            }
          });
        });
      });

      setPlayers(Array.from(playerMap.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (filter === 'ALL') return matchesSearch;
    if (filter === 'BAT') return matchesSearch && (p.stats?.runs || 0) > 0;
    if (filter === 'BOWL') return matchesSearch && (p.stats?.wickets || 0) > 0;
    return matchesSearch;
  });

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.background, '#020617']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>PLAYER ARCHIVE</Text>
          <Text style={styles.subtitle}>ELITE ROSTER MANAGEMENT</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Elite Players..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['ALL', 'BAT', 'BOWL'] as const).map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterChip, filter === f && styles.filterChipActive]} 
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'ALL' ? 'ALL PLAYERS' : f === 'BAT' ? 'BATTERS' : 'BOWLERS'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : filteredPlayers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>NO ELITE PLAYERS FOUND</Text>
            <Text style={styles.emptySub}>Start a match to register new talent</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {filteredPlayers.map((player, index) => (
              <TouchableOpacity key={player.id} style={styles.playerCard} activeOpacity={0.8}>
                <LinearGradient colors={['rgba(255,255,255,0.03)', 'transparent']} style={styles.cardInner}>
                  <View style={styles.playerAvatar}>
                    <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{(player.name || 'PLAYER').toUpperCase()}</Text>
                    <Text style={styles.playerTeam}>{player.team || 'FREE AGENT'}</Text>
                    
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statVal}>{player.stats?.runs}</Text>
                        <Text style={styles.statLab}>RUNS</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statVal}>{player.stats?.wickets}</Text>
                        <Text style={styles.statLab}>WKTS</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statVal}>{player.stats?.matches}</Text>
                        <Text style={styles.statLab}>GAMES</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.ratingBox}>
                    <Text style={styles.ratingVal}>{(Math.random() * 20 + 75).toFixed(0)}</Text>
                    <Text style={styles.ratingLab}>OVR</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <BottomNavBar />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  header: { padding: 24, paddingBottom: 10 },
  title: { 
    fontSize: theme.typography.size.xl, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#FFF', 
    letterSpacing: 2 
  },
  subtitle: { 
    fontSize: theme.typography.size.xs - 1, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.accent, 
    letterSpacing: 4, 
    marginTop: 4,
    textTransform: 'uppercase'
  },
  searchContainer: { paddingHorizontal: 24, marginBottom: 16 },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: { fontSize: 16, marginRight: 12 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  filterText: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  filterTextActive: { color: '#000' },
  scroll: { paddingHorizontal: 24, paddingBottom: 120 },
  playerCard: { height: 110, marginBottom: 16, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 },
  playerAvatar: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#3b82f6' },
  playerInfo: { flex: 1, marginLeft: 16 },
  playerName: { 
    fontSize: theme.typography.size.lg, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#FFF', 
    letterSpacing: theme.typography.letterSpacing.tight 
  },
  playerTeam: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginTop: 2, marginBottom: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statItem: { alignItems: 'center' },
  statVal: { 
    fontSize: theme.typography.size.md, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#FFF' 
  },
  statLab: { 
    fontSize: theme.typography.size.xs - 3, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: 'rgba(255,255,255,0.2)', 
    letterSpacing: 1 
  },
  statDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  ratingBox: { alignItems: 'center', justifyContent: 'center', paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' },
  ratingVal: { 
    fontSize: theme.typography.size.xl, 
    fontFamily: theme.typography.fontFamily.manrope, 
    color: theme.colors.accent 
  },
  ratingLab: { 
    fontSize: theme.typography.size.xs - 2, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: 'rgba(255,255,255,0.3)' 
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 64, opacity: 0.2, marginBottom: 20 },
  emptyText: { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 2 },
  emptySub: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.1)', marginTop: 8 },
});
