import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Modal, Animated, Dimensions, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface CelebrationModalProps {
  visible: boolean;
  type: 'SIX' | 'FOUR' | 'WICKET' | '50' | '100' | null;
  onComplete: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ visible, type, onComplete }) => {
  const { theme } = useAppTheme();
  
  // Animation Refs
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const flareOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible && type) {
      // Reset
      scale.setValue(0.5);
      opacity.setValue(0);
      rotate.setValue(0);
      flareOpacity.setValue(0);
      textTranslateY.setValue(20);

      const animation = Animated.sequence([
        // Entry: Pop and Glow
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(textTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          Animated.timing(flareOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        // Hold for a bit
        Animated.delay(1800),
        // Exit: Fade and Scale Up
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]);

      animation.start(({ finished }) => {
        if (finished) onComplete();
      });

      // Haptic Sequence
      if (type === 'WICKET') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (type === 'SIX' || type === 'FOUR') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === '50' || type === '100') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
      }

      // Failsafe timeout to prevent getting stuck
      const timer = setTimeout(() => {
        onComplete();
      }, 4000);

      return () => {
        animation.stop();
        clearTimeout(timer);
      };
    }
  }, [visible, type]);

  if (!visible || !type) return null;

  const getColors = () => {
    switch (type) {
      case 'SIX': return ['#8B5CF6', '#D946EF']; // Purple to Magenta
      case 'FOUR': return ['#3B82F6', '#06B6D4']; // Blue to Cyan
      case 'WICKET': return ['#EF4444', '#B91C1C']; // Red to Dark Red
      case '50': return ['#F59E0B', '#D97706']; // Orange
      case '100': return ['#FACC15', '#EAB308']; // Gold
      default: return [theme.colors.accent, theme.colors.accentSecondary];
    }
  };

  const getLabel = () => {
    switch (type) {
      case '50': return 'HALF CENTURY';
      case '100': return 'CENTURY';
      case 'WICKET': return 'OUT!';
      case 'SIX': return 'MAXIMUM 6';
      case 'FOUR': return 'BOUNDARY 4';
      default: return type;
    }
  };

  const colors = getColors();

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg']
  });

  const bgPulse = flareOpacity.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['rgba(0,0,0,0.95)', colors[0] + '40', 'rgba(0,0,0,0.95)']
  });

  return (
    <Modal visible={visible} transparent animationType="none">
        <View style={styles.gridContainer}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={styles.gridLine} />
          ))}
        </View>

        <Animated.View style={[styles.overlay, { backgroundColor: bgPulse }]}>
          <View style={styles.scanline} />
          
          <Animated.View style={[
            styles.content, 
            { 
              transform: [{ scale }, { rotate: spin }], 
              opacity,
              borderColor: colors[0] + 'CC',
              shadowColor: colors[0]
            }
          ]}>
            <LinearGradient colors={colors as any} style={styles.gradient} start={{x:0, y:0}} end={{x:1, y:1}}>
              <View style={styles.inner}>
                <View style={styles.broadcastTag}>
                  <View style={styles.liveDot} />
                  <Text style={styles.broadcastText}>ELITE BROADCAST • HYPE MODE ACTIVE</Text>
                </View>
                
                <Animated.View style={{ transform: [{ translateY: textTranslateY }] }}>
                  <Text style={styles.title}>{getLabel()}</Text>
                  <View style={styles.titleShadow} />
                </Animated.View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>STRIKE FORCE ACHIEVED</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
          
          {/* Intense Flash Effect */}
          <Animated.View style={[styles.flash, { opacity: flareOpacity, backgroundColor: colors[0] }]} pointerEvents="none" />
        </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gridLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#FFF',
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.01)',
    height: 1,
    zIndex: 10,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  content: { 
    width: width * 0.95, 
    borderRadius: 20, 
    overflow: 'hidden', 
    backgroundColor: '#000',
    borderWidth: 2,
    zIndex: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 50,
  },
  gradient: { 
    paddingVertical: 100, 
    paddingHorizontal: 40, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  inner: { 
    alignItems: 'center', 
    width: '100%' 
  },
  broadcastTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 40,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  liveDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#FF0000',
  },
  broadcastText: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#FFF', 
    letterSpacing: 4, 
  },
  title: { 
    fontSize: 84, 
    fontWeight: '900', 
    color: '#FFF', 
    letterSpacing: -5, 
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 0, height: 12 },
    textShadowRadius: 30,
    fontStyle: 'italic',
    zIndex: 2,
  },
  titleShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  statRow: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  statLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 6,
    opacity: 0.8,
  }
});
