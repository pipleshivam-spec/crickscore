import React from 'react';
import { StyleSheet, Text, View, Dimensions, Image, Animated, Easing } from 'react-native';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

interface ScoreHeaderProps {
  battingTeam: string;
  runs: number;
  wickets: number;
  balls: number;
  totalOvers: number;
  target?: number;
  fow?: Array<{ wicket: number; score: number; batter: string; overs: string }>;
  bowlerName?: string;
  partnership?: { runs: number; balls: number };
}

export const ScoreHeader: React.FC<ScoreHeaderProps> = ({ 
  battingTeam, runs, wickets, balls, totalOvers, target, fow, bowlerName, partnership 
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  
  const glimmerAnim = React.useRef(new Animated.Value(-1)).current;

  React.useEffect(() => {
    const runAnimation = () => {
      glimmerAnim.setValue(-1);
      Animated.timing(glimmerAnim, {
        toValue: 2,
        duration: 3500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        setTimeout(runAnimation, 2500);
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

  const fowText = fow?.map(f => `${f.wicket}-${f.score}`).join(' • ');

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#1e293b', '#000']} 
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
            colors={['transparent', 'rgba(255,255,255,0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.headerTop}>
          <View style={styles.scoreInfo}>
            <View style={styles.brandRow}>
              <View style={[styles.liveBadge, bowlerName && styles.bowlingBadge]}>
                <View style={[styles.liveDot, bowlerName && styles.bowlingDot]} />
                <Text style={[styles.liveText, bowlerName && styles.bowlingText]}>
                  {bowlerName ? `BOWL: ${bowlerName.toUpperCase()}` : 'LIVE'}
                </Text>
              </View>
              <Text style={styles.teamNameLabel} numberOfLines={1}>{battingTeam.toUpperCase()}</Text>
            </View>
            
            <View style={styles.scoreDisplayRow}>
              <Text style={styles.mainScoreText}>{runs}</Text>
              <Text style={styles.scoreDivider}>/</Text>
              <Text style={styles.wicketText}>{wickets}</Text>
            </View>
            
            <View style={styles.overRow}>
              <View style={styles.statChip}>
                <Text style={styles.statChipLab}>OV</Text>
                <Text style={styles.statChipVal}>{oversStr}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipLab}>CRR</Text>
                <Text style={[styles.statChipVal, { color: theme.colors.success }]}>{crr}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.rightStats}>
            {target !== undefined ? (
              <View style={styles.targetIndicator}>
                <Text style={styles.targetSubLabel}>TO WIN</Text>
                <Text style={styles.targetMainVal}>{runsNeeded}</Text>
                <Text style={styles.targetBalls}>OFF {ballsLeft} BALLS</Text>
              </View>
            ) : (
              <View style={styles.logoBox}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} />
                <Text style={styles.engineTag}>ELITE ENGINE</Text>
              </View>
            )}
          </View>
        </View>

        {(fowText || partnership) && (
          <View style={styles.bottomBar}>
            {fowText && (
              <View style={styles.fowSection}>
                <Text style={styles.bottomLabel}>FOW</Text>
                <Text style={styles.bottomVal} numberOfLines={1}>{fowText}</Text>
              </View>
            )}
            {partnership && (
              <View style={styles.pSection}>
                <Text style={styles.bottomLabel}>PTR</Text>
                <Text style={styles.bottomVal}>{partnership.runs} ({partnership.balls})</Text>
              </View>
            )}
          </View>
        )}

        {target !== undefined && (
          <View style={styles.rrrBar}>
            <LinearGradient 
              colors={['rgba(244, 63, 94, 0.1)', 'rgba(0,0,0,0)']} 
              start={{x:0, y:0}} end={{x:1, y:0}}
              style={styles.rrrInner}
            >
              <Text style={styles.rrrLabel}>REQ RATE</Text>
              <Text style={styles.rrrVal}>{rrr}</Text>
            </LinearGradient>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glimmer: {
    ...StyleSheet.absoluteFillObject,
    width: width * 0.8,
    zIndex: 1,
    opacity: 0.4,
  },
  gradient: {
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scoreInfo: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bowlingBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  bowlingDot: {
    backgroundColor: theme.colors.accent,
  },
  liveText: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#ef4444',
    letterSpacing: 1.5,
  },
  bowlingText: {
    color: theme.colors.accent,
  },
  teamNameLabel: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    flexShrink: 1,
  },
  scoreDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  mainScoreText: {
    fontSize: isSmallScreen ? 48 : 56,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#FFF',
    letterSpacing: -2,
    fontWeight: '800',
  },
  scoreDivider: {
    fontSize: isSmallScreen ? 32 : 40,
    color: 'rgba(255,255,255,0.15)',
    marginHorizontal: 8,
    fontWeight: '200',
  },
  wicketText: {
    fontSize: isSmallScreen ? 44 : 52,
    fontFamily: theme.typography.fontFamily.manrope,
    color: theme.colors.accent,
    fontWeight: '800',
  },
  overRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statChipLab: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.3)',
    marginRight: 6,
    letterSpacing: 1,
  },
  statChipVal: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#FFF',
    fontWeight: '700',
  },
  rightStats: {
    alignItems: 'flex-end',
  },
  targetIndicator: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 100,
  },
  targetSubLabel: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  targetMainVal: {
    fontSize: 32,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: -1,
  },
  targetBalls: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.accent,
    marginTop: 2,
    letterSpacing: 1,
  },
  logoBox: {
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 36,
    height: 36,
    opacity: 0.8,
  },
  engineTag: {
    fontSize: 7,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 2,
  },
  bottomBar: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  fowSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  bottomLabel: {
    fontSize: 8,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1.5,
    marginRight: 8,
  },
  bottomVal: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
  },
  rrrBar: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  rrrInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rrrLabel: {
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
  rrrVal: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#F43F5E',
    fontWeight: '800',
  },
});
