import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme, THEME_PRESETS, ThemeId } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

interface ProfileSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  visible, onClose,
}) => {
  const { theme, themeId, setTheme } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>PRO SETTINGS</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.colors.textMuted, fontWeight: '900' }}>DONE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }]}>
                <Text style={[styles.avatarText, { color: theme.colors.accent }]}>SC</Text>
              </View>
              <View>
                <Text style={[styles.userName, { color: theme.colors.text }]}>SCORE COMMANDER</Text>
                <Text style={[styles.userRole, { color: theme.colors.textMuted }]}>Pro Scoring License</Text>
              </View>
            </View>

            {/* Theme Engine */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>🎨 VISUAL THEME ENGINE</Text>
              <View style={styles.swatchGrid}>
                {(Object.keys(THEME_PRESETS) as ThemeId[]).map((id) => {
                  const preset = THEME_PRESETS[id];
                  const isActive = themeId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.swatchBtn, 
                        isActive && { borderColor: preset.swatch, backgroundColor: preset.swatch + '10' }
                      ]}
                      onPress={() => setTheme(id)}
                    >
                      <View style={[styles.swatch, { backgroundColor: preset.swatch }]} />
                      <View style={styles.swatchInfo}>
                        <Text style={[styles.swatchName, { color: theme.colors.text }, isActive && { color: preset.swatch }]}>
                          {preset.label}
                        </Text>
                        <Text style={styles.swatchStatus}>
                          {isActive ? 'ACTIVE' : 'SELECT'}
                        </Text>
                      </View>
                      {isActive && <View style={[styles.activeIndicator, { backgroundColor: preset.swatch }]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* App Info */}
            <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>LazyCric Pro v2.4.0</Text>
              <Text style={[styles.infoSub, { color: theme.colors.textMuted }]}>
                Offline-First Event Sourcing Engine Ready
              </Text>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%', height: '80%',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { padding: 8 },
  content: { padding: 24 },
  profileSection: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: { fontSize: 24, fontWeight: '900' },
  userName: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  userRole: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 16 },
  swatchGrid: { gap: 12 },
  swatchBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  swatch: { width: 44, height: 44, borderRadius: 12 },
  swatchInfo: { flex: 1, marginLeft: 16 },
  swatchName: { fontSize: 14, fontWeight: '800' },
  swatchStatus: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginTop: 4, letterSpacing: 1 },
  activeIndicator: { width: 6, height: 6, borderRadius: 3, position: 'absolute', right: 20 },
  infoBox: { padding: 20, borderRadius: 20, alignItems: 'center' },
  infoTitle: { fontSize: 13, fontWeight: '800' },
  infoSub: { fontSize: 9, fontWeight: '700', marginTop: 4 },
});
