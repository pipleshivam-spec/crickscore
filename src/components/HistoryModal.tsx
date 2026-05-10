import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';

interface BallRecord {
  runs: number;
  is_wicket: boolean;
  is_wide: boolean;
  is_no_ball: boolean;
  over_number: number;
  ball_number: number;
  result_text: string;
}

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  history: BallRecord[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ visible, onClose, history }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Match History</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {history.length === 0 ? (
              <Text style={styles.empty}>No balls bowled yet.</Text>
            ) : (
              history.slice().reverse().map((ball, i) => (
                <View key={i} style={styles.historyRow}>
                  <Text style={styles.overLabel}>Over {ball.over_number}.{ball.ball_number}</Text>
                  <View style={[styles.resultChip, ball.is_wicket && styles.wicketChip]}>
                    <Text style={[styles.resultText, ball.is_wicket && styles.wicketText]}>
                      {ball.result_text}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  closeText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  empty: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  overLabel: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
  resultChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceAlt,
    minWidth: 40,
    alignItems: 'center',
  },
  wicketChip: {
    backgroundColor: theme.colors.danger,
  },
  resultText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  wicketText: {
    color: theme.colors.white,
  },
});
