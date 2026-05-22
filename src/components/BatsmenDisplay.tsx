import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { getSRClass } from '../lib/scoringEngine';

interface BatsmanStats {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isStriker: boolean;
  how?: string;
}

interface BatsmenDisplayProps {
  striker: BatsmanStats;
  nonStriker: BatsmanStats;
  dismissed?: BatsmanStats[];
  onSwap: () => void;
  partnership: { runs: number; balls: number };
}

export const BatsmenDisplay: React.FC<BatsmenDisplayProps> = ({ 
  striker, nonStriker, dismissed = [], onSwap, partnership 
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const getSRColor = (sr: number) => {
    const cls = getSRClass(sr);
    if (cls === 'good') return theme.colors.success;
    if (cls === 'average') return theme.colors.warning;
    return theme.colors.danger;
  };

  const renderPlayer = (p: BatsmanStats, key: string) => {
    const sr = p.balls > 0 ? parseFloat(((p.runs / p.balls) * 100).toFixed(1)) : 0;
    return (
      <View 
        key={key}
        style={[styles.playerRow, p.isStriker && styles.activeRow]} 
      >
        <View style={styles.nameCol}>
          <Text style={[styles.playerName, !p.isStriker && styles.inactiveText]} numberOfLines={1}>
            {p.name}{p.isStriker ? ' *' : ''}
          </Text>
        </View>
        <View style={styles.statsCols}>
           <Text style={[styles.statText, styles.runsCol, !p.isStriker && styles.inactiveText]}>{p.runs}</Text>
           <Text style={[styles.statText, styles.ballsCol, styles.mutedText]}>{p.balls}</Text>
           <Text style={[styles.statText, styles.foursCol, styles.mutedText]}>{p.fours}</Text>
           <Text style={[styles.statText, styles.sixesCol, styles.mutedText]}>{p.sixes}</Text>
           <Text style={[styles.statText, styles.srCol, { color: getSRColor(sr) }]}>{sr.toFixed(1)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.bentoBox}>
        <View style={styles.tableHeader}>
          <Text style={styles.headerLabel}>BATTER STATS</Text>
          <View style={styles.statsCols}>
            <Text style={[styles.headerLabel, styles.runsCol]}>R</Text>
            <Text style={[styles.headerLabel, styles.ballsCol]}>B</Text>
            <Text style={[styles.headerLabel, styles.foursCol]}>4s</Text>
            <Text style={[styles.headerLabel, styles.sixesCol]}>6s</Text>
            <Text style={[styles.headerLabel, styles.srCol]}>SR</Text>
          </View>
        </View>
        
        {renderPlayer(striker, 'striker')}
        <View style={styles.rowDivider} />
        {renderPlayer(nonStriker, 'non-striker')}

        {/* Partnership Card */}
        <View style={styles.partnershipCard}>
          <LinearGradient 
            colors={['rgba(255,255,255,0.02)', 'transparent']} 
            style={styles.partnershipInner}
            start={{x:0, y:0}}
            end={{x:1, y:0}}
          >
            <View style={styles.pLabelRow}>
              <View style={styles.pDot} />
              <Text style={styles.partnershipLabel}>STRIKE FORCE PARTNERSHIP</Text>
            </View>
            <View style={styles.partnershipStats}>
              <Text style={styles.partnershipRuns}>{partnership.runs}</Text>
              <Text style={styles.partnershipBalls}>({partnership.balls})</Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      <TouchableOpacity onPress={onSwap} style={styles.swapBtn}>
         <Text style={styles.swapText}>ROTATE STRIKE ⟲</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { marginBottom: 20 },
  bentoBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  activeRow: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  nameCol: {
    flex: 1,
    justifyContent: 'center',
  },
  playerName: {
    color: theme.colors.text,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  inactiveText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  statsCols: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statText: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'center',
    color: theme.colors.text,
  },
  runsCol: { width: 28 },
  ballsCol: { width: 28 },
  foursCol: { width: 28 },
  sixesCol: { width: 28 },
  srCol: { width: 50, textAlign: 'right' },
  mutedText: { color: theme.colors.textMuted, fontWeight: '700' },
  partnershipCard: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  partnershipInner: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  partnershipLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 2,
  },
  partnershipStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  partnershipRuns: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.manrope,
    color: theme.colors.text,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  partnershipBalls: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  swapBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapText: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
