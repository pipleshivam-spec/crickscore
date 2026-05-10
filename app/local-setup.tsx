import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { theme as globalTheme } from '../src/theme';
import { localDb } from '../src/lib/localDb';
import { useAppTheme, AppTheme } from '../src/theme/ThemeContext';
import { TossCoin, TossCoinHandle } from '../src/components/TossCoin';

export default function LocalSetup() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [step, setStep] = useState(0);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [overs, setOvers] = useState('20');
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const [tossChoice, setTossChoice] = useState<'bat' | 'bowl' | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const coinRef = useRef<TossCoinHandle>(null);

  const handleFlip = async () => {
    if (!teamA || !teamB) {
      Alert.alert('TEAMS MISSING', 'Please go back and enter team names.');
      return;
    }
    setIsFlipping(true);
    setTossWinner(null);
    setTossChoice(null);
    
    const winner = Math.random() > 0.5 ? teamA : teamB;
    await coinRef.current?.flip(winner);
    
    setTossWinner(winner);
    setIsFlipping(false);
  };

  const handleNext = () => {
    if (!teamA || !teamB || !overs) {
      Alert.alert('INCOMPLETE INFO', 'Please specify squads and match duration.');
      return;
    }
    setStep(1);
  };

  const handleStart = async () => {
    if (!tossWinner || !tossChoice) {
      Alert.alert('TOSS REQUIRED', 'Match starts with a coin flip and decision.');
      return;
    }

    setLoading(true);
    try {
      const matchId = `local_${Date.now()}`;
      const battingTeam = tossWinner === teamA ? (tossChoice === 'bat' ? teamA : teamB) : (tossChoice === 'bat' ? teamB : teamA);
      const bowlingTeam = battingTeam === teamA ? teamB : teamA;

      const newMatch = {
        id: matchId,
        team_a: teamA,
        team_b: teamB,
        overs: parseInt(overs),
        toss_winner: tossWinner,
        toss_choice: tossChoice,
        status: 'active',
        innings: [
          {
            id: `${matchId}_inn1`,
            match_id: matchId,
            innings_number: 1,
            batting_team: battingTeam,
            bowling_team: bowlingTeam,
            status: 'active',
            total_runs: 0,
            total_wickets: 0,
            total_balls: 0,
            balls: []
          }
        ],
        players: [],
        created_at: new Date().toISOString(),
        isLocal: true
      };

      await localDb.saveMatch(newMatch);
      router.replace({ 
        pathname: '/scoring', 
        params: { matchId: matchId, inningsId: `${matchId}_inn1`, isLocal: 'true' } 
      });
    } catch (err) {
      Alert.alert('DATABASE ERROR', 'Failed to initialize local stadium.');
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
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => step === 0 ? (router.canGoBack() ? router.back() : router.replace('/')) : setStep(0)} style={styles.backBtn}>
            <Text style={styles.backText}>{step === 0 ? '✕' : '←'}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>{step === 0 ? 'MATCH PROTOCOL' : 'THE TOSS'}</Text>
            <Text style={styles.subtitle}>ELITE OFFLINE ENGINE • STEP {step + 1} OF 2</Text>
          </View>

          {step === 0 ? (
            <View style={styles.form}>
              <View style={styles.eliteTypeSelector}>
                {['T20', 'ODI', 'TEST', '100'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.eliteChip, overs === (t === 'T20' ? '20' : t === 'ODI' ? '50' : t === '100' ? '16.4' : '90') && styles.eliteChipActive]}
                    onPress={() => setOvers(t === 'T20' ? '20' : t === 'ODI' ? '50' : t === '100' ? '16.4' : '90')}
                  >
                    <Text style={[styles.eliteChipText, overs === (t === 'T20' ? '20' : t === 'ODI' ? '50' : t === '100' ? '16.4' : '90') && styles.eliteChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.eliteSquadInputCard}>
                <View style={styles.cardHeaderElite}>
                  <Text style={styles.labelElite}>PRIMARY SQUAD (HOME)</Text>
                  <View style={styles.proDot} />
                </View>
                <TextInput 
                  style={styles.inputElite} 
                  placeholder="ENTER TEAM ALPHA" 
                  placeholderTextColor="rgba(255,255,255,0.1)"
                  value={teamA}
                  onChangeText={setTeamA}
                  autoCapitalize="characters"
                  selectionColor={theme.colors.accent}
                />
              </View>

              <View style={styles.vsSeparatorRow}>
                <View style={styles.vsLineElite} />
                <View style={styles.vsCircleProfessional}>
                  <Text style={styles.vsTextProfessional}>VS</Text>
                </View>
                <View style={styles.vsLineElite} />
              </View>

              <View style={styles.eliteSquadInputCard}>
                <View style={styles.cardHeaderElite}>
                  <Text style={styles.labelElite}>OPPOSING SQUAD (AWAY)</Text>
                  <View style={[styles.proDot, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                </View>
                <TextInput 
                  style={styles.inputElite} 
                  placeholder="ENTER TEAM BETA" 
                  placeholderTextColor="rgba(255,255,255,0.1)"
                  value={teamB}
                  onChangeText={setTeamB}
                  autoCapitalize="characters"
                  selectionColor={theme.colors.accent}
                />
              </View>

              <View style={styles.eliteOptionGroup}>
                <Text style={styles.groupLabelElite}>MATCH ARCHITECTURE</Text>
                <View style={styles.eliteGrid}>
                  {['T20', 'ODI', 'TEST', 'PRO'].map(t => (
                    <TouchableOpacity 
                      key={t} 
                      style={[styles.eliteChip, overs === (t === 'T20' ? '20' : t === 'ODI' ? '50' : t === 'TEST' ? '90' : overs) && styles.eliteChipActive]}
                      onPress={() => setOvers(t === 'T20' ? '20' : t === 'ODI' ? '50' : t === 'TEST' ? '90' : overs)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.eliteChipText, overs === (t === 'T20' ? '20' : t === 'ODI' ? '50' : t === 'TEST' ? '90' : overs) && styles.eliteChipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.configRow}>
                <View style={styles.configItem}>
                  <Text style={styles.labelElite}>MATCH OVERS</Text>
                  <View style={styles.oversInputWrapper}>
                    <TextInput 
                      style={styles.inputElite} 
                      placeholder="20" 
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.1)"
                      value={overs}
                      onChangeText={setOvers}
                    />
                  </View>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.labelElite}>STADIUM CONDITIONS</Text>
                  <View style={styles.ballSelector}>
                    <Text style={styles.ballIcon}>🎾</Text>
                    <Text style={styles.ballText}>TENNIS PRO</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <LinearGradient 
                  colors={[theme.colors.accent, theme.colors.accentSecondary]} 
                  style={styles.btnInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.btnText}>INITIATE TOSS PROTOCOL</Text>
                  <Text style={{ fontSize: 18 }}>→</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tossSection}>
              <TossCoin ref={coinRef} />

              {!tossWinner && !isFlipping && (
                <TouchableOpacity style={styles.flipBtn} onPress={handleFlip}>
                  <LinearGradient colors={['#FFD700', '#B8860B']} style={styles.btnInner}>
                    <Text style={styles.flipBtnText}>FLIP COIN</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {tossWinner && !isFlipping && (
                <View style={styles.resultArea}>
                  <Text style={styles.resultLabel}>TOSS WINNER</Text>
                  <Text style={styles.winnerName}>{tossWinner.toUpperCase()}</Text>
                  
                  <Text style={styles.choiceLabel}>SELECT DECISION</Text>
                  <View style={styles.choiceRow}>
                    <TouchableOpacity 
                      style={[styles.choiceBtn, tossChoice === 'bat' && styles.choiceBtnSelected]} 
                      onPress={() => setTossChoice('bat')}
                    >
                      <Text style={styles.choiceIcon}>🏏</Text>
                      <Text style={[styles.choiceText, tossChoice === 'bat' && styles.choiceTextSelected]}>BAT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.choiceBtn, tossChoice === 'bowl' && styles.choiceBtnSelected]} 
                      onPress={() => setTossChoice('bowl')}
                    >
                      <Text style={styles.choiceIcon}>🎾</Text>
                      <Text style={[styles.choiceText, tossChoice === 'bowl' && styles.choiceTextSelected]}>BOWL</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} onPress={handleStart} disabled={loading}>
                    <LinearGradient colors={[theme.colors.accent, theme.colors.accentSecondary]} style={styles.btnInner}>
                      {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>START STADIUM ENGINE</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  scroll: { padding: 24, flexGrow: 1 },
  backBtn: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  header: { marginBottom: 56, alignItems: 'center' },
  title: { 
    fontSize: theme.typography.size.xxl + 4, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#FFF', 
    letterSpacing: theme.typography.letterSpacing.tight 
  },
  subtitle: { 
    fontSize: theme.typography.size.xs - 1, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.accent, 
    letterSpacing: 4, 
    marginTop: 12, 
    textTransform: 'uppercase' 
  },
  form: { gap: 24 },
  eliteOptionGroup: { marginBottom: 32 },
  groupLabelElite: { 
    fontSize: 9, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: 'rgba(255,255,255,0.2)', 
    letterSpacing: 3, 
    marginBottom: 20, 
    textTransform: 'uppercase' 
  },
  eliteGrid: { flexDirection: 'row', gap: 12 },
  eliteTypeSelector: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  eliteChip: { flex: 1, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.01)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  eliteChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  eliteChipText: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.25)', letterSpacing: 2 },
  eliteChipTextActive: { color: '#000' },
  eliteSquadInputCard: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeaderElite: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  proDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  labelElite: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 3, textTransform: 'uppercase' },
  inputElite: { 
    color: '#FFF', 
    fontSize: theme.typography.size.lg, 
    fontFamily: theme.typography.fontFamily.bold, 
    letterSpacing: theme.typography.letterSpacing.tight 
  },
  vsSeparatorRow: { flexDirection: 'row', alignItems: 'center', marginVertical: -8, zIndex: 10 },
  vsLineElite: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  vsCircleProfessional: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
  vsTextProfessional: { color: theme.colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  configRow: { flexDirection: 'row', gap: 16, marginTop: 12, marginBottom: 12 },
  configItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  oversInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  oversInput: { color: theme.colors.accent, fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  ballSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  ballIcon: { fontSize: 20 },
  ballText: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  primaryBtn: { height: 60, borderRadius: 20, overflow: 'hidden', marginTop: 24 },
  btnInner: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  btnText: { 
    color: '#000', 
    fontSize: theme.typography.size.sm, 
    fontFamily: theme.typography.fontFamily.bold, 
    letterSpacing: 2, 
    textTransform: 'uppercase' 
  },
  tossSection: { alignItems: 'center', flex: 1, paddingTop: 20 },
  flipBtn: { width: '100%', height: 60, borderRadius: 20, overflow: 'hidden', marginTop: 32 },
  flipBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  resultArea: { width: '100%', alignItems: 'center', marginTop: 40 },
  resultLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 4, textTransform: 'uppercase' },
  winnerName: { 
    fontSize: theme.typography.size.mega, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: '#10B981', 
    marginTop: 16, 
    marginBottom: 56, 
    letterSpacing: theme.typography.letterSpacing.tight 
  },
  choiceLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 4, marginBottom: 20, textTransform: 'uppercase' },
  choiceRow: { flexDirection: 'row', gap: 16, width: '100%', marginBottom: 40 },
  choiceBtn: { 
    flex: 1, 
    height: 100, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.01)', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 12,
  },
  choiceBtnSelected: { borderColor: theme.colors.accent, backgroundColor: 'rgba(255, 126, 95, 0.04)' },
  choiceIcon: { fontSize: 32 },
  choiceText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  choiceTextSelected: { color: theme.colors.accent },
});
