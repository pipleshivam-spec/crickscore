import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';

interface CommentaryItem {
  over: string;
  text: string;
}

interface CommentaryFeedProps {
  commentary: CommentaryItem[];
}

export const CommentaryFeed: React.FC<CommentaryFeedProps> = ({ commentary = [] }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>COMMENTARY FEED</Text>
      <ScrollView 
        style={styles.feed} 
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
      >
        {commentary.map((item, i) => (
          <View key={i} style={[styles.item, i === 0 && styles.latestItem]}>
            <Text style={[styles.overText, i === 0 && styles.latestText]}>{item.over}</Text>
            <Text style={[styles.descText, i === 0 && styles.latestText]}>{item.text}</Text>
          </View>
        ))}
        {commentary.length === 0 && (
          <Text style={styles.emptyText}>Waiting for first ball...</Text>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginBottom: 24,
    maxHeight: 180,
  },
  header: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  feed: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceAlt,
    gap: 12,
  },
  latestItem: {
    borderBottomColor: theme.colors.accent + '33',
    backgroundColor: theme.colors.accent + '08',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  overText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    width: 32,
  },
  descText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  latestText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 20,
    fontStyle: 'italic',
  },
});
