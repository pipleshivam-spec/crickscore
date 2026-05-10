import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme, AppTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

interface SocialHighlightProps {
  visible: boolean;
  onClose: () => void;
  innings1: any;
  innings2?: any;
  winner?: string;
  mvp?: { name: string; runs: number; wickets: number };
}

export const SocialHighlightModal: React.FC<SocialHighlightProps> = ({
  visible, onClose, innings1, innings2, winner, mvp
}) => {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <LinearGradient colors={['#0f172a', '#020617']} style={styles.card}>
            {/* Background Texture */}
            <View style={styles.gridOverlay}>
               {Array.from({ length: 15 }).map((_, i) => (
                 <View key={i} style={styles.gridLine} />
               ))}
            </View>

            <View style={styles.header}>
              <Text style={styles.brandText}>LAZYCRIC PROTOCOL</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ELITE HIGHLIGHT</Text>
              </View>
            </View>

            <View style={styles.mainContent}>
              <View style={styles.scoreRow}>
                 <View style={styles.teamBox}>
                    <Text style={styles.teamName}>{innings1?.battingTeam?.toUpperCase()}</Text>
                    <Text style={styles.teamScore}>{innings1?.runs}/{innings1?.wickets}</Text>
                    <Text style={styles.teamOvers}>{Math.floor(innings1?.balls/6)}.{innings1?.balls%6} OV</Text>
                 </View>
                 
                 <View style={styles.vsContainer}>
                    <Text style={styles.vsText}>VS</Text>
                 </View>

                 <View style={styles.teamBox}>
                    <Text style={styles.teamName}>{innings2?.battingTeam?.toUpperCase() || 'TBD'}</Text>
                    <Text style={styles.teamScore}>{innings2 ? `${innings2.runs}/${innings2.wickets}` : '---'}</Text>
                    <Text style={styles.teamOvers}>{innings2 ? `${Math.floor(innings2.balls/6)}.${innings2.balls%6} OV` : '---'}</Text>
                 </View>
              </View>

              <View style={styles.resultContainer}>
                 <LinearGradient colors={['rgba(59, 130, 246, 0.2)', 'transparent']} style={styles.resultInner}>
                    <Text style={styles.resultText}>{winner || 'MATCH IN PROGRESS'}</Text>
                 </LinearGradient>
              </View>

              {mvp && (
                <View style={styles.mvpSection}>
                   <Text style={styles.mvpLabel}>VALUABLE PLAYER</Text>
                   <Text style={styles.mvpName}>{mvp.name.toUpperCase()}</Text>
                   <Text style={styles.mvpStats}>{mvp.runs} RUNS • {mvp.wickets} WKTS</Text>
                </View>
              )}
            </View>

            <View style={styles.footer}>
               <Text style={styles.footerInfo}>GENERATE YOUR OWN AT LAZYCRIC.COM</Text>
               <View style={styles.qrPlaceholder}>
                  <View style={styles.qrInner} />
               </View>
            </View>
          </LinearGradient>
          
          <View style={styles.actions}>
             <TouchableOpacity style={styles.shareBtn} onPress={onClose}>
                <Text style={styles.shareText}>CLOSE HIGHLIGHT</Text>
             </TouchableOpacity>
             <Text style={styles.hintText}>TIP: SCREENSHOT TO SHARE</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  cardContainer: { width: width * 0.85, height: height * 0.7, alignItems: 'center' },
  card: { flex: 1, width: '100%', borderRadius: 32, overflow: 'hidden', padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-between', opacity: 0.05 },
  gridLine: { width: 1, height: '100%', backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 },
  brandText: { fontSize: 10, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2 },
  badge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 8, fontWeight: '900', color: '#FFF' },
  mainContent: { flex: 1, justifyContent: 'center' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 56 },
  teamBox: { alignItems: 'center', flex: 1 },
  teamName: { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 8 },
  teamScore: { fontSize: 36, fontWeight: '900', color: '#FFF', letterSpacing: -1 },
  teamOvers: { fontSize: 10, fontWeight: '700', color: theme.colors.accent, marginTop: 4 },
  vsContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  vsText: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.2)' },
  resultContainer: { alignItems: 'center', marginBottom: 48 },
  resultInner: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  resultText: { fontSize: 14, fontWeight: '900', color: '#60a5fa', letterSpacing: 1, textAlign: 'center' },
  mvpSection: { alignItems: 'center' },
  mvpLabel: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 4, marginBottom: 12 },
  mvpName: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.5, marginBottom: 4 },
  mvpStats: { fontSize: 12, fontWeight: '800', color: theme.colors.accent },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' },
  footerInfo: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.2)', width: '60%' },
  qrPlaceholder: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', padding: 4, borderRadius: 8 },
  qrInner: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 },
  actions: { marginTop: 32, alignItems: 'center' },
  shareBtn: { backgroundColor: '#FFF', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 },
  shareText: { fontSize: 13, fontWeight: '900', color: '#000', letterSpacing: 1 },
  hintText: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginTop: 16, letterSpacing: 2 },
});
