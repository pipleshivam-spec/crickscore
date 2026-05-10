import React, { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  Easing,
  runOnJS,
  withSequence
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ParticleProps {
  id: number;
  color: string;
}

const Particle = ({ color, type }: { color: string, type: 'spark' | 'square' | 'ring' }) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 300;
    const duration = 1200 + Math.random() * 1200;

    x.value = withTiming(Math.cos(angle) * distance, { 
      duration, 
      easing: Easing.out(Easing.exp) 
    });
    y.value = withTiming(Math.sin(angle) * distance + (Math.random() * 100), { 
      duration, 
      easing: Easing.out(Easing.exp) 
    });
    
    scale.value = withSequence(
      withTiming(Math.random() * 2 + 0.5, { duration: 150 }),
      withTiming(0, { duration: duration - 150 })
    );

    rotation.value = withTiming(Math.random() * 360, { duration });
    drift.value = withTiming(Math.random() * 50 - 25, { duration });
    
    opacity.value = withDelay(duration * 0.6, withTiming(0, { duration: duration * 0.4 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + drift.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
    opacity: opacity.value,
    backgroundColor: type === 'ring' ? 'transparent' : color,
    borderColor: color,
    borderWidth: type === 'ring' ? 2 : 0,
    width: type === 'ring' ? 12 : 8,
    height: type === 'ring' ? 12 : 8,
    borderRadius: type === 'square' ? 2 : 10,
  }));

  return <Animated.View style={[styles.particle, animatedStyle]} />;
};

export interface CelebrationEmitterHandle {
  burst: (color?: string) => void;
}

export const CelebrationEmitter = forwardRef<CelebrationEmitterHandle>((props, ref) => {
  const [particles, setParticles] = useState<{ id: number; color: string; type: string }[]>([]);
  const idCounter = React.useRef(0);

  useImperativeHandle(ref, () => ({
    burst: (color = '#FFD700') => {
      const particleTypes: ('spark' | 'square' | 'ring')[] = ['spark', 'square', 'ring'];
      const newParticles = Array.from({ length: 40 }).map(() => ({
        id: idCounter.current++,
        color: color === 'WICKET' ? '#EF4444' : (color === 'SIX' ? '#8B5CF6' : (color === 'FOUR' ? '#3B82F6' : '#FFD700')),
        type: particleTypes[Math.floor(Math.random() * particleTypes.length)]
      }));
      setParticles(prev => [...prev, ...newParticles]);
      
      // Cleanup
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
      }, 3000);
    }
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.center}>
        {particles.map(p => (
          <Particle key={p.id} color={p.color} type={p.type as any} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: height / 2,
    left: width / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  }
});
