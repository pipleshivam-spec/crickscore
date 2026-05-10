import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAppTheme } from '../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function MatchSetup() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [step, setStep] = useState(1);
  const [team1Name, setTeam1Name] = useState('Team A');
  const [team2Name, setTeam2Name] = useState('Team B');
  const [overs, setOvers] = useState(10);
  const [loading, setLoading] = useState(false);
  const [matchType, setMatchType] = useState('T20');
  const [pitch, setPitch] = useState('HARD');
  const [ball, setBall] = useState('LEATHER');

  const progress = (step / 3) * 100;

  const handleProceed = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    try {
      setLoading(true);
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert([{
          session_id: sessionId,
          team_a: team1Name,
          team_b: team2Name,
          overs: overs,
        }])
        .select()
        .single();

      if (matchError) throw matchError;

      router.push({
        pathname: '/toss',
        params: { matchId: matchData.id, team1Name, team2Name }
      });

    } catch (err: any) {
      Alert.alert('SETUP FAILED', 'Elite cloud sync error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>SQUAD INITIALIZATION</Text>
            <View style={styles.eliteInputCard}>
              <LinearGradient colors={['rgba(255,255,255,0.03)', 'transparent']} style={styles.cardGlow} />
              <View style={styles.inputHeader}>
                <View style={styles.labelGroup}>
                  <Text style={styles.eliteLabel}>PRIMARY SQUAD</Text>
                  <View style={styles.proBadge}><Text style={styles.proBadgeText}>HOME</Text></View>
                </View>
                <View style={styles.statusDot} />
              </View>
              <TextInput
                style={styles.eliteInput}
                value={team1Name}
                onChangeText={setTeam1Name}
                placeholder="ENTER TEAM NAME"
                placeholderTextColor="rgba(255,255,255,0.1)"
                selectionColor={theme.colors.accent}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.vsDividerRow}>
              <View style={styles.vsLine} />
              <View style={styles.vsCircleElite}>
                <Text style={styles.vsTextElite}>VS</Text>
              </View>
              <View style={styles.vsLine} />
            </View>

            <View style={styles.eliteInputCard}>
              <LinearGradient colors={['rgba(255,255,255,0.03)', 'transparent']} style={styles.cardGlow} />
              <View style={styles.inputHeader}>
                <View style={styles.labelGroup}>
                  <Text style={styles.eliteLabel}>OPPOSING SQUAD</Text>
                  <View style={[styles.proBadge, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.proBadgeText}>AWAY</Text></View>
                </View>
                <View style={[styles.statusDot, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
              </View>
              <TextInput
                style={styles.eliteInput}
                value={team2Name}
                onChangeText={setTeam2Name}
                placeholder="ENTER TEAM NAME"
                placeholderTextColor="rgba(255,255,255,0.1)"
                selectionColor={theme.colors.accent}
                autoCapitalize="characters"
              />
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
              <LinearGradient colors={['#0f172a', '#020617']} style={styles.ticketInner}>
                <View style={styles.ticketHeader}>
                  <View>
                    <Text style={styles.ticketBranding}>LAZYCRIC PRO</Text>
                    <Text style={styles.ticketMatchId}>ELITE-NODE-{Math.floor(Math.random() * 10000)}</Text>
                  </View>
                  <View style={styles.broadcastBadge}>
                    <View style={styles.broadcastDot} />
                    <Text style={styles.broadcastText}>READY</Text>
                  </View>
                </View>

                <View style={styles.ticketMain}>
                  <View style={styles.ticketTeamBox}>
                    <Text style={styles.ticketTeamName}>{team1Name.toUpperCase()}</Text>
                    <Text style={styles.ticketTeamRole}>HOME</Text>
                  </View>
                  <View style={styles.ticketVSBox}>
                    <Text style={styles.ticketVSText}>VS</Text>
                  </View>
                  <View style={styles.ticketTeamBox}>
                    <Text style={[styles.ticketTeamName, { textAlign: 'right' }]}>{team2Name.toUpperCase()}</Text>
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
              </LinearGradient>
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
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.background, '#000']}
        style={StyleSheet.absoluteFill}
      />

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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>MATCH SETUP</Text>
              <Text style={styles.mainSub}>ELITE CONFIGURATION PANEL</Text>
            </View>

            {renderStep()}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleProceed}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.accentSecondary]}
                style={styles.btnInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <>
                    <Text style={styles.btnText}>{step === 3 ? 'INITIALIZE ENGINE' : 'CONTINUE'}</Text>
                    <Text style={styles.btnIcon}>→</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backIcon: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  progressWrapper: { alignItems: 'flex-end', flex: 1, marginLeft: 40 },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  stepCounter: {
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    letterSpacing: 3,
    marginTop: 16,
    textTransform: 'uppercase'
  },
  scroll: { flexGrow: 1, paddingBottom: 60 },
  titleSection: { marginBottom: 56 },
  mainTitle: {
    fontSize: theme.typography.size.mega - 4,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    letterSpacing: theme.typography.letterSpacing.tight
  },
  mainSub: {
    fontSize: theme.typography.size.xs - 1,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.accent,
    letterSpacing: theme.typography.letterSpacing.extraWide + 2,
    marginTop: 12,
    textTransform: 'uppercase'
  },
  stepContainer: { flex: 1 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 4,
    marginBottom: 40,
    textTransform: 'uppercase'
  },
  teamInputWrapper: { gap: 24 },
  eliteInputCard: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 40,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden'
  },
  cardGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.1 },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  eliteLabel: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.3)', letterSpacing: 2.5, textTransform: 'uppercase' },
  eliteInput: {
    fontSize: theme.typography.size.xxl - 4,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    letterSpacing: theme.typography.letterSpacing.tight
  },
  vsDividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: -12, zIndex: 10 },
  vsLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  vsCircleElite: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20 },
  vsTextElite: { color: theme.colors.accent, fontSize: 13, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 2 },

  labelGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proBadge: { backgroundColor: 'rgba(251, 113, 133, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.2)' },
  proBadgeText: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 1 },

  eliteOptionGroup: { marginBottom: 48 },
  groupLabelElite: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 24, textTransform: 'uppercase' },
  eliteGrid: { flexDirection: 'row', gap: 12 },
  eliteChip: {
    flex: 1,
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  eliteChipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(255, 126, 95, 0.03)',
  },
  eliteChipText: { fontSize: 12, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 },
  eliteChipTextActive: { color: theme.colors.accent },
  activeIndicator: { position: 'absolute', bottom: 12, width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.accent },

  oversGridElite: { flexDirection: 'row', gap: 12 },
  overBoxElite: {
    flex: 1,
    height: 100,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.01)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  overBoxActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
  },
  overValElite: { fontSize: 32, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', letterSpacing: -1 },
  overValActive: { color: '#FFF' },
  overSubElite: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.15)', marginTop: 4, letterSpacing: 2 },
  overSubActive: { color: '#10B981' },

  conditionRow: { flexDirection: 'row', gap: 16 },
  conditionItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  conditionLabel: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  pillActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pillText: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.3)' },
  pillTextActive: { color: '#000' },

  ticketCard: { borderRadius: 48, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#000' },
  ticketInner: { padding: 40 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  ticketBranding: { fontSize: 16, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 4 },
  ticketMatchId: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', marginTop: 4 },
  broadcastBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  broadcastDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' },
  broadcastText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: '#10B981', letterSpacing: 1 },
  ticketMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
  ticketTeamBox: { flex: 1 },
  ticketTeamName: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    letterSpacing: theme.typography.letterSpacing.tight
  },
  ticketTeamRole: {
    fontSize: theme.typography.size.xs - 2,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  ticketVSBox: { width: 60, alignItems: 'center' },
  ticketVSText: { fontSize: 12, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.1)' },
  ticketDividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -40, marginBottom: 40 },
  ticketCut: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#000', marginLeft: -15 },
  ticketCutRight: { marginLeft: 0, marginRight: -15 },
  ticketDash: { flex: 1, height: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerItem: { alignItems: 'center' },
  footerLab: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', marginBottom: 6, letterSpacing: 1 },
  footerVal: { fontSize: 13, fontFamily: theme.typography.fontFamily.bold, color: '#FFF' },

  hintBox: { marginTop: 40, paddingHorizontal: 24 },
  hintText: { fontSize: 11, color: 'rgba(255,255,255,0.15)', lineHeight: 20, fontFamily: theme.typography.fontFamily.medium, textAlign: 'center', letterSpacing: 0.5 },
  footer: { paddingTop: 32 },
  primaryBtn: { height: 80, borderRadius: 32, overflow: 'hidden' },
  btnInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  btnText: {
    color: '#000',
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  btnIcon: { color: '#000', fontSize: theme.typography.size.xl, fontFamily: theme.typography.fontFamily.bold },
  disabledBtn: { opacity: 0.5 },
});
