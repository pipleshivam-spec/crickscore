import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated as RNAnimated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

interface PlayerCardProps {
  name: string;
  stats: string;
  subStats: string;
}

export const ElitePlayerCard = ({ name, stats, subStats }: PlayerCardProps) => {
  const animatedValue = React.useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    RNAnimated.spring(animatedValue, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['15deg', '0deg'],
  });

  return (
    <RNAnimated.View style={[styles.container, { transform: [{ scale }, { rotate }] }]}>
      <LinearGradient
        colors={['#1E293B', '#0F172A']}
        style={styles.card}
      >
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.2)', 'transparent']}
          style={styles.hologram}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ELITE PERFORMER</Text>
          </View>
          <Text style={styles.title}>PLAYER OF THE MATCH</Text>
        </View>

        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#FFD700', '#B8860B']}
            style={styles.avatarRing}
          />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🏏</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{name.toUpperCase()}</Text>
          <Text style={styles.stats}>{stats}</Text>
          <Text style={styles.subStats}>{subStats}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.seal}>
            <Text style={styles.sealText}>MOM</Text>
          </View>
          <Text style={styles.branding}>LAZYCRIC PREMIUM</Text>
        </View>
      </LinearGradient>
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.8,
    alignSelf: 'center',
    marginVertical: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  card: {
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    overflow: 'hidden',
  },
  hologram: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'absolute',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  avatarText: {
    fontSize: 40,
  },
  info: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  stats: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '900',
  },
  subStats: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  seal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  branding: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
