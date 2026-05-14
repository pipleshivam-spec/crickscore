import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Alert, StatusBar } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
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
            teamA: teams[i],
            teamB: teams[j],
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
        teamA: teamA,
        teamB: teamB,
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

  const syncTournamentMatches = async () => {
    try {
      setLoading(true);
      const allMatches = await localDb.getMatches();
      const leagueTeams = tournament.teams.map((t: any) => t.name.toLowerCase());
      
      const leagueMatches = allMatches.filter((m: any) => {
        if (m.tournament_id === id) return true;
        const t1 = (m.teamA || m.team_a || '').toLowerCase();
        const t2 = (m.teamB || m.team_b || '').toLowerCase();
        return m.tournament_id === null && leagueTeams.includes(t1) && leagueTeams.includes(t2);
      });

      const newTeams = tournament.teams.map((t: any) => ({
        ...t,
        played: 0, won: 0, lost: 0, draw: 0, points: 0, nrr: 0,
        totalRunsScored: 0, totalOversFaced: 0, totalRunsConceded: 0, totalOversBowled: 0
      }));

      const processedMatches = leagueMatches.map((m: any) => {
        const inn1 = m.innings?.[0];
        const inn2 = m.innings?.[1];
        
        if (m.status === 'finished' && inn1 && inn2) {
          const tAIdx = newTeams.findIndex((t: any) => t.name.toLowerCase() === inn1.battingTeam.toLowerCase());
          const tBIdx = newTeams.findIndex((t: any) => t.name.toLowerCase() === inn2.battingTeam.toLowerCase());

          if (tAIdx !== -1 && tBIdx !== -1) {
            const teamA = newTeams[tAIdx];
            const teamB = newTeams[tBIdx];
            const tourOvers = tournament.overs || 20;

            teamA.played++;
            teamB.played++;

            if (inn2.runs > inn1.runs) {
              teamB.won++;
              teamB.points += 2;
              teamA.lost++;
            } else if (inn2.runs < inn1.runs) {
              teamA.won++;
              teamA.points += 2;
              teamB.lost++;
            } else {
              teamA.draw++;
              teamB.draw++;
              teamA.points += 1;
              teamB.points += 1;
            }

            const oversA = (inn1.total_balls || inn1.balls?.length || 0) / 6 || 0.1;
            const oversB = (inn2.total_balls || inn2.balls?.length || 0) / 6 || 0.1;

            teamA.totalRunsScored += inn1.runs;
            teamA.totalOversFaced += (inn1.wickets === 10 ? tourOvers : oversA);
            teamA.totalRunsConceded += inn2.runs;
            teamA.totalOversBowled += (inn2.wickets === 10 ? tourOvers : oversB);

            teamB.totalRunsScored += inn2.runs;
            teamB.totalOversFaced += (inn2.wickets === 10 ? tourOvers : oversB);
            teamB.totalRunsConceded += inn1.runs;
            teamB.totalOversBowled += (inn2.wickets === 10 ? tourOvers : oversA);

            const safeNRR = (runs: number, faced: number, conceded: number, bowled: number) => {
              if (faced === 0 || bowled === 0) return 0;
              return (runs / faced) - (conceded / bowled);
            };

            teamA.nrr = safeNRR(teamA.totalRunsScored, teamA.totalOversFaced, teamA.totalRunsConceded, teamA.totalOversBowled);
            teamB.nrr = safeNRR(teamB.totalRunsScored, teamB.totalOversFaced, teamB.totalRunsConceded, teamB.totalOversBowled);
          }
        }

        return {
          id: m.id,
          teamA: m.teamA || m.team_a,
          teamB: m.teamB || m.team_b,
          status: m.status,
          result: m.result,
          date: m.date || m.created_at
        };
      });

      const updatedTournament = {
        ...tournament,
        teams: newTeams,
        matches: processedMatches
      };

      await localDb.saveTournament(updatedTournament);
      setTournament(updatedTournament);
      Alert.alert('LEAGUE SYNCED', 'Points table and fixtures updated from match archives.');
    } catch (e) {
      console.error(e);
      Alert.alert('SYNC ERROR', 'Failed to synchronize league data.');
    } finally {
      setLoading(false);
    }
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
      <LinearGradient colors={['#0f172a', '#000']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/tournaments')}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
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
          <TouchableOpacity style={styles.pdfBtn} onPress={syncTournamentMatches}>
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
                        <Text style={[styles.rank, index === 0 && { color: '#000' }]}>{index + 1}</Text>
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
                    onPress={() => startOneTapMatch(selectedTeams.a!, selectedTeams.b!)}
                  >
                    <LinearGradient colors={[theme.colors.accent, '#f97316']} style={styles.quickStartBtnInner}>
                      <Ionicons name="flash" size={14} color="#000" />
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
                          startOneTapMatch(match.teamA || match.team_a, match.teamB || match.team_b);
                        } else if (match.status === 'live' && match.id) {
                          handleResumeMatch(match.id);
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
                            onPress={(e) => { e.stopPropagation?.(); deleteMatch(match.id); }}
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
                        <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.3)" />
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
                    <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.05)" />
                  </View>
                  <Text style={styles.emptyTitle}>NO ARCHIVED FIXTURES</Text>
                  <Text style={styles.emptySub}>Set up the entire round-robin schedule instantly for professional league management</Text>

                  <TouchableOpacity style={styles.generateBtn} onPress={generateFixtures}>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitleContainer: { flex: 1 },
  title: { fontSize: 22, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -0.8 },
  badgeRow: { marginTop: 4 },
  tagText: { fontSize: 9, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  deleteBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  pdfBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,126,95,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,126,95,0.15)' },
  insightsBanner: {
    flexDirection: 'row',
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  insightBox: { flex: 1, alignItems: 'center' },
  insightVal: { fontSize: 20, fontFamily: theme.typography.fontFamily.manrope, color: '#FFF', fontWeight: '800' },
  insightLab: { fontSize: 8, fontFamily: theme.typography.fontFamily.semiBold, color: 'rgba(255,255,255,0.3)', marginTop: 4, letterSpacing: 1.5, textTransform: 'uppercase' },
  insightDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  tabsContainer: { paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 6, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tab: { flex: 1, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  tabText: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
  tabTextActive: { color: theme.colors.accent },
  contentArea: { flex: 1 },
  innerScroll: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 },
  tableCard: { 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    borderRadius: 24, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  th: { flex: 1, fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, textAlign: 'center', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  topRow: { backgroundColor: 'rgba(255, 126, 95, 0.08)', borderRadius: 16, borderBottomWidth: 0, marginHorizontal: -4, paddingHorizontal: 4 },
  rankBox: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  rankBoxGold: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  rank: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.5)' },
  teamName: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -0.3 },
  td: { flex: 1, fontSize: 14, fontFamily: theme.typography.fontFamily.manrope, color: '#FFF', textAlign: 'center', fontWeight: '700' },
  quickStartSection: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 2.5, textTransform: 'uppercase' },
  titleLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  quickSetupBox: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  selectItem: { flex: 1 },
  selectLabel: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  chipScroll: { paddingVertical: 4 },
  teamChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  teamChipActive: { backgroundColor: 'rgba(255, 126, 95, 0.15)', borderColor: theme.colors.accent },
  teamChipText: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.4)' },
  teamChipTextActive: { color: theme.colors.accent },
  vsCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  vsText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.5)' },
  quickStartBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 4 },
  quickStartBtnInner: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  quickStartBtnText: { color: '#000', fontSize: 12, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1.5 },
  fixtureCard: { 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  matchDeleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' },
  fixtureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  matchIdBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  matchIdText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1.5 },
  matchBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  mTeamBox: { flex: 1 },
  mTeamName: { fontSize: 16, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -0.5 },
  mVsBox: { width: 40, alignItems: 'center' },
  mVsText: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, opacity: 0.4 },
  resultRow: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 14, marginVertical: 12, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  resultText: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: '#10B981', letterSpacing: 1 },
  fixtureFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  matchDateText: { fontSize: 10, fontFamily: theme.typography.fontFamily.semiBold, color: 'rgba(255,255,255,0.35)', flex: 1 },
  tapToStart: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tapText: { fontSize: 10, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 1 },
  emptyState: { marginTop: 60, alignItems: 'center', padding: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  emptyTitle: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: 1.5 },
  emptySub: { fontSize: 10, fontFamily: theme.typography.fontFamily.semiBold, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 12, lineHeight: 16 },
  generateBtn: { marginTop: 40, borderRadius: 20, overflow: 'hidden', width: '100%' },
  genBtnInner: { height: 56, alignItems: 'center', justifyContent: 'center' },
  genBtnText: { color: '#000', fontSize: 12, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 2 },
  fabContainer: { position: 'absolute', bottom: 100, right: 24 },
  fab: { borderRadius: 24, overflow: 'hidden', ...theme.shadows.glow },
  fabInner: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
});
