import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { localDb } from '../src/lib/localDb';
import { useAppTheme } from '../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { TossCoin, TossCoinHandle } from '../src/components/TossCoin';

const { width } = Dimensions.get('window');

export default function Toss() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const { matchId, team1Name, team2Name, sessionId } = useLocalSearchParams<{ matchId: string, team1Name: string, team2Name: string, sessionId?: string }>();
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
 
      const battingTeam = tossResult.winner === team1Name
        ? (choice === 'bat' ? team1Name : team2Name)
        : (choice === 'bat' ? team2Name : team1Name);
      const bowlingTeam = battingTeam === team1Name ? team2Name : team1Name;
 
      // Load the match from local storage
      const match = await localDb.getMatch(matchId!);
      if (!match) {
        Alert.alert('ERROR', 'Match not found. Please restart.');
        return;
      }
 
      // Create innings records inside the match
      const inn1Id = `${matchId}_inn1`;
      const inn2Id = `${matchId}_inn2`;
 
      const updatedMatch = {
        ...match,
        toss_winner: tossResult.winner,
        toss_choice: choice,
        innings: [
          {
            id: inn1Id,
            match_id: matchId,
            innings_number: 1,
            batting_team: battingTeam,
            bowling_team: bowlingTeam,
            status: 'active',
            total_runs: 0,
            total_wickets: 0,
            total_balls: 0,
            balls: [],
          },
          {
            id: inn2Id,
            match_id: matchId,
            innings_number: 2,
            batting_team: bowlingTeam,
            bowling_team: battingTeam,
            status: 'waiting',
            total_runs: 0,
            total_wickets: 0,
            total_balls: 0,
            balls: [],
          },
        ],
      };
 
      await localDb.saveMatch(updatedMatch);

      if (sessionId) {
        const { supabase } = await import('../src/lib/supabase');
        // 1. Update match with toss details in Supabase
        const { error: matchError } = await supabase.from('matches').update({
          toss_winner: tossResult.winner,
          toss_choice: choice
        }).eq('id', matchId);
        if (matchError) console.error('Error updating match in Supabase:', matchError);

        // 2. Insert Innings 1 and Innings 2 into Supabase
        const { error: inningsError } = await supabase.from('innings').insert([
          {
            id: inn1Id,
            match_id: matchId,
            innings_number: 1,
            batting_team: battingTeam,
            bowling_team: bowlingTeam,
            status: 'active',
            total_runs: 0,
            total_wickets: 0,
            total_balls: 0
          },
          {
            id: inn2Id,
            match_id: matchId,
            innings_number: 2,
            batting_team: bowlingTeam,
            bowling_team: battingTeam,
            status: 'waiting',
            total_runs: 0,
            total_wickets: 0,
            total_balls: 0
          }
        ]);
        if (inningsError) console.error('Error inserting innings in Supabase:', inningsError);
      }
 
      router.push({
        pathname: '/scoring',
        params: { 
          matchId, 
          inningsId: inn1Id, 
          isLocal: sessionId ? 'false' : 'true', 
          sessionId: sessionId || '',
          role: sessionId ? 'host' : ''
        }
      });
    } catch (err) {
      Alert.alert('ERROR', 'Could not start match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={[theme.colors.background, theme.colors.surfaceAlt]} 
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
                <Text style={styles.winnerName}>{(tossResult.winner || 'TEAM').toUpperCase()}</Text>
                
                <View style={styles.decisionGroup}>
                  <Text style={styles.decisionPrompt}>SELECT DECISION</Text>
                  <View style={styles.choiceRow}>
                    <TouchableOpacity style={styles.choiceBtn} onPress={() => handleTossChoice('bat')} disabled={loading}>
                      <View style={styles.choiceInner}>
                        <Text style={styles.choiceIcon}>🏏</Text>
                        <Text style={styles.choiceText}>BAT FIRST</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.choiceBtn} onPress={() => handleTossChoice('bowl')} disabled={loading}>
                      <View style={styles.choiceInner}>
                        <Text style={styles.choiceIcon}>🎾</Text>
                        <Text style={styles.choiceText}>BOWL FIRST</Text>
                      </View>
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

const createStyles = (theme: any) => StyleSheet.create({
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
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 10,
  },
  backIcon: { color: theme.colors.text, fontSize: 18 },
  title: { fontSize: 32, fontWeight: '900', color: theme.colors.text, letterSpacing: 4 },
  matchBadge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  matchTeams: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  actionSection: { minHeight: 250, justifyContent: 'center' },
  flipBtn: { height: 60, borderRadius: 30, overflow: 'hidden' },
  btnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  resultBox: { alignItems: 'center' },
  winnerLabel: { color: theme.colors.textMuted, fontSize: 12, letterSpacing: 2 },
  winnerName: { color: theme.colors.text, fontSize: 24, fontWeight: '900', marginVertical: 8 },
  decisionGroup: { marginTop: 24, width: '100%' },
  decisionPrompt: { color: theme.colors.textMuted, fontSize: 10, textAlign: 'center', marginBottom: 16, letterSpacing: 2 },
  choiceRow: { flexDirection: 'row', gap: 16 },
  choiceBtn: { flex: 1, height: 100, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  choiceInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  choiceIcon: { fontSize: 32 },
  choiceText: { fontSize: 12, fontWeight: '900', color: theme.colors.text, letterSpacing: 1 },
});
