import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

interface ProfessionalBackgroundProps {
  children?: React.ReactNode;
}

export const ProfessionalBackground: React.FC<ProfessionalBackgroundProps> = ({ children }) => {
  const { theme } = useAppTheme();
  const scanLineY = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const startAnimation = () => {
      scanLineY.setValue(-100);
      Animated.loop(
        Animated.timing(scanLineY, {
          toValue: height + 100,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ).start();
    };

    startAnimation();
  }, [scanLineY]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Base Gradient Layer */}
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.background }]}
      />

      {/* 2. Tech Grid Pattern */}
      <View style={styles.gridOverlay}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View
            key={`h-${i}`}
            style={[
              styles.gridLineH,
              { 
                top: `${i * 5}%`, 
                backgroundColor: theme.colors.accent, 
                opacity: 0.03 
              }
            ]}
          />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={`v-${i}`}
            style={[
              styles.gridLineV,
              { 
                left: `${i * (100 / 11)}%`, 
                backgroundColor: theme.colors.accent, 
                opacity: 0.03 
              }
            ]}
          />
        ))}
      </View>

      {/* 3. Radial Glow (Top Left) */}
      <View style={styles.radialGlowWrapper}>
        <View
          style={[styles.radialGlow, { backgroundColor: `${theme.colors.accent}15` }]}
        />
      </View>

      {/* 4. Animated Scan Line */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            backgroundColor: `${theme.colors.accent}08`,
            transform: [{ translateY: scanLineY }],
          },
        ]}
      />

      {/* 5. Ambient Vignette - Light Soft Glow instead of Dark shadow */}
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
        pointerEvents="none"
      />

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    width: '100%',
    height: 1,
  },
  gridLineV: {
    position: 'absolute',
    height: '100%',
    width: 1,
  },
  radialGlowWrapper: {
    position: 'absolute',
    top: -height * 0.2,
    left: -width * 0.2,
    width: width,
    height: width,
    borderRadius: width / 2,
    overflow: 'hidden',
    opacity: 0.5,
  },
  radialGlow: {
    flex: 1,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 150,
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
});
