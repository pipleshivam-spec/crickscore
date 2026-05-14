import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Text, Dimensions, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { useAppTheme } from '../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { classifyDelivery, checkInningsEnd, needsNewBowler, generateBallCommentary } from '../src/lib/scoringEngine';
import Ionicons from '@expo/vector-icons/Ionicons';

// Import Components
import { ScoreHeader } from '../src/components/ScoreHeader';
import { BatsmenDisplay } from '../src/components/BatsmenDisplay';
import { OverTracker } from '../src/components/OverTracker';
import { BowlerDisplay } from '../src/components/BowlerDisplay';
import { BallButtons } from '../src/components/BallButtons';
import { WicketModal } from '../src/components/WicketModal';
import { BowlerModal } from '../src/components/BowlerModal';
import { HistoryModal } from '../src/components/HistoryModal';
import { SetupBatsmenModal } from '../src/components/SetupBatsmenModal';
import { WagonWheelModal } from '../src/components/WagonWheelModal';
import { CelebrationModal } from '../src/components/CelebrationModal';
import { MatchSummaryModal } from '../src/components/MatchSummaryModal';
import type { PlayerPerformance } from '../src/components/MatchSummaryModal';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CommentaryFeed } from '../src/components/CommentaryFeed';
import { CelebrationEmitter, CelebrationEmitterHandle } from '../src/components/CelebrationEmitter';

import { BottomNavBar } from '../src/components/BottomNavBar';
import { VoiceConsole } from '../src/components/VoiceConsole';

import { localDb } from '../src/lib/localDb';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

interface InningsReportSummary {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number;
  extras: number;
  fow: any[];
  players: any[];
}

// MoM calculation helper
const calcMomScore = (p: any): number => {
  const runs = p.runsScored || 0;
  const balls = p.ballsFaced || 0;
  const wickets = p.wicketsTaken || 0;
  const runsConc = p.runsConceded || 0;
  const overs = (p.oversBowled || 0) / 6;
  const fours = p.fours || 0;
  const sixes = p.sixes || 0;
  const maidens = p.maidens || 0;

  const sr = balls > 0 ? (runs / balls) * 100 : 0;
  const srBonus = sr > 150 ? 15 : sr > 100 ? 8 : sr > 75 ? 3 : 0;
  const battingScore = runs + srBonus + fours * 2 + sixes * 4;

  const economy = overs > 0 ? runsConc / overs : 0;
  const economyBonus = economy < 5 ? 10 : economy < 7 ? 5 : 0;
  const bowlingScore = wickets * 25 + maidens * 10 + economyBonus;

  return battingScore + bowlingScore;
};

export default function Scoring() {
  const { matchId, inningsId, isLocal, autoShowSummary } = useLocalSearchParams<{ 
    matchId: string, 
    inningsId: string, 
    isLocal?: string,
    autoShowSummary?: string 
  }>();
  const isOffline = isLocal === 'true';
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  // State
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState<any>(null);
  const [inningsData, setInningsData] = useState<any>(null);
  const [target, setTarget] = useState<number | undefined>(undefined);
  const [commentary, setCommentary] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [score, setScore] = useState({
    runs: 0, wickets: 0, balls: 0, extras: 0,
    currentOver: [] as string[],
    striker: null as any, nonStriker: null as any, bowler: null as any,
    strikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
    nonStrikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
    bowlerStats: { id: '', name: '', balls: 0, runs: 0, wickets: 0, maidens: 0 },
    partnership: { runs: 0, balls: 0 },
    runsInCurrentOver: 0,
    runsConcededInCurrentOver: 0,
    fow: [] as any[],
    dismissed: [] as any[],
    bowlers: [] as any[],
    fullCommentary: [] as any[],
  });

  const [modals, setModals] = useState({
    history: false, wicket: false, bowler: false, setup: false,
    wagon: false, celebration: false, summary: false,
  });
  const [celebrationType, setCelebrationType] = useState<'SIX' | 'FOUR' | 'WICKET' | '50' | '100' | null>(null);
  const [pendingBall, setPendingBall] = useState<any>(null);
  // Track all players for MoM calculation
  const [summaryData, setSummaryData] = useState<{ isFirst: boolean; runs: number; wickets: number; balls: number; onAction: () => void }>({ isFirst: true, runs: 0, wickets: 0, balls: 0, onAction: () => { } });
  const [innings1Data, setInnings1Data] = useState<any>(null);
  const [rivalry, setRivalry] = useState<{ runs: number, balls: number, wickets: number }>({ runs: 0, balls: 0, wickets: 0 });
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');
  const [lastVoiceEvent, setLastVoiceEvent] = useState('');
  const playersRef = React.useRef<Map<string, PlayerPerformance>>(new Map());
  const emitterRef = React.useRef<CelebrationEmitterHandle>(null);
  const shakeX = useSharedValue(0);

  const animatedShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));


  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  useEffect(() => { loadMatchData(); }, [matchId, inningsId]);

  // ✅ React to over/innings completion OUTSIDE the setScore updater
  // This is the correct pattern — no setTimeout inside setState
  useEffect(() => {
    if ((score as any)._overComplete) {
      const t = setTimeout(() => setModals(m => ({ ...m, bowler: true })), 400);
      return () => clearTimeout(t);
    }
  }, [(score as any)._overComplete, (score as any).balls]);

  useEffect(() => {
    if ((score as any)._inningsComplete) {
      const { _finalRuns, _finalWickets, _finalBalls } = score as any;
      const t = setTimeout(() => handleInningsEnd(_finalRuns, _finalWickets, _finalBalls), 600);
      return () => clearTimeout(t);
    }
  }, [(score as any)._inningsComplete, (score as any).balls]);

  // Handle auto-show summary from history
  useEffect(() => {
    if (autoShowSummary === 'true' && !loading && matchData) {
      const isFirst = inningsData?.innings_number === 1;
      setSummaryData({
        isFirst,
        runs: score.runs,
        wickets: score.wickets,
        balls: score.balls,
        onAction: () => setModals(m => ({ ...m, summary: false }))
      });
      setModals(m => ({ ...m, summary: true }));
    }
  }, [autoShowSummary, loading, !!matchData]);

  const loadMatchData = async () => {
    try {
      setLoading(true);
      let match: any, innings: any, balls: any[] = [];

      if (isOffline) {
        match = await localDb.getMatch(matchId!);
        innings = match?.innings?.find((i: any) => i.id === inningsId);
        balls = innings?.balls || [];
      } else {
        const { data: m } = await supabase.from('matches').select('*').eq('id', matchId).single();
        const { data: i } = await supabase.from('innings').select('*').eq('id', inningsId).single();
        match = m;
        innings = i;
        const { data: b } = await supabase.from('balls').select('*').eq('innings_id', inningsId).order('created_at', { ascending: true });
        balls = b || [];
      }

      setMatchData(match);
      setInningsData(innings);

      if (innings?.innings_number === 2) {
        let fInn: any;
        if (isOffline) {
          fInn = match?.innings?.find((i: any) => i.innings_number === 1);
          if (fInn) setTarget(fInn.total_runs + 1);
        } else {
          const { data } = await supabase.from('innings').select('*, balls(*)').eq('match_id', matchId).eq('innings_number', 1).single();
          fInn = data;
          if (fInn) setTarget(fInn.total_runs + 1);
        }
        
        if (fInn) {
          setInnings1Data({
            battingTeam: fInn.batting_team,
            bowlingTeam: fInn.bowling_team,
            runs: fInn.total_runs || 0,
            wickets: fInn.total_wickets || 0,
            balls: fInn.total_balls || 0,
            players: fInn.players || [],
            history: fInn.balls || []
          });
        }
      }

      if (balls.length === 0) {
        // Reset score state for new innings
        setScore({
          runs: 0, wickets: 0, balls: 0, extras: 0,
          currentOver: [],
          striker: null, nonStriker: null, bowler: null,
          strikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          nonStrikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          bowlerStats: { id: '', name: '', balls: 0, runs: 0, wickets: 0, maidens: 0 },
          partnership: { runs: 0, balls: 0 },
          runsInCurrentOver: 0,
          runsConcededInCurrentOver: 0,
          fow: [],
          dismissed: [],
          bowlers: [],
          fullCommentary: [],
        });
        setHistory([]);
        setCommentary([]);
        setModals(prev => ({ ...prev, setup: true }));
      } else {
        // Pass innings so batsmen, bowler and stats are restored in ONE atomic setScore call
        calculateStateFromHistory(balls, innings, match.overs);
        setHistory(balls.map(b => ({
          ...b,
          result_text: b.result_text || (b.is_wicket ? 'W' : b.is_wide ? 'Wd' : b.is_no_ball ? 'NB' : b.runs.toString())
        })));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // ─── Professional Event-Sourcing Replay ───
  const calculateStateFromHistory = (balls: any[], currentInnings?: any, overrideOvers?: number) => {
    const matchOvers = overrideOvers || matchData?.overs || 20;
    let runs = 0, wickets = 0, totalBalls = 0, extras = 0;
    const pMap = new Map<string, PlayerPerformance>();
    let currentOver: string[] = [];
    let pRuns = 0, pBalls = 0;

    balls.forEach(b => {
      const resultStr = b.is_wicket ? 'W' :
        b.type === 'wide' || b.is_wide ? 'Wd' :
          b.type === 'no_ball' || b.is_no_ball ? 'NB' :
            b.type === 'leg_bye' ? `LB${b.extras || b.runs}` :
              b.type === 'bye' ? `B${b.extras || b.runs}` :
                b.runs.toString();

      const c = classifyDelivery(resultStr);
      runs += c.totalRuns;
      extras += c.extrasRuns;
      pRuns += c.totalRuns;

      // Rebuild Player Performance Map for MoM and Career
      if (b.batsman_id) {
        const existing = pMap.get(b.batsman_id) || { id: b.batsman_id, name: b.batsman_name || 'Batsman', runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, wicketsTaken: 0, runsConceded: 0, oversBowled: 0, maidens: 0 };
        if (b.type !== 'wide') {
          existing.runsScored += b.runs;
          if (c.countsAsBall) existing.ballsFaced += 1;
        }
        if (b.runs === 4) existing.fours += 1;
        if (b.runs === 6) existing.sixes += 1;
        pMap.set(b.batsman_id, existing);
      }
      if (b.bowler_id) {
        const existing = pMap.get(b.bowler_id) || { id: b.bowler_id, name: b.bowler_name || 'Bowler', runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, wicketsTaken: 0, runsConceded: 0, oversBowled: 0, maidens: 0 };
        if (b.type !== 'bye' && b.type !== 'leg_bye') {
          existing.runsConceded += (b.runs + (b.type === 'wide' || b.type === 'no_ball' ? b.extras : 0));
        }
        if (c.countsAsBall) existing.oversBowled += 1;
        if (b.is_wicket) {
          existing.wicketsTaken += 1;
        }
        pMap.set(b.bowler_id, existing);
      }

      if (b.is_wicket) { wickets++; pRuns = 0; pBalls = 0; }

      if (c.countsAsBall) {
        totalBalls++;
        pBalls++;
        currentOver.push(b.is_wicket ? 'W' : b.runs === 0 ? `${c.extrasRuns}` : b.runs.toString());
      } else {
        currentOver.push(b.is_wide || b.type === 'wide' ? 'Wd' : 'NB');
      }

      if (currentOver.filter(x => x !== 'Wd' && x !== 'NB').length === 6) {
        currentOver = [];
      }
    });

    playersRef.current = pMap;

    setScore(prev => {
      const sId = currentInnings?.lastStriker?.id || prev.striker?.id;
      const nsId = currentInnings?.lastNonStriker?.id || prev.nonStriker?.id;
      const bId = currentInnings?.lastBowler?.id || prev.bowler?.id;

      const sP = sId ? pMap.get(sId) : null;
      const nsP = nsId ? pMap.get(nsId) : null;
      const bP = bId ? pMap.get(bId) : null;

      return {
        ...prev, runs, wickets, balls: totalBalls, extras, currentOver,
        partnership: { runs: pRuns, balls: pBalls },
        striker: currentInnings?.lastStriker || prev.striker,
        nonStriker: currentInnings?.lastNonStriker || prev.nonStriker,
        strikerStats: sP ? { runs: sP.runsScored, balls: sP.ballsFaced, fours: sP.fours, sixes: sP.sixes } : (currentInnings?.lastStrikerStats || prev.strikerStats),
        nonStrikerStats: nsP ? { runs: nsP.runsScored, balls: nsP.ballsFaced, fours: nsP.fours, sixes: nsP.sixes } : (currentInnings?.lastNonStrikerStats || prev.nonStrikerStats),
        bowler: currentInnings?.lastBowler || prev.bowler,
        bowlerStats: bP ? { id: bP.id, name: bP.name, balls: bP.oversBowled, runs: bP.runsConceded, wickets: bP.wicketsTaken, maidens: bP.maidens } : (currentInnings?.lastBowlerStats || prev.bowlerStats),
        fow: currentInnings?.fow || [],
        dismissed: currentInnings?.dismissed || [],
        bowlers: currentInnings?.bowlers || [],
        fullCommentary: currentInnings?.fullCommentary || [],
      };
    });

    const reason = checkInningsEnd(wickets, totalBalls, matchOvers, runs, target);
    // NOTE: Do NOT call handleInningsEnd here during a replay/restore.
    // Innings end is only triggered by live play via the _inningsComplete effect.
    // If the innings was already complete, the match loader handles navigation.
  };

  const handleInningsEnd = async (finalRuns: number, finalWickets: number, finalBalls: number) => {
    const isFirstInnings = inningsData?.innings_number === 1;

    const currentInningsSummary = {
      battingTeam: inningsData?.batting_team || '',
      bowlingTeam: inningsData?.bowling_team || '',
      runs: finalRuns,
      wickets: finalWickets,
      balls: finalBalls,
      players: Array.from(playersRef.current.values()),
      history: [...history],
      fow: score.fow,
      extras: score.extras
    };

    if (isFirstInnings) {
      setInnings1Data(currentInningsSummary);
    }

    const updateTournamentStandings = async (tourId: string | null, inn1: any, inn2: any) => {
      try {
        const allTournaments = await localDb.getTournaments();
        
        let targets = [];
        if (tourId) {
          const t = allTournaments.find((t: any) => t.id === tourId);
          if (t) targets.push(t);
        } else {
          targets = allTournaments.filter((t: any) => {
            const hasT1 = t.teams.some((team: any) => team.name.toLowerCase() === inn1.battingTeam.toLowerCase());
            const hasT2 = t.teams.some((team: any) => team.name.toLowerCase() === inn2.battingTeam.toLowerCase());
            return hasT1 && hasT2;
          });
        }

        for (const tour of targets) {
          const teams = [...tour.teams];
          const tAIdx = teams.findIndex((t: any) => t.name.toLowerCase() === inn1.battingTeam.toLowerCase());
          const tBIdx = teams.findIndex((t: any) => t.name.toLowerCase() === inn2.battingTeam.toLowerCase());

          if (tAIdx === -1 || tBIdx === -1) continue;

          const teamA = { ...teams[tAIdx] };
          const teamB = { ...teams[tBIdx] };
          const targetVal = inn1.runs + 1;
          const tourOvers = tour.overs || 20;

          teamA.played = (teamA.played || 0) + 1;
          teamB.played = (teamB.played || 0) + 1;

          if (inn2.runs >= targetVal) {
            teamB.won = (teamB.won || 0) + 1;
            teamB.points = (teamB.points || 0) + 2;
            teamA.lost = (teamA.lost || 0) + 1;
          } else if (inn2.runs < inn1.runs) {
            teamA.won = (teamA.won || 0) + 1;
            teamA.points = (teamA.points || 0) + 2;
            teamB.lost = (teamB.lost || 0) + 1;
          } else {
            teamA.draw = (teamA.draw || 0) + 1;
            teamB.draw = (teamB.draw || 0) + 1;
            teamA.points = (teamA.points || 0) + 1;
            teamB.points = (teamB.points || 0) + 1;
          }

          const oversA = inn1.balls / 6 || 0.1;
          const oversB = inn2.balls / 6 || 0.1;

          teamA.totalRunsScored = (teamA.totalRunsScored || 0) + inn1.runs;
          teamA.totalOversFaced = (teamA.totalOversFaced || 0) + (inn1.wickets === 10 ? tourOvers : oversA);
          teamA.totalRunsConceded = (teamA.totalRunsConceded || 0) + inn2.runs;
          teamA.totalOversBowled = (teamA.totalOversBowled || 0) + (inn2.wickets === 10 ? tourOvers : oversB);

          teamB.totalRunsScored = (teamB.totalRunsScored || 0) + inn2.runs;
          teamB.totalOversFaced = (teamB.totalOversFaced || 0) + (inn2.wickets === 10 ? tourOvers : oversB);
          teamB.totalRunsConceded = (teamB.totalRunsConceded || 0) + inn1.runs;
          teamB.totalOversBowled = (teamB.totalOversBowled || 0) + (inn1.wickets === 10 ? tourOvers : oversA);

          teamA.nrr = (teamA.totalRunsScored / teamA.totalOversFaced) - (teamA.totalRunsConceded / teamA.totalOversBowled);
          teamB.nrr = (teamB.totalRunsScored / teamB.totalOversFaced) - (teamB.totalRunsConceded / teamB.totalOversBowled);

          teams[tAIdx] = teamA;
          teams[tBIdx] = teamB;

          if (!tour.matches) tour.matches = [];
          const resultStr = inn2.runs >= targetVal 
            ? `${inn2.battingTeam} won by ${10 - inn2.wickets} wickets`
            : inn2.runs < inn1.runs - 1 || inn2.wickets === 10
              ? `${inn1.battingTeam} won by ${inn1.runs - inn2.runs} runs`
              : "Match Tied";

          const mEntry = {
            id: matchId,
            date: new Date().toISOString(),
            teamA: inn1.battingTeam,
            teamB: inn2.battingTeam,
            status: 'finished',
            result: resultStr
          };

          const mIdx = tour.matches.findIndex((m: any) => m.id === matchId);
          if (mIdx >= 0) {
            tour.matches[mIdx] = { ...tour.matches[mIdx], ...mEntry };
          } else {
            tour.matches.push(mEntry);
          }

          await localDb.saveTournament({ ...tour, teams });
        }
      } catch (err) {
        console.error('Points Table Logic Error:', err);
      }
    };

    const doAction = async () => {
      setModals(m => ({ ...m, summary: false }));
      
      // Update Player Career Stats
      const players = Array.from(playersRef.current.values());
      for (const p of players) {
        await localDb.updatePlayerCareer(p);
      }

      if (!isFirstInnings && matchData?.tournament_id) {
        await updateTournamentStandings(matchData.tournament_id, innings1Data, currentInningsSummary);
      }

      if (isFirstInnings && isOffline) {
        const updatedMatch = { ...matchData };
        const inn1Idx = updatedMatch.innings.findIndex((i: any) => i.id === inningsId);
        if (inn1Idx >= 0) {
          updatedMatch.innings[inn1Idx].status = 'completed';
          updatedMatch.innings[inn1Idx].total_runs = finalRuns;
          updatedMatch.innings[inn1Idx].total_wickets = finalWickets;
          updatedMatch.innings[inn1Idx].total_balls = finalBalls;
          updatedMatch.innings[inn1Idx].players = currentInningsSummary.players;
          updatedMatch.innings[inn1Idx].history = currentInningsSummary.history;
        }
        const inn2Id = `${matchId}_inn2`;
        updatedMatch.innings.push({
          id: inn2Id, match_id: matchId, innings_number: 2,
          batting_team: inningsData?.bowling_team,
          bowling_team: inningsData?.batting_team,
          status: 'active', total_runs: 0, total_wickets: 0, total_balls: 0, balls: [],
        });
        await localDb.saveMatch(updatedMatch);
        // Clear local states before transition
        setScore({
          runs: 0, wickets: 0, balls: 0, extras: 0,
          currentOver: [],
          striker: null, nonStriker: null, bowler: null,
          strikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          nonStrikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          bowlerStats: { id: '', name: '', balls: 0, runs: 0, wickets: 0, maidens: 0 },
          partnership: { runs: 0, balls: 0 },
          runsInCurrentOver: 0,
          runsConcededInCurrentOver: 0,
          fow: [],
          dismissed: [],
          bowlers: [],
          fullCommentary: [],
        } as any);
        setHistory([]);
        setCommentary([]);

        router.replace({ pathname: '/scoring', params: { matchId, inningsId: inn2Id, isLocal: 'true' } });
      } else {
        if (!isFirstInnings && isOffline) {
          const updatedMatch = { ...matchData, status: 'finished' };
          const inn2Idx = updatedMatch.innings.findIndex((i: any) => i.id === inningsId);
          if (inn2Idx >= 0) {
            updatedMatch.innings[inn2Idx].status = 'completed';
            updatedMatch.innings[inn2Idx].total_runs = finalRuns;
            updatedMatch.innings[inn2Idx].total_wickets = finalWickets;
            updatedMatch.innings[inn2Idx].total_balls = finalBalls;
            updatedMatch.innings[inn2Idx].players = currentInningsSummary.players;
            updatedMatch.innings[inn2Idx].history = currentInningsSummary.history;
          }
          await localDb.saveMatch(updatedMatch);
        }
        router.replace('/');
      }
    };

    setSummaryData({ isFirst: isFirstInnings, runs: finalRuns, wickets: finalWickets, balls: finalBalls, onAction: doAction });
    setModals(m => ({ ...m, summary: true }));
  };

  const generateCommentary = (ball: any, batsmanName: string) => {
    const ballForEngine = {
      runs: ball.runs,
      extras: ball.extras || (ball.is_wide || ball.is_no_ball ? 1 : 0),
      is_wicket: ball.is_wicket,
      type: ball.type || (ball.is_wide ? 'wide' : ball.is_no_ball ? 'no_ball' : 'legal'),
    };
    const text = generateBallCommentary(ballForEngine, batsmanName);
    const ov = `${Math.floor(score.balls / 6)}.${(score.balls % 6) + 1}`;
    setScore(prev => ({
      ...prev,
      fullCommentary: [{ over: ov, text }, ...prev.fullCommentary].slice(0, 20)
    }));
  };

  const triggerCelebration = (type: any) => {
    setCelebrationType(type);
    setModals(m => ({ ...m, celebration: true }));
    emitterRef.current?.burst(type);
    triggerShake();
  };

  const handleVoiceCommand = (cmd: string) => {
    let eventText = '';
    const cleanCmd = cmd.toLowerCase().trim();
    
    // Direction mapping
    const directions: Record<string, string> = {
      'mid wicket': 'mid_wicket',
      'mid-wicket': 'mid_wicket',
      'cover': 'covers',
      'covers': 'covers',
      'long on': 'long_on',
      'long-on': 'long_on',
      'long off': 'long_off',
      'long-off': 'long_off',
      'point': 'point',
      'square leg': 'square_leg',
      'fine leg': 'fine_leg',
      'third man': 'third_man',
      'straight': 'straight'
    };

    let foundDirection = 'none';
    for (const [key, val] of Object.entries(directions)) {
      if (cleanCmd.includes(key)) {
        foundDirection = val;
        break;
      }
    }

    if (cleanCmd.includes('four') || cleanCmd.includes(' 4 ') || cleanCmd.startsWith('4 ') || cleanCmd.endsWith(' 4') || cleanCmd === '4') {
      processBall('4', foundDirection);
      eventText = foundDirection !== 'none' ? `Four runs through ${foundDirection.replace('_', ' ')}` : 'Four runs scored';
    }
    else if (cleanCmd.includes('six') || cleanCmd.includes(' 6 ') || cleanCmd.startsWith('6 ') || cleanCmd.endsWith(' 6') || cleanCmd === '6') {
      processBall('6', foundDirection);
      eventText = 'Massive six!';
    }
    else if (cleanCmd.includes('wicket') || cleanCmd.includes('out')) {
      setModals(m => ({ ...m, wicket: true }));
      eventText = 'Wicket gone!';
    }
    else if (cleanCmd.includes('wide')) {
      handleExtra('Wd');
      eventText = 'Wide ball';
    }
    else if (cleanCmd.includes('no ball')) {
      handleExtra('NB');
      eventText = 'No ball';
    }
    else if (cleanCmd.includes('one') || cleanCmd.includes('single') || cleanCmd === '1') {
      processBall('1', foundDirection);
      eventText = 'Single taken';
    }
    else if (cleanCmd.includes('two') || cleanCmd === '2') {
      processBall('2', foundDirection);
      eventText = 'Two runs';
    }
    else if (cleanCmd.includes('three') || cleanCmd === '3') {
      processBall('3', foundDirection);
      eventText = 'Three runs';
    }
    else if (cleanCmd.includes('dot') || cleanCmd.includes('zero') || cleanCmd === '0') {
      processBall('0', foundDirection);
      eventText = 'Dot ball';
    }
    else if (cleanCmd.includes('undo')) {
      handleUndo();
      eventText = 'Last action undone';
    }
    
    if (eventText) setLastVoiceEvent(eventText);
  };

  const handleExtra = (type: string) => {
    processBall(type);
  };

  const handleBall = async (result: string) => {
    // Block if we're waiting for a new bowler (over just ended in live play)
    if ((score as any)._overComplete) {
      setModals(m => ({ ...m, bowler: true }));
      return;
    }
    if (!score.striker || !score.nonStriker) { setModals(m => ({ ...m, setup: true })); return; }
    if (!score.bowler) { setModals(m => ({ ...m, bowler: true })); return; }
    const runValue = parseInt(result);
    if (runValue === 4 || runValue === 6) {
      setPendingBall(result);
      setModals(m => ({ ...m, wagon: true }));
      return;
    }
    await processBall(result);
  };
  const processBall = async (result: string, direction: string = 'none') => {
    if (!score.striker || !score.nonStriker) { 
      Alert.alert('ASSIGN BATSMEN', 'Please select both striker and non-striker before scoring.');
      setModals(m => ({ ...m, setup: true })); 
      return; 
    }
    if (!score.bowler) { 
      Alert.alert('ASSIGN BOWLER', 'Please select a bowler for the current over.');
      setModals(m => ({ ...m, bowler: true })); 
      return; 
    }

    // ─── Professional Delivery Classification ───

    const c = classifyDelivery(result);
    const isWicket = result === 'W';

    const newBallData: any = {
      id: isOffline ? `ball_${Date.now()}` : undefined,
      innings_id: inningsId,
      over_number: Math.floor(score.balls / 6) + 1,
      ball_number: score.balls % 6 + 1,
      runs: c.batsmanRuns,
      extras: c.extrasRuns,
      type: c.type,
      is_wide: c.type === 'wide',
      is_no_ball: c.type === 'no_ball',
      is_wicket: isWicket,
      batsman_id: score.striker.id,
      batsman_name: score.striker.name,
      bowler_id: score.bowler.id,
      bowler_name: score.bowler.name,
      direction,
      created_at: new Date().toISOString(),
      result_text: result,
    };

    try {
      if (isOffline) {
        const updatedMatch = { ...matchData };
        const innIdx = updatedMatch.innings.findIndex((i: any) => i.id === inningsId);
        updatedMatch.innings[innIdx].balls = [...(updatedMatch.innings[innIdx].balls || []), newBallData];
        updatedMatch.innings[innIdx].total_runs = (updatedMatch.innings[innIdx].total_runs || 0) + c.totalRuns;
        updatedMatch.innings[innIdx].total_wickets = (updatedMatch.innings[innIdx].total_wickets || 0) + (isWicket ? 1 : 0);
        if (c.countsAsBall) updatedMatch.innings[innIdx].total_balls = (updatedMatch.innings[innIdx].total_balls || 0) + 1;
        // Persist for resume
        updatedMatch.innings[innIdx].lastStriker = score.striker;
        updatedMatch.innings[innIdx].lastNonStriker = score.nonStriker;
        updatedMatch.innings[innIdx].lastStrikerStats = score.strikerStats;
        updatedMatch.innings[innIdx].lastNonStrikerStats = score.nonStrikerStats;
        updatedMatch.innings[innIdx].lastBowler = score.bowler;
        updatedMatch.innings[innIdx].lastBowlerStats = score.bowlerStats;
        updatedMatch.innings[innIdx].fow = score.fow;
        updatedMatch.innings[innIdx].dismissed = score.dismissed;
        updatedMatch.innings[innIdx].bowlers = score.bowlers;
        updatedMatch.innings[innIdx].fullCommentary = score.fullCommentary;
        await localDb.saveMatch(updatedMatch);
        setMatchData(updatedMatch);
      } else {
        await supabase.from('balls').insert([newBallData]);
        await supabase.from('innings').update({
          total_runs: score.runs + c.totalRuns,
          total_wickets: score.wickets + (isWicket ? 1 : 0),
          total_balls: score.balls + (c.countsAsBall ? 1 : 0)
        }).eq('id', inningsId);
      }

      // ─── Update UI State ───
      // ─── Update player stats for MoM ───
      const pMap = playersRef.current;
      // Striker batting
      if (score.striker) {
        const existing = pMap.get(score.striker.id) || { id: score.striker.id, name: score.striker.name, team: score.striker.team, runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, wicketsTaken: 0, runsConceded: 0, oversBowled: 0, maidens: 0 };
        existing.runsScored += c.batsmanRuns;
        if (c.countsAsBall && c.type !== 'wide') existing.ballsFaced += 1;
        if (c.batsmanRuns === 4) existing.fours += 1;
        if (c.batsmanRuns === 6) existing.sixes += 1;
        pMap.set(score.striker.id, existing);
      }
      // Bowler
      if (score.bowler) {
        const existing = pMap.get(score.bowler.id) || { id: score.bowler.id, name: score.bowler.name, team: score.bowler.team, runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, wicketsTaken: 0, runsConceded: 0, oversBowled: 0, maidens: 0 };
        existing.runsConceded += c.totalRuns;
        if (c.countsAsBall) existing.oversBowled += 1;
        if (isWicket) existing.wicketsTaken += 1;
        pMap.set(score.bowler.id, existing);
      }
      playersRef.current = pMap;
      
      // Update Rivalry
      if (score.striker && score.bowler) {
        setRivalry(prev => ({
          runs: prev.runs + c.batsmanRuns,
          balls: prev.balls + (c.countsAsBall ? 1 : 0),
          wickets: prev.wickets + (isWicket ? 1 : 0)
        }));
      }

      setHistory(prev => [...prev, newBallData]);
      generateCommentary(newBallData, score.striker?.name || 'Batsman');
      applyDeliveryToScore(c, isWicket);

      // ─── Milestones ───
      const newStrikerRuns = score.strikerStats.runs + c.batsmanRuns;
      if (newStrikerRuns >= 100 && score.strikerStats.runs < 100) triggerCelebration('100');
      else if (newStrikerRuns >= 50 && score.strikerStats.runs < 50) triggerCelebration('50');
      else if (c.batsmanRuns === 6) triggerCelebration('SIX');
      else if (c.batsmanRuns === 4) triggerCelebration('FOUR');
      else if (isWicket) triggerCelebration('WICKET');
    } catch (err) { Alert.alert('Error', 'Action failed.'); }
  };

  const strikeRate = (runs: number, balls: number) => {
    if (balls === 0) return '0.0';
    return ((runs / balls) * 100).toFixed(1);
  };

  const economyRate = (runs: number, balls: number) => {
    if (balls === 0) return '0.00';
    const overs = balls / 6;
    return (runs / overs).toFixed(2);
  };

  const generatePDF = async () => {
    try {
      const isFirstInnings = summaryData.isFirst;
      const matchOvers = matchData?.overs || 20;

      // Innings 1 Data
      const inn1: InningsReportSummary = isFirstInnings ? {
        battingTeam: inningsData?.batting_team || 'Team A',
        bowlingTeam: inningsData?.bowling_team || 'Team B',
        runs: score.runs,
        wickets: score.wickets,
        balls: score.balls,
        extras: score.extras,
        fow: score.fow,
        players: Array.from(playersRef.current.values()),
      } : (innings1Data || {
        battingTeam: matchData?.team_a || 'Team A',
        bowlingTeam: matchData?.team_b || 'Team B',
        runs: 0, wickets: 0, balls: 0, extras: 0, fow: [], players: []
      });

      // Innings 2 Data
      const inn2: InningsReportSummary | null = !isFirstInnings ? {
        battingTeam: inningsData?.batting_team || 'Team B',
        bowlingTeam: inningsData?.bowling_team || 'Team A',
        runs: score.runs,
        wickets: score.wickets,
        balls: score.balls,
        extras: score.extras,
        fow: score.fow,
        players: Array.from(playersRef.current.values()),
      } : null;

      // Type-safe result calculation
      const resultText = !inn2 ? 'IN PROGRESS' : (
        inn2.runs >= (inn1.runs + 1)
          ? `${(inn2.battingTeam || 'TEAM').toUpperCase()} WON BY ${10 - inn2.wickets} WKTS`
          : (inn2.wickets === 10 || Math.floor(inn2.balls / 6) >= matchOvers)
            ? inn2.runs === inn1.runs 
              ? 'MATCH TIED' 
              : `${(inn1.battingTeam || 'TEAM').toUpperCase()} WON BY ${inn1.runs - inn2.runs} RUNS`
            : 'IN PROGRESS'
      );

      // MoM Calculation
      const allPlayers = Array.from(playersRef.current.values());
      const mom = allPlayers.length > 0 ? allPlayers.sort((a, b) => calcMomScore(b) - calcMomScore(a))[0] : null;

      const isComplete = inn2 !== null;
      const targetVal = target || (inn1.runs + 1);

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
              body { font-family: 'Outfit', sans-serif; background: #f8fafc; color: #0f172a; padding: 0; margin: 0; line-height: 1.5; }
              .page { padding: 40px; }
              .header { background: #0f172a; color: white; padding: 40px; border-bottom: 8px solid #3b82f6; position: relative; overflow: hidden; }
              .header::after { content: ""; position: absolute; top: -50%; right: -10%; width: 50%; height: 200%; background: rgba(59, 130, 246, 0.1); transform: rotate(15deg); }
              .logo-brand { font-size: 12px; font-weight: 800; color: #3b82f6; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 8px; }
              .match-title { font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -1px; }
              .match-meta { font-size: 14px; color: #94a3b8; margin-top: 8px; font-weight: 500; }
              
              .summary-bar { display: flex; background: white; margin-top: -30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); padding: 24px; margin-left: 40px; margin-right: 40px; position: relative; z-index: 10; border: 1px solid #e2e8f0; }
              .summary-item { flex: 1; text-align: center; border-right: 1px solid #e2e8f0; }
              .summary-item:last-child { border-right: none; }
              .summary-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
              .summary-value { font-size: 24px; font-weight: 800; color: #0f172a; }
              .summary-value.winner { color: #10b981; }

              .mom-section { margin: 40px; background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%); border: 1px solid #fcd34d; border-radius: 20px; padding: 24px; display: flex; align-items: center; gap: 24px; }
              .mom-badge { background: #d97706; color: white; font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 100px; text-transform: uppercase; margin-bottom: 8px; display: inline-block; }
              .mom-name { font-size: 24px; font-weight: 800; color: #92400e; margin: 0; }
              .mom-stats { font-size: 14px; color: #b45309; font-weight: 600; margin-top: 4px; }
              .mom-icon { font-size: 40px; }

              .innings-card { margin: 0 40px 40px 40px; background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
              .innings-header { background: #f1f5f9; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
              .innings-title { font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
              .innings-score { font-size: 18px; font-weight: 800; color: #3b82f6; }

              table { width: 100%; border-collapse: collapse; }
              th { text-align: left; background: #f8fafc; color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; }
              td { padding: 12px 24px; font-size: 13px; border-bottom: 1px solid #f1f5f9; color: #334155; }
              .player-name { font-weight: 700; color: #0f172a; }
              .stat-val { font-weight: 700; color: #0f172a; text-align: right; }
              .stat-muted { color: #94a3b8; text-align: right; }

              .extras-row { background: #f8fafc; padding: 12px 24px; font-size: 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; }
              .fow-section { padding: 16px 24px; }
              .fow-title { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
              .fow-list { font-size: 11px; color: #64748b; line-height: 1.8; }

              .footer { text-align: center; padding: 40px; color: #94a3b8; font-size: 11px; font-weight: 600; letter-spacing: 1px; }
              .watermark { position: fixed; bottom: 40px; right: 40px; opacity: 0.1; font-size: 40px; font-weight: 900; color: #0f172a; transform: rotate(-15deg); pointer-events: none; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-brand">LazyCric Professional Broadcast</div>
              <div class="match-title">${inn1.battingTeam} VS ${inn2?.battingTeam || inn1.bowlingTeam}</div>
              <div class="match-meta">
                ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} • ${matchOvers} OVERS MATCH • OFFICIAL SCORECARD
              </div>
            </div>

            <div class="summary-bar">
              <div class="summary-item">
                <div class="summary-label">${inn1.battingTeam}</div>
                <div class="summary-value">${inn1.runs}/${inn1.wickets} <span style="font-size: 12px; color: #64748b;">(${Math.floor(inn1.balls / 6)}.${inn1.balls % 6})</span></div>
              </div>
              ${inn2 ? `
                <div class="summary-item">
                  <div class="summary-label">${inn2.battingTeam}</div>
                  <div class="summary-value">${inn2.runs}/${inn2.wickets} <span style="font-size: 12px; color: #64748b;">(${Math.floor(inn2.balls / 6)}.${inn2.balls % 6})</span></div>
                </div>

              ` : `
                <div class="summary-item">
                  <div class="summary-label">Result</div>
                  <div class="summary-value winner" style="font-size: 14px;">
                    ${resultText}
                  </div>
                </div>
              `}
            </div>

            ${mom ? `
              <div class="mom-section">
                <div style="flex: 1;">
                  <span class="mom-badge">Man of the Match</span>
                  <h2 class="mom-name">${(mom.name || 'PLAYER').toUpperCase()}</h2>
                  <div class="mom-stats">
                    ${mom.runsScored > 0 ? `${mom.runsScored} Runs (${mom.ballsFaced}b)` : ''}
                    ${mom.runsScored > 0 && mom.wicketsTaken > 0 ? ' • ' : ''}
                    ${mom.wicketsTaken > 0 ? `${mom.wicketsTaken} Wickets (${Math.floor(mom.oversBowled / 6)}.${mom.oversBowled % 6}ov)` : ''}
                  </div>
                </div>
                <div class="mom-icon">🏆</div>
              </div>
            ` : ''}

            <!-- INNINGS 1 -->
            <div class="innings-card">
              <div class="innings-header">
                <div class="innings-title">1st Innings: ${inn1.battingTeam}</div>
                <div class="innings-score">${inn1.runs}/${inn1.wickets}</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40%;">Batsman</th>
                    <th style="text-align: right;">R</th>
                    <th style="text-align: right;">B</th>
                    <th style="text-align: right;">4s</th>
                    <th style="text-align: right;">6s</th>
                    <th style="text-align: right;">SR</th>
                  </tr>
                </thead>
                <tbody>
                  ${inn1.players.filter((p: any) => p.ballsFaced > 0 && p.team === (matchData?.team_a === inn1.battingTeam ? 'team1' : 'team2')).map((p: any) => `
                    <tr>
                      <td class="player-name">${p.name}</td>
                      <td class="stat-val">${p.runsScored}</td>
                      <td class="stat-muted">${p.ballsFaced}</td>
                      <td class="stat-muted">${p.fours || 0}</td>
                      <td class="stat-muted">${p.sixes || 0}</td>
                      <td class="stat-val">${strikeRate(p.runsScored, p.ballsFaced)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="extras-row">Extras: ${inn1.extras || 0}</div>
              
              <div style="height: 20px; background: #f8fafc;"></div>
              
              <table>
                <thead>
                  <tr>
                    <th style="width: 40%;">Bowler</th>
                    <th style="text-align: right;">O</th>
                    <th style="text-align: right;">M</th>
                    <th style="text-align: right;">R</th>
                    <th style="text-align: right;">W</th>
                    <th style="text-align: right;">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  ${inn1.players.filter((p: any) => p.oversBowled > 0 && p.team === (matchData?.team_a === inn1.bowlingTeam ? 'team1' : 'team2')).map((p: any) => `
                    <tr>
                      <td class="player-name">${p.name}</td>
                      <td class="stat-val">${Math.floor(p.oversBowled / 6)}.${p.oversBowled % 6}</td>
                      <td class="stat-muted">${p.maidens || 0}</td>
                      <td class="stat-muted">${p.runsConceded || 0}</td>
                      <td class="stat-val" style="color: #ef4444;">${p.wicketsTaken || 0}</td>
                      <td class="stat-val">${economyRate(p.runsConceded || 0, p.oversBowled)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              ${inn1.fow && inn1.fow.length > 0 ? `
                <div class="fow-section">
                  <div class="fow-title">Fall of Wickets</div>
                  <div class="fow-list">
                    ${inn1.fow.map((f: any) => `${f.wicket}-${f.score} (${f.batter}, ${f.overs} ov)`).join(', ')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- INNINGS 2 -->
            ${inn2 ? `
              <div class="innings-card">
                <div class="innings-header">
                  <div class="innings-title">2nd Innings: ${inn2.battingTeam}</div>
                  <div class="innings-score">${inn2.runs}/${inn2.wickets}</div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 40%;">Batsman</th>
                      <th style="text-align: right;">R</th>
                      <th style="text-align: right;">B</th>
                      <th style="text-align: right;">4s</th>
                      <th style="text-align: right;">6s</th>
                      <th style="text-align: right;">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inn2.players.filter((p: any) => p.ballsFaced > 0 && p.team === (matchData?.team_a === inn2.battingTeam ? 'team1' : 'team2')).map((p: any) => `
                      <tr>
                        <td class="player-name">${p.name}</td>
                        <td class="stat-val">${p.runsScored}</td>
                        <td class="stat-muted">${p.ballsFaced}</td>
                        <td class="stat-muted">${p.fours || 0}</td>
                        <td class="stat-muted">${p.sixes || 0}</td>
                        <td class="stat-val">${strikeRate(p.runsScored, p.ballsFaced)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div class="extras-row">Extras: ${inn2.extras || 0}</div>
                
                <div style="height: 20px; background: #f8fafc;"></div>
                
                <table>
                  <thead>
                    <tr>
                      <th style="width: 40%;">Bowler</th>
                      <th style="text-align: right;">O</th>
                      <th style="text-align: right;">M</th>
                      <th style="text-align: right;">R</th>
                      <th style="text-align: right;">W</th>
                      <th style="text-align: right;">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inn2.players.filter((p: any) => p.oversBowled > 0 && p.team === (matchData?.team_a === inn2.bowlingTeam ? 'team1' : 'team2')).map((p: any) => `
                      <tr>
                        <td class="player-name">${p.name}</td>
                        <td class="stat-val">${Math.floor(p.oversBowled / 6)}.${p.oversBowled % 6}</td>
                        <td class="stat-muted">${p.maidens || 0}</td>
                        <td class="stat-muted">${p.runsConceded || 0}</td>
                        <td class="stat-val" style="color: #ef4444;">${p.wicketsTaken || 0}</td>
                        <td class="stat-val">${economyRate(p.runsConceded || 0, p.oversBowled)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                ${inn2.fow && inn2.fow.length > 0 ? `
                  <div class="fow-section">
                    <div class="fow-title">Fall of Wickets</div>
                    <div class="fow-list">
                      ${inn2.fow.map((f: any) => `${f.wicket}-${f.score} (${f.batter}, ${f.overs} ov)`).join(', ')}
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div class="footer">
              REPORT GENERATED BY LAZYCRIC ELITE BROADCAST ENGINE<br/>
              DIGITAL VERIFICATION: ${Math.random().toString(36).substring(2, 15).toUpperCase()} • ${new Date().getFullYear()}
            </div>
            
            <div class="watermark">LAZYCRIC</div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', 'Failed to generate elite report.');
    }
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    const lastBall = history[history.length - 1];
    Alert.alert('UNDO ACTION?', 'This will permanently remove the last delivery from history.', [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'UNDO', style: 'destructive', onPress: async () => {
          if (isOffline) {
            const updatedMatch = { ...matchData };
            const innIdx = updatedMatch.innings.findIndex((i: any) => i.id === inningsId);
            updatedMatch.innings[innIdx].balls = updatedMatch.innings[innIdx].balls.slice(0, -1);
            // Simplified re-calc for local undo
            await localDb.saveMatch(updatedMatch);
            setMatchData(updatedMatch);
          } else {
            await supabase.from('balls').delete().eq('id', lastBall.id);
          }
          const newHistory = history.slice(0, -1);
          setHistory(newHistory);
          calculateStateFromHistory(newHistory);
        }
      }
    ], { cancelable: true });
  };

  // ─── Professional State Applicator ───
  const applyDeliveryToScore = (c: ReturnType<typeof classifyDelivery>, isWicket: boolean) => {
    // Pre-compute BEFORE setScore so we can safely call setTimeout after
    setScore(prev => {
      const newBalls = prev.balls + (c.countsAsBall ? 1 : 0);
      const newWickets = prev.wickets + (isWicket ? 1 : 0);
      const matchOvers = matchData?.overs || 20;

      // ✅ Correct over detection: modulo of the running legal-ball counter
      const isOverComplete = c.countsAsBall && newBalls > 0 && newBalls % 6 === 0;
      const inningsComplete = checkInningsEnd(newWickets, newBalls, matchOvers, prev.runs + c.totalRuns, target) !== null;

      let nStriker = { ...prev.striker };
      let nNonStriker = { ...prev.nonStriker };
      let nSStats = { ...prev.strikerStats };
      let nNSStats = { ...prev.nonStrikerStats };
      let nBStats = { ...prev.bowlerStats };

      // 1. Batsman stats (wides don't count as balls faced)
      if (c.type !== 'wide') {
        nSStats.runs += c.batsmanRuns;
        if (c.countsAsBall) nSStats.balls += 1;
        if (c.batsmanRuns === 4) nSStats.fours += 1;
        if (c.batsmanRuns === 6) nSStats.sixes += 1;
      }

      // 2. Bowler stats
      // In professional rules, Byes and Leg-Byes are NOT credited to the bowler's runs conceded.
      if (c.type !== 'bye' && c.type !== 'leg_bye') {
        nBStats.runs += c.totalRuns;
      }
      if (c.countsAsBall) nBStats.balls += 1;
      if (isWicket) nBStats.wickets += 1;

      const runsThisOver = prev.runsInCurrentOver + c.totalRuns;
      const runsConcededThisOver = prev.runsConcededInCurrentOver + (c.type !== 'bye' && c.type !== 'leg_bye' ? c.totalRuns : 0);

      if (isOverComplete && runsConcededThisOver === 0) {
        nBStats.maidens += 1;
      }

      // 3. Strike rotation on odd runs (wides never rotate)
      if (!isWicket && c.strikeRotates) {
        [nStriker, nNonStriker] = [nNonStriker, nStriker];
        [nSStats, nNSStats] = [nNSStats, nSStats];
      }

      // 4. End-of-over strike rotation (happens regardless of runs scored)
      if (isOverComplete && !inningsComplete) {
        [nStriker, nNonStriker] = [nNonStriker, nStriker];
        [nSStats, nNSStats] = [nNSStats, nSStats];
      }

      // 5. Build over display string
      const displayStr = isWicket ? 'W' :
        c.type === 'wide' ? 'Wd' :
          c.type === 'no_ball' ? 'NB' :
            c.batsmanRuns.toString();

      // 6. Update FOW and dismissed if wicket
      let nFow = [...prev.fow];
      let nDismissed = [...prev.dismissed];
      if (isWicket) {
        const outPlayer = (score as any)._pendingWicketWhoOut === 'non-striker' ? prev.nonStriker : prev.striker;
        const outStats = (score as any)._pendingWicketWhoOut === 'non-striker' ? prev.nonStrikerStats : prev.strikerStats;

        nFow.push({
          wicket: newWickets,
          score: prev.runs + c.totalRuns,
          batter: outPlayer?.name || 'Batsman',
          overs: `${Math.floor(newBalls / 6)}.${newBalls % 6}`
        });
        nDismissed = [{
          ...outPlayer,
          ...outStats,
          how: (score as any)._pendingWicketType || 'OUT',
          isStriker: false
        }, ...nDismissed].slice(0, 3);
      }

      // 7. Update bowlers list
      let nBowlers = [...prev.bowlers];
      const bIdx = nBowlers.findIndex(b => b.id === prev.bowler?.id);
      if (bIdx >= 0) {
        nBowlers[bIdx] = nBStats;
      } else if (prev.bowler) {
        nBowlers.push(nBStats);
      }

      return {
        ...prev,
        runs: prev.runs + c.totalRuns,
        wickets: newWickets,
        balls: newBalls,
        extras: prev.extras + c.extrasRuns,
        currentOver: isOverComplete ? [] : [...prev.currentOver, displayStr],
        striker: nStriker,
        nonStriker: nNonStriker,
        strikerStats: nSStats,
        nonStrikerStats: nNSStats,
        bowlerStats: nBStats,
        bowlers: nBowlers,
        fow: nFow,
        dismissed: nDismissed,
        runsInCurrentOver: isOverComplete ? 0 : runsThisOver,
        runsConcededInCurrentOver: isOverComplete ? 0 : runsConcededThisOver,
        partnership: isWicket
          ? { runs: 0, balls: 0 }
          : { runs: prev.partnership.runs + c.totalRuns, balls: prev.partnership.balls + (c.countsAsBall ? 1 : 0) },
        _overComplete: isOverComplete && !inningsComplete,  // flag for post-update actions
        _inningsComplete: inningsComplete,
        _finalRuns: prev.runs + c.totalRuns,
        _finalWickets: newWickets,
        _finalBalls: newBalls,
      };
    });
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000', paddingTop: 10 }}>
      <Animated.View style={[styles.container, animatedShakeStyle]}>
      <StatusBar style="light" />
      
      {/* Global ProfessionalBackground provides the depth here */}

      {/* ── Compact Top Bar (Height Reduced for better visibility) ── */}
      <View style={[styles.header, { height: 50 }]}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/logo.png')} style={{ width: 24, height: 24, borderRadius: 6, marginRight: 8 }} />
          <Text style={styles.logoText}>LazyCricScore</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.hdrBtn} onPress={() => setModals(m => ({ ...m, history: true }))} activeOpacity={0.7}>
            <Text style={styles.hdrBtnIcon}>📋</Text>
          </TouchableOpacity>
          <View style={styles.profileCircle}>
            <Text style={styles.profileInitial}>S</Text>
          </View>
        </View>
      </View>

      {/* 1. FIXED HEADER SCOREBOARD */}
      <ScoreHeader 
        battingTeam={inningsData?.batting_team || 'Team A'} 
        runs={score.runs} 
        wickets={score.wickets} 
        balls={score.balls} 
        totalOvers={matchData?.overs || 20} 
        target={target}
        fow={score.fow} 
        bowlerName={score.bowler?.name}
        partnership={score.partnership}
      />

      {/* ── Slim Recent Deliveries ── */}
      <View style={styles.recentDeliveries}>
        <Text style={styles.recentLabel}>REC</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
          {history.slice(-10).reverse().map((ball, i) => (
            <View key={i} style={[styles.recentBall, { backgroundColor: ball.is_wicket ? '#EF4444' : ball.runs === 6 ? theme.colors.accent : ball.runs === 4 ? '#10B981' : 'rgba(255,255,255,0.08)' }]}>
              <Text style={styles.recentBallText}>{ball.is_wicket ? 'W' : ball.is_wide ? 'Wd' : ball.is_no_ball ? 'NB' : ball.runs}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── Fixed Info Panel (No Scroll) ── */}
      <View style={styles.infoPanel}>

        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardDot} />
            <Text style={styles.infoCardTitle}>BATTING UNIT</Text>
            <TouchableOpacity 
              style={styles.swapChip} 
              activeOpacity={0.6}
              onPress={() => setScore(prev => ({ ...prev, striker: prev.nonStriker, nonStriker: prev.striker, strikerStats: prev.nonStrikerStats, nonStrikerStats: prev.strikerStats }))}
            >
              <Text style={styles.swapChipText}>SWAP ENDS ⇄</Text>
            </TouchableOpacity>
          </View>
          {/* Striker */}
          <View style={styles.batsmanRow}>
            <View style={styles.nameBlock}>
              <View style={styles.strikerIndicator}>
                <Text style={styles.strikerStar}>★</Text>
              </View>
              <Text style={styles.batsmanName} numberOfLines={1}>{score.striker?.name || 'WAITING...'}</Text>
            </View>
            <View style={styles.batsmanStats}>
              <View style={styles.statPill}><Text style={styles.statPillVal}>{score.strikerStats.runs}</Text><Text style={styles.statPillLbl}>R</Text></View>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{score.strikerStats.balls}</Text><Text style={styles.statPillLbl}>B</Text></View>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{score.strikerStats.fours}</Text><Text style={styles.statPillLbl}>4s</Text></View>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{score.strikerStats.sixes}</Text><Text style={styles.statPillLbl}>6s</Text></View>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{strikeRate(score.strikerStats.runs, score.strikerStats.balls)}</Text><Text style={styles.statPillLbl}>SR</Text></View>
            </View>
          </View>
          <View style={styles.rowDivider} />
          {/* Non-Striker */}
          <View style={styles.batsmanRow}>
            <View style={styles.nameBlock}>
              <View style={styles.strikerIndicator}>
                <Text style={styles.strikerStarMuted}>○</Text>
              </View>
              <Text style={[styles.batsmanName, styles.batsmanNameMuted]} numberOfLines={1}>{score.nonStriker?.name || 'WAITING...'}</Text>
            </View>
            <View style={styles.batsmanStats}>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{score.nonStrikerStats.runs}</Text><Text style={styles.statPillLbl}>R</Text></View>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{score.nonStrikerStats.balls}</Text><Text style={styles.statPillLbl}>B</Text></View>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{score.nonStrikerStats.fours}</Text><Text style={styles.statPillLbl}>4s</Text></View>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{score.nonStrikerStats.sixes}</Text><Text style={styles.statPillLbl}>6s</Text></View>
              <View style={styles.statPill}><Text style={styles.statPillMuted}>{strikeRate(score.nonStrikerStats.runs, score.nonStrikerStats.balls)}</Text><Text style={styles.statPillLbl}>SR</Text></View>
            </View>
          </View>
        </View>

        {/* ── Action Card: Bowler + This Over (Integrated Row) ── */}
        <View style={styles.actionCard}>
          <View style={styles.actionRow}>
            {/* Bowler Side */}
            <View style={styles.bowlerBlock}>
              <View style={styles.actionHeaderRow}>
                <Ionicons name="fitness" size={10} color={theme.colors.accent} />
                <Text style={styles.actionLabel}>BOWLER</Text>
              </View>
              
              {score.bowler ? (
                <View style={styles.bowlerMain}>
                  <Text style={styles.bowlerNameAction} numberOfLines={1}>{(score.bowler.name || 'BOWLER').toUpperCase()}</Text>
                  <View style={styles.bowlerMiniStats}>
                    <View style={styles.bStatItem}><Text style={styles.bStatLabel}>O</Text><Text style={styles.bMiniVal}>{Math.floor(score.bowlerStats.balls/6)}.{score.bowlerStats.balls%6}</Text></View>
                    <View style={styles.bStatItem}><Text style={styles.bStatLabel}>R</Text><Text style={styles.bMiniVal}>{score.bowlerStats.runs}</Text></View>
                    <View style={styles.bStatItem}><Text style={styles.bStatLabel}>W</Text><Text style={[styles.bMiniVal, { color: '#EF4444' }]}>{score.bowlerStats.wickets}</Text></View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setModals(m => ({ ...m, bowler: true }))} style={styles.bowlerAssignAction} activeOpacity={0.8}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.assignInner}>
                    <Text style={styles.bowlerAssignText}>⊕ ASSIGN</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.vActionDivider} />

            {/* Over Side */}
            <View style={styles.overBlock}>
              <View style={styles.overHeaderAction}>
                <View style={styles.actionHeaderRow}>
                  <Ionicons name="analytics" size={10} color={theme.colors.accent} />
                  <Text style={styles.actionLabel}>THIS OVER</Text>
                </View>
                <View style={styles.overBadge}>
                  <Text style={styles.overFraction}>{score.currentOver.filter(b => b !== 'Wd' && b !== 'NB').length}<Text style={{opacity: 0.3}}>/6</Text></Text>
                </View>
              </View>
              <View style={styles.overBallsRow}>
                {Array.from({ length: Math.max(6, score.currentOver.length) }).map((_, i) => {
                  const ball = score.currentOver[i];
                  const bg = ball === 'W' ? '#EF4444' : ball === '6' ? theme.colors.accent : ball === '4' ? '#10B981' : (ball === 'Wd' || ball === 'NB') ? '#F59E0B' : ball ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)';
                  return (
                    <View key={i} style={[styles.overBallPro, ball && { backgroundColor: bg, borderColor: 'rgba(255,255,255,0.1)' }]}>
                      <Text style={[styles.overBallTextPro, !ball && { color: 'rgba(255,255,255,0.05)' }]}>
                        {ball ? (ball === '0' ? '•' : ball) : '·'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Control Panel (fixed bottom) ── */}
      <View style={styles.controlPanel}>
        <BallButtons
          onBall={handleBall}
          onWicket={() => {
            if (!score.striker || !score.nonStriker) { setModals(m => ({ ...m, setup: true })); return; }
            if (!score.bowler) { setModals(m => ({ ...m, bowler: true })); return; }
            setModals(m => ({ ...m, wicket: true }));
          }}
          onExtra={(type) => handleBall(type)}
          onUndo={handleUndo}
          onSwap={() => setScore(prev => ({ ...prev, striker: prev.nonStriker, nonStriker: prev.striker, strikerStats: prev.nonStrikerStats, nonStrikerStats: prev.strikerStats }))}
        />
      </View>


      <BottomNavBar />

      <SetupBatsmenModal visible={modals.setup} battingTeam={inningsData?.batting_team} onConfirm={(s, ns) => {
        const battingTeamName = inningsData?.batting_team || matchData?.team_a || 'team1';
        const teamKey = battingTeamName === matchData?.team_a ? 'team1' : 'team2';
        if (isOffline) {
          const p1 = { id: `p_${Date.now()}_1`, name: s, team: teamKey };
          const p2 = { id: `p_${Date.now()}_2`, name: ns, team: teamKey };
          setScore(prev => ({ ...prev, striker: p1, nonStriker: p2 }));
          setModals(m => ({ ...m, setup: false }));
        } else {
          supabase.from('players').insert([{ match_id: matchId, name: s, team: teamKey }]).select().single().then(({ data: p1 }) => {
            supabase.from('players').insert([{ match_id: matchId, name: ns, team: teamKey }]).select().single().then(({ data: p2 }) => {
              setScore(prev => ({ ...prev, striker: p1, nonStriker: p2 }));
              setModals(m => ({ ...m, setup: false }));
            });
          });
        }
      }} />

      <WagonWheelModal visible={modals.wagon} onSelect={(dir) => { processBall(pendingBall, dir); setModals(m => ({ ...m, wagon: false })); setPendingBall(null); }} />
      <MatchSummaryModal
        visible={modals.summary}
        isFirstInningsOnly={summaryData.isFirst}
        innings1={summaryData.isFirst ? {
          battingTeam: inningsData?.batting_team || '',
          bowlingTeam: inningsData?.bowling_team || '',
          runs: summaryData.runs,
          wickets: summaryData.wickets,
          balls: summaryData.balls,
          players: Array.from(playersRef.current.values()),
          history: history
        } : innings1Data}
        innings2={!summaryData.isFirst ? {
          battingTeam: inningsData?.batting_team || '',
          bowlingTeam: inningsData?.bowling_team || '',
          runs: summaryData.runs,
          wickets: summaryData.wickets,
          balls: summaryData.balls,
          players: Array.from(playersRef.current.values()),
          history: history
        } : undefined}
        matchOvers={matchData?.overs || 20}
        target={target}
        onAction={summaryData.onAction}
        onDownload={generatePDF}
      />
      <CelebrationModal visible={modals.celebration} type={celebrationType} onComplete={() => { setModals(m => ({ ...m, celebration: false })); setCelebrationType(null); }} />

      <WicketModal visible={modals.wicket} onConfirm={async (d) => {
        setModals(m => ({ ...m, wicket: false }));
        // Temporarily store who is out in a hidden state property to be picked up by applyDeliveryToScore
        setScore(prev => ({ ...prev, _pendingWicketWhoOut: d.whoOut, _pendingWicketType: d.type }) as any);
        await processBall('W');
        triggerCelebration('WICKET');

        // Handle next batsman
        if (d.nextBatsman) {
          const battingTeamName = inningsData?.batting_team || matchData?.team_a || 'team1';
          const teamKey = battingTeamName === matchData?.team_a ? 'team1' : 'team2';
          const nextP = { id: `p_${Date.now()}_nb`, name: d.nextBatsman, team: teamKey };
          if (d.whoOut === 'striker') {
            setScore(prev => ({ ...prev, striker: nextP, strikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 } }));
          } else {
            setScore(prev => ({ ...prev, nonStriker: nextP, nonStrikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 } }));
          }
        }
      }} onCancel={() => setModals(m => ({ ...m, wicket: false }))} />

      <BowlerModal
        visible={modals.bowler}
        previousBowlerId={score.bowler?.id}
        availableBowlers={score.bowlers}
        onSelect={(b) => {
          const bowlingTeamName = inningsData?.bowling_team || matchData?.team_b || 'team2';
          const teamKey = bowlingTeamName === matchData?.team_a ? 'team1' : 'team2';
          if (isOffline) {
            const data = b.id ? score.bowlers.find(bl => bl.id === b.id) : { id: `p_${Date.now()}_b`, name: b.name, team: teamKey, balls: 0, runs: 0, wickets: 0, maidens: 0 };
            setScore(prev => ({ ...prev, bowler: data, currentOver: [], bowlerStats: data, _overComplete: false }));
            setModals(m => ({ ...m, bowler: false }));
          } else {
            // For online, handle similarly
            if (b.id) {
              const data = score.bowlers.find(bl => bl.id === b.id);
              setScore(prev => ({ ...prev, bowler: data, currentOver: [], bowlerStats: data, _overComplete: false }));
              setModals(m => ({ ...m, bowler: false }));
            } else {
              supabase.from('players').insert([{ match_id: matchId, name: b.name, team: teamKey }]).select().single().then(({ data }) => {
                const newData = { ...data, balls: 0, runs: 0, wickets: 0, maidens: 0 };
                setScore(prev => ({ ...prev, bowler: newData, currentOver: [], bowlerStats: newData, _overComplete: false }));
                setModals(m => ({ ...m, bowler: false }));
              });
            }
          }
        }}
      />
      <HistoryModal visible={modals.history} onClose={() => setModals(m => ({ ...m, history: false }))} history={history} />
      <CelebrationEmitter ref={emitterRef} />
      <VoiceConsole onCommand={handleVoiceCommand} lastEvent={lastVoiceEvent} />
      </Animated.View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  // ─── Root ───
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  bgGlow: { position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: theme.colors.accent + '15', opacity: 0.5 },
  bgGlowAlt: { top: undefined, bottom: -150, left: -150, backgroundColor: theme.colors.success + '10' },
  scanlines: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', opacity: 0.03, zIndex: 999 },

  // ─── Header bar ───
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  hdrBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  hdrBtnIcon: { fontSize: 14 },
  profileCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: theme.colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitial: { color: '#FFF', fontWeight: '900', fontSize: 13 },

  // ─── Recent Deliveries ───
  recentDeliveries: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 36,
  },
  recentLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 1,
    marginRight: 10,
  },
  recentScroll: {
    alignItems: 'center',
    paddingRight: 20,
  },
  recentBall: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  recentBallText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  noHistoryText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.1)',
    fontStyle: 'italic',
  },

  // ─── Info Panel (flex area between header and control panel) ───
  scrollContent: {
    flex: 1,
    marginTop: -8,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  infoPanel: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },

  // ─── Info Card (shared card style) ───
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoCardDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  infoCardTitle: {
    flex: 1,
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ─── Swap chip ───
  swapChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  swapChipText: { fontSize: 8, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 0.5 },

  // ─── Batsmen rows ───
  batsmanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  nameBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  strikerIndicator: { width: 20, alignItems: 'center' },
  strikerStar: { fontSize: 14, color: '#FBBF24' },
  strikerStarMuted: { fontSize: 12, color: 'rgba(255,255,255,0.1)' },
  batsmanName: { color: '#FFF', fontSize: 18, fontFamily: theme.typography.fontFamily.bold, letterSpacing: -0.3 },
  batsmanNameMuted: { color: 'rgba(255,255,255,0.4)', fontFamily: theme.typography.fontFamily.semiBold },
  batsmanStats: { flexDirection: 'row', gap: 12 },
  statPill: { alignItems: 'flex-end', minWidth: 32 },
  statPillVal: { fontSize: 18, fontFamily: theme.typography.fontFamily.manrope, color: '#FFF', fontWeight: '800' },
  statPillMuted: { fontSize: 16, fontFamily: theme.typography.fontFamily.manrope, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  statPillLbl: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 1 },
  rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginVertical: 8 },

  // ─── Partnership & Required Strip ───
  partnershipStripPro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  pStat: { flex: 1, alignItems: 'center' },
  pLabel: { fontSize: 7, fontWeight: '900', color: 'rgba(255,255,255,0.15)', letterSpacing: 1, marginBottom: 4 },
  pVal: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  pSub: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.25)' },

  // ─── Action Card (Integrated Bowler + Over) ───
  actionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginVertical: 4,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bowlerBlock: { flex: 1.2, paddingRight: 12 },
  actionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  actionLabel: { fontSize: 9, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  bowlerMain: { gap: 4 },
  bowlerNameAction: { fontSize: 16, fontFamily: theme.typography.fontFamily.bold, color: '#FFF', letterSpacing: -0.2 },
  bowlerMiniStats: { flexDirection: 'row', gap: 10, marginTop: 4 },
  bStatItem: { alignItems: 'flex-start', gap: 1 },
  bStatLabel: { fontSize: 7, fontFamily: theme.typography.fontFamily.bold, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' },
  bMiniVal: { fontSize: 14, fontFamily: theme.typography.fontFamily.manrope, color: '#FFF', fontWeight: '700' },
  bowlerAssignAction: { height: 44, borderRadius: 12, overflow: 'hidden', width: '100%' },
  assignInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bowlerAssignText: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent, letterSpacing: 1 },
  vActionDivider: { width: 1, height: '70%', backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 },
  overBlock: { flex: 2, paddingLeft: 12 },
  overHeaderAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  overBadge: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  overFraction: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.accent },
  overBallsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  overBallPro: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  overBallTextPro: { fontSize: 12, fontFamily: theme.typography.fontFamily.bold, color: '#FFF' },

  // ─── Fixed control panel at bottom ───
  controlPanel: {
    paddingBottom: 80, 
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
  },
});
