import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

interface ManhattanChartProps {
  teamARunsPerOver: number[];
  teamBRunsPerOver?: number[];
  maxOvers: number;
}

export const ManhattanChart = ({ teamARunsPerOver, teamBRunsPerOver, maxOvers }: ManhattanChartProps) => {
  const maxRuns = Math.max(...teamARunsPerOver, ...(teamBRunsPerOver || []), 15);
  const chartHeight = 100;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MANHATTAN CHART (RUNS PER OVER)</Text>
      <View style={[styles.chartArea, { height: chartHeight }]}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yText}>{maxRuns}</Text>
          <Text style={styles.yText}>{Math.round(maxRuns / 2)}</Text>
          <Text style={styles.yText}>0</Text>
        </View>

        <View style={styles.barsContainer}>
          {Array.from({ length: maxOvers }).map((_, i) => (
            <View key={i} style={styles.overColumn}>
              {/* Team A Bar */}
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: (teamARunsPerOver[i] / maxRuns) * chartHeight,
                    backgroundColor: '#3fe56c',
                    width: teamBRunsPerOver ? '40%' : '80%'
                  }
                ]} 
              />
              {/* Team B Bar (Optional) */}
              {teamBRunsPerOver && (
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (teamBRunsPerOver[i] / maxRuns) * chartHeight,
                      backgroundColor: '#FFD700',
                      width: '40%'
                    }
                  ]} 
                />
              )}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.xAxis}>
        <Text style={styles.xText}>1</Text>
        <Text style={styles.xText}>OVER</Text>
        <Text style={styles.xText}>{maxOvers}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  yAxis: {
    height: '100%',
    justifyContent: 'space-between',
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  yText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '700',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 4,
  },
  overColumn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 1,
  },
  bar: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 24,
  },
  xText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '700',
  },
});
