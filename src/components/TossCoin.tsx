import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

export interface TossCoinHandle {
  flip: (winnerName: string) => Promise<void>;
  reset: () => void;
}

export const TossCoin = forwardRef<TossCoinHandle>((props, ref) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    flip: async (winnerName: string) => {
      return new Promise((resolve) => {
        setIsFlipping(true);
        flipAnim.setValue(0);
        opacityAnim.setValue(0);

        Animated.sequence([
          Animated.timing(flipAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ]).start(() => {
          setIsFlipping(false);
          resolve();
        });
      });
    },
    reset: () => {
      flipAnim.setValue(0);
      opacityAnim.setValue(0);
      setIsFlipping(false);
    }
  }));

  const spin = flipAnim.interpolate({ 
    inputRange: [0, 1], 
    outputRange: ['0deg', '2880deg'] 
  });

  const coinScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.5, 1]
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.coinWrapper, 
        { transform: [{ rotateY: spin }, { scale: coinScale }] }
      ]}>
        <LinearGradient 
          colors={['#FFD700', '#FFA500', '#B8860B']} 
          style={styles.coinInner}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
        >
          <View style={styles.coinRing}>
            <Text style={styles.coinSymbol}>₵</Text>
          </View>
        </LinearGradient>
      </Animated.View>
      {isFlipping && <Text style={styles.flippingText}>FLIPPING...</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  coinWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  coinInner: {
    flex: 1,
    borderRadius: 70,
    padding: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  coinRing: {
    flex: 1,
    borderRadius: 62,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  coinSymbol: { 
    fontSize: 60, 
    color: 'rgba(0,0,0,0.6)', 
    fontWeight: '900' 
  },
  flippingText: { 
    marginTop: 20, 
    fontSize: 12, 
    fontWeight: '900', 
    color: '#FFD700', 
    letterSpacing: 4 
  },
});
