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

const { width, height } = Dimensions.get('window');

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

function CustomSplashScreen({ onComplete }: { onComplete: () => void }) {
  // Animation Shared Values
  const ballY = useSharedValue(-height * 0.2);
  const ballScale = useSharedValue(1);
  const ballOpacity = useSharedValue(1);
  
  const batRotate = useSharedValue(60);
  const batOpacity = useSharedValue(0);
  
  const impactScale = useSharedValue(0);
  const impactOpacity = useSharedValue(0);
  
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.5);
  
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Initial State
    batOpacity.value = withTiming(1, { duration: 500 });

    // 2. Ball Drop
    ballY.value = withSequence(
      withDelay(400, withTiming(height * 0.5, { 
        duration: 800, 
        easing: Easing.bezier(0.25, 0.1, 0.25, 1) 
      }))
    );

    // 3. Bat Swing (Timed to meet ball)
    batRotate.value = withDelay(900, withTiming(-30, { 
      duration: 300, 
      easing: Easing.out(Easing.quad) 
    }));

    // 4. Impact Flash
    impactScale.value = withDelay(1150, withSequence(
      withTiming(4, { duration: 100 }),
      withTiming(0, { duration: 300 })
    ));
    impactOpacity.value = withDelay(1150, withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(0, { duration: 300 })
    ));

    // 5. Ball flies towards camera
    ballScale.value = withDelay(1150, withTiming(15, { duration: 600, easing: Easing.in(Easing.quad) }));
    ballOpacity.value = withDelay(1150, withTiming(0, { duration: 400 }));

    // 6. Logo Reveal
    logoOpacity.value = withDelay(1550, withTiming(1, { duration: 800 }));
    logoScale.value = withDelay(1550, withSpring(1, { damping: 12 }));

    // 7. Complete
    containerOpacity.value = withDelay(2500, withTiming(0, { duration: 500 }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    }));
  }, []);

  const animatedBallStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ballY.value }, { scale: ballScale.value }],
    opacity: ballOpacity.value,
  }));

  const animatedBatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: width * 0.15 },
      { translateY: height * 0.55 },
      { rotate: `${batRotate.value}deg` },
      { translateX: -width * 0.15 },
      { translateY: -height * 0.55 }
    ],
    opacity: batOpacity.value,
  }));

  const animatedImpactStyle = useAnimatedStyle(() => ({
    transform: [{ scale: impactScale.value }],
    opacity: impactOpacity.value,
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.splashContainer, animatedContainerStyle]} pointerEvents="none">
      <LinearGradient 
        colors={['#020617', '#080C1A', '#020617']} 
        style={StyleSheet.absoluteFillObject} 
      />

      {/* Stars Background */}
      <View style={styles.starField}>
        {Array.from({ length: 40 }).map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.star, 
              { 
                top: `${Math.random() * 80}%`, 
                left: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.5,
                transform: [{ scale: 0.5 + Math.random() }]
              }
            ]} 
          />
        ))}
      </View>

      {/* Field Pitch */}
      <LinearGradient
        colors={['transparent', 'rgba(16, 60, 16, 0.4)', 'rgba(10, 40, 10, 0.8)']}
        style={styles.fieldPitch}
      />

      {/* The Bat */}
      <Animated.View style={[styles.batContainer, animatedBatStyle]}>
        <View style={styles.batHandle} />
        <View style={styles.batBlade} />
      </Animated.View>

      {/* The Ball */}
      <Animated.View style={[styles.cricketBall, animatedBallStyle]}>
        <LinearGradient
          colors={['#FF4D4D', '#CC0000']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.2, y: 0.2 }}
        />
        <View style={styles.ballSeam} />
      </Animated.View>

      {/* Impact Effect */}
      <Animated.View style={[styles.impactFlash, animatedImpactStyle]} />

      {/* Branding Reveal */}
      <Animated.View style={[styles.finalBranding, animatedLogoStyle]}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logoInSplash}
          resizeMode="contain"
        />
        <Text style={styles.brandingTitle}>LAZYCRIC</Text>
        <Text style={styles.brandingSubtitle}>PREMIUM SCORING EXPERIENCE</Text>
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="light" />
      
      {isAppReady && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
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
        <CustomSplashScreen onComplete={() => setAnimationComplete(true)} />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
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
  starField: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#FFF',
    borderRadius: 1,
  },
  fieldPitch: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: height * 0.4,
  },
  batContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  batHandle: {
    width: 6,
    height: 30,
    backgroundColor: '#5D4037',
    borderRadius: 3,
  },
  batBlade: {
    width: 22,
    height: 70,
    backgroundColor: '#D2B48C',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  cricketBall: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 10,
    top: 0,
    left: width / 2 - 10,
  },
  ballSeam: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    top: '50%',
  },
  impactFlash: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    top: height * 0.5 - 10,
    left: width / 2 - 10,
    zIndex: 15,
  },
  finalBranding: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInSplash: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  brandingTitle: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 8,
    fontFamily: 'System',
    fontStyle: 'italic',
  },
  brandingSubtitle: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 10,
  }
});

