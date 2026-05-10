import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface BallButtonsProps {
  onBall: (result: string) => void;
  onWicket: () => void;
  onExtra: (type: string) => void;
  onUndo: () => void;
  onSwap: () => void;
}

export const BallButtons: React.FC<BallButtonsProps> = ({ 
  onBall, onWicket, onExtra, onUndo, onSwap
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const renderRunBtn = (val: string, label: string, isDot = false) => (
    <TouchableOpacity 
      style={[styles.runBtn, isDot && styles.dotBtn]} 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onBall(val === '•' ? '0' : val);
      }}
      activeOpacity={0.6}
    >
      <Text style={[styles.runText, isDot && styles.dotText]}>{val}</Text>
    </TouchableOpacity>
  );

  const renderBoundaryBtn = (val: string, color: string, onPress: () => void) => (
    <TouchableOpacity 
      style={[styles.boundaryBtn, { borderColor: color + '40' }]} 
      onPress={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPress();
      }}
      activeOpacity={0.6}
    >
      <LinearGradient
        colors={[color + '20', color + '05']}
        style={styles.boundaryGradient}
      >
        <Text style={[styles.boundaryText, { color }]}>{val}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.consoleHeader}>
        <View style={styles.indicator} />
        <Text style={styles.consoleTitle}>DELIVERY CONTROL</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionBtn} 
            onPress={() => {
              Haptics.selectionAsync();
              onSwap();
            }}
          >
            <Text style={styles.headerActionText}>SWAP ⇄</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerActionBtn, styles.undoBtn]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onUndo();
            }}
          >
            <Text style={styles.headerActionText}>UNDO ↩</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary Actions Row (4, 6, W) */}
      <View style={styles.mainRow}>
        {renderBoundaryBtn('4', theme.colors.success, () => onBall('4'))}
        {renderBoundaryBtn('6', theme.colors.accent, () => onBall('6'))}
        {renderBoundaryBtn('W', theme.colors.danger, onWicket)}
      </View>

      {/* Runs Row */}
      <View style={styles.runsRow}>
        {renderRunBtn('•', 'DOT', true)}
        {renderRunBtn('1', '1')}
        {renderRunBtn('2', '2')}
        {renderRunBtn('3', '3')}
      </View>

      {/* Extras Grid */}
      <View style={styles.extrasGrid}>
        <TouchableOpacity 
          style={styles.extraBtn} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onExtra('Wd');
          }}
        >
          <Text style={styles.extraText}>WIDE</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.extraBtn} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onExtra('NB');
          }}
        >
          <Text style={styles.extraText}>NO BALL</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.extraBtn} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onExtra('Byes');
          }}
        >
          <Text style={styles.extraText}>BYE</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.extraBtn} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onExtra('Leg Byes');
          }}
        >
          <Text style={styles.extraText}>LEG BYE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { 
    backgroundColor: '#0f172a',
    borderRadius: 28,
    padding: 16,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
    marginRight: 10,
    shadowColor: theme.colors.success,
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  consoleTitle: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: theme.typography.letterSpacing.extraWide,
    flex: 1,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  undoBtn: {
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  headerActionText: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
  },
  mainRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  boundaryBtn: {
    flex: 1,
    height: theme.buttons.height,
    borderRadius: theme.buttons.borderRadius,
    borderWidth: 1,
    overflow: 'hidden',
  },
  boundaryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boundaryText: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  runsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  runBtn: {
    flex: 1,
    height: theme.buttons.height - 4,
    borderRadius: theme.buttons.borderRadius - 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  runText: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
  },
  dotText: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.2)',
  },
  extrasGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  extraBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: {
    fontSize: theme.typography.size.xs - 2,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
