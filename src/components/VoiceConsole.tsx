import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, TextInput, Keyboard, PanResponder } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { NativeModules } from 'react-native';

// @react-native-voice/voice is a native module — safely dynamic-require it
// so the app still runs in Expo Go without a custom dev build.
type SpeechResultsEvent = { value?: string[] };
type SpeechErrorEvent = { error?: { message?: string } };

let Voice: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Voice = require('@react-native-voice/voice').default;
} catch (_) {
  // Package not installed or native module unavailable — voice features disabled
}

const isVoiceSupported = !!Voice && (!!NativeModules.RCTVoice || !!NativeModules.Voice);

interface VoiceConsoleProps {
  onCommand: (cmd: string) => void;
  lastEvent?: string;
}

export const VoiceConsole: React.FC<VoiceConsoleProps> = ({ onCommand, lastEvent }) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  
  const [isActive, setIsActive] = useState(false);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Draggable Logic
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  useEffect(() => {
    if (!isVoiceSupported) return;

    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value[0]) {
        setQuery(e.value[0]);
        // Auto-submit after a brief delay to allow for correction if needed
        setTimeout(() => {
          if (e.value && e.value[0]) {
            onCommand(e.value[0].toLowerCase());
            setIsActive(false);
          }
        }, 1500);
      }
    };
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value[0]) {
        setQuery(e.value[0]);
      }
    };
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.warn('Voice recognition error:', e);
      setIsListening(false);
    };

    return () => {
      try {
        Voice.destroy().then(Voice.removeAllListeners);
      } catch (e) {
        console.warn('Voice destruction error:', e);
      }
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      if (isVoiceSupported) startListening();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      if (isVoiceSupported) stopListening();
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  const startListening = async () => {
    try {
      if (!isVoiceSupported) return;
      setQuery('');
      await Voice.start('en-US');
    } catch (e) {
      console.warn('Failed to start voice recognition:', e);
    }
  };

  const stopListening = async () => {
    try {
      if (!isVoiceSupported) return;
      await Voice.stop();
    } catch (e) {
      console.warn('Failed to stop voice recognition:', e);
    }
  };

  useEffect(() => {
    if (lastEvent) {
      Speech.speak(lastEvent, {
        pitch: 1.1,
        rate: 1.0,
      });
    }
  }, [lastEvent]);

  const handleSubmit = () => {
    if (!query) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCommand(query.toLowerCase());
    setQuery('');
    setIsActive(false);
    Keyboard.dismiss();
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: pan.getTranslateTransform() }
      ]}
      {...panResponder.panHandlers}
    >
      {isActive && (
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', 'rgba(15,23,42,0.9)'] }
          style={styles.activeOverlay}
        >
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.accentSecondary]}
              style={styles.micCircle}
            >
              <Text style={styles.micIcon}>🎙️</Text>
            </LinearGradient>
          </Animated.View>

          <View style={styles.inputContainer}>
            <Text style={styles.hintText}>
              {isVoiceSupported 
                ? 'SAY SOMETHING LIKE "FOUR RUNS" OR "WICKET"' 
                : 'VOICE ENGINE OFFLINE • USE MANUAL INPUT'}
            </Text>
            <TextInput
              style={styles.voiceInput}
              placeholder={isVoiceSupported ? "LISTENING..." : "TYPE COMMAND..."}
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoFocus
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSubmit}
              autoCapitalize="none"
              selectionColor={theme.colors.accent}
            />
            <View style={styles.waveRow}>
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <View key={i} style={[styles.waveBar, { height: Math.random() * 20 + 5 }]} />
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={() => setIsActive(false)}>
            <Text style={styles.closeText}>CANCEL</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      <TouchableOpacity 
        style={styles.triggerBtn} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setIsActive(true);
        }}
      >
        <LinearGradient
          colors={[theme.colors.accent, theme.colors.accentSecondary]}
          style={styles.triggerInner}
        >
          <Text style={styles.triggerIcon}>🎙️</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>VOICE-SCORER</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 999,
  },
  triggerBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  triggerInner: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  triggerIcon: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  activeOverlay: {
    position: 'absolute',
    bottom: -80,
    right: -20,
    width: 300,
    height: 400,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: { fontSize: 32 },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
  },
  voiceInput: {
    width: '100%',
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waveBar: {
    width: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: 1.5,
  },
  closeBtn: {
    marginTop: 40,
    padding: 12,
  },
  closeText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.danger,
    letterSpacing: 2,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    fontSize: 5,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
