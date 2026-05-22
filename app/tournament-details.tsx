import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Alert, StatusBar } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { localDb } from '../src/lib/localDb';
import { generateFixtures as genFixtures, syncTournamentMatches as syncMatches, startOneTapMatch as startMatch, handleResumeMatch as resumeMatch, deleteMatch as removeMatch } from '../src/lib/tournamentLogic';
import { useAppTheme } from '../src/theme/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');

export default function TournamentDetails() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tournament, setTournament] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'points' | 'matches'>('points');
  const [selectedTeams, setSelectedTeams] = React.useState<{ a: string | null, b: string | null }>({ a: null, b: null });

  React.useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const data = await localDb.getTournament(id!);
      setTournament(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = () => {
    Alert.alert(
      "DELETE LEAGUE",
      "This action is irreversible. All standings and fixtures will be lost. Continue?",
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await localDb.deleteTournament(id!);
              router.replace('/tournaments');
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };



// startOneTapMatch logic moved to tournamentLogic library.

// deleteMatch logic moved to tournamentLogic library.

// syncTournamentMatches logic moved to tournamentLogic library.

// handleResumeMatch logic moved to tournamentLogic library.

  if (loading || !tournament) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const sortedTeams = [...tournament.teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.nrr || 0) - (a.nrr || 0);
  });

  const stats = {
    total: tournament.matches?.length || 0,
    finished: tournament.matches?.filter((m: any) => m.status === 'finished').length || 0,
    live: tournament.matches?.filter((m: any) => m.status === 'live').length || 0,
  };

  const generateTournamentPDF = async () => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; background: #020617; color: #f8fafc; padding: 32px; margin: 0; }
              .header { text-align: center; padding: 32px; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 24px; margin-bottom: 32px; border: 1px solid rgba(255,255,255,0.1); }
              .logo-brand { font-size: 10px; font-weight: 800; color: #3b82f6; letter-spacing: 4px; margin-bottom: 8px; }
              .league-title { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -1px; }
              .league-meta { font-size: 13px; color: #94a3b8; margin-top: 8px; }
              .section-title { font-size: 10px; font-weight: 800; color: #FF7E5F; letter-spacing: 3px; margin: 32px 0 16px; text-transform: uppercase; }
              table { width: 100%; border-collapse: collapse; background: rgba(30,41,59,0.5); border-radius: 16px; overflow: hidden; }
              th { background: rgba(255,126,95,0.1); color: #FF7E5F; font-size: 9px; letter-spacing: 1px; padding: 12px 16px; text-align: left; text-transform: uppercase; }
              td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #e2e8f0; }
              tr:last-child td { border-bottom: none; }
              .rank-box { background: rgba(255,255,255,0.05); color: #94a3b8; width: 22px; height: 22px; border-radius: 6px; display: inline-block; text-align: center; line-height: 22px; font-weight: 900; font-size: 11px; }
              .rank-box.top { background: #FF7E5F; color: #000; }
              .pts-val { color: #FF7E5F; font-weight: 900; }
              .nrr-pos { color: #10B981; }
              .nrr-neg { color: #EF4444; }
              .fixture-card { background: rgba(30,41,59,0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); }
              .fx-header { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-bottom: 8px; }
              .fx-teams { font-size: 15px; font-weight: 700; color: #fff; }
              .fx-vs { color: #FF7E5F; font-size: 11px; font-weight: 900; margin: 0 12px; }
              .fx-status { font-size: 9px; font-weight: 800; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; }
              .status-live { background: rgba(239,68,68,0.1); color: #EF4444; }
              .status-finished { background: rgba(16,185,129,0.1); color: #10B981; }
              .status-scheduled { background: rgba(255,255,255,0.05); color: #94a3b8; }
              .fx-result { font-size: 11px; color: #10B981; font-weight: 700; margin-top: 8px; }
              .footer { text-align: center; font-size: 10px; color: #475569; margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); letter-spacing: 1px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-brand">LazyCric Elite League Engine</div>
              <div class="league-title">${(tournament.name || 'LEAGUE').toUpperCase()}</div>
              <div class="league-meta">
                ${tournament.overs} OVERS • ${tournament.teams.length} TEAMS • ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Official Standings</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40px;">#</th>
                    <th>Team</th>
                    <th style="text-align: center;">P</th>
                    <th style="text-align: center;">W</th>
                    <th style="text-align: center;">L</th>
                    <th style="text-align: center;">Pts</th>
                    <th style="text-align: right;">NRR</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedTeams.map((t: any, i: number) => `
                    <tr>
                      <td><div class="rank-box ${i === 0 ? 'top' : ''}">${i + 1}</div></td>
                      <td class="team-name">${t.name}</td>
                      <td style="text-align: center; font-weight: 600;">${t.played || 0}</td>
                      <td style="text-align: center;">${t.won || 0}</td>
                      <td style="text-align: center;">${t.lost || 0}</td>
                      <td style="text-align: center;" class="pts-val">${t.points || 0}</td>
                      <td style="text-align: right;" class="${(t.nrr || 0) >= 0 ? 'nrr-pos' : 'nrr-neg'}">
                        ${(t.nrr || 0) > 0 ? '+' : ''}${(t.nrr || 0).toFixed(3)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Fixtures & Results</div>
              ${(tournament.matches || []).length === 0
          ? '<p style="color:#64748b; text-align: center;">No matches recorded yet.</p>'
          : (tournament.matches || []).map((m: any, i: number) => `
                    <div class="fixture-card">
                      <div class="fx-header">
                        <span>GAME #${i + 1} • ${new Date(m.date || m.created_at).toLocaleDateString('en-GB')}</span>
                        <span class="fx-status status-${m.status || 'scheduled'}">${(m.status || 'SCHEDULED').toUpperCase()}</span>
                      </div>
                      <div class="fx-teams">
                        <span>${(m.teamA || m.team_a || 'TBA').toUpperCase()}</span>
                        <span class="fx-vs">VS</span>
                        <span>${(m.teamB || m.team_b || 'TBA').toUpperCase()}</span>
                      </div>
                      ${m.result ? `<div class="fx-result">${m.result.toUpperCase()}</div>` : ''}
                    </div>
                  `).join('')}
            </div>

            <div class="footer">
              OFFICIAL REPORT GENERATED BY LAZYCRIC ELITE ENGINE<br/>
              © ${new Date().getFullYear()} LAZYCRIC BROADCAST PROTOCOL
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('PDF ERROR', 'Could not generate report. Please try again.');
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.surfaceAlt]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/tournaments')}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title} numberOfLines={1}>{(tournament.name || 'LEAGUE').toUpperCase()}</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.tagText}>{tournament.overs} OVERS • {tournament.teams.length} TEAMS</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteTournament}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfBtn} onPress={() => syncMatches(tournament, setLoading, loadTournament)}>
            <Ionicons name="sync-outline" size={20} color={theme.colors.success} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfBtn} onPress={generateTournamentPDF}>
            <Ionicons name="download-outline" size={20} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.insightsBanner}>
          <View style={styles.insightBox}>
            <Text style={styles.insightVal}>{stats.total}</Text>
            <Text style={styles.insightLab}>TOTAL MATCHES</Text>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightBox}>
            <Text style={[styles.insightVal, { color: theme.colors.success }]}>{stats.finished}</Text>
            <Text style={styles.insightLab}>COMPLETED</Text>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightBox}>
            <Text style={[styles.insightVal, { color: theme.colors.accent }]}>{stats.live}</Text>
            <Text style={styles.insightLab}>LIVE NOW</Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'points' && styles.tabActive]}
              onPress={() => setActiveTab('points')}
            >
              <Ionicons name="trophy" size={12} color={activeTab === 'points' ? theme.colors.accent : theme.colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, activeTab === 'points' && styles.tabTextActive]}>STANDINGS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'matches' && styles.tabActive]}
              onPress={() => setActiveTab('matches')}
            >
              <Ionicons name="calendar" size={12} color={activeTab === 'matches' ? theme.colors.accent : theme.colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>FIXTURES</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View 
          layout={Layout.springify()} 
          style={styles.contentArea}
        >
          {activeTab === 'points' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.innerScroll}>
              <Animated.View entering={FadeInDown.duration(600)} style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2.5, textAlign: 'left' }]}>SQUAD</Text>
                  <Text style={styles.th}>P</Text>
                  <Text style={styles.th}>W</Text>
                  <Text style={styles.th}>L</Text>
                  <Text style={styles.th}>PTS</Text>
                  <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>NRR</Text>
                </View>
                {sortedTeams.map((team, index) => (
                  <View key={index} style={[styles.tableRow, index === 0 && styles.topRow]}>
                    <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.rankBox, index === 0 && styles.rankBoxGold]}>
                        <Text style={[styles.rank, index === 0 && { color: '#FFF' }]}>{index + 1}</Text>
                      </View>
                      <Text style={styles.teamName} numberOfLines={1}>{(team.name || 'TEAM').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.td}>{team.played || 0}</Text>
                    <Text style={styles.td}>{team.won || 0}</Text>
                    <Text style={styles.td}>{team.lost || 0}</Text>
                    <Text style={[styles.td, { color: theme.colors.accent, fontWeight: '900' }]}>{team.points || 0}</Text>
                    <Text style={[styles.td, { flex: 1.2, fontSize: 10, textAlign: 'right', color: (team.nrr || 0) >= 0 ? theme.colors.success : theme.colors.danger }]}>
                      {(team.nrr || 0) > 0 ? '+' : ''}{(team.nrr || 0).toFixed(3)}
                    </Text>
                  </View>
                ))}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.quickStartSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>BROADCAST CONTROL: QUICK START</Text>
                  <View style={styles.titleLine} />
                </View>

                <View style={styles.quickSetupBox}>
                  <View style={styles.selectRow}>
                    <View style={styles.selectItem}>
                      <Text style={styles.selectLabel}>HOME</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {tournament.teams.map((t: any) => (
                          <TouchableOpacity
                            key={t.name}
                            style={[styles.teamChip, selectedTeams.a === t.name && styles.teamChipActive]}
                            onPress={() => setSelectedTeams(prev => ({ ...prev, a: t.name }))}
                          >
                            <Text style={[styles.teamChipText, selectedTeams.a === t.name && styles.teamChipTextActive]}>{t.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.vsCircle}>
                      <Text style={styles.vsText}>VS</Text>
                    </View>

                    <View style={styles.selectItem}>
                      <Text style={styles.selectLabel}>AWAY</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {tournament.teams.map((t: any) => (
                          <TouchableOpacity
                            key={t.name}
                            style={[styles.teamChip, selectedTeams.b === t.name && styles.teamChipActive]}
                            onPress={() => setSelectedTeams(prev => ({ ...prev, b: t.name }))}
                            disabled={selectedTeams.a === t.name}
                          >
                            <Text style={[styles.teamChipText, selectedTeams.b === t.name && styles.teamChipTextActive, selectedTeams.a === t.name && { opacity: 0.2 }]}>{t.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.quickStartBtn, (!selectedTeams.a || !selectedTeams.b) && { opacity: 0.5 }]}
                    disabled={!selectedTeams.a || !selectedTeams.b}
                    onPress={() => startMatch(tournament, selectedTeams.a!, selectedTeams.b!, setLoading, loadTournament)}
                  >
                    <LinearGradient colors={[theme.colors.accent, '#f97316']} style={styles.quickStartBtnInner}>
                      <Ionicons name="flash" size={14} color="#FFF" />
                      <Text style={styles.quickStartBtnText}>INITIALIZE LIVE SESSION</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.innerScroll}>
              {tournament.matches && tournament.matches.length > 0 ? (
                tournament.matches.map((match: any, index: number) => (
                  <Animated.View key={index} entering={FadeInDown.delay(index * 50).duration(400)}>
                    <TouchableOpacity
                      style={styles.fixtureCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (match.status === 'scheduled') {
                          startMatch(tournament, match.teamA || match.team_a, match.teamB || match.team_b, setLoading, loadTournament);
                        } else if (match.status === 'live' && match.id) {
                          resumeMatch(match.id, setLoading);
                        }
                      }}
                    >
                      <View style={styles.fixtureHeader}>
                        <View style={styles.matchIdBox}>
                          <Text style={styles.matchIdText}>SESSION #{index + 1}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.statusBadge, { backgroundColor: match.status === 'live' ? 'rgba(239, 68, 68, 0.1)' : match.status === 'finished' ? 'rgba(16,185,129,0.1)' : 'rgba(255, 255, 255, 0.05)' }]}>
                            <View style={[styles.statusDot, { backgroundColor: match.status === 'live' ? theme.colors.danger : match.status === 'finished' ? theme.colors.success : theme.colors.textMuted }]} />
                            <Text style={[styles.statusText, { color: match.status === 'live' ? theme.colors.danger : match.status === 'finished' ? theme.colors.success : theme.colors.textMuted }]}>
                              {match.status?.toUpperCase() || 'SCHEDULED'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.matchDeleteBtn}
                            onPress={(e) => { e.stopPropagation?.(); removeMatch(match.id, setLoading, loadTournament); }}
                          >
                            <Ionicons name="trash-outline" size={14} color="rgba(239,68,68,0.5)" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.matchBody}>
                        <View style={styles.mTeamBox}>
                          <Text style={styles.mTeamName} numberOfLines={1}>{(match.teamA || match.team_a || 'TBA').toUpperCase()}</Text>
                        </View>
                        <View style={styles.mVsBox}>
                          <Text style={styles.mVsText}>VS</Text>
                        </View>
                        <View style={styles.mTeamBox}>
                          <Text style={[styles.mTeamName, { textAlign: 'right' }]} numberOfLines={1}>{(match.teamB || match.team_b || 'TBA').toUpperCase()}</Text>
                        </View>
                      </View>

                      {match.result && (
                        <View style={styles.resultRow}>
                          <Text style={styles.resultText}>{match.result.toUpperCase()}</Text>
                        </View>
                      )}

                      <View style={styles.fixtureFooter}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                        <Text style={styles.matchDateText}>{new Date(match.date || match.created_at).toLocaleDateString()} • BROADCAST ARCHIVE</Text>
                        {(match.status === 'scheduled' || match.status === 'live') && (
                          <View style={styles.tapToStart}>
                            <Text style={[styles.tapText, match.status === 'live' && { color: theme.colors.danger }]}>
                              {match.status === 'live' ? 'RESUME' : 'START'}
                            </Text>
                            <Ionicons name="chevron-forward" size={10} color={match.status === 'live' ? theme.colors.danger : theme.colors.accent} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))
              ) : (
                <Animated.View entering={FadeIn.duration(800)} style={styles.emptyState}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted + '20'} />
                  </View>
                  <Text style={styles.emptyTitle}>NO ARCHIVED FIXTURES</Text>
                  <Text style={styles.emptySub}>Set up the entire round-robin schedule instantly for professional league management</Text>

                  <TouchableOpacity style={styles.generateBtn} onPress={() => genFixtures(tournament, setLoading, loadTournament)}>
                    <LinearGradient colors={[theme.colors.accent, theme.colors.accentSecondary]} style={styles.genBtnInner}>
                      <Text style={styles.genBtnText}>INITIALIZE ALL FIXTURES</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </ScrollView>
          )}
        </Animated.View>

        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push({ pathname: '/match-setup', params: { tournamentId: id } })}
          >
            <LinearGradient colors={[theme.colors.accent, theme.colors.accentSecondary]} style={styles.fabInner}>
              <Ionicons name="add" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <BottomNavBar />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1, paddingTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  headerTitleContainer: { flex: 1 },
  title: { fontSize: 22, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, letterSpacing: -0.8 },
  badgeRow: { marginTop: 4 },
  tagText: { fontSize: 9, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  deleteBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  pdfBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,126,95,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,126,95,0.15)' },
  insightsBanner: {
    flexDirection: 'row',
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  insightBox: { flex: 1, alignItems: 'center' },
  insightVal: { fontSize: 20, fontFamily: theme.typography.fontFamily.manrope, color: theme.colors.text, fontWeight: '800' },
  insightLab: { fontSize: 8, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, marginTop: 4, letterSpacing: 1.5, textTransform: 'uppercase' },
  insightDivider: { width: 1, height: 24, backgroundColor: theme.colors.border },
  tabsContainer: { paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.surfaceAlt, borderRadius: 16, padding: 6, gap: 6, borderWidth: 1, borderColor: theme.colors.border },
  tab: { flex: 1, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: theme.colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
  tabText: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1 },
  tabTextActive: { color: theme.colors.accent },
  contentArea: { flex: 1 },
  innerScroll: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 },
  tableCard: { 
    backgroundColor: theme.colors.surface, 
    borderRadius: 24, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 8 },
  th: { flex: 1, fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1.5, textAlign: 'center', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  topRow: { backgroundColor: 'rgba(162, 28, 60, 0.05)', borderRadius: 16, borderBottomWidth: 0, marginHorizontal: -4, paddingHorizontal: 4 },
  rankBox: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  rankBoxGold: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  rank: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted },
  teamName: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, letterSpacing: -0.3 },
  td: { flex: 1, fontSize: 14, fontFamily: theme.typography.fontFamily.manrope, color: theme.colors.text, textAlign: 'center', fontWeight: '700' },
  quickStartSection: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 2.5, textTransform: 'uppercase' },
  titleLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  quickSetupBox: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  selectItem: { flex: 1 },
  selectLabel: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  chipScroll: { paddingVertical: 4 },
  teamChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  teamChipActive: { backgroundColor: 'rgba(162, 28, 60, 0.05)', borderColor: theme.colors.accent },
  teamChipText: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted },
  teamChipTextActive: { color: theme.colors.accent },
  vsCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  vsText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted },
  quickStartBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 4 },
  quickStartBtnInner: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  quickStartBtnText: { color: '#FFF', fontSize: 12, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1.5 },
  fixtureCard: { 
    backgroundColor: theme.colors.surface, 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  matchDeleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' },
  fixtureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  matchIdBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.surfaceAlt },
  matchIdText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1.5 },
  matchBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  mTeamBox: { flex: 1 },
  mTeamName: { fontSize: 16, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, letterSpacing: -0.5 },
  mVsBox: { width: 40, alignItems: 'center' },
  mVsText: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, opacity: 0.4 },
  resultRow: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 14, marginVertical: 12, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  resultText: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: '#10B981', letterSpacing: 1 },
  fixtureFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  matchDateText: { fontSize: 10, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, flex: 1 },
  tapToStart: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tapText: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 1 },
  emptyState: { marginTop: 60, alignItems: 'center', padding: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 32, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: theme.colors.border },
  emptyTitle: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, letterSpacing: 1.5 },
  emptySub: { fontSize: 10, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 16 },
  generateBtn: { marginTop: 40, borderRadius: 20, overflow: 'hidden', width: '100%' },
  genBtnInner: { height: 56, alignItems: 'center', justifyContent: 'center' },
  genBtnText: { color: '#FFF', fontSize: 12, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 2 },
  fabContainer: { position: 'absolute', bottom: 100, right: 24 },
  fab: { borderRadius: 24, overflow: 'hidden', ...theme.shadows.glow },
  fabInner: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
});
