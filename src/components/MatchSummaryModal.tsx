import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { ElitePlayerCard } from './ElitePlayerCard';
import { ManhattanChart } from './ManhattanChart';
import { TeamComparison } from './TeamComparison';
import { SocialHighlightModal } from './SocialHighlightModal';

const { width } = Dimensions.get('window');

export interface PlayerPerformance {
  id: string;
  name: string;
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wicketsTaken: number;
  runsConceded: number;
  oversBowled: number;
  maidens: number;
}

export interface InningsData {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number;
  players: PlayerPerformance[];
  history: any[];
}

interface MatchSummaryProps {
  visible: boolean;
  isFirstInningsOnly: boolean;
  innings1: InningsData;
  innings2?: InningsData;
  matchOvers: number;
  target?: number;
  onAction: () => void;
  onDownload?: () => void;
}

function calcMomScore(p: PlayerPerformance): number {
  const sr = p.ballsFaced > 0 ? (p.runsScored / p.ballsFaced) * 100 : 0;
  const srBonus = sr > 150 ? 15 : sr > 100 ? 8 : sr > 75 ? 3 : 0;
  const battingScore = p.runsScored + srBonus + p.fours * 2 + p.sixes * 4;

  const overs = p.oversBowled / 6;
  const economy = overs > 0 ? p.runsConceded / overs : 0;
  const economyBonus = economy < 5 ? 10 : economy < 7 ? 5 : 0;
  const bowlingScore = p.wicketsTaken * 25 + p.maidens * 10 + economyBonus;

  return battingScore + bowlingScore;
}

function strikeRate(runs: number, balls: number): string {
  if (balls === 0) return '—';
  return ((runs / balls) * 100).toFixed(1);
}

function economy(runs: number, balls: number): string {
  if (balls === 0) return '—';
  return ((runs / (balls / 6))).toFixed(2);
}

export const MatchSummaryModal: React.FC<MatchSummaryProps> = ({
  visible, isFirstInningsOnly, innings1, innings2, matchOvers, target, onAction, onDownload,
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [activeTab, setActiveTab] = useState(isFirstInningsOnly ? 1 : 2);
  const [isSharing, setIsSharing] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setActiveTab(isFirstInningsOnly ? 1 : 2);
      setIsSharing(false);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleDownload = async () => {
    if (isSharing || !onDownload) return;
    setIsSharing(true);
    try {
      await onDownload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSharing(false);
    }
  };

  const currentInnings = activeTab === 1 ? innings1 : (innings2 || innings1);

  if (!currentInnings || !currentInnings.history) {
    return null;
  }

  // Aggregate Stats
  const runsPerOver = Array.from({ length: matchOvers }).map((_, i) => {
    return (currentInnings.history
      .filter(b => b.over_number === i + 1)
      .reduce((sum, b) => sum + (b.runs || 0) + (b.extras || 0), 0));
  });

  const boundaries = currentInnings.history.reduce((acc, b) => {
    if (b.runs === 4 && !b.is_wicket) acc.fours++;
    if (b.runs === 6 && !b.is_wicket) acc.sixes++;
    return acc;
  }, { fours: 0, sixes: 0 });

  const dotBalls = currentInnings.history.filter(b => b.runs === 0 && !b.is_wicket && !b.is_wide && !b.is_no_ball).length;
  const extras = currentInnings.history.reduce((sum, b) => sum + (b.extras || 0), 0);

  // MVP Calculation (from all available players)
  const allPlayers = [
    ...(innings1?.players || []), 
    ...(innings2?.players || [])
  ];
  
  const ranked = allPlayers.length > 0 
    ? allPlayers.sort((a, b) => calcMomScore(b) - calcMomScore(a))
    : [];
    
  const mom = ranked.length > 0 ? ranked[0] : null;

  const isWon = !isFirstInningsOnly && target !== undefined && (innings2?.runs || 0) >= target;
  const resultText = isFirstInningsOnly
    ? `TARGET: ${innings1.runs + 1}`
    : isWon
      ? `${innings2?.battingTeam} WON BY ${10 - (innings2?.wickets || 0)} WICKETS`
      : `${innings1.battingTeam} WON BY ${target! - (innings2?.runs || 0)} RUNS`;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.sheet, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={[theme.colors.background, '#020617']} style={StyleSheet.absoluteFillObject} />

          {/* Consolidated Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerLabel}>MATCH SUMMARY</Text>
              <TouchableOpacity 
                onPress={handleDownload} 
                style={[styles.downloadBtn, isSharing && { opacity: 0.5 }]}
                disabled={isSharing}
              >
                <Text style={styles.downloadText}>{isSharing ? '...' : 'PRO PDF'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.matchScores}>
              <View style={styles.teamScoreBox}>
                <Text style={styles.teamNameShort}>{innings1?.battingTeam || '---'}</Text>
                <Text style={styles.teamScoreVal}>{innings1 ? `${innings1.runs}/${innings1.wickets}` : '0/0'}</Text>
                <Text style={styles.teamOverVal}>{innings1 ? `${Math.floor(innings1.balls / 6)}.${innings1.balls % 6} ov` : '0.0 ov'}</Text>
              </View>
              <View style={styles.vsCircle}><Text style={styles.vsText}>VS</Text></View>
              <View style={styles.teamScoreBox}>
                <Text style={styles.teamNameShort}>{innings2?.battingTeam || 'TBD'}</Text>
                <Text style={styles.teamScoreVal}>{innings2 ? `${innings2.runs}/${innings2.wickets}` : '—'}</Text>
                <Text style={styles.teamOverVal}>{innings2 ? `${Math.floor(innings2.balls / 6)}.${innings2.balls % 6} ov` : '—'}</Text>
              </View>
            </View>

            <View style={[styles.resultBanner, !isFirstInningsOnly && styles.resultBannerActive]}>
              <Text style={styles.resultText}>{resultText.toUpperCase()}</Text>
            </View>
          </View>

          {/* Tab Switcher */}
          {!isFirstInningsOnly && innings2 && (
            <View style={styles.tabs}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 1 && styles.tabActive]} 
                onPress={() => setActiveTab(1)}
              >
                <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>1ST INNINGS</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 2 && styles.tabActive]} 
                onPress={() => setActiveTab(2)}
              >
                <Text style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}>2ND INNINGS</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* MVP Section */}
            {mom && !isFirstInningsOnly && (
              <ElitePlayerCard 
                name={mom.name} 
                stats={`${mom.runsScored > 0 ? `${mom.runsScored} RUNS` : ''}${mom.runsScored > 0 && mom.wicketsTaken > 0 ? ' & ' : ''}${mom.wicketsTaken > 0 ? `${mom.wicketsTaken} WKTS` : ''}`}
                subStats={`STRIKE RATE: ${strikeRate(mom.runsScored, mom.ballsFaced)} | ECONOMY: ${economy(mom.runsConceded, mom.oversBowled)}`}
              />
            )}

            <ManhattanChart teamARunsPerOver={runsPerOver} maxOvers={matchOvers} />

            <TeamComparison 
              teamAName={currentInnings.battingTeam}
              teamBName={currentInnings.bowlingTeam}
              stats={[
                { label: 'FOURS (4s)', teamAVal: boundaries.fours, teamBVal: 0 },
                { label: 'SIXES (6s)', teamAVal: boundaries.sixes, teamBVal: 0 },
                { label: 'DOT BALLS', teamAVal: dotBalls, teamBVal: 0 },
                { label: 'EXTRAS', teamAVal: extras, teamBVal: 0 },
              ]}
            />

            {/* Detailed Table */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{(currentInnings?.battingTeam || '').toUpperCase()} BATTING</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tdName, styles.thText]}>BATSMAN</Text>
                  <Text style={[styles.tdStat, styles.thText]}>R(B)</Text>
                  <Text style={[styles.tdSR, styles.thText]}>4s/6s</Text>
                  <Text style={[styles.tdSR, styles.thText]}>SR</Text>
                </View>
                {(currentInnings?.players || []).filter(p => p.ballsFaced > 0).map(p => (
                  <View key={p.id} style={styles.tableRow}>
                    <Text style={styles.tdName}>{p.name}</Text>
                    <Text style={styles.tdStat}>{p.runsScored}({p.ballsFaced})</Text>
                    <Text style={styles.tdSR}>{p.fours}/{p.sixes}</Text>
                    <Text style={styles.tdSR}>{strikeRate(p.runsScored, p.ballsFaced)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{(currentInnings?.bowlingTeam || '').toUpperCase()} BOWLING</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tdName, styles.thText]}>BOWLER</Text>
                  <Text style={[styles.tdStat, styles.thText]}>O-M-R-W</Text>
                  <Text style={[styles.tdSR, styles.thText]}>ECON</Text>
                </View>
                {(currentInnings?.players || []).filter(p => p.oversBowled > 0).map(p => (
                  <View key={p.id} style={styles.tableRow}>
                    <Text style={styles.tdName}>{p.name}</Text>
                    <Text style={styles.tdStat}>{Math.floor(p.oversBowled/6)}.{p.oversBowled%6}-{p.maidens}-{p.runsConceded}-{p.wicketsTaken}</Text>
                    <Text style={styles.tdSR}>{economy(p.runsConceded, p.oversBowled)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onAction} style={styles.mainAction}>
              <LinearGradient colors={[theme.colors.accent, theme.colors.accentSecondary]} style={styles.actionInner}>
                <Text style={styles.actionText}>
                  {isFirstInningsOnly ? 'PREPARE 2ND INNINGS' : 'CLOSE SUMMARY'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {!isFirstInningsOnly && (
              <TouchableOpacity onPress={() => setShowHighlight(true)} style={styles.storyAction}>
                <Text style={styles.storyActionText}>📲 GENERATE SOCIAL HIGHLIGHT</Text>
              </TouchableOpacity>
            )}
          </View>

          <SocialHighlightModal 
            visible={showHighlight}
            onClose={() => setShowHighlight(false)}
            innings1={innings1}
            innings2={innings2}
            winner={resultText}
            mvp={mom ? { name: mom.name, runs: mom.runsScored, wickets: mom.wicketsTaken } : undefined}
          />
        </Animated.View>

        {isSharing && (
          <View style={styles.loadingOverlay}>
            <LinearGradient colors={['rgba(15, 23, 42, 0.9)', '#020617']} style={StyleSheet.absoluteFillObject} />
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>ASSEMBLING ELITE REPORT...</Text>
            <Text style={styles.loadingSub}>LAZYCRIC PROTOCOL v2.5</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxHeight: '92%', backgroundColor: theme.colors.background, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.glassBorder },
  header: { padding: 24, borderBottomWidth: 1, borderBottomColor: theme.colors.glassBorder },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLabel: { fontSize: 10, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 2 },
  downloadBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  downloadText: { fontSize: 9, fontWeight: '900', color: theme.colors.accent },
  matchScores: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamScoreBox: { alignItems: 'center', flex: 1 },
  teamNameShort: { fontSize: 12, fontWeight: '800', color: theme.colors.textMuted, marginBottom: 4 },
  teamScoreVal: { fontSize: 28, fontWeight: '900', color: theme.colors.text },
  teamOverVal: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  vsCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  vsText: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted },
  resultBanner: { marginTop: 24, paddingVertical: 8, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)' },
  resultBannerActive: { backgroundColor: 'rgba(72, 187, 120, 0.1)', borderWidth: 1, borderColor: 'rgba(72, 187, 120, 0.2)' },
  resultText: { fontSize: 11, fontWeight: '900', color: theme.colors.accent, letterSpacing: 1 },
  tabs: { flexDirection: 'row', padding: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.05)' },
  tabText: { fontSize: 10, fontWeight: '900', color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.text },
  scroll: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 9, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  table: { gap: 1 },
  tableHeader: { borderBottomWidth: 2, borderBottomColor: theme.colors.accent + '40', paddingVertical: 8 },
  thText: { fontSize: 8, fontWeight: '900', color: theme.colors.accent, letterSpacing: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.glassBorder, alignItems: 'center' },
  tdName: { flex: 1, fontSize: 14, fontWeight: '800', color: theme.colors.text },
  tdStat: { fontSize: 14, fontWeight: '900', color: theme.colors.accent, marginRight: 16 },
  tdSR: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: theme.colors.glassBorder },
  mainAction: { height: 56, borderRadius: 20, overflow: 'hidden' },
  storyAction: { marginTop: 12, height: 44, borderRadius: 12, backgroundColor: 'rgba(217, 70, 239, 0.1)', borderWidth: 1, borderColor: 'rgba(217, 70, 239, 0.2)', alignItems: 'center', justifyContent: 'center' },
  storyActionText: { fontSize: 10, fontWeight: '900', color: '#D946EF', letterSpacing: 1 },
  actionInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 1 },
  loadingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: { 
    marginTop: 20, 
    fontSize: 12, 
    fontWeight: '900', 
    color: theme.colors.accent, 
    letterSpacing: 2 
  },
  loadingSub: { 
    fontSize: 8, 
    fontWeight: '800', 
    color: 'rgba(255,255,255,0.4)', 
    marginTop: 8, 
    letterSpacing: 1 
  },
});
