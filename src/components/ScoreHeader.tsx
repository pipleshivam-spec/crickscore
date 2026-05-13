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
  let winProb = 50;
  let projectedScore = 0;

  if (target) {
    ballsLeft = (totalOvers * 6) - balls;
    runsNeeded = target - runs;
    rrr = ballsLeft > 0 ? (runsNeeded / (ballsLeft / 6)).toFixed(2) : '0.00';
    
    // Win Prob calculation (Simple broadcast logic)
    const currentRate = parseFloat(crr);
    const requiredRate = parseFloat(rrr);
    if (requiredRate <= 0) winProb = 100;
    else if (ballsLeft <= 0) winProb = 0;
    else {
      winProb = Math.min(99, Math.max(1, Math.round((currentRate / (currentRate + requiredRate)) * 100)));
    }
  } else {
    // 1st Innings Projected Score
    projectedScore = Math.round(runs + (parseFloat(crr) * ((totalOvers * 6) - balls) / 6));
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
              <View style={[styles.liveBadge, bowlerName && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                <View style={[styles.liveDot, bowlerName && { backgroundColor: theme.colors.accent }]} />
                <Text style={[styles.liveText, bowlerName && { color: theme.colors.accent }]}>
                  {bowlerName ? `BOWLING: ${bowlerName.toUpperCase()}` : 'LIVE BROADCAST'}
                </Text>
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

        {partnership ? (
          <View style={styles.pHeaderRow}>
             <View style={styles.pBadge}><Text style={styles.pBadgeText}>PTR</Text></View>
             <Text style={styles.pHeaderVal}>{partnership.runs}<Text style={{opacity: 0.4}}> runs</Text> <Text style={{opacity: 0.2}}>/</Text> {partnership.balls}<Text style={{opacity: 0.4}}> balls</Text></Text>
          </View>
        ) : null}

        {/* Analytics bar removed for better screen visibility */}


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
    borderRadius: 20,
    marginBottom: 12,
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
    padding: 10,
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
    gap: 6,
    marginBottom: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ef4444',
    marginRight: 4,
  },
  liveText: {
    fontSize: 7,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#ef4444',
    letterSpacing: 1,
  },
  teamNameLabel: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
  },
  scoreDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  mainScoreText: {
    fontSize: isSmallScreen ? 30 : 36,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#FFF',
    letterSpacing: -1,
  },
  scoreDivider: {
    fontSize: isSmallScreen ? 20 : 24,
    color: 'rgba(255,255,255,0.1)',
    marginHorizontal: isSmallScreen ? 4 : 6,
    fontWeight: '300',
  },
  wicketText: {
    fontSize: isSmallScreen ? 28 : 32,
    fontFamily: theme.typography.fontFamily.manrope,
    color: theme.colors.accent,
  },
  overRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  overLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1.5,
    marginRight: 6,
  },
  overDetailText: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFF',
    marginRight: 10,
  },
  vDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 10,
  },
  crrValSmall: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.success,
  },
  rightStats: {
    alignItems: 'flex-end',
  },
  targetIndicator: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  targetMainVal: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.manrope,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  targetSubLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
    marginBottom: 2,
    letterSpacing: 1.5,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.01)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  logo: {
    width: 24,
    height: 24,
    opacity: 0.6,
  },
  fowContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  fowPulse: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.accent,
    marginRight: 8,
  },
  fowLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 1.5,
    marginRight: 8,
  },
  fowText: {
    flex: 1,
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '700',
  },
  targetBar: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.02)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  targetCol: {
    alignItems: 'center',
  },
  targetDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  targetLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  targetVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
  },
  requiredRR: {
    color: '#F43F5E',
  },

  // ─── Analytics Bar ───
  analyticsBar: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  probRow: { gap: 6 },
  probLabel: { fontSize: 7, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 1.5, textAlign: 'center' },
  probTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', overflow: 'hidden' },
  probFill: { height: '100%', backgroundColor: theme.colors.accent },
  probFillOpp: { height: '100%', backgroundColor: 'rgba(255,255,255,0.1)' },
  probTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  probVal: { fontSize: 8, fontWeight: '900', color: '#FFF', opacity: 0.8 },

  projRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  projItem: { alignItems: 'center' },
  projLabel: { fontSize: 7, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginBottom: 2 },
  projVal: { fontSize: 14, fontWeight: '900', color: theme.colors.accent },
  projDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  // Partnership Header Styles
  pHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    paddingHorizontal: 4,
  },
  pBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  pBadgeText: { fontSize: 7, fontWeight: '900', color: theme.colors.accent, letterSpacing: 0.5 },
  pHeaderVal: { fontSize: 11, fontWeight: '800', color: '#FFF' },
});
