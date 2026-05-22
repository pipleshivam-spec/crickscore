import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
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
      <LinearGradient colors={[theme.colors.background, theme.colors.surfaceAlt]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scroll} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity 
              onPress={() => step === 0 ? (router.canGoBack() ? router.back() : router.replace('/')) : setStep(0)} 
              style={styles.backBtn}
            >
              <Text style={styles.backText}>{step === 0 ? '✕' : '←'}</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>{step === 0 ? 'MATCH PROTOCOL' : 'THE TOSS'}</Text>
              <Text style={styles.subtitle}>ELITE OFFLINE ENGINE • STEP {step + 1} OF 2</Text>
            </View>

            {step === 0 ? (
              <View style={styles.form}>
                <View style={styles.squadInputsCompact}>
                  <View style={styles.slimInputCard}>
                    <View style={styles.inputLabelRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.slimLabel}>HOME SQUAD</Text>
                    </View>
                    <TextInput 
                      style={styles.slimInput} 
                      placeholder="TEAM ALPHA" 
                      placeholderTextColor={theme.colors.textMuted + '80'}
                      value={teamA}
                      onChangeText={setTeamA}
                      autoCapitalize="characters"
                      selectionColor={theme.colors.accent}
                    />
                  </View>

                  <View style={styles.vsCompactRow}>
                    <View style={styles.vsLinePro} />
                    <View style={styles.vsChipPro}>
                      <Text style={styles.vsTextPro}>VS</Text>
                    </View>
                    <View style={styles.vsLinePro} />
                  </View>

                  <View style={styles.slimInputCard}>
                    <View style={styles.inputLabelRow}>
                      <View style={[styles.statusDot, { backgroundColor: theme.colors.textMuted }]} />
                      <Text style={styles.slimLabel}>AWAY SQUAD</Text>
                    </View>
                    <TextInput 
                      style={styles.slimInput} 
                      placeholder="TEAM BETA" 
                      placeholderTextColor={theme.colors.textMuted + '80'}
                      value={teamB}
                      onChangeText={setTeamB}
                      autoCapitalize="characters"
                      selectionColor={theme.colors.accent}
                    />
                  </View>
                </View>

                <View style={styles.configRow}>
                  <View style={styles.configItem}>
                    <Text style={styles.labelElite}>OVERS</Text>
                    <TextInput 
                      style={styles.inputElite} 
                      placeholder="20" 
                      keyboardType="numeric"
                      placeholderTextColor={theme.colors.textMuted + '80'}
                      value={overs}
                      onChangeText={setOvers}
                    />
                  </View>
                  <View style={styles.configItem}>
                    <Text style={styles.labelElite}>ENGINE</Text>
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
                  >
                    <Text style={styles.btnText}>INITIATE TOSS</Text>
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
                    <View style={styles.winnerCard}>
                      <Text style={styles.resultLabel}>TOSS WINNER</Text>
                      <Text style={styles.winnerName}>{(tossWinner || 'TEAM').toUpperCase()}</Text>
                    </View>
                    
                    <Text style={styles.choiceLabel}>DECISION PROTOCOL</Text>
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
                        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>START STADIUM</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingVertical: 16, flexGrow: 1 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  backText: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  header: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 7, fontWeight: '900', color: theme.colors.accent, letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' },
  form: { gap: 16 },

  // ─── Compact Squad Inputs ───
  squadInputsCompact: { gap: 8 },
  slimInputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  slimLabel: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1.5 },
  slimInput: { fontSize: 18, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  vsCompactRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  vsLinePro: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  vsChipPro: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border, marginHorizontal: 16 },
  vsTextPro: { fontSize: 10, fontWeight: '900', color: theme.colors.accent, letterSpacing: 1.5 },

  eliteOptionGroup: { marginBottom: 32 },
  groupLabelElite: { 
    fontSize: 8, 
    fontFamily: theme.typography.fontFamily.bold, 
    color: theme.colors.textMuted, 
    letterSpacing: 2.5, 
    marginBottom: 20, 
    textTransform: 'uppercase' 
  },
  eliteGrid: { flexDirection: 'row', gap: 10 },
  eliteTypeSelector: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  eliteChip: { flex: 1, height: 48, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  eliteChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  eliteChipText: { fontSize: 10, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1 },
  eliteChipTextActive: { color: '#FFF' },
  eliteSquadInputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeaderElite: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent },
  labelElite: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
  inputElite: { 
    color: theme.colors.text, 
    fontSize: 18, 
    fontFamily: theme.typography.fontFamily.bold, 
    letterSpacing: -0.5
  },
  vsSeparatorRow: { flexDirection: 'row', alignItems: 'center', marginVertical: -8, zIndex: 10 },
  vsLineElite: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  vsCircleProfessional: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
  vsTextProfessional: { color: theme.colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  configRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  configItem: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  oversInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ballSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  ballIcon: { fontSize: 20 },
  ballText: { fontSize: 11, fontWeight: '900', color: theme.colors.text, letterSpacing: 1 },
  primaryBtn: { height: 56, borderRadius: 20, overflow: 'hidden', marginTop: 16 },
  btnInner: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  btnText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  tossSection: { alignItems: 'center', flex: 1, paddingTop: 10 },
  flipBtn: { width: '100%', height: 56, borderRadius: 20, overflow: 'hidden', marginTop: 24 },
  flipBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  resultArea: { width: '100%', alignItems: 'center', marginTop: 24 },
  winnerCard: { 
    width: '100%', 
    backgroundColor: 'rgba(46, 125, 50, 0.05)', 
    padding: 20, 
    borderRadius: 24, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(46, 125, 50, 0.1)',
    marginBottom: 24 
  },
  resultLabel: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  winnerName: { fontSize: 32, fontWeight: '900', color: '#2E7D32', letterSpacing: -0.5 },
  choiceLabel: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 3, marginBottom: 16, textTransform: 'uppercase' },
  choiceRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 20 },
  choiceBtn: { flex: 1, height: 74, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 },
  choiceBtnSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceAlt },
  choiceIcon: { fontSize: 24 },
  choiceText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  choiceTextSelected: { color: theme.colors.accent },
});
