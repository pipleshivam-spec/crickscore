import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, FlatList, ScrollView } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface BowlerModalProps {
  visible: boolean;
  onSelect: (bowler: { name: string, id?: string }) => void;
  previousBowlerId?: string;
  availableBowlers?: any[];
  onClose?: () => void;
}

export const BowlerModal: React.FC<BowlerModalProps> = ({ 
  visible, onSelect, previousBowlerId, availableBowlers = [], onClose
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [name, setName] = useState('');

  const handleSelect = (bowler?: any) => {
    if (bowler) {
      if (bowler.id === previousBowlerId) return;
      onSelect({ name: bowler.name, id: bowler.id });
    } else {
      if (!name.trim()) return;
      onSelect({ name: name.trim() });
    }
    setName('');
  };

  const renderBowlerItem = ({ item }: { item: any }) => {
    const isPrevious = item.id === previousBowlerId;
    return (
      <TouchableOpacity 
        style={[styles.bowlerCard, isPrevious && styles.disabledCard]} 
        onPress={() => handleSelect(item)}
        disabled={isPrevious}
      >
        <View style={[styles.avatarCircle, { backgroundColor: isPrevious ? theme.colors.surfaceAlt : theme.colors.accent + '15' }]}>
          <Text style={[styles.avatarText, { color: isPrevious ? theme.colors.textMuted : theme.colors.accent }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.bowlerName, isPrevious && styles.mutedText]} numberOfLines={1}>{item.name}</Text>
        {isPrevious && <Text style={styles.prevLabel}>PREV OVER</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.overlay}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerTitleRow}>
              <Text style={styles.title}>SELECT BOWLER</Text>
              {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.subtitle}>WHO WILL BOWL THE NEXT OVER?</Text>
          </View>
          
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContainer}
          >
            {availableBowlers.length > 0 && (
              <View style={styles.listSection}>
                <Text style={styles.label}>RECENT BOWLERS</Text>
                <FlatList
                  data={availableBowlers}
                  renderItem={renderBowlerItem}
                  keyExtractor={(item, index) => item.id || index.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            )}

            <View style={styles.inputSection}>
              <Text style={styles.label}>OR ADD NEW BOWLER</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="ENTER NAME"
                  placeholderTextColor={theme.colors.textMuted + '80'}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.btn, !name.trim() && styles.disabled]} 
              onPress={() => handleSelect()}
              disabled={!name.trim()}
            >
              <LinearGradient 
                colors={[theme.colors.accent, theme.colors.accentSecondary || theme.colors.accent]} 
                style={styles.btnInner}
                start={{x:0, y:0}}
                end={{x:1, y:1}}
              >
                <Text style={styles.btnText}>START OVER ▶</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
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
    paddingHorizontal: 24, 
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1, 
    borderColor: theme.colors.border,
    maxHeight: '90%',
  },
  header: { alignItems: 'center', marginBottom: 16 },
  handle: { width: 40, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginBottom: 16 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' },
  title: { fontSize: 22, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2 },
  closeBtn: { position: 'absolute', right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  closeBtnText: { color: theme.colors.text, fontSize: 12, fontWeight: '900' },
  subtitle: { fontSize: 9, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1.5, marginTop: 4 },
  scrollContainer: { paddingBottom: 16 },
  listSection: { marginBottom: 24 },
  label: { fontSize: 9, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1.5, marginBottom: 12 },
  listContent: { gap: 12, paddingRight: 32 },
  bowlerCard: {
    width: 90,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disabledCard: {
    opacity: 0.5,
    backgroundColor: theme.colors.surfaceAlt,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
  },
  bowlerName: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  mutedText: {
    color: theme.colors.textMuted,
  },
  prevLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: theme.colors.danger,
    marginTop: 4,
  },
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
  btn: { height: 60, borderRadius: 20, overflow: 'hidden' },
  btnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  disabled: { opacity: 0.5 },
});
