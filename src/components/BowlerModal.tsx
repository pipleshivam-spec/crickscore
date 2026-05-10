import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface BowlerModalProps {
  visible: boolean;
  onSelect: (bowler: { name: string, id?: string }) => void;
  previousBowlerId?: string;
  availableBowlers?: any[];
}

export const BowlerModal: React.FC<BowlerModalProps> = ({ 
  visible, onSelect, previousBowlerId, availableBowlers = []
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
        <View style={[styles.avatarCircle, { backgroundColor: isPrevious ? theme.colors.surfaceAlt : theme.colors.accent + '20' }]}>
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
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>SELECT BOWLER</Text>
            <Text style={styles.subtitle}>WHO WILL BOWL THE NEXT OVER?</Text>
          </View>
          
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
              />
            </View>
          )}

          <View style={styles.inputSection}>
            <Text style={styles.label}>OR ADD NEW BOWLER</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="ENTER NAME"
                placeholderTextColor={theme.colors.textMuted}
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
  header: { alignItems: 'center', marginBottom: 24 },
  handle: { width: 40, height: 4, backgroundColor: theme.colors.glassBorder, borderRadius: 2, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2 },
  subtitle: { fontSize: 9, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1.5, marginTop: 4 },
  listSection: { marginBottom: 32 },
  label: { fontSize: 9, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1.5, marginBottom: 16 },
  listContent: { gap: 12, paddingRight: 32 },
  bowlerCard: {
    width: 90,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
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
  inputSection: { marginBottom: 32 },
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
  btn: { height: 60, borderRadius: 20, overflow: 'hidden' },
  btnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  disabled: { opacity: 0.5 },
});
