import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as masterTheme } from './index';

// ─── Theme Presets (Light Theme Variants) ─────────────────────────────────────
export const THEME_PRESETS = {
  'TITANIUM': {
    id: 'TITANIUM',
    label: 'Titanium Crimson',
    swatch: '#A21C3C',
    background: '#F4F4F3',
    surface: '#FFFFFF',
    surfaceAlt: '#EAE9E6',
    accent: '#A21C3C',
    accentSecondary: '#8DCBE6',
    text: '#111111',
    textMuted: '#7A7A7A',
    border: '#E0DFDB',
    gradientStart: '#FFFFFF',
    gradientEnd: '#F4F4F3',
    success: '#2E7D32',
    danger: '#A21C3C',
    warning: '#F6C47A',
    glow: '#A21C3C',
  },
  'MIDNIGHT_GOLD': {
    id: 'MIDNIGHT_GOLD',
    label: 'Ivory Gold',
    swatch: '#D4AF37',
    background: '#F9F9F6',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEFEA',
    accent: '#D4AF37',
    accentSecondary: '#F6C47A',
    text: '#111111',
    textMuted: '#8A8A80',
    border: '#EBEBE3',
    gradientStart: '#FFFFFF',
    gradientEnd: '#F9F9F6',
    success: '#2E7D32',
    danger: '#D4AF37',
    warning: '#F6C47A',
    glow: '#D4AF37',
  },
  'CRIMSON_ONYX': {
    id: 'CRIMSON_ONYX',
    label: 'Rose White',
    swatch: '#E11D48',
    background: '#FDF8F9',
    surface: '#FFFFFF',
    surfaceAlt: '#FAEBEF',
    accent: '#E11D48',
    accentSecondary: '#FDA4AF',
    text: '#111111',
    textMuted: '#9F1239',
    border: '#F3CCD6',
    gradientStart: '#FFFFFF',
    gradientEnd: '#FDF8F9',
    success: '#2E7D32',
    danger: '#E11D48',
    warning: '#F59E0B',
    glow: '#E11D48',
  },
  'ELECTRIC_COBALT': {
    id: 'ELECTRIC_COBALT',
    label: 'Cobalt Light',
    swatch: '#2563EB',
    background: '#F0F4F8',
    surface: '#FFFFFF',
    surfaceAlt: '#E2EAF2',
    accent: '#2563EB',
    accentSecondary: '#93C5FD',
    text: '#111111',
    textMuted: '#64748B',
    border: '#CBD5E1',
    gradientStart: '#FFFFFF',
    gradientEnd: '#F0F4F8',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    glow: '#2563EB',
  },
  'EMERALD_NIGHT': {
    id: 'EMERALD_NIGHT',
    label: 'Mint Fresh',
    swatch: '#10B981',
    background: '#F2F9F5',
    surface: '#FFFFFF',
    surfaceAlt: '#E1F2E8',
    accent: '#10B981',
    accentSecondary: '#6EE7B7',
    text: '#111111',
    textMuted: '#047857',
    border: '#A7F3D0',
    gradientStart: '#FFFFFF',
    gradientEnd: '#F2F9F5',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    glow: '#10B981',
  },
} as const;

export type ThemeId = keyof typeof THEME_PRESETS;
export type ThemePreset = typeof THEME_PRESETS[ThemeId];

// ─── Build full theme object from preset ─────────────────────────────────────
export function buildTheme(preset: ThemePreset) {
  return {
    id: preset.id,
    colors: {
      background: preset.background,
      surface: preset.surface,
      surfaceAlt: preset.surfaceAlt,
      accent: preset.accent,
      accentSecondary: preset.accentSecondary,
      success: preset.success,
      danger: preset.danger,
      warning: preset.warning,
      text: preset.text,
      textMuted: preset.textMuted,
      border: preset.border,
      glass: 'rgba(0,0,0,0.02)',
      glassBorder: 'rgba(0,0,0,0.06)',
      white: '#FFFFFF',
      black: '#000000',
      gradientStart: preset.gradientStart,
      gradientEnd: preset.gradientEnd,
      four: '#8DCBE6',
      six: '#A21C3C',
      wicket: '#A21C3C',
      extra: '#7A7A7A',
      dot: preset.textMuted,
      single: '#2E7D32',
      two: '#1565C0',
      three: '#6A1B9A',
      wide: '#F6C47A',
      noball: '#F6C47A',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    roundness: { sm: 10, md: 16, lg: 32, xl: 40 },
    shadows: {
      card: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
      glow: { shadowColor: preset.glow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
      accentGlow: { shadowColor: preset.glow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
    },
    typography: masterTheme.typography,
    buttons: masterTheme.buttons,
  };
}

export type AppTheme = ReturnType<typeof buildTheme>;

// ─── Context ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = '@lazycric_theme';

interface ThemeContextType {
  theme: AppTheme;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  presets: typeof THEME_PRESETS;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: buildTheme(THEME_PRESETS.TITANIUM),
  themeId: 'TITANIUM',
  setTheme: () => {},
  presets: THEME_PRESETS,
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeId] = useState<ThemeId>('TITANIUM');
  const theme = buildTheme(THEME_PRESETS[themeId]);

  useEffect(() => {
    // Load saved theme on startup
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved && THEME_PRESETS[saved as ThemeId]) {
        setThemeId(saved as ThemeId);
      }
    });
  }, []);

  const setTheme = (id: ThemeId) => {
    setThemeId(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme, presets: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
