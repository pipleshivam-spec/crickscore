import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface TeamComparisonProps {
  teamAName: string;
  teamBName: string;
  stats: {
    label: string;
    teamAVal: number;
    teamBVal: number;
    prefix?: string;
    suffix?: string;
  }[];
}

export const TeamComparison = ({ teamAName, teamBName, stats }: TeamComparisonProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TEAM PERFORMANCE COMPARISON</Text>
      
      <View style={styles.header}>
        <Text style={[styles.teamLabel, { color: '#3fe56c' }]}>{teamAName.toUpperCase()}</Text>
        <Text style={[styles.teamLabel, { color: '#FFD700' }]}>{teamBName.toUpperCase()}</Text>
      </View>

      {stats.map((item, index) => {
        const total = item.teamAVal + item.teamBVal || 1;
        const percA = (item.teamAVal / total) * 100;

        return (
          <View key={index} style={styles.statRow}>
            <View style={styles.statLabels}>
              <Text style={styles.statValue}>{item.prefix}{item.teamAVal}{item.suffix}</Text>
              <Text style={styles.statName}>{item.label}</Text>
              <Text style={styles.statValue}>{item.prefix}{item.teamBVal}{item.suffix}</Text>
            </View>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, { width: `${percA}%`, backgroundColor: '#3fe56c' }]} />
              <View style={[styles.barFill, { width: `${100 - percA}%`, backgroundColor: '#FFD700' }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: 24,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  teamLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statRow: {
    marginBottom: 18,
  },
  statLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statName: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  barContainer: {
    height: 4,
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  barFill: {
    height: '100%',
  }
});
