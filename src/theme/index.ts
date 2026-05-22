export const theme = {
  colors: {
    background: '#F4F4F3',
    surface: '#FFFFFF',
    surfaceAlt: '#EAE9E6',
    accent: '#A21C3C',
    accentSecondary: '#8DCBE6',
    success: '#2E7D32',
    danger: '#A21C3C',
    warning: '#F6C47A',
    text: '#111111',
    textMuted: '#7A7A7A',
    border: '#E0DFDB',
    glass: 'rgba(0, 0, 0, 0.02)',
    glassBorder: 'rgba(0, 0, 0, 0.06)',
    white: '#FFFFFF',
    black: '#000000',
    gradientStart: '#FFFFFF',
    gradientEnd: '#F4F4F3',
    
    // Action Specifics
    four: '#8DCBE6',
    six: '#A21C3C',
    wicket: '#A21C3C',
    extra: '#7A7A7A',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  roundness: {
    sm: 10,
    md: 16,
    lg: 32,
    xl: 40,
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    glow: {
      shadowColor: '#FF7E5F',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 15,
      elevation: 12,
    },
    accentGlow: {
      shadowColor: '#FF7E5F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
    }
  },
  typography: {
    fontFamily: {
      bold: 'PlusJakartaSans_800ExtraBold',
      semiBold: 'PlusJakartaSans_600SemiBold',
      medium: 'PlusJakartaSans_500Medium',
      regular: 'PlusJakartaSans_400Regular',
      manrope: 'Manrope_800ExtraBold',
    },
    size: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 18,
      xl: 24,
      xxl: 32,
      mega: 48,
    },
    letterSpacing: {
      tight: -1,
      normal: 0,
      wide: 1,
      extraWide: 4,
    }
  },
  buttons: {
    height: 64,
    borderRadius: 24,
    paddingHorizontal: 24,
  }
};
