import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';

interface WagonWheelModalProps {
  visible: boolean;
  onSelect: (direction: string) => void;
}

const DIRECTIONS = [
  { id: 'long_on', label: 'Long On', pos: { top: '10%', left: '30%' } },
  { id: 'long_off', label: 'Long Off', pos: { top: '10%', right: '30%' } },
  { id: 'mid_wicket', label: 'Mid Wicket', pos: { top: '40%', left: '5%' } },
  { id: 'cover', label: 'Cover', pos: { top: '40%', right: '5%' } },
  { id: 'square_leg', label: 'Sq. Leg', pos: { bottom: '20%', left: '10%' } },
  { id: 'point', label: 'Point', pos: { bottom: '20%', right: '10%' } },
  { id: 'fine_leg', label: 'Fine Leg', pos: { bottom: '5%', left: '40%' } },
  { id: 'third_man', label: '3rd Man', pos: { bottom: '5%', right: '40%' } },
];

export const WagonWheelModal: React.FC<WagonWheelModalProps> = ({ visible, onSelect }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Where was it hit?</Text>
          <Text style={styles.subtitle}>Tap the direction of the shot</Text>
          
          <View style={styles.fieldContainer}>
            <View style={styles.pitch} />
            {DIRECTIONS.map(d => (
              <TouchableOpacity 
                key={d.id} 
                style={[styles.dirBtn, d.pos as any]} 
                onPress={() => onSelect(d.id)}
              >
                <Text style={styles.dirText}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={() => onSelect('none')}>
            <Text style={styles.skipText}>Skip Direction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  content: { backgroundColor: theme.colors.surface, borderRadius: 32, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 22, fontWeight: '900', color: theme.colors.text, marginBottom: 4 },
  subtitle: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 30 },
  fieldContainer: { width: '100%', height: 350, backgroundColor: 'rgba(0,245,160,0.05)', borderRadius: 175, borderWidth: 2, borderColor: 'rgba(0,245,160,0.2)', position: 'relative', overflow: 'hidden', borderStyle: 'dashed' },
  pitch: { position: 'absolute', top: '35%', left: '45%', width: '10%', height: '30%', backgroundColor: 'rgba(253,200,48,0.2)', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(253,200,48,0.3)' },
  dirBtn: { position: 'absolute', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  dirText: { fontSize: 10, fontWeight: '800', color: theme.colors.accent },
  skipBtn: { marginTop: 30, padding: 12 },
  skipText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
});
