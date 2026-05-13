import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as masterTheme } from './index';

// ─── Theme Presets ───────────────────────────────────────────────────────────
export const THEME_PRESETS = {
  'TITANIUM': {
    id: 'TITANIUM',
    label: 'Titanium Silver',
    swatch: '#E2E8F0',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceAlt: '#334155',
    accent: '#E2E8F0',
    accentSecondary: '#94A3B8',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: '#334155',
    gradientStart: '#0F172A',
    gradientEnd: '#020617',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    glow: 'rgba(255,255,255,0.4)',
  },
  'MIDNIGHT_GOLD': {
    id: 'MIDNIGHT_GOLD',
    label: 'Midnight Gold',
    swatch: '#D4AF37',
    background: '#0A0800',
    surface: '#1A1400',
    surfaceAlt: '#2D2200',
    accent: '#D4AF37',
    accentSecondary: '#AA8A2E',
    text: '#F8FAFC',
    textMuted: '#AA8A2E',
    border: '#2D2200',
    gradientStart: '#0A0800',
    gradientEnd: '#1A1200',
    success: '#34D399',
    danger: '#FF416C',
    warning: '#FFA500',
    glow: '#D4AF37',
  },
  'CRIMSON_ONYX': {
    id: 'CRIMSON_ONYX',
    label: 'Crimson Onyx',
    swatch: '#FF416C',
    background: '#0F0505',
    surface: '#1E0A0A',
    surfaceAlt: '#2D0F0F',
    accent: '#FF416C',
    accentSecondary: '#BD1E1E',
    text: '#F8FAFC',
    textMuted: '#BD1E1E',
    border: '#2D0F0F',
    gradientStart: '#0F0505',
    gradientEnd: '#050000',
    success: '#10B981',
    danger: '#FF416C',
    warning: '#FDC830',
    glow: '#FF416C',
  },
  'ELECTRIC_COBALT': {
    id: 'ELECTRIC_COBALT',
    label: 'Electric Cobalt',
    swatch: '#2563EB',
    background: '#020617',
    surface: '#0F172A',
    surfaceAlt: '#1E293B',
    accent: '#2563EB',
    accentSecondary: '#1D4ED8',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: '#1E293B',
    gradientStart: '#020617',
    gradientEnd: '#000000',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    glow: '#2563EB',
  },
  'EMERALD_NIGHT': {
    id: 'EMERALD_NIGHT',
    label: 'Emerald Night',
    swatch: '#10B981',
    background: '#022C22',
    surface: '#064E3B',
    surfaceAlt: '#065F46',
    accent: '#10B981',
    accentSecondary: '#059669',
    text: '#F8FAFC',
    textMuted: '#059669',
    border: '#065F46',
    gradientStart: '#022C22',
    gradientEnd: '#064E3B',
    success: '#10B981',
    danger: '#FF416C',
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
      glass: 'rgba(255,255,255,0.03)',
      glassBorder: 'rgba(255,255,255,0.08)',
      white: '#FFFFFF',
      black: '#000000',
      gradientStart: preset.gradientStart,
      gradientEnd: preset.gradientEnd,
      four: '#f57c00',
      six: '#c62828',
      wicket: '#b71c1c',
      extra: '#37474f',
      dot: preset.textMuted,
      single: '#2e7d32',
      two: '#1565c0',
      three: '#6a1b9a',
      wide: '#37474f',
      noball: '#37474f',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    roundness: { sm: 10, md: 16, lg: 32, xl: 40 },
    shadows: {
      card: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
      glow: { shadowColor: preset.glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 12 },
      accentGlow: { shadowColor: preset.glow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
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
