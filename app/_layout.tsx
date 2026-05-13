import { useEffect, useState } from 'react';
import { BackHandler, Alert } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay, 
  withSpring,
  withRepeat,
  Easing,
  runOnJS,
  interpolate
} from 'react-native-reanimated';
import { View, StyleSheet, Text, Dimensions, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { ThemeProvider, useAppTheme } from '../src/theme/ThemeContext';
import * as Haptics from 'expo-haptics';


const { width, height } = Dimensions.get('window');

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

function CustomSplashScreen({ onComplete, theme }: { onComplete: () => void, theme: any }) {
  // Shared values for professional animation
  const coreScale = useSharedValue(0.5);
  const coreRotate = useSharedValue(0);
  const coreOpacity = useSharedValue(0);
  const coreGlow = useSharedValue(0);
  
  const ring1Rotate = useSharedValue(0);
  const ring2Rotate = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const textLetterSpacing = useSharedValue(20);
  
  const scanLineY = useSharedValue(-100);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Background Scan Line Loop
    scanLineY.value = withRepeat(
      withTiming(height + 100, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );

    // 2. Core Assembly
    coreOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    coreScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 80 }));
    coreGlow.value = withDelay(800, withRepeat(withTiming(1, { duration: 1500 }), -1, true));

    // 3. Rings Spin Up
    ringOpacity.value = withDelay(600, withTiming(0.6, { duration: 1000 }));
    ring1Rotate.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1, false);
    ring2Rotate.value = withRepeat(withTiming(-360, { duration: 6000, easing: Easing.linear }), -1, false);

    // 4. Text Reveal
    textOpacity.value = withDelay(1200, withTiming(1, { duration: 1000 }));
    textTranslateY.value = withDelay(1200, withSpring(0, { damping: 12 }));
    textLetterSpacing.value = withDelay(1200, withTiming(8, { duration: 1500, easing: Easing.out(Easing.exp) }));

    // 5. Haptic Feedback
    const triggerHaptics = async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (e) {}
    };
    setTimeout(() => {
      runOnJS(triggerHaptics)();
    }, 800);

    // 6. Final Exit
    containerOpacity.value = withDelay(3500, withTiming(0, { duration: 600 }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    }));
  }, []);

  const animatedCoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }, { rotate: `${coreRotate.value}deg` }],
    opacity: coreOpacity.value,
    shadowOpacity: interpolate(coreGlow.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(coreGlow.value, [0, 1], [10, 25]),
    shadowColor: theme.colors.accent,
  }));

  const animatedRing1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring1Rotate.value}deg` }],
    opacity: ringOpacity.value,
  }));

  const animatedRing2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring2Rotate.value}deg` }],
    opacity: ringOpacity.value * 0.7,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
    letterSpacing: textLetterSpacing.value,
  }));

  const animatedScanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: interpolate(containerOpacity.value, [0, 1], [1.1, 1]) }]
  }));

  return (
    <Animated.View style={[styles.splashContainer, { backgroundColor: theme.colors.background }, animatedContainerStyle]} pointerEvents="none">
      <LinearGradient 
        colors={[theme.colors.background, theme.colors.surface, theme.colors.background]} 
        style={StyleSheet.absoluteFillObject} 
      />
      
      {/* Dynamic Scan Line */}
      <Animated.View style={[styles.scanLine, { backgroundColor: `${theme.colors.accent}10` }, animatedScanLineStyle]} />

      {/* Background Tech Grid (Subtle) */}
      <View style={styles.gridOverlay}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: `${i * 10}%`, backgroundColor: theme.colors.accent, opacity: 0.2 }]} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: `${i * 10}%`, backgroundColor: theme.colors.accent, opacity: 0.2 }]} />
        ))}
      </View>

      <View style={styles.contentWrapper}>
        {/* Outer Data Rings */}
        <Animated.View style={[styles.dataRing, styles.ringOuter, { borderColor: theme.colors.accent, opacity: 0.4 }, animatedRing1Style]}>
          <View style={[styles.ringSegment, { backgroundColor: theme.colors.accent }]} />
          <View style={[styles.ringSegment, { backgroundColor: theme.colors.accent, transform: [{ rotate: '120deg' }] }]} />
          <View style={[styles.ringSegment, { backgroundColor: theme.colors.accent, transform: [{ rotate: '240deg' }] }]} />
        </Animated.View>

        <Animated.View style={[styles.dataRing, styles.ringInner, { borderColor: theme.colors.accent, opacity: 0.3 }, animatedRing2Style]}>
          <View style={[styles.ringSegmentDashed, { borderColor: theme.colors.accent, opacity: 0.2 }]} />
        </Animated.View>

        {/* The Digital Core */}
        <Animated.View style={[styles.coreLogo, animatedCoreStyle]}>
          <View
            style={[styles.radialGlow, { backgroundColor: `${theme.colors.accent}15` }]}
          />
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={[styles.coreGlowEffect, { borderColor: theme.colors.accent, opacity: 0.3 }]} />
        </Animated.View>
      </View>

      {/* Branding */}
      <Animated.View style={[styles.brandingContainer, animatedTextStyle]}>
        <Text style={[styles.brandTitle, { color: theme.colors.text }]}>LAZYCRIC</Text>
        <View style={styles.badgeWrapper}>
          <View style={[styles.badgeLine, { backgroundColor: theme.colors.accent, opacity: 0.5 }]} />
          <Text style={[styles.brandSubtitle, { color: theme.colors.accent }]}>ELITE SPORTS TECH</Text>
          <View style={[styles.badgeLine, { backgroundColor: theme.colors.accent, opacity: 0.5 }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function RootLayoutContent() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false);
  const { theme } = useAppTheme();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_800ExtraBold,
    Manrope_800ExtraBold
  });

  useEffect(() => {
    async function prepare() {
      if (fontsLoaded) {
        await SplashScreen.hideAsync().catch(() => {});
        setIsAppReady(true);
      }
    }
    prepare();

    const backAction = () => {
      if (!router.canGoBack()) {
        // We are at the root, let the OS handle exit
        return false;
      }
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [fontsLoaded]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      
      {isAppReady && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#000' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="create" />
          <Stack.Screen name="join" />
          <Stack.Screen name="lobby" />
          <Stack.Screen name="scoring" />
          <Stack.Screen name="local-setup" />
        </Stack>
      )}

      {!isSplashAnimationComplete && isAppReady && (
        <CustomSplashScreen onComplete={() => setAnimationComplete(true)} theme={theme} />
      )}
    </View>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    zIndex: 2,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  gridLineH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#3B82F6',
  },
  gridLineV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: '#3B82F6',
  },
  contentWrapper: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreLogo: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  radialGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 70,
  },
  coreGlowEffect: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  dataRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderStyle: 'dashed',
  },
  ringInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  ringSegment: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 5,
    top: -5,
  },
  ringSegmentDashed: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    borderWidth: 4,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    borderStyle: 'dashed',
  },
  brandingContainer: {
    position: 'absolute',
    bottom: height * 0.15,
    alignItems: 'center',
  },
  brandTitle: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '900',
    fontFamily: 'System',
    fontStyle: 'italic',
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  badgeLine: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
  },
  brandSubtitle: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 15,
  }
});
