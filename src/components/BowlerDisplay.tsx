import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { getERClass } from '../lib/scoringEngine';

interface BowlerStats {
  id: string;
  name: string;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
}

interface BowlerDisplayProps {
  bowlers: BowlerStats[];
  currentBowlerId?: string;
}

export const BowlerDisplay: React.FC<BowlerDisplayProps> = ({ bowlers = [], currentBowlerId }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const getERColor = (er: number) => {
    const cls = getERClass(er);
    if (cls === 'good') return theme.colors.success;
    if (cls === 'average') return theme.colors.warning;
    return theme.colors.danger;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>BOWLER</Text>
        <View style={styles.statsHeader}>
          <Text style={[styles.headerLabel, styles.statCol]}>O</Text>
          <Text style={[styles.headerLabel, styles.statCol]}>M</Text>
          <Text style={[styles.headerLabel, styles.statCol]}>R</Text>
          <Text style={[styles.headerLabel, styles.statCol]}>W</Text>
          <Text style={[styles.headerLabel, styles.erCol]}>ER</Text>
        </View>
      </View>

      {bowlers.map((b, i) => {
        const oversStr = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;
        const totalOvers = b.balls / 6;
        const er = totalOvers > 0 ? parseFloat((b.runs / totalOvers).toFixed(2)) : 0;
        const isCurrent = b.id === currentBowlerId;

        return (
          <View key={b.id || i} style={[styles.bowlerRow, isCurrent && styles.activeRow]}>
            <View style={styles.nameCol}>
              <Text style={[styles.bowlerName, isCurrent && styles.activeText]}>
                {b.name}{isCurrent ? ' ▼' : ''}
              </Text>
            </View>
            <View style={styles.statsSection}>
              <Text style={[styles.statValue, styles.statCol]}>{oversStr}</Text>
              <Text style={[styles.statValue, styles.statCol]}>{b.maidens}</Text>
              <Text style={[styles.statValue, styles.statCol]}>{b.runs}</Text>
              <Text style={[styles.statValue, styles.statCol, { color: theme.colors.danger }]}>{b.wickets}</Text>
              <Text style={[styles.statValue, styles.erCol, { color: getERColor(er) }]}>{er.toFixed(2)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  header: {
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
  statsHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  bowlerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
  },
  activeRow: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  nameCol: {
    flex: 1,
  },
  bowlerName: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  activeText: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 16,
  },
  statCol: {
    width: 28,
    textAlign: 'center',
  },
  erCol: {
    width: 50,
    textAlign: 'right',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
  },
});
