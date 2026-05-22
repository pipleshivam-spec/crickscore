import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { router, usePathname } from 'expo-router';

const { width } = Dimensions.get('window');

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: '⌂', route: '/' },
  { label: 'Matches', icon: '🏏', route: '/matches' },
  { label: 'League', icon: '🏆', route: '/tournaments' },
  { label: 'Vault', icon: '🏛️', route: '/career-vault' },
];

export const BottomNavBar: React.FC = () => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const pathname = usePathname();

  const handlePress = (route: string) => {
    if (pathname === route) return;
    router.replace(route as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navInner}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.route;
          return (
            <TouchableOpacity 
              key={item.label} 
              style={styles.navItem} 
              onPress={() => handlePress(item.route)}
              activeOpacity={0.7}
            >
              <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    height: 72,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  navInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    flex: 1,
  },
  navIcon: {
    fontSize: 22,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  navIconActive: {
    color: theme.colors.accent,
    transform: [{ scale: 1.1 }],
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  navLabelActive: {
    color: theme.colors.text,
  },
  activeIndicator: {
    marginTop: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
});
