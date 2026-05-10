import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Text, Dimensions, Image, TextInput } from 'react-native';
import Animated, { useSharedValue, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { useAppTheme } from '../src/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { classifyDelivery, checkInningsEnd, needsNewBowler, generateBallCommentary } from '../src/lib/scoringEngine';

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
import { MatchAnalytics } from '../src/components/MatchAnalytics';
import { BottomNavBar } from '../src/components/BottomNavBar';

import { localDb } from '../src/lib/localDb';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

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
    let currentOver: string[] = [];
    let pRuns = 0, pBalls = 0;

    balls.forEach(b => {
      // Use the professional engine to classify each delivery
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

      if (b.is_wicket) { wickets++; pRuns = 0; pBalls = 0; }

      if (c.countsAsBall) {
        totalBalls++;
        pBalls++;
        currentOver.push(b.is_wicket ? 'W' : b.runs === 0 ? `${c.extrasRuns}` : b.runs.toString());
      } else {
        currentOver.push(b.is_wide || b.type === 'wide' ? 'Wd' : 'NB');
      }

      // End of over — reset
      if (currentOver.filter(x => x !== 'Wd' && x !== 'NB').length === 6) {
        currentOver = [];
      }
    });

    setScore(prev => ({
      ...prev, runs, wickets, balls: totalBalls, extras, currentOver,
      partnership: { runs: pRuns, balls: pBalls },
      striker: currentInnings?.lastStriker || prev.striker,
      nonStriker: currentInnings?.lastNonStriker || prev.nonStriker,
      strikerStats: currentInnings?.lastStrikerStats || prev.strikerStats,
      nonStrikerStats: currentInnings?.lastNonStrikerStats || prev.nonStrikerStats,
      bowler: currentInnings?.lastBowler || prev.bowler,
      bowlerStats: currentInnings?.lastBowlerStats || prev.bowlerStats,
      fow: currentInnings?.fow || [],
      dismissed: currentInnings?.dismissed || [],
      bowlers: currentInnings?.bowlers || [],
      fullCommentary: currentInnings?.fullCommentary || [],
    }));

    const reason = checkInningsEnd(wickets, totalBalls, matchOvers, runs, target);
    if (reason) handleInningsEnd(runs, wickets, totalBalls);
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
      history: [...history]
    };

    if (isFirstInnings) {
      setInnings1Data(currentInningsSummary);
    }

    const doAction = async () => {
      setModals(m => ({ ...m, summary: false }));
      if (isFirstInnings && isOffline) {
        const updatedMatch = { ...matchData };
        const inn1Idx = updatedMatch.innings.findIndex((i: any) => i.id === inningsId);
        if (inn1Idx >= 0) {
          updatedMatch.innings[inn1Idx].status = 'completed';
          updatedMatch.innings[inn1Idx].total_runs = finalRuns;
          updatedMatch.innings[inn1Idx].total_wickets = finalWickets;
          updatedMatch.innings[inn1Idx].total_balls = finalBalls;
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

  const handleBall = async (result: string) => {
    if (score.balls > 0 && score.balls % 6 === 0 && score.currentOver.length === 0 && !score.bowler) {
      setModals(m => ({ ...m, bowler: true }));
      return;
    }
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
    if (!score.striker || !score.nonStriker) { setModals(m => ({ ...m, setup: true })); return; }
    if (!score.bowler) { setModals(m => ({ ...m, bowler: true })); return; }

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
      bowler_id: score.bowler.id,
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
      const isComplete = innings1Data && summaryData.isFirst === false;
      const inn1 = innings1Data || {
        battingTeam: inningsData?.batting_team,
        runs: score.runs,
        wickets: score.wickets,
        balls: score.balls,
        players: Array.from(playersRef.current.values())
      };

      const inn2 = !summaryData.isFirst ? {
        battingTeam: inningsData?.batting_team,
        runs: score.runs,
        wickets: score.wickets,
        balls: score.balls,
        players: Array.from(playersRef.current.values())
      } : null;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
              
              body { 
                font-family: 'Plus Jakarta Sans', sans-serif; 
                background: #020617; 
                color: #f8fafc; 
                padding: 40px; 
                margin: 0;
              }
              
              .container {
                max-width: 900px;
                margin: 0 auto;
              }

              .header { 
                text-align: center; 
                margin-bottom: 50px; 
                padding: 40px;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: 24px;
                border: 1px solid rgba(255,255,255,0.1);
              }
              
              .logo-text {
                font-size: 12px;
                font-weight: 800;
                color: #3b82f6;
                letter-spacing: 4px;
                margin-bottom: 12px;
                text-transform: uppercase;
              }

              .title { 
                font-size: 36px; 
                font-weight: 800; 
                color: #fff; 
                letter-spacing: -1px;
                margin: 0;
              }
              
              .match-info { 
                font-size: 16px; 
                color: #94a3b8; 
                margin-top: 12px; 
                font-weight: 500;
              }
              
              .score-grid { 
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                margin-bottom: 40px;
              }
              
              .score-card {
                background: #1e293b;
                padding: 32px;
                border-radius: 24px;
                border: 1px solid rgba(255,255,255,0.05);
                text-align: center;
              }
              
              .team-name { 
                font-size: 14px; 
                font-weight: 800; 
                color: #3b82f6; 
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              
              .score-val { 
                font-size: 48px; 
                font-weight: 800; 
                color: #fff;
                line-height: 1;
                margin-bottom: 8px;
              }
              
              .overs { 
                font-size: 14px; 
                color: #64748b;
                font-weight: 600;
              }
              
              .result-banner { 
                text-align: center; 
                font-size: 20px; 
                font-weight: 800; 
                color: #10b981; 
                margin-bottom: 50px; 
                background: rgba(16, 185, 129, 0.1); 
                padding: 24px; 
                border-radius: 20px;
                border: 1px solid rgba(16, 185, 129, 0.2);
              }
              
              .innings-section { 
                margin-bottom: 60px; 
              }
              
              .innings-header {
                display: flex;
                align-items: center;
                margin-bottom: 24px;
                gap: 16px;
              }
              
              .innings-title { 
                font-size: 18px; 
                font-weight: 800; 
                color: #fff; 
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .innings-line {
                flex: 1;
                height: 1px;
                background: linear-gradient(90deg, #3b82f6, transparent);
              }
              
              table { 
                width: 100%; 
                border-collapse: separate; 
                border-spacing: 0;
                margin-bottom: 32px; 
                background: rgba(30, 41, 59, 0.5); 
                border-radius: 20px; 
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.05);
              }
              
              th { 
                background: rgba(51, 65, 85, 0.5); 
                color: #94a3b8; 
                font-size: 10px; 
                text-transform: uppercase; 
                text-align: left; 
                padding: 16px;
                font-weight: 800;
                letter-spacing: 1px;
              }
              
              td { 
                padding: 16px; 
                font-size: 14px; 
                border-bottom: 1px solid rgba(255,255,255,0.05); 
                color: #e2e8f0;
                font-weight: 500;
              }
              
              tr:last-child td { border-bottom: none; }
              
              .name-cell { font-weight: 700; color: #fff; }
              .stat-cell { font-weight: 800; color: #3b82f6; }
              .mute-cell { color: #64748b; }
              
              .footer { 
                text-align: center; 
                font-size: 12px; 
                color: #475569; 
                margin-top: 80px;
                padding-top: 40px;
                border-top: 1px solid rgba(255,255,255,0.05);
                font-weight: 600;
                letter-spacing: 1px;
              }

              .table-label {
                font-size: 12px;
                font-weight: 700;
                color: #94a3b8;
                margin-bottom: 12px;
                margin-left: 4px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo-text">LazyCricScore Professional</div>
                <div class="title">OFFICIAL MATCH REPORT</div>
                <div class="match-info">${matchData?.team_a.toUpperCase()} vs ${matchData?.team_b.toUpperCase()}</div>
                <div class="match-info" style="font-size: 12px; opacity: 0.7;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} • ${matchData?.overs} OVERS MATCH</div>
              </div>

              <div class="score-grid">
                <div class="score-card">
                  <div class="team-name">${inn1.battingTeam}</div>
                  <div class="score-val">${inn1.runs}/${inn1.wickets}</div>
                  <div class="overs">${Math.floor(inn1.balls / 6)}.${inn1.balls % 6} OVERS</div>
                </div>
                <div class="score-card" style="${!inn2 ? 'opacity: 0.5;' : ''}">
                  <div class="team-name">${inn2?.battingTeam || 'SECOND INNINGS'}</div>
                  <div class="score-val">${inn2 ? `${inn2.runs}/${inn2.wickets}` : 'TBD'}</div>
                  <div class="overs">${inn2 ? `${Math.floor(inn2.balls / 6)}.${inn2.balls % 6} OVERS` : 'YET TO BAT'}</div>
                </div>
              </div>

              ${isComplete ? `
                <div class="result-banner">
                  ${(inn2?.runs || 0) >= (target || 0)
              ? `${inn2?.battingTeam.toUpperCase()} WON BY ${10 - (inn2?.wickets || 0)} WICKETS`
              : `${inn1.battingTeam.toUpperCase()} WON BY ${target! - (inn2?.runs || 0)} RUNS`}
                </div>
              ` : inn1.runs > 0 ? `<div class="result-banner" style="color: #3b82f6; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2);">TARGET: ${inn1.runs + 1} RUNS</div>` : ''}

              <!-- FIRST INNINGS -->
              <div class="innings-section">
                <div class="innings-header">
                  <div class="innings-title">1st Innings: ${inn1.battingTeam}</div>
                  <div class="innings-line"></div>
                </div>
                
                <div class="table-label">BATTING SCORECARD</div>
                <table>
                  <thead>
                    <tr>
                      <th>Batsman</th>
                      <th>Runs</th>
                      <th>Balls</th>
                      <th>4s</th>
                      <th>6s</th>
                      <th>SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inn1.players.filter((p: any) => p.ballsFaced > 0).map((p: any) => `
                      <tr>
                        <td class="name-cell">${p.name}</td>
                        <td class="stat-cell">${p.runsScored}</td>
                        <td>${p.ballsFaced}</td>
                        <td class="mute-cell">${p.fours || 0}</td>
                        <td class="mute-cell">${p.sixes || 0}</td>
                        <td>${strikeRate(p.runsScored, p.ballsFaced)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                <div class="table-label">BOWLING SCORECARD</div>
                <table>
                  <thead>
                    <tr>
                      <th>Bowler</th>
                      <th>O</th>
                      <th>M</th>
                      <th>R</th>
                      <th>W</th>
                      <th>ECON</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inn1.players.filter((p: any) => p.oversBowled > 0).map((p: any) => `
                      <tr>
                        <td class="name-cell">${p.name}</td>
                        <td class="stat-cell">${Math.floor(p.oversBowled / 6)}.${p.oversBowled % 6}</td>
                        <td>${p.maidens || 0}</td>
                        <td>${p.runsConceded || 0}</td>
                        <td class="stat-cell">${p.wicketsTaken || 0}</td>
                        <td>${economyRate(p.runsConceded || 0, p.oversBowled)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <!-- SECOND INNINGS -->
              ${inn2 ? `
                <div class="innings-section">
                  <div class="innings-header">
                    <div class="innings-title">2nd Innings: ${inn2.battingTeam}</div>
                    <div class="innings-line"></div>
                  </div>
                  
                  <div class="table-label">BATTING SCORECARD</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Batsman</th>
                        <th>Runs</th>
                        <th>Balls</th>
                        <th>4s</th>
                        <th>6s</th>
                        <th>SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${inn2.players.filter((p: any) => p.ballsFaced > 0).map((p: any) => `
                        <tr>
                          <td class="name-cell">${p.name}</td>
                          <td class="stat-cell">${p.runsScored}</td>
                          <td>${p.ballsFaced}</td>
                          <td class="mute-cell">${p.fours || 0}</td>
                          <td class="mute-cell">${p.sixes || 0}</td>
                          <td>${strikeRate(p.runsScored, p.ballsFaced)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>

                  <div class="table-label">BOWLING SCORECARD</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Bowler</th>
                        <th>O</th>
                        <th>M</th>
                        <th>R</th>
                        <th>W</th>
                        <th>ECON</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${inn2.players.filter((p: any) => p.oversBowled > 0).map((p: any) => `
                        <tr>
                          <td class="name-cell">${p.name}</td>
                          <td class="stat-cell">${Math.floor(p.oversBowled / 6)}.${p.oversBowled % 6}</td>
                          <td>${p.maidens || 0}</td>
                          <td>${p.runsConceded || 0}</td>
                          <td class="stat-cell">${p.wicketsTaken || 0}</td>
                          <td>${economyRate(p.runsConceded || 0, p.oversBowled)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              <div class="footer">
                GENERATED BY ELITE BROADCAST ENGINE • LAZYCRICSCORE PRO v2.0<br/>
                <span style="font-size: 10px; opacity: 0.5; margin-top: 8px; display: block;">DIGITAL AUTHENTICITY SECURED</span>
              </div>
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', 'Failed to generate pro report.');
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
    <Animated.View style={[styles.container, animatedShakeStyle]}>
      <StatusBar style="light" />
      
      {/* Immersive Background Elements */}
      <View style={styles.bgGlow} />
      <View style={[styles.bgGlow, styles.bgGlowAlt]} />
      <View style={styles.scanlines} pointerEvents="none" />

      {/* TopAppBar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/logo.png')} style={{ width: 28, height: 28, borderRadius: 8, marginRight: 12 }} />
          <Text style={styles.logoText}>LazyCricScore</Text>
        </View>
        <View style={styles.profileCircle}>
          <Text style={styles.profileInitial}>S</Text>
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
      />

      {/* 2. SCROLLABLE CONTENT */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bentoSection}>
          <BatsmenDisplay 
            striker={{ ...score.strikerStats, name: score.striker?.name || '---', isStriker: true }} 
            nonStriker={{ ...score.nonStrikerStats, name: score.nonStriker?.name || '---', isStriker: false }} 
            dismissed={score.dismissed}
            onSwap={() => {
              setScore(prev => ({
                ...prev,
                striker: prev.nonStriker,
                nonStriker: prev.striker,
                strikerStats: prev.nonStrikerStats,
                nonStrikerStats: prev.strikerStats
              }));
            }} 
            partnership={score.partnership} 
          />

          {/* DELIVERY CONTROL IMMEDIATELY AFTER BATSMEN */}
          <BallButtons 
            onBall={handleBall} 
            onWicket={() => {
              if (!score.striker || !score.nonStriker) { setModals(m => ({ ...m, setup: true })); return; }
              if (!score.bowler) { setModals(m => ({ ...m, bowler: true })); return; }
              setModals(m => ({ ...m, wicket: true }));
            }} 
            onExtra={(type) => handleBall(type)} 
            onUndo={handleUndo}
            onSwap={() => {
              setScore(prev => ({
                ...prev,
                striker: prev.nonStriker,
                nonStriker: prev.striker,
                strikerStats: prev.nonStrikerStats,
                nonStrikerStats: prev.strikerStats
              }));
            }}
          />
          
          <BowlerDisplay 
            bowlers={score.bowlers}
            currentBowlerId={score.bowler?.id}
          />
        </View>

        <OverTracker currentOver={score.currentOver} />

        {/* Elite Rivalry Hub */}
        <View style={styles.rivalryCard}>
          <LinearGradient colors={['rgba(30, 41, 59, 0.5)', 'transparent']} style={styles.rivalryInner}>
            <View style={styles.rivalryHeader}>
              <Text style={styles.rivalryLabel}>PLAYER RIVALRY</Text>
              <View style={styles.rivalryLive}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>HEAD-TO-HEAD</Text>
              </View>
            </View>
            <View style={styles.rivalryStats}>
              <View style={styles.rivalryPlayer}>
                <Text style={styles.rivalryName} numberOfLines={1}>{score.striker?.name}</Text>
                <Text style={styles.rivalryVal}>{rivalry.runs}</Text>
                <Text style={styles.rivalrySub}>RUNS</Text>
              </View>
              <View style={styles.rivalryVS}><Text style={styles.vsText}>VS</Text></View>
              <View style={styles.rivalryPlayer}>
                <Text style={styles.rivalryName} numberOfLines={1}>{score.bowler?.name}</Text>
                <Text style={styles.rivalryVal}>{rivalry.wickets}</Text>
                <Text style={styles.rivalrySub}>WKTS</Text>
              </View>
            </View>
            <Text style={styles.rivalrySummary}>
              Striker has faced {rivalry.balls} balls from this bowler in this match.
            </Text>
          </LinearGradient>
        </View>

        {/* Elite Voice & Command Hub */}
        <View style={styles.voiceContainer}>
          <TouchableOpacity 
            style={[styles.voiceBtn, isVoiceActive && styles.voiceBtnActive]} 
            onPress={() => setIsVoiceActive(!isVoiceActive)}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={isVoiceActive ? ['#EF4444', '#B91C1C'] : ['#1E293B', '#0F172A']} 
              style={styles.voiceInner}
            >
              <Text style={styles.voiceIcon}>{isVoiceActive ? '🛑' : '🎙️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.voiceTitle}>{isVoiceActive ? 'EVI ENGINE: LISTENING...' : 'ACTIVATE ELITE VOICE SCORING'}</Text>
                <Text style={styles.voiceSub}>{isVoiceActive ? 'Say "Four", "Single", or "Wicket"' : 'Professional Hands-Free Protocol'}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {isVoiceActive && (
            <View style={styles.voiceCommandBox}>
              <TextInput
                style={styles.voiceInput}
                placeholder="Type command (e.g. 4, 6, W, 1)..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={voiceCommand}
                onChangeText={(text) => {
                  setVoiceCommand(text);
                  const raw = text.toUpperCase().trim();
                  
                  // Professional Alias Mapping
                  const commandMap: Record<string, string> = {
                    '0': '0', 'DOT': '0',
                    '1': '1', 'SINGLE': '1',
                    '2': '2', 'DOUBLE': '2',
                    '3': '3', 'TRIPLE': '3',
                    '4': '4', 'FOUR': '4', 'BOUNDARY': '4',
                    '6': '6', 'SIX': '6', 'MAXIMUM': '6',
                    'W': 'W', 'WICKET': 'W', 'OUT': 'W',
                    'WD': 'WD', 'WIDE': 'WD',
                    'NB': 'NB', 'NO BALL': 'NB'
                  };

                  const cmd = commandMap[raw];
                  if (cmd) {
                    setVoiceCommand('');
                    setIsVoiceActive(false);
                    if (cmd === 'W') {
                      if (!score.striker || !score.nonStriker) { setModals(m => ({ ...m, setup: true })); return; }
                      if (!score.bowler) { setModals(m => ({ ...m, bowler: true })); return; }
                      setModals(m => ({ ...m, wicket: true }));
                    } else {
                      handleBall(cmd);
                    }
                  }
                }}
                autoFocus
              />
              <Text style={styles.voiceHint}>EVI SIMULATION ACTIVE</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNavBar />

      <SetupBatsmenModal visible={modals.setup} battingTeam={inningsData?.batting_team} onConfirm={(s, ns) => {
        const teamKey = inningsData.batting_team === matchData.team_a ? 'team1' : 'team2';
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
        onDownload={async () => {
          const isFirstInningsOnly = summaryData.isFirst;
          const currentInnings = isFirstInningsOnly ? innings1Data : {
            battingTeam: inningsData?.batting_team || '',
            bowlingTeam: inningsData?.bowling_team || '',
            runs: summaryData.runs,
            wickets: summaryData.wickets,
            balls: summaryData.balls,
            players: Array.from(playersRef.current.values()),
            history: history
          };

          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                  body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; margin: 0; }
                  .container { max-width: 800px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
                  .header { background: #0f172a; padding: 30px; color: white; }
                  .branding { font-size: 10px; font-weight: 900; letter-spacing: 2px; color: #3b82f6; margin-bottom: 8px; }
                  .match-title { font-size: 24px; font-weight: 900; margin-bottom: 10px; }
                  .toss-info { font-size: 11px; font-weight: 700; color: #94a3b8; }
                  .score-summary { display: flex; justify-content: space-between; padding: 20px 30px; background: #f1f5f9; }
                  .team-row { flex: 1; }
                  .team-n { font-size: 12px; font-weight: 700; color: #64748b; }
                  .score-v { font-size: 24px; font-weight: 900; color: #0f172a; }
                  .section { padding: 20px 30px; }
                  .section-h { font-size: 10px; font-weight: 900; color: #3b82f6; letter-spacing: 1px; border-bottom: 2px solid #3b82f6; display: inline-block; margin-bottom: 15px; }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                  th { text-align: left; font-size: 10px; color: #64748b; padding: 10px; border-bottom: 1px solid #e2e8f0; }
                  td { padding: 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
                  .name-cell { font-weight: 700; }
                  .stat-cell { font-weight: 800; color: #3b82f6; }
                  .footer { padding: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="branding">LAZYCRIC ELITE REPORT</div>
                    <div class="match-title">${innings1Data?.battingTeam || 'Team A'} vs ${inningsData?.batting_team || 'Team B'}</div>
                    <div class="toss-info">TOSS: ${matchData?.toss_winner || '---'} WON AND CHOSE TO ${matchData?.toss_choice?.toUpperCase() || '---'}</div>
                  </div>
                  
                  <div class="score-summary">
                    <div class="team-row">
                      <div class="team-n">${innings1Data?.battingTeam || 'T1'}</div>
                      <div class="score-v">${innings1Data?.runs || 0}/${innings1Data?.wickets || 0} (${Math.floor((innings1Data?.balls || 0)/6)}.${(innings1Data?.balls || 0)%6})</div>
                    </div>
                    ${!isFirstInningsOnly ? `
                    <div class="team-row" style="text-align: right;">
                      <div class="team-n">${inningsData?.batting_team || 'T2'}</div>
                      <div class="score-v">${summaryData.runs}/${summaryData.wickets} (${Math.floor(summaryData.balls/6)}.${summaryData.balls%6})</div>
                    </div>` : ''}
                  </div>

                  <div class="section">
                    <div class="section-h">${currentInnings?.battingTeam.toUpperCase()} BATTING</div>
                    <table>
                      <thead><tr><th>BATSMAN</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
                      <tbody>
                        ${(currentInnings?.players || []).filter((p: any) => p.ballsFaced > 0).map((p: any) => `
                          <tr>
                            <td class="name-cell">${p.name}</td>
                            <td class="stat-cell">${p.runsScored}</td>
                            <td>${p.ballsFaced}</td>
                            <td>${p.fours}</td>
                            <td>${p.sixes}</td>
                            <td>${((p.runsScored/(p.ballsFaced || 1))*100).toFixed(1)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>

                  <div class="section">
                    <div class="section-h">${currentInnings?.bowlingTeam.toUpperCase()} BOWLING</div>
                    <table>
                      <thead><tr><th>BOWLER</th><th>O</th><th>M</th><th>R</th><th>W</th><th>ECON</th></tr></thead>
                      <tbody>
                        ${(currentInnings?.players || []).filter((p: any) => p.oversBowled > 0).map((p: any) => `
                          <tr>
                            <td class="name-cell">${p.name}</td>
                            <td class="stat-cell">${Math.floor(p.oversBowled/6)}.${p.oversBowled%6}</td>
                            <td>${p.maidens}</td>
                            <td>${p.runsConceded}</td>
                            <td>${p.wicketsTaken}</td>
                            <td>${(p.runsConceded / (p.oversBowled/6 || 1)).toFixed(2)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>

                  <div class="footer">POWERED BY LAZYCRIC • PROFESSIONAL GRADE SCORING</div>
                </div>
              </body>
            </html>
          `;
          const { uri } = await Print.printToFileAsync({ html });
          // Open PDF Viewer First
          await Print.printAsync({ uri });
        }}
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
          const teamKey = inningsData.batting_team === matchData.team_a ? 'team1' : 'team2';
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
          const teamKey = inningsData.bowling_team === matchData.team_a ? 'team1' : 'team2';
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
    </Animated.View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: theme.colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIcon: {
    color: theme.colors.accent,
    fontSize: 24,
  },
  logoText: {
    color: theme.colors.accent,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  bentoSection: {
    gap: 16,
    marginBottom: 24,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingBottom: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navItemActive: {
    backgroundColor: theme.colors.glass,
    borderRadius: 16,
  },
  navIcon: {
    fontSize: 24,
    color: theme.colors.textMuted,
  },
  navIconActive: {
    color: theme.colors.accent,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  navLabelActive: {
    color: theme.colors.accent,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  bgGlow: { position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: theme.colors.accent + '15', opacity: 0.5 },
  bgGlowAlt: { top: undefined, bottom: -150, left: -150, backgroundColor: theme.colors.success + '10' },
  scanlines: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', opacity: 0.03, zIndex: 999 },
  rivalryCard: { marginHorizontal: 20, marginTop: 16, borderRadius: 32, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.01)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  rivalryInner: { padding: 24 },
  rivalryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rivalryLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.2)', letterSpacing: 3 },
  rivalryLive: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59, 130, 246, 0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveText: { fontSize: 8, fontWeight: '900', color: theme.colors.accent, letterSpacing: 1 },
  rivalryStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  rivalryPlayer: { flex: 1, alignItems: 'center' },
  rivalryName: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: 1 },
  rivalryVal: { fontSize: 40, fontWeight: '900', color: '#FFF', letterSpacing: -2 },
  rivalrySub: { fontSize: 8, fontWeight: '900', color: theme.colors.accent, letterSpacing: 2 },
  rivalryVS: { width: 40, alignItems: 'center' },
  vsText: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.1)' },
  rivalrySummary: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: 0.5 },
  voiceContainer: { marginHorizontal: 20, marginTop: 16, gap: 16, marginBottom: 40 },
  voiceBtn: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  voiceBtnActive: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  voiceInner: { padding: 24, flexDirection: 'row', alignItems: 'center', gap: 20 },
  voiceIcon: { fontSize: 32 },
  voiceTitle: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  voiceSub: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  voiceCommandBox: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  voiceInput: { width: '100%', height: 56, color: '#FFF', fontSize: 16, fontWeight: '900', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  voiceHint: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.15)', marginTop: 12, letterSpacing: 3 },
});
