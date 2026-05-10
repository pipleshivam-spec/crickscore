import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface OverTrackerProps {
  currentOver?: string[];
  commentary?: string[];
}

export const OverTracker: React.FC<OverTrackerProps> = ({ currentOver = [], commentary = [] }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const getBallConfig = (result: string) => {
    if (result === 'W') return { bg: theme.colors.wicket, text: '#FFF', label: 'W' };
    if (result === '6') return { bg: theme.colors.six, text: '#FFF', label: '6' };
    if (result === '4') return { bg: theme.colors.four, text: '#FFF', label: '4' };
    if (result === '3') return { bg: theme.colors.three, text: '#FFF', label: '3' };
    if (result === '2') return { bg: theme.colors.two, text: '#FFF', label: '2' };
    if (result === '1') return { bg: theme.colors.single, text: '#FFF', label: '1' };
    if (result === '0' || result === 'dot' || result === '•') return { bg: theme.colors.dot, text: '#AAA', label: '•' };
    if (result === 'Wd') return { bg: theme.colors.wide, text: '#FFF', label: 'Wd', border: '#90a4ae' };
    if (result === 'NB') return { bg: theme.colors.noball, text: '#FFF', label: 'NB', border: '#ef9a9a' };
    return { bg: theme.colors.surfaceAlt, text: theme.colors.text, label: result };
  };

  const legalBalls = currentOver.filter(b => !b.includes('Wd') && !b.includes('NB'));
  const legalBallsCount = legalBalls.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>THIS OVER</Text>
        <View style={styles.divider} />
        <Text style={styles.ballCounter}>{legalBallsCount} / 6 BALLS</Text>
      </View>
      
      <View style={styles.trackerRow}>
        {Array.from({ length: 6 }).map((_, i) => {
          const ball = legalBalls[i];
          const config = ball ? getBallConfig(ball) : null;
          
          return (
            <View key={i} style={styles.ballSlot}>
              {config ? (
                <View style={[
                  styles.ballCircle, 
                  { backgroundColor: config.bg },
                  config.border ? { borderWidth: 2, borderColor: config.border } : null
                ]}>
                  <Text style={[styles.ballText, { color: config.text }]}>{config.label}</Text>
                </View>
              ) : (
                <View style={[styles.ballCircle, styles.emptyCircle]}>
                  <View style={styles.dot} />
                </View>
              )}
              <Text style={styles.ballIndex}>{i + 1}</Text>
            </View>
          );
        })}
      </View>

      {/* Extras & Overflow Row */}
      {currentOver.length > legalBallsCount && (
        <View style={styles.extrasRow}>
          <Text style={styles.extrasLabel}>SEQUENCE: </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.extrasScroll}>
            {currentOver.map((ball, i) => {
              const config = getBallConfig(ball);
              return (
                <View key={i} style={[styles.miniBall, { backgroundColor: config.bg }]}>
                  <Text style={styles.miniText}>{config.label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { 
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.glassBorder,
  },
  ballCounter: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  trackerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center' 
  },
  ballSlot: {
    alignItems: 'center',
    gap: 8,
  },
  ballCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  ballText: { 
    fontSize: 14, 
    fontWeight: '900',
  },
  emptyCircle: { 
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.3,
  },
  dot: { 
    width: 4, 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: theme.colors.textMuted,
  },
  ballIndex: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  extrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    gap: 12,
  },
  extrasLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  extrasScroll: {
    gap: 8,
    paddingRight: 16,
  },
  miniBall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
});
