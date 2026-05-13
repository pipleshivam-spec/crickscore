import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { localDb } from '../src/lib/localDb';
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
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'points' | 'matches'>('points');
  const [selectedTeams, setSelectedTeams] = useState<{ a: string | null, b: string | null }>({ a: null, b: null });

  useEffect(() => {
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

  const generateFixtures = async () => {
    if (!tournament) return;

    try {
      setLoading(true);
      const teams = tournament.teams.map((t: any) => t.name);
      const matches = [];
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matches.push({
            id: `m_${Date.now()}_${i}_${j}`,
            team_a: teams[i],
            team_b: teams[j],
            status: 'scheduled',
            created_at: new Date().toISOString()
          });
        }
      }

      const updatedTournament = {
        ...tournament,
        matches: [...(tournament.matches || []), ...matches]
      };
      await localDb.saveTournament(updatedTournament);
      loadTournament();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startOneTapMatch = async (teamA: string, teamB: string) => {
    try {
      setLoading(true);
      const matchId = `match_${Date.now()}`;
      const newMatch = {
        id: matchId,
        team_a: teamA,
        team_b: teamB,
        overs: tournament.overs,
        status: 'live',
        created_at: new Date().toISOString(),
        tournament_id: id,
        isLocal: true
      };

      const updatedTournament = {
        ...tournament,
        matches: [...(tournament.matches || []), newMatch]
      };
      await localDb.saveTournament(updatedTournament);
      await localDb.saveMatch(newMatch);

      router.push({
        pathname: '/toss',
        params: { matchId, team1Name: teamA, team2Name: teamB }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteMatch = (matchId: string) => {
    Alert.alert(
      "REMOVE FIXTURE",
      "Remove this match from the fixture list and global history?",
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "REMOVE",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await localDb.deleteMatch(matchId);
              loadTournament();
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleResumeMatch = async (matchId: string) => {
    try {
      setLoading(true);
      const fullMatch = await localDb.getMatch(matchId);
      if (!fullMatch) {
        Alert.alert('ERROR', 'Match data not found.');
        return;
      }

      const activeInnings = fullMatch.innings?.find((i: any) => i.status === 'active') ||
        fullMatch.innings?.[fullMatch.innings.length - 1] ||
        { id: `${matchId}_inn1` };

      router.push({
        pathname: '/scoring',
        params: {
          matchId,
          inningsId: activeInnings.id,
          isLocal: 'true',
          autoShowSummary: 'false'
        }
      });
    } catch (e) {
      Alert.alert('ERROR', 'Failed to resume match.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !tournament) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const sortedTeams = [...tournament.teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
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
              .logo { font-size: 10px; font-weight: 800; color: #FF7E5F; letter-spacing: 4px; margin-bottom: 8px; }
              .league-name { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -1px; }
              .sub { font-size: 13px; color: #94a3b8; margin-top: 8px; }
              .section-title { font-size: 10px; font-weight: 800; color: #FF7E5F; letter-spacing: 3px; margin: 32px 0 16px; text-transform: uppercase; }
              table { width: 100%; border-collapse: collapse; background: rgba(30,41,59,0.5); border-radius: 16px; overflow: hidden; }
              th { background: rgba(255,126,95,0.1); color: #FF7E5F; font-size: 9px; letter-spacing: 1px; padding: 12px 16px; text-align: left; text-transform: uppercase; }
              td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #e2e8f0; }
              tr:last-child td { border-bottom: none; }
              .rank-gold { background: #FF7E5F; color: #000; width: 22px; height: 22px; border-radius: 6px; display: inline-block; text-align: center; line-height: 22px; font-weight: 900; font-size: 11px; }
              .rank-normal { background: rgba(255,255,255,0.05); color: #94a3b8; width: 22px; height: 22px; border-radius: 6px; display: inline-block; text-align: center; line-height: 22px; font-weight: 900; font-size: 11px; }
              .pts { color: #FF7E5F; font-weight: 900; }
              .nrr-pos { color: #10B981; }
              .nrr-neg { color: #EF4444; }
              .fixture { background: rgba(30,41,59,0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
              .fx-teams { font-size: 15px; font-weight: 700; color: #fff; }
              .fx-vs { color: #FF7E5F; font-size: 11px; font-weight: 900; margin: 0 12px; }
              .fx-status { font-size: 9px; font-weight: 800; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; }
              .status-live { background: rgba(239,68,68,0.1); color: #EF4444; }
              .status-finished { background: rgba(16,185,129,0.1); color: #10B981; }
              .status-scheduled { background: rgba(255,255,255,0.05); color: #94a3b8; }
              .footer { text-align: center; font-size: 10px; color: #475569; margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); letter-spacing: 1px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">LAZYCRIC ELITE ENGINE</div>
              <div class="league-name">${tournament.name.toUpperCase()}</div>
              <div class="sub">${tournament.overs} OVERS • ${tournament.teams.length} TEAMS • ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>

            <div class="section-title">League Standings</div>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th><th>NRR</th>
                </tr>
              </thead>
              <tbody>
                ${sortedTeams.map((t: any, i: number) => `
                  <tr>
                    <td><span class="${i === 0 ? 'rank-gold' : 'rank-normal'}">${i + 1}</span></td>
                    <td style="font-weight:700;color:#fff">${t.name}</td>
                    <td>${t.played || 0}</td>
                    <td>${t.won || 0}</td>
                    <td>${t.lost || 0}</td>
                    <td class="pts">${t.points || 0}</td>
                    <td class="${(t.nrr || 0) >= 0 ? 'nrr-pos' : 'nrr-neg'}">${(t.nrr || 0) > 0 ? '+' : ''}${(t.nrr || 0).toFixed(3)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="section-title">Fixtures & Results</div>
            ${(tournament.matches || []).length === 0
          ? '<p style="color:#64748b;text-align:center;">No fixtures generated yet.</p>'
          : (tournament.matches || []).map((m: any, i: number) => `
                <div class="fixture">
                  <div>
                    <span class="fx-teams">${m.teamA} <span class="fx-vs">VS</span> ${m.teamB}</span><br/>
                    <span style="font-size:11px;color:#64748b;">${new Date(m.date).toLocaleDateString()} • Game #${i + 1}</span>
                    ${m.result ? `<br/><span style="font-size:12px;color:#10B981;font-weight:700;">${m.result}</span>` : ''}
                  </div>
                  <span class="fx-status status-${m.status || 'scheduled'}">${(m.status || 'SCHEDULED').toUpperCase()}</span>
                </div>
              `).join('')}

            <div class="footer">
              GENERATED BY LAZYCRIC ELITE ENGINE • OFFICIAL LEAGUE REPORT
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
      <LinearGradient colors={['#0f172a', '#000']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        {/* Professional Fixed Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/tournaments')}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title} numberOfLines={1}>{tournament.name.toUpperCase()}</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.tagText}>{tournament.overs} OVERS • {tournament.teams.length} TEAMS</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteTournament}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfBtn} onPress={generateTournamentPDF}>
            <Ionicons name="download-outline" size={20} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Insights Banner */}
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

        {/* Professional Fixed Tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'points' && styles.tabActive]}
              onPress={() => setActiveTab('points')}
            >
              <Ionicons name="trophy" size={12} color={activeTab === 'points' ? theme.colors.accent : 'rgba(255,255,255,0.2)'} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, activeTab === 'points' && styles.tabTextActive]}>STANDINGS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'matches' && styles.tabActive]}
              onPress={() => setActiveTab('matches')}
            >
              <Ionicons name="calendar" size={12} color={activeTab === 'matches' ? theme.colors.accent : 'rgba(255,255,255,0.2)'} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>FIXTURES</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content Area Only */}
        <View style={styles.contentArea}>
          {activeTab === 'points' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.innerScroll}>
              <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2.5, textAlign: 'left' }]}>TEAM</Text>
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
                        <Text style={[styles.rank, index === 0 && { color: '#000' }]}>{index + 1}</Text>
                      </View>
                      <Text style={styles.teamName} numberOfLines={1}>{team.name.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.td}>{team.played}</Text>
                    <Text style={styles.td}>{team.won}</Text>
                    <Text style={styles.td}>{team.lost || 0}</Text>
                    <Text style={[styles.td, { color: theme.colors.accent, fontWeight: '900' }]}>{team.points}</Text>
                    <Text style={[styles.td, { flex: 1.2, fontSize: 10, textAlign: 'right', color: team.nrr >= 0 ? theme.colors.success : theme.colors.danger }]}>
                      {team.nrr > 0 ? '+' : ''}{team.nrr.toFixed(3)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.quickStartSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>ONE-TAP QUICK START</Text>
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
                    onPress={() => startOneTapMatch(selectedTeams.a!, selectedTeams.b!)}
                  >
                    <LinearGradient colors={[theme.colors.accent, '#f97316']} style={styles.quickStartBtnInner}>
                      <Ionicons name="flash" size={14} color="#000" />
                      <Text style={styles.quickStartBtnText}>START SCORING NOW</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.innerScroll}>
              {tournament.matches && tournament.matches.length > 0 ? (
                tournament.matches.map((match: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.fixtureCard}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (match.status === 'scheduled') {
                        startOneTapMatch(match.team_a, match.team_b);
                      } else if (match.status === 'live' && match.id) {
                        handleResumeMatch(match.id);
                      }
                    }}
                  >
                    <View style={styles.fixtureHeader}>
                      <View style={styles.matchIdBox}>
                        <Text style={styles.matchIdText}>GAME #{index + 1}</Text>
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
                          onPress={(e) => { e.stopPropagation?.(); deleteMatch(match.id); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={14} color="rgba(239,68,68,0.5)" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.matchBody}>
                      <View style={styles.mTeamBox}>
                        <Text style={styles.mTeamName} numberOfLines={1}>{match.teamA.toUpperCase()}</Text>
                      </View>
                      <View style={styles.mVsBox}>
                        <Text style={styles.mVsText}>VS</Text>
                      </View>
                      <View style={styles.mTeamBox}>
                        <Text style={[styles.mTeamName, { textAlign: 'right' }]} numberOfLines={1}>{match.teamB.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.fixtureFooter}>
                      <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.3)" />
                      <Text style={styles.matchDateText}>{new Date(match.date).toLocaleDateString()} • BROADCAST MATCH</Text>
                      {match.status === 'scheduled' && (
                        <View style={styles.tapToStart}>
                          <Text style={styles.tapText}>START</Text>
                          <Ionicons name="chevron-forward" size={10} color={theme.colors.accent} />
                        </View>
                      )}
                      {match.status === 'live' && (
                        <View style={styles.tapToStart}>
                          <Text style={[styles.tapText, { color: theme.colors.danger }]}>RESUME</Text>
                          <Ionicons name="chevron-forward" size={10} color={theme.colors.danger} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.05)" />
                  </View>
                  <Text style={styles.emptyTitle}>NO FIXTURES SET</Text>
                  <Text style={styles.emptySub}>Set up the entire round-robin schedule instantly</Text>

                  <TouchableOpacity style={styles.generateBtn} onPress={generateFixtures}>
                    <LinearGradient colors={[theme.colors.accent, theme.colors.accentSecondary]} style={styles.genBtnInner}>
                      <Text style={styles.genBtnText}>GENERATE ALL FIXTURES</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Floating Action Button - Stays outside scroll */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push({ pathname: '/match-setup', params: { tournamentId: id } })}
          >
            <LinearGradient colors={[theme.colors.accent, theme.colors.accentSecondary]} style={styles.fabInner}>
              <Ionicons name="add" size={24} color="#000" />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flex: 1 },
  title: { fontSize: 18, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -0.5 },
  badgeRow: { marginTop: 2 },
  tagText: { fontSize: 8, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.accent, letterSpacing: 1 },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.05)', alignItems: 'center', justifyContent: 'center' },
  pdfBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,126,95,0.08)', alignItems: 'center', justifyContent: 'center' },

  insightsBanner: {
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  insightBox: { flex: 1, alignItems: 'center' },
  insightVal: { fontSize: 16, fontFamily: theme.typography.fontFamily.manrope, color: '#FFF' },
  insightLab: { fontSize: 7, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, marginTop: 3, letterSpacing: 1 },
  insightDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.05)' },

  tabsContainer: { paddingHorizontal: 16, marginTop: 10, marginBottom: 6 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, height: 36, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  tabText: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 },
  tabTextActive: { color: theme.colors.accent },

  contentArea: { flex: 1 },
  innerScroll: { paddingHorizontal: 16, paddingBottom: 110, paddingTop: 6 },

  tableCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 4 },
  th: { flex: 1, fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted, letterSpacing: 1, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  topRow: { backgroundColor: 'rgba(255, 126, 95, 0.05)', borderRadius: 12, borderBottomWidth: 0 },
  rankBox: { width: 22, height: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  rankBoxGold: { backgroundColor: theme.colors.accent },
  rank: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.4)' },
  teamName: { fontSize: 12, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -0.2 },
  td: { flex: 1, fontSize: 12, fontFamily: theme.typography.fontFamily.semiBold, color: '#FFF', textAlign: 'center' },

  quickStartSection: { marginTop: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 2 },
  titleLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  quickSetupBox: { backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  selectItem: { flex: 1 },
  selectLabel: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginBottom: 6 },
  chipScroll: { paddingVertical: 4 },
  teamChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  teamChipActive: { backgroundColor: 'rgba(255, 126, 95, 0.1)', borderColor: theme.colors.accent },
  teamChipText: { fontSize: 9, fontFamily: theme.typography.fontFamily.semiBold, color: 'rgba(255,255,255,0.3)' },
  teamChipTextActive: { color: theme.colors.accent },
  vsCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  vsText: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent },
  quickStartBtn: { borderRadius: 16, overflow: 'hidden' },
  quickStartBtnInner: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  quickStartBtnText: { color: '#000', fontSize: 11, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1 },

  fixtureCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  matchDeleteBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.05)', alignItems: 'center', justifyContent: 'center' },
  fixtureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  matchIdBox: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)' },
  matchIdText: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1 },
  matchBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  mTeamBox: { flex: 1 },
  mTeamName: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -0.5 },
  mVsBox: { width: 30, alignItems: 'center' },
  mVsText: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, opacity: 0.3 },
  fixtureFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
  matchDateText: { fontSize: 9, fontFamily: theme.typography.fontFamily.semiBold, color: 'rgba(255,255,255,0.2)', flex: 1 },
  tapToStart: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tapText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 0.5 },

  emptyState: { marginTop: 40, alignItems: 'center', padding: 40 },
  emptyIconBox: { width: 64, height: 64, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 12, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: 1 },
  emptySub: { fontSize: 9, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8 },
  generateBtn: { marginTop: 32, borderRadius: 16, overflow: 'hidden', width: '100%' },
  genBtnInner: { height: 50, alignItems: 'center', justifyContent: 'center' },
  genBtnText: { color: '#000', fontSize: 10, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1 },

  fabContainer: { position: 'absolute', bottom: 90, right: 20 },
  fab: { borderRadius: 20, overflow: 'hidden', ...theme.shadows.glow },
  fabInner: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
});
