// src/lib/tournamentLogic.ts
// Centralized tournament and local match utilities for LazyCricScore
// Extracted from app/tournament-details.tsx to improve reuse and readability.
import { localDb } from './localDb';
import { router } from 'expo-router';
import { Alert } from 'react-native';

// Types (simplified for brevity) – adjust as needed in the project
export type Team = { name: string; played?: number; won?: number; lost?: number; draw?: number; points?: number; nrr?: number; totalRunsScored?: number; totalOversFaced?: number; totalRunsConceded?: number; totalOversBowled?: number };
export type Match = {
  id: string;
  teamA?: string;
  teamB?: string;
  team_a?: string;
  team_b?: string;
  overs?: number;
  status?: 'scheduled' | 'live' | 'finished';
  result?: string;
  date?: string;
  created_at?: string;
  innings?: any[];
  tournament_id?: string | null;
  isLocal?: boolean;
};
export type Tournament = {
  id: string;
  name?: string;
  overs?: number;
  teams: Team[];
  matches?: Match[];
};

/** Generate round‑robin fixtures for a tournament */
export async function generateFixtures(tournament: Tournament, setLoading: (b: boolean) => void, loadTournament: () => Promise<void>) {
  if (!tournament) return;
  try {
    setLoading(true);
    const teams = tournament.teams.map(t => t.name);
    const matches: Match[] = [];
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
        } as Match);
      }
    }
    const updated = { ...tournament, matches: [...(tournament.matches || []), ...matches] };
    await localDb.saveTournament(updated);
    await loadTournament();
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}

/** Sync tournament points table with historic matches stored locally */
export async function syncTournamentMatches(
  tournament: Tournament,
  setLoading: (b: boolean) => void,
  loadTournament: () => Promise<void>
) {
  try {
    setLoading(true);
    const allMatches = await localDb.getMatches();
    const leagueTeams = tournament.teams.map(t => t.name.toLowerCase());
    const leagueMatches = allMatches.filter((m: Match) => {
      if (m.tournament_id === tournament.id) return true;
      const t1 = (m.teamA || m.team_a || '').toLowerCase();
      const t2 = (m.teamB || m.team_b || '').toLowerCase();
      return m.tournament_id === null && leagueTeams.includes(t1) && leagueTeams.includes(t2);
    });

    // Reset team stats
    const newTeams = tournament.teams.map(t => ({
      ...t,
      played: 0,
      won: 0,
      lost: 0,
      draw: 0,
      points: 0,
      nrr: 0,
      totalRunsScored: 0,
      totalOversFaced: 0,
      totalRunsConceded: 0,
      totalOversBowled: 0
    }));

    const processedMatches = leagueMatches.map((m: Match) => {
      const inn1 = m.innings?.[0];
      const inn2 = m.innings?.[1];
      if (m.status === 'finished' && inn1 && inn2) {
        const tAIdx = newTeams.findIndex(t => t.name.toLowerCase() === inn1.battingTeam.toLowerCase());
        const tBIdx = newTeams.findIndex(t => t.name.toLowerCase() === inn2.battingTeam.toLowerCase());
        if (tAIdx !== -1 && tBIdx !== -1) {
          const teamA = newTeams[tAIdx];
          const teamB = newTeams[tBIdx];
          const tourOvers = tournament.overs || 20;
          teamA.played!++;
          teamB.played!++;
          if (inn2.runs > inn1.runs) {
            teamB.won!++;
            teamB.points! += 2;
            teamA.lost!++;
          } else if (inn2.runs < inn1.runs) {
            teamA.won!++;
            teamA.points! += 2;
            teamB.lost!++;
          } else {
            teamA.draw!++;
            teamB.draw!++;
            teamA.points!++;
            teamB.points!++;
          }
          const oversA = (inn1.total_balls || inn1.balls?.length || 0) / 6 || 0.1;
          const oversB = (inn2.total_balls || inn2.balls?.length || 0) / 6 || 0.1;
          teamA.totalRunsScored! += inn1.runs;
          teamA.totalOversFaced! += inn1.wickets === 10 ? tourOvers : oversA;
          teamA.totalRunsConceded! += inn2.runs;
          teamA.totalOversBowled! += inn2.wickets === 10 ? tourOvers : oversB;
          teamB.totalRunsScored! += inn2.runs;
          teamB.totalOversFaced! += inn2.wickets === 10 ? tourOvers : oversB;
          teamB.totalRunsConceded! += inn1.runs;
          teamB.totalOversBowled! += inn1.wickets === 10 ? tourOvers : oversA;
          const safeNRR = (runs: number, faced: number, conceded: number, bowled: number) => {
            if (faced === 0 || bowled === 0) return 0;
            return runs / faced - conceded / bowled;
          };
          teamA.nrr = safeNRR(teamA.totalRunsScored!, teamA.totalOversFaced!, teamA.totalRunsConceded!, teamA.totalOversBowled!);
          teamB.nrr = safeNRR(teamB.totalRunsScored!, teamB.totalOversFaced!, teamB.totalRunsConceded!, teamB.totalOversBowled!);
        }
      }
      return {
        id: m.id,
        teamA: m.teamA || m.team_a,
        teamB: m.teamB || m.team_b,
        status: m.status,
        result: m.result,
        date: m.date || m.created_at
      } as Match;
    });

    const updatedTournament = { ...tournament, teams: newTeams, matches: processedMatches };
    await localDb.saveTournament(updatedTournament);
    await loadTournament();
    Alert.alert('LEAGUE SYNCED', 'Points table and fixtures updated from match archives.');
  } catch (e) {
    console.error(e);
    Alert.alert('SYNC ERROR', 'Failed to synchronize league data.');
  } finally {
    setLoading(false);
  }
}

/** Start a one‑tap live match (local session) */
export async function startOneTapMatch(
  tournament: Tournament,
  teamA: string,
  teamB: string,
  setLoading: (b: boolean) => void,
  loadTournament: () => Promise<void>
) {
  try {
    setLoading(true);
    const matchId = `match_${Date.now()}`;
    const newMatch: Match = {
      id: matchId,
      team_a: teamA,
      team_b: teamB,
      teamA,
      teamB,
      overs: tournament.overs,
      status: 'live',
      created_at: new Date().toISOString(),
      tournament_id: tournament.id,
      isLocal: true,

    };
    const updated = { ...tournament, matches: [...(tournament.matches || []), newMatch] };
    await localDb.saveTournament(updated);
    await localDb.saveMatch(newMatch);
    router.push({ pathname: '/toss', params: { matchId, team1Name: teamA, team2Name: teamB } });
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
    await loadTournament();
  }
}

/** Resume an existing match */
export async function handleResumeMatch(matchId: string, setLoading: (b: boolean) => void) {
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
      params: { matchId, inningsId: activeInnings.id, isLocal: 'true', autoShowSummary: 'false' }
    });
  } catch (e) {
    Alert.alert('ERROR', 'Failed to resume match.');
  } finally {
    setLoading(false);
  }
}

/** Delete a fixture match */
export async function deleteMatch(matchId: string, setLoading: (b: boolean) => void, loadTournament: () => Promise<void>) {
  try {
    setLoading(true);
    await localDb.deleteMatch(matchId);
    await loadTournament();
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}
