import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAppTheme } from '../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { localDb } from '../src/lib/localDb';

const { width } = Dimensions.get('window');

export default function MatchSetup() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [step, setStep] = React.useState(1);
  const [team1Name, setTeam1Name] = React.useState('Team A');
  const [team2Name, setTeam2Name] = React.useState('Team B');
  const [overs, setOvers] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [matchType, setMatchType] = React.useState('T20');
  const [pitch, setPitch] = React.useState('HARD');
  const [ball, setBall] = React.useState('LEATHER');
  const [tournaments, setTournaments] = React.useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = React.useState<any>(null);
  const [matchId] = React.useState(() => `match_${Date.now()}`);
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();

  React.useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    const data = await localDb.getTournaments();
    setTournaments(data);
    if (tournamentId) {
      const tour = data.find((t: any) => t.id === tournamentId);
      if (tour) {
        setSelectedTournament(tour);
        setOvers(tour.overs || 20);
      }
    }
  };

  const progress = (step / 3) * 100;

  const handleProceed = async () => {
    if (step === 1) {
      if (!team1Name.trim() || !team2Name.trim()) {
        Alert.alert('REQUIRED FIELDS', 'Please enter names for both Home and Away squads.');
        return;
      }
      if (team1Name.trim().toUpperCase() === team2Name.trim().toUpperCase()) {
        Alert.alert('INVALID SQUADS', 'Home and Away squads cannot have the same name.');
        return;
      }
      setStep(2);
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    try {
      setLoading(true);
      const newMatch = {
        id: matchId,
        team_a: team1Name.trim(),
        team_b: team2Name.trim(),
        teamA: team1Name.trim(),
        teamB: team2Name.trim(),
        overs: overs,
        matchType,
        pitch,
        ball,
        tournament_id: selectedTournament?.id || null,
        date: new Date().toISOString(),
        status: 'live',
        result: null,
        created_at: new Date().toISOString(),
        isLocal: true,
      };

      await localDb.saveMatch(newMatch);

      if (sessionId) {
        const { error } = await supabase.from('matches').insert([{
          id: matchId,
          session_id: sessionId,
          team_a: team1Name.trim(),
          team_b: team2Name.trim(),
          overs: overs,
          status: 'live',
          created_at: new Date().toISOString()
        }]);
        if (error) console.error('Error inserting online match:', error);
      }

      if (selectedTournament) {
        const updatedTournament = {
          ...selectedTournament,
          matches: [...(selectedTournament.matches || []), {
            id: matchId,
            teamA: team1Name.trim(),
            teamB: team2Name.trim(),
            date: new Date().toISOString(),
            status: 'live',
            result: null,
          }],
        };
        await localDb.saveTournament(updatedTournament);
      }

      router.push({
        pathname: '/toss',
        params: { matchId, team1Name: team1Name.trim(), team2Name: team2Name.trim(), sessionId: sessionId || '' }
      });

    } catch (err: any) {
      Alert.alert('SETUP FAILED', 'Could not create match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>TOURNAMENT LINKING</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tourSelector}>
              <TouchableOpacity
                style={[styles.tourChip, !selectedTournament && styles.tourChipActive]}
                onPress={() => setSelectedTournament(null)}
              >
                <Text style={[styles.tourChipText, !selectedTournament && styles.tourChipTextActive]}>EXHIBITION MATCH</Text>
              </TouchableOpacity>
              {tournaments.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tourChip, selectedTournament?.id === t.id && styles.tourChipActive]}
                  onPress={() => {
                    setSelectedTournament(t);
                    setOvers(t.overs);
                  }}
                >
                  <Text style={[styles.tourChipText, selectedTournament?.id === t.id && styles.tourChipTextActive]}>{t.name.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>SQUAD INITIALIZATION</Text>

            <View style={styles.squadInputsCompact}>
              <View style={styles.slimInputCard}>
                <View style={styles.inputLabelRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.slimLabel}>HOME SQUAD</Text>
                </View>
                <TextInput
                  style={styles.slimInput}
                  value={team1Name}
                  onChangeText={setTeam1Name}
                  placeholder="ENTER HOME SQUAD"
                  placeholderTextColor={theme.colors.textMuted + '80'}
                  selectionColor={theme.colors.accent}
                  autoCapitalize="characters"
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
                  value={team2Name}
                  onChangeText={setTeam2Name}
                  placeholder="ENTER AWAY SQUAD"
                  placeholderTextColor={theme.colors.textMuted + '80'}
                  selectionColor={theme.colors.accent}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>BATTLE PARAMETERS</Text>

            <View style={styles.eliteOptionGroup}>
              <Text style={styles.groupLabelElite}>MATCH ARCHITECTURE</Text>
              <View style={styles.eliteGrid}>
                {['T20', 'ODI', 'TEST', 'PRO'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.eliteChip, matchType === t && styles.eliteChipActive]}
                    onPress={() => setMatchType(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.eliteChipText, matchType === t && styles.eliteChipTextActive]}>{t}</Text>
                    {matchType === t && <View style={styles.activeIndicator} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.eliteOptionGroup}>
              <Text style={styles.groupLabelElite}>SESSION DURATION (OVERS)</Text>
              <View style={styles.oversGridElite}>
                {[5, 10, 20, 50].map(o => (
                  <TouchableOpacity
                    key={o}
                    style={[styles.overBoxElite, overs === o && styles.overBoxActive]}
                    onPress={() => setOvers(o)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.overValElite, overs === o && styles.overValActive]}>{o}</Text>
                    <Text style={[styles.overSubElite, overs === o && styles.overSubActive]}>OV</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.eliteOptionGroup}>
              <Text style={styles.groupLabelElite}>STADIUM CONDITIONS</Text>
              <View style={styles.conditionRow}>
                <View style={styles.conditionItem}>
                  <Text style={styles.conditionLabel}>PITCH</Text>
                  <View style={styles.pillRow}>
                    {['HARD', 'GREEN', 'DUSTY'].map(p => (
                      <TouchableOpacity key={p} onPress={() => setPitch(p)} style={[styles.pill, pitch === p && styles.pillActive]}>
                        <Text style={[styles.pillText, pitch === p && styles.pillTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.conditionItem}>
                  <Text style={styles.conditionLabel}>BALL</Text>
                  <View style={styles.pillRow}>
                    {['LEATHER', 'TENNIS'].map(b => (
                      <TouchableOpacity key={b} onPress={() => setBall(b)} style={[styles.pill, ball === b && styles.pillActive]}>
                        <Text style={[styles.pillText, ball === b && styles.pillTextActive]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>MATCH TICKET VERIFICATION</Text>
            <View style={styles.ticketCard}>
              <View style={[styles.ticketInner, { backgroundColor: theme.colors.surfaceAlt }]}>
                <View style={styles.ticketHeader}>
                  <View>
                    <Text style={styles.ticketBranding}>LAZYCRIC PRO</Text>
                    <Text style={styles.ticketMatchId}>SID-{matchId.split('_')[1] || 'LIVE'}</Text>
                  </View>
                  <View style={styles.broadcastBadge}>
                    <View style={styles.broadcastDot} />
                    <Text style={styles.broadcastText}>READY</Text>
                  </View>
                </View>

                <View style={styles.ticketMain}>
                  <View style={styles.ticketTeamBox}>
                    <Text style={styles.ticketTeamName}>{(team1Name || 'TEAM A').toUpperCase()}</Text>
                    <Text style={styles.ticketTeamRole}>HOME</Text>
                  </View>
                  <View style={styles.ticketVSBox}>
                    <Text style={styles.ticketVSText}>VS</Text>
                  </View>
                  <View style={styles.ticketTeamBox}>
                    <Text style={[styles.ticketTeamName, { textAlign: 'right' }]}>{(team2Name || 'TEAM B').toUpperCase()}</Text>
                    <Text style={[styles.ticketTeamRole, { textAlign: 'right' }]}>AWAY</Text>
                  </View>
                </View>

                <View style={styles.ticketDividerRow}>
                  <View style={styles.ticketCut} />
                  <View style={styles.ticketDash} />
                  <View style={[styles.ticketCut, styles.ticketCutRight]} />
                </View>

                <View style={styles.ticketFooter}>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerLab}>FORMAT</Text>
                    <Text style={styles.footerVal}>{matchType}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerLab}>OVERS</Text>
                    <Text style={styles.footerVal}>{overs}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerLab}>PITCH</Text>
                    <Text style={styles.footerVal}>{pitch}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerLab}>BALL</Text>
                    <Text style={styles.footerVal}>{ball.charAt(0)}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>* All parameters are synced to the cloud for real-time viewer access.</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.surfaceAlt]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => step > 1 ? setStep(step - 1) : (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.backBtn}
            >
              <Text style={styles.backIcon}>{step > 1 ? '←' : '✕'}</Text>
            </TouchableOpacity>
            <View style={styles.progressWrapper}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.stepCounter}>
                STEP 0{step} <Text style={{ color: theme.colors.textMuted }}>/ 03</Text>
              </Text>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.titleSection}>
                <Text style={styles.mainTitle}>MATCH SETUP</Text>
                <Text style={styles.mainSub}>ELITE CONFIGURATION PANEL</Text>
              </View>

              {renderStep()}
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleProceed}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View
                style={[styles.btnInner, { backgroundColor: theme.colors.accent }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={[styles.btnText, { color: '#FFF' }]}>{step === 3 ? 'INITIALIZE ENGINE' : 'CONTINUE'}</Text>
                    <Text style={[styles.btnIcon, { color: '#FFF' }]}>→</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  header: { padding: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  backIcon: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  progressWrapper: { flex: 1, marginLeft: 20 },
  progressBar: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: theme.colors.accent },
  stepCounter: { fontSize: 8, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2, textTransform: 'uppercase' },
  scroll: { flexGrow: 1, paddingBottom: 60 },
  titleSection: { paddingHorizontal: 24, marginBottom: 20 },
  mainTitle: { fontSize: 24, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 },
  mainSub: { fontSize: 7, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' },
 
  stepContainer: { paddingHorizontal: 24, gap: 16 },
  sectionTitle: { fontSize: 8, fontWeight: '900', color: theme.colors.accent, letterSpacing: 3, marginBottom: 4, textTransform: 'uppercase' },
 
  tourSelector: { flexDirection: 'row', marginBottom: 12 },
  tourChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  tourChipActive: { backgroundColor: 'rgba(162, 28, 60, 0.05)', borderColor: theme.colors.accent },
  tourChipText: { fontSize: 9, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1 },
  tourChipTextActive: { color: theme.colors.accent },
 
  squadInputsCompact: { gap: 8 },
  slimInputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  slimLabel: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1.5 },
  slimInput: { fontSize: 18, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  vsCompactRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  vsLinePro: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  vsChipPro: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border, marginHorizontal: 16 },
  vsTextPro: { fontSize: 10, fontWeight: '900', color: theme.colors.accent, letterSpacing: 1.5 },
 
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent },
  eliteOptionGroup: { marginBottom: 24 },
  groupLabelElite: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 2.5, marginBottom: 12, textTransform: 'uppercase' },
  eliteGrid: { flexDirection: 'row', gap: 10 },
  eliteChip: { flex: 1, height: 44, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  eliteChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  eliteChipText: { fontSize: 10, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1 },
  eliteChipTextActive: { color: '#FFF' },
  activeIndicator: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
 
  oversGridElite: { flexDirection: 'row', gap: 10 },
  overBoxElite: { flex: 1, height: 64, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  overBoxActive: { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent, borderWidth: 2 },
  overValElite: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
  overValActive: { color: theme.colors.accent },
  overSubElite: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1 },
  overSubActive: { color: theme.colors.accent },
 
  conditionRow: { flexDirection: 'row', gap: 12 },
  conditionItem: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  conditionLabel: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  pillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pillText: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted },
  pillTextActive: { color: '#FFF' },
 
  ticketCard: { borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  ticketInner: { padding: 32 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  ticketBranding: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 3 },
  ticketMatchId: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, marginTop: 4 },
  broadcastBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  broadcastDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#10B981' },
  broadcastText: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: '#10B981', letterSpacing: 0.5 },
  ticketMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  ticketTeamBox: { flex: 1 },
  ticketTeamName: { fontSize: 18, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, letterSpacing: -0.5 },
  ticketTeamRole: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  ticketVSBox: { width: 40, alignItems: 'center' },
  ticketVSText: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted },
  ticketDividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -32, marginBottom: 32 },
  ticketCut: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.background, marginLeft: -10 },
  ticketCutRight: { marginLeft: 0, marginRight: -10 },
  ticketDash: { flex: 1, height: 1, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerItem: { alignItems: 'center' },
  footerLab: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, marginBottom: 4, letterSpacing: 1 },
  footerVal: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text },
 
  footer: { padding: 24 },
  primaryBtn: { height: 72, borderRadius: 24, overflow: 'hidden' },
  btnInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  btnText: { color: '#000', fontSize: 16, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1, textTransform: 'uppercase' },
  btnIcon: { color: '#000', fontSize: 18, fontFamily: theme.typography.fontFamily.bold },
  disabledBtn: { opacity: 0.5 },
 
  hintBox: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hintText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
});
