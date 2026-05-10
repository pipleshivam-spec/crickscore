import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

interface MatchAnalyticsProps {
  winProbability: number; // 0 to 100
  battingTeam: string;
  bowlingTeam: string;
  innings1Runs: number[];
  innings2Runs: number[];
  maxOvers: number;
}

export const MatchAnalytics = ({ 
  winProbability, 
  battingTeam, 
  bowlingTeam,
  innings1Runs = [],
  innings2Runs = [],
  maxOvers = 20
}: MatchAnalyticsProps) => {
  
  // Normalize runs for the Worm chart
  const maxRuns = Math.max(...innings1Runs, ...innings2Runs, 1);
  const chartHeight = 120;
  
  const renderWorm = (runs: number[], color: string) => {
    if (runs.length === 0) return null;
    return (
      <View style={styles.wormContainer}>
        {runs.map((r, i) => (
          <View 
            key={i} 
            style={[
              styles.wormNode, 
              { 
                backgroundColor: color,
                height: 4,
                width: (width - 64) / maxOvers,
                bottom: (r / maxRuns) * chartHeight,
                left: i * ((width - 64) / maxOvers)
              }
            ]} 
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>LIVE ANALYTICS</Text>
      
      {/* Win Predictor */}
      <View style={styles.predictorBox}>
        <View style={styles.predictorHeader}>
          <Text style={styles.teamName}>{battingTeam.toUpperCase()}</Text>
          <Text style={styles.probText}>{winProbability}% WIN PROBABILITY</Text>
          <Text style={styles.teamName}>{bowlingTeam.toUpperCase()}</Text>
        </View>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={['#FF4D4D', '#FFD700', '#48BB78']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${winProbability}%` }]}
          />
        </View>
      </View>

      {/* Match Worm */}
      <View style={styles.wormBox}>
        <Text style={styles.chartLabel}>MATCH PROGRESSION (THE WORM)</Text>
        <View style={[styles.chartArea, { height: chartHeight }]}>
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <View key={i} style={[styles.gridLine, { bottom: p * chartHeight }]} />
          ))}
          
          {renderWorm(innings1Runs, 'rgba(255,255,255,0.2)')}
          {renderWorm(innings2Runs, '#FFD700')}
        </View>
        <View style={styles.chartFooter}>
          <Text style={styles.footerText}>0 OVERS</Text>
          <Text style={styles.footerText}>{maxOvers} OVERS</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 16,
  },
  predictorBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  predictorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamName: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    width: '30%',
    textAlign: 'center',
  },
  probText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFD700',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  wormBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chartLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartArea: {
    width: '100%',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  wormContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  wormNode: {
    position: 'absolute',
    borderRadius: 2,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  footerText: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
});
