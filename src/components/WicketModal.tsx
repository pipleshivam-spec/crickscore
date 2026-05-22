import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { height, width } = Dimensions.get('window');

interface WicketModalProps {
  visible: boolean;
  onConfirm: (data: any) => void;
  onCancel: () => void;
}

const DISMISSAL_TYPES = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'];

export const WicketModal: React.FC<WicketModalProps> = ({ 
  visible, onConfirm, onCancel 
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [type, setType] = useState('Bowled');
  const [fielder, setFielder] = useState('');
  const [nextBatsman, setNextBatsman] = useState('');

    const needsFielder = ['Caught', 'Run Out', 'Stumped'].includes(type);
    const isRunOut = type === 'Run Out';
    const [whoOut, setWhoOut] = useState<'striker' | 'non-striker'>('striker');

    return (
      <Modal visible={visible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <View style={styles.content}>
            <LinearGradient 
              colors={[theme.colors.danger + '20', 'transparent']} 
              style={styles.headerGlow} 
            />
            
            <View style={styles.header}>
              <View style={styles.handle} />
              <Text style={styles.title}>WICKET PROTOCOL</Text>
              <Text style={styles.subTitle}>SELECT DISMISSAL DETAILS</Text>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              <Text style={styles.label}>DISMISSAL METHOD</Text>
              <View style={styles.typeGrid}>
                {DISMISSAL_TYPES.map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.typeBtn, type === t && styles.activeTypeBtn]}
                    onPress={() => setType(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeText, type === t && styles.activeTypeText]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {isRunOut && (
                <View style={styles.inputSection}>
                  <Text style={styles.label}>WHO IS OUT?</Text>
                  <View style={styles.typeGrid}>
                    <TouchableOpacity 
                      style={[styles.typeBtn, whoOut === 'striker' && styles.activeTypeBtn]}
                      onPress={() => setWhoOut('striker')}
                    >
                      <Text style={[styles.typeText, whoOut === 'striker' && styles.activeTypeText]}>STRIKER</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.typeBtn, whoOut === 'non-striker' && styles.activeTypeBtn]}
                      onPress={() => setWhoOut('non-striker')}
                    >
                      <Text style={[styles.typeText, whoOut === 'non-striker' && styles.activeTypeText]}>NON-STRIKER</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {needsFielder && (
                <View style={styles.inputSection}>
                  <Text style={styles.label}>ASSISTING FIELDER</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="ENTER NAME"
                      placeholderTextColor={theme.colors.textMuted}
                      value={fielder}
                      onChangeText={setFielder}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputSection}>
                <Text style={styles.label}>INCOMING BATSMAN</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="ENTER NAME"
                    placeholderTextColor={theme.colors.textMuted}
                    value={nextBatsman}
                    onChangeText={setNextBatsman}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>ABORT</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, !nextBatsman && styles.disabled]} 
                onPress={() => onConfirm({ type, fielder, nextBatsman, whoOut: isRunOut ? whoOut : 'striker' })}
                disabled={!nextBatsman}
              >
                <LinearGradient 
                  colors={[theme.colors.danger, '#FF4B2B']} 
                  style={styles.confirmInner}
                  start={{x:0, y:0}}
                  end={{x:1, y:1}}
                >
                  <Text style={styles.confirmText}>CONFIRM OUT</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  content: { 
    backgroundColor: theme.colors.background, 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 32, 
    maxHeight: height * 0.85,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  handle: { width: 40, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: theme.colors.danger, letterSpacing: 2 },
  subTitle: { fontSize: 9, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 2, marginTop: 4 },
  scroll: { paddingBottom: 20 },
  label: { fontSize: 9, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1.5, marginBottom: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  typeBtn: { 
    width: (width - 84) / 2,
    paddingVertical: 14, 
    borderRadius: 16, 
    backgroundColor: theme.colors.surface, 
    borderWidth: 1, 
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  activeTypeBtn: { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.danger },
  typeText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  activeTypeText: { color: theme.colors.danger },
  inputSection: { marginBottom: 24 },
  inputWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', gap: 16, marginTop: 10 },
  cancelBtn: { 
    flex: 1, 
    height: 60, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelText: { color: theme.colors.textMuted, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  confirmBtn: { flex: 2, height: 60, borderRadius: 20, overflow: 'hidden' },
  confirmInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  disabled: { opacity: 0.5 },
});
