import React from 'react';
import { StyleSheet, Text, View, Dimensions, Image, Animated, Easing } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ScoreHeaderProps {
  battingTeam: string;
  runs: number;
  wickets: number;
  balls: number;
  totalOvers: number;
  target?: number;
  fow?: Array<{ wicket: number; score: number; batter: string; overs: string }>;
}

export const ScoreHeader: React.FC<ScoreHeaderProps> = ({ 
  battingTeam, runs, wickets, balls, totalOvers, target, fow 
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  
  // Glimmer Animation
  const glimmerAnim = React.useRef(new Animated.Value(-1)).current;

  React.useEffect(() => {
    const runAnimation = () => {
      glimmerAnim.setValue(-1);
      Animated.timing(glimmerAnim, {
        toValue: 2,
        duration: 3000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        setTimeout(runAnimation, 2000);
      });
    };
    runAnimation();
  }, []);

  const glimmerTranslate = glimmerAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-width, width * 1.5]
  });

  const oversDone = Math.floor(balls / 6);
  const ballsInOver = balls % 6;
  const oversStr = `${oversDone}.${ballsInOver}`;
  
  const crr = balls > 0 ? (runs / (balls / 6)).toFixed(2) : '0.00';
  
  let rrr = '0.00';
  let ballsLeft = 0;
  let runsNeeded = 0;
  if (target) {
    ballsLeft = (totalOvers * 6) - balls;
    runsNeeded = target - runs;
    rrr = ballsLeft > 0 ? (runsNeeded / (ballsLeft / 6)).toFixed(2) : '0.00';
  }

  const fowText = fow?.map(f => `${f.wicket}-${f.score} (${f.batter}, ${f.overs})`).join('  ');

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#0f172a', '#000']} 
        style={styles.gradient}
        start={{x:0, y:0}}
        end={{x:0, y:1}}
      >
        <Animated.View 
          style={[
            styles.glimmer, 
            { transform: [{ translateX: glimmerTranslate }] }
          ]} 
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.headerTop}>
          <View style={styles.scoreInfo}>
            <View style={styles.brandRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE BROADCAST</Text>
              </View>
              <Text style={styles.teamNameLabel}>{battingTeam.toUpperCase()}</Text>
            </View>
            
            <View style={styles.scoreDisplayRow}>
              <Text style={styles.mainScoreText}>{runs}</Text>
              <Text style={styles.scoreDivider}>-</Text>
              <Text style={styles.wicketText}>{wickets}</Text>
            </View>
            
            <View style={styles.overRow}>
              <Text style={styles.overLabel}>OVERS</Text>
              <Text style={styles.overDetailText}>{oversStr}</Text>
              <View style={styles.vDivider} />
              <Text style={styles.overLabel}>CRR</Text>
              <Text style={styles.crrValSmall}>{crr}</Text>
            </View>
          </View>
          
          <View style={styles.rightStats}>
            {target !== undefined ? (
              <View style={styles.targetIndicator}>
                <Text style={styles.targetSubLabel}>TARGET</Text>
                <Text style={styles.targetMainVal}>{target}</Text>
              </View>
            ) : (
              <View style={styles.logoBox}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} />
              </View>
            )}
          </View>
        </View>

        {fowText ? (
          <View style={styles.fowContainer}>
            <View style={styles.fowPulse} />
            <Text style={styles.fowLabel}>FOW TRACKER</Text>
            <Text style={styles.fowText} numberOfLines={1}>{fowText}</Text>
          </View>
        ) : null}

        {target !== undefined && (
          <View style={styles.targetBar}>
            <View style={styles.targetCol}>
              <Text style={styles.targetLabel}>REQUIRED</Text>
              <Text style={[styles.targetVal, styles.requiredRR]}>{runsNeeded}</Text>
            </View>
            <View style={styles.targetDivider} />
            <View style={styles.targetCol}>
              <Text style={styles.targetLabel}>REMAINING</Text>
              <Text style={styles.targetVal}>{ballsLeft} BALLS</Text>
            </View>
            <View style={styles.targetDivider} />
            <View style={styles.targetCol}>
              <Text style={styles.targetLabel}>RRR</Text>
              <Text style={[styles.targetVal, styles.requiredRR]}>{rrr}</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 32,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  glimmer: {
    ...StyleSheet.absoluteFillObject,
    width: width * 0.6,
    zIndex: 1,
    opacity: 0.5,
  },
  gradient: {
    padding: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreInfo: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: theme.typography.size.xs - 2,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#ef4444',
    letterSpacing: 2,
  },
  teamNameLabel: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
  },
  scoreDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  mainScoreText: {
    fontSize: theme.typography.size.mega + 8,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#FFF',
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  scoreDivider: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
    fontWeight: '300',
  },
  wicketText: {
    fontSize: theme.typography.size.mega - 8,
    fontFamily: theme.typography.fontFamily.manrope,
    color: theme.colors.accent,
  },
  overRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  overLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 2,
    marginRight: 8,
  },
  overDetailText: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    marginRight: 16,
  },
  vDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 16,
  },
  crrValSmall: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.success,
  },
  rightStats: {
    alignItems: 'flex-end',
  },
  targetIndicator: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  targetMainVal: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#FFF',
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  targetSubLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 4,
    letterSpacing: 2,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  logo: {
    width: 32,
    height: 32,
    opacity: 0.8,
  },
  fowContainer: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  fowPulse: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
    marginRight: 10,
  },
  fowLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 2,
    marginRight: 12,
  },
  fowText: {
    flex: 1,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  targetBar: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  targetCol: {
    alignItems: 'center',
  },
  targetDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  targetLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 2,
    marginBottom: 6,
  },
  targetVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  requiredRR: {
    color: '#F43F5E',
  },
});
