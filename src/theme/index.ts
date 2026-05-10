export const theme = {
  colors: {
    background: '#04070B', // Even deeper black
    surface: '#0F131A',    // Deep slate
    surfaceAlt: '#1A1F26', 
    accent: '#FF7E5F',     // Vibrant sunset orange
    accentSecondary: '#FEB47B', // Lighter peach
    success: '#00F5A0',    // Neon mint
    danger: '#FF416C',     // Vivid red
    warning: '#FDC830',    // Bright gold
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: '#1E293B',
    glass: 'rgba(255, 255, 255, 0.03)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    white: '#FFFFFF',
    black: '#000000',
    gradientStart: '#000428', // Deep night blue
    gradientEnd: '#004e92',
    
    // Action Specifics
    four: '#4facfe',
    six: '#f093fb',
    wicket: '#FF416C',
    extra: '#94A3B8',
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
