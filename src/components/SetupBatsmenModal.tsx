import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface SetupBatsmenModalProps {
  visible: boolean;
  battingTeam: string;
  onConfirm: (striker: string, nonStriker: string) => void;
}

export const SetupBatsmenModal: React.FC<SetupBatsmenModalProps> = ({ visible, battingTeam, onConfirm }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [s, setS] = useState('');
  const [ns, setNS] = useState('');

  const handleConfirm = () => {
    if (!s.trim() || !ns.trim()) return;
    onConfirm(s.trim(), ns.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>OPENING PAIR</Text>
            <Text style={styles.subtitle}>SELECT BATSMEN FOR {battingTeam?.toUpperCase()}</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>STRIKER</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="ENTER NAME"
                placeholderTextColor={theme.colors.textMuted}
                value={s}
                onChangeText={setS}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NON-STRIKER</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="ENTER NAME"
                placeholderTextColor={theme.colors.textMuted}
                value={ns}
                onChangeText={setNS}
                autoCapitalize="words"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.btn, (!s || !ns) && styles.disabled]} 
            onPress={handleConfirm}
            disabled={!s || !ns}
          >
            <LinearGradient 
              colors={[theme.colors.accent, theme.colors.accentSecondary]} 
              style={styles.btnInner}
              start={{x:0, y:0}}
              end={{x:1, y:1}}
            >
              <Text style={styles.btnText}>START INNINGS ▶</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  content: { 
    backgroundColor: theme.colors.background, 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 32, 
    borderWidth: 1, 
    borderColor: theme.colors.glassBorder 
  },
  header: { alignItems: 'center', marginBottom: 32 },
  handle: { width: 40, height: 4, backgroundColor: theme.colors.glassBorder, borderRadius: 2, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2 },
  subtitle: { fontSize: 9, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1.5, marginTop: 4 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 9, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  inputWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  btn: { height: 60, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  btnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  disabled: { opacity: 0.5 },
});
