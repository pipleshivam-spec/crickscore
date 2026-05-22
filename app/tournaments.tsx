import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { localDb } from '../src/lib/localDb';
import { useAppTheme } from '../src/theme/ThemeContext';
import { router } from 'expo-router';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Tournaments() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [tournaments, setTournaments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [newTournament, setNewTournament] = React.useState({ name: '', overs: '20', teams: '' });

  React.useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await localDb.getTournaments();
      setTournaments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTournament.name) return;
    const tourId = `tour_${Date.now()}`;
    const tournament = {
      id: tourId,
      name: newTournament.name,
      overs: parseInt(newTournament.overs),
      teams: newTournament.teams.split(',').map(t => t.trim()).filter(t => t !== '').map(name => ({
        name, played: 0, won: 0, lost: 0, draw: 0, points: 0, nrr: 0
      })),
      matches: [],
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await localDb.saveTournament(tournament);
    setModalVisible(false);
    setNewTournament({ name: '', overs: '20', teams: '' });
    router.push({ pathname: '/tournament-details', params: { id: tourId } });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.surfaceAlt]} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>TOURNAMENTS</Text>
            <Text style={styles.subtitle}>ELITE LEAGUE MANAGEMENT ENGINE</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <LinearGradient colors={[theme.colors.accent, theme.colors.accentSecondary]} style={styles.addBtnInner}>
              <Text style={styles.addBtnText}>+ NEW</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {tournaments.length > 0 ? (
            tournaments.map((tour, idx) => (
              <Animated.View 
                key={tour.id} 
                entering={FadeInDown.delay(idx * 100).duration(600)}
              >
                <TouchableOpacity 
                  style={styles.tourCard}
                  onPress={() => router.push({ pathname: '/tournament-details', params: { id: tour.id } })}
                  activeOpacity={0.9}
                >
                  <LinearGradient 
                    colors={[theme.colors.surface, theme.colors.surfaceAlt]} 
                    style={styles.cardInner}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: tour.status === 'active' ? '#10B981' : theme.colors.textMuted }]} />
                        <Text style={styles.statusText}>{(tour.status || 'ACTIVE').toUpperCase()}</Text>
                      </View>
                      <View style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={10} color={theme.colors.textMuted} />
                        <Text style={styles.dateText}>{new Date(tour.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.tourName}>{(tour.name || 'LEAGUE').toUpperCase()}</Text>
                    
                    <View style={styles.tourMeta}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaVal}>{tour.teams.length}</Text>
                        <Text style={styles.metaLab}>SQUADS</Text>
                      </View>
                      <View style={styles.vDivider} />
                      <View style={styles.metaItem}>
                        <Text style={styles.metaVal}>{tour.overs}</Text>
                        <Text style={styles.metaLab}>OVERS</Text>
                      </View>
                      <View style={styles.vDivider} />
                      <View style={styles.metaItem}>
                        <Text style={styles.metaVal}>{tour.matches?.length || 0}</Text>
                        <Text style={styles.metaLab}>SESSION</Text>
                      </View>
                    </View>

                    <View style={styles.cardFooterPro}>
                      <Text style={styles.footerTextPro}>MANAGED BY LAZYCRIC ELITE ENGINE</Text>
                      <Ionicons name="chevron-forward" size={12} color={theme.colors.accent} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>NO ACTIVE TOURNAMENTS</Text>
              <Text style={styles.emptySub}>CREATE YOUR FIRST LEAGUE TO START TRACKING POINTS TABLES AND TEAM STANDINGS</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.emptyAddText}>CREATE TOURNAMENT</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Create Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={[theme.colors.surface, theme.colors.surfaceAlt]} style={StyleSheet.absoluteFill} />
            <Text style={styles.modalTitle}>NEW TOURNAMENT</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>TOURNAMENT NAME</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Summer Premier League" 
                placeholderTextColor="rgba(0,0,0,0.25)"
                value={newTournament.name}
                onChangeText={(t) => setNewTournament(prev => ({ ...prev, name: t }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MATCH OVERS</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric"
                placeholder="20" 
                placeholderTextColor="rgba(0,0,0,0.25)"
                value={newTournament.overs}
                onChangeText={(t) => setNewTournament(prev => ({ ...prev, overs: t }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TEAMS (COMMA SEPARATED)</Text>
              <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} 
                multiline
                placeholder="Team A, Team B, Team C..." 
                placeholderTextColor="rgba(0,0,0,0.25)"
                value={newTournament.teams}
                onChangeText={(t) => setNewTournament(prev => ({ ...prev, teams: t }))}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                <LinearGradient colors={[theme.colors.accent, theme.colors.accentSecondary]} style={styles.createBtnInner}>
                  <Text style={styles.createBtnText}>START ENGINE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavBar />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1, paddingTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { padding: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: theme.colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 8, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2, marginTop: 4 },
  addBtn: { borderRadius: 12, overflow: 'hidden' },
  addBtnInner: { paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  scroll: { paddingHorizontal: 24, paddingBottom: 120 },

  tourCard: { marginBottom: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  cardInner: { padding: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 8, fontWeight: '900', color: theme.colors.text, letterSpacing: 1 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  dateText: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 0.5 },
  tourName: { fontSize: 20, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5, marginBottom: 20 },
  tourMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.surfaceAlt, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border },
  metaItem: { alignItems: 'center', flex: 1 },
  metaVal: { fontSize: 18, fontWeight: '900', color: theme.colors.accent },
  metaLab: { fontSize: 8, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1, marginTop: 4 },
  vDivider: { width: 1, height: 20, backgroundColor: theme.colors.border },
  cardFooterPro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  footerTextPro: { fontSize: 8, fontWeight: '900', color: theme.colors.textMuted, letterSpacing: 1.5 },

  emptyBox: { marginTop: 60, alignItems: 'center', padding: 40, borderRadius: 32, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
  emptyIcon: { fontSize: 48, marginBottom: 24, opacity: 0.2 },
  emptyText: { fontSize: 14, fontWeight: '900', color: theme.colors.text, letterSpacing: 1 },
  emptySub: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 18 },
  emptyAddBtn: { marginTop: 32, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  emptyAddText: { color: theme.colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, borderTopWidth: 1, borderTopColor: theme.colors.border, overflow: 'hidden' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, letterSpacing: 2, marginBottom: 32, textAlign: 'center' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 9, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2, marginBottom: 12 },
  input: { backgroundColor: theme.colors.surfaceAlt, borderRadius: 16, height: 56, paddingHorizontal: 20, color: theme.colors.text, fontWeight: '700', borderWidth: 1, borderColor: theme.colors.border },
  modalActions: { flexDirection: 'row', gap: 16, marginTop: 16 },
  cancelBtn: { flex: 1, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  cancelText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '900' },
  createBtn: { flex: 2, height: 64, borderRadius: 20, overflow: 'hidden' },
  createBtnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
