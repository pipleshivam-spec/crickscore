import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { TossCoin, TossCoinHandle } from '../src/components/TossCoin';

const { width } = Dimensions.get('window');

export default function Toss() {
  const { matchId, team1Name, team2Name } = useLocalSearchParams<{ matchId: string, team1Name: string, team2Name: string }>();
  const [isFlipping, setIsFlipping] = useState(false);
  const [tossResult, setTossResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const coinRef = useRef<TossCoinHandle>(null);

  const handleFlip = async () => {
    setIsFlipping(true);
    setTossResult(null);
    const winner = Math.random() > 0.5 ? team1Name : team2Name;
    
    await coinRef.current?.flip(winner);
    
    setTossResult({ winner });
    setIsFlipping(false);
  };

  const handleTossChoice = async (choice: 'bat' | 'bowl') => {
    try {
      setLoading(true);
      const battingTeam = tossResult.winner === team1Name ? (choice === 'bat' ? team1Name : team2Name) : (choice === 'bat' ? team2Name : team1Name);
      const bowlingTeam = battingTeam === team1Name ? team2Name : team1Name;

      await supabase.from('matches').update({ toss_winner: tossResult.winner, toss_choice: choice }).eq('id', matchId);
      
      const { data: inn1 } = await supabase.from('innings').insert([{ match_id: matchId, innings_number: 1, batting_team: battingTeam, bowling_team: bowlingTeam, status: 'active' }]).select().single();
      await supabase.from('innings').insert([{ match_id: matchId, innings_number: 2, batting_team: bowlingTeam, bowling_team: battingTeam, status: 'waiting' }]);

      router.push({ pathname: '/scoring', params: { matchId, inningsId: inn1.id } });
    } catch (err) {
      Alert.alert('ERROR', 'Elite Cloud Sync failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={[theme.colors.gradientStart, theme.colors.background, '#000']} 
        style={StyleSheet.absoluteFill} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
              <Text style={styles.backIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>THE TOSS</Text>
            <View style={styles.matchBadge}>
              <Text style={styles.matchTeams}>{team1Name} vs {team2Name}</Text>
            </View>
          </View>

          <TossCoin ref={coinRef} />

          <View style={styles.actionSection}>
            {!tossResult && !isFlipping ? (
              <TouchableOpacity style={styles.flipBtn} onPress={handleFlip} activeOpacity={0.8}>
                <LinearGradient 
                  colors={[theme.colors.accent, theme.colors.accentSecondary]} 
                  style={styles.btnInner}
                  start={{x:0, y:0}}
                  end={{x:1, y:1}}
                >
                  <Text style={styles.btnText}>FLIP COIN</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            {tossResult && !isFlipping && (
              <View style={styles.resultBox}>
                <Text style={styles.winnerLabel}>TOSS WINNER</Text>
                <Text style={styles.winnerName}>{tossResult.winner.toUpperCase()}</Text>
                
                <View style={styles.decisionGroup}>
                  <Text style={styles.decisionPrompt}>SELECT DECISION</Text>
                  <View style={styles.choiceRow}>
                    <TouchableOpacity style={styles.choiceBtn} onPress={() => handleTossChoice('bat')} disabled={loading}>
                      <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={styles.choiceInner}>
                        <Text style={styles.choiceIcon}>🏏</Text>
                        <Text style={styles.choiceText}>BAT FIRST</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.choiceBtn} onPress={() => handleTossChoice('bowl')} disabled={loading}>
                      <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={styles.choiceInner}>
                        <Text style={styles.choiceIcon}>🎾</Text>
                        <Text style={styles.choiceText}>BOWL FIRST</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
                {loading && <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />}
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 32, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 20 },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  backIcon: { color: theme.colors.text, fontSize: 18 },
  title: { fontSize: 32, fontWeight: '900', color: theme.colors.text, letterSpacing: 4 },
  matchBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  matchTeams: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  actionSection: { width: '100%', marginBottom: 20 },
  flipBtn: { height: 70, borderRadius: 24, overflow: 'hidden', ...theme.shadows.glow },
  btnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: theme.colors.background, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  resultBox: { alignItems: 'center', width: '100%' },
  winnerLabel: { fontSize: 10, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 2 },
  winnerName: { fontSize: 28, fontWeight: '900', color: theme.colors.success, marginTop: 8, textAlign: 'center' },
  decisionGroup: { marginTop: 40, width: '100%' },
  decisionPrompt: { fontSize: 9, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  choiceRow: { flexDirection: 'row', gap: 16 },
  choiceBtn: { flex: 1, height: 100, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  choiceInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  choiceIcon: { fontSize: 32 },
  choiceText: { fontSize: 12, fontWeight: '900', color: theme.colors.text, letterSpacing: 1 },
});
