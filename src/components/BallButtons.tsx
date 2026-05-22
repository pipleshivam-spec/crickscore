import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

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
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 12,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.success,
    marginRight: 8,
  },
  consoleTitle: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    flex: 1,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  undoBtn: {
    borderColor: theme.colors.danger + '30',
  },
  headerActionText: {
    fontSize: 7,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  boundaryBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  boundaryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boundaryText: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: -0.5,
  },
  runsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    marginBottom: 4,
  },
  runBtn: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
  },
  runText: {
    fontSize: isSmallScreen ? 13 : 15,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  dotText: {
    fontSize: 20,
    color: theme.colors.text,
  },
  extrasGrid: {
    flexDirection: 'row',
    gap: 5,
  },
  extraBtn: {
    flex: 1,
    height: 26,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
