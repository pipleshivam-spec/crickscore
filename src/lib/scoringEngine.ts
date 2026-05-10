/**
 * ============================================================
 * LAZYCRIC PROFESSIONAL SCORING ENGINE
 * Implements full ICC cricket rules via Event Sourcing pattern.
 * ============================================================
 */

export type DeliveryType = 'legal' | 'wide' | 'no_ball' | 'leg_bye' | 'bye';

export interface BallEvent {
  id: string;
  innings_id: string;
  over_number: number;
  ball_number: number;        // Actual sequence number (includes extras)
  legal_ball_number: number;  // Only valid deliveries (1-6)
  runs: number;               // Runs off the bat
  extras: number;             // Extras (wide +1, no-ball +1, byes/leg-byes = actual runs)
  type: DeliveryType;
  is_wicket: boolean;
  batsman_id: string;
  bowler_id: string;
  direction: string;
  created_at: string;
}

export interface BatsmanState {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: 'in' | 'out' | 'retired';
}

export interface BowlerState {
  id: string;
  name: string;
  overs: number;
  balls: number;  // legal balls this over
  runs: number;
  wickets: number;
  maidens: number;
}

export interface PartnershipState {
  runs: number;
  balls: number;
  batsmanAId: string;
  batsmanBId: string;
}

export interface InningsState {
  totalRuns: number;
  totalWickets: number;
  totalLegalBalls: number;  // Valid ball count only
  totalExtras: number;
  currentOver: string[];    // Display strings for current over
  striker: BatsmanState | null;
  nonStriker: BatsmanState | null;
  bowler: BowlerState | null;
  partnership: PartnershipState;
  completedOvers: number;
  isComplete: boolean;
  completionReason: 'all_out' | 'overs_complete' | 'target_reached' | null;
}

/**
 * Classifies a delivery and returns structured result.
 * This is the FIRST GATE every delivery passes through.
 */
export function classifyDelivery(result: string): {
  type: DeliveryType;
  batsmanRuns: number;   // runs credited to batsman
  extrasRuns: number;    // extras (wide penalty / no-ball penalty / byes)
  totalRuns: number;     // total runs added to team score
  countsAsBall: boolean; // does it count toward the 6-ball over?
  strikeRotates: boolean;// does strike rotate (based on batsmanRuns)?
  pendingLegalBall: boolean; // true if an extra ball must be bowled
} {
  // Wide
  if (result === 'Wd') {
    return { type: 'wide', batsmanRuns: 0, extrasRuns: 1, totalRuns: 1, countsAsBall: false, strikeRotates: false, pendingLegalBall: true };
  }
  // No Ball (dot off bat — just the penalty run)
  if (result === 'NB') {
    return { type: 'no_ball', batsmanRuns: 0, extrasRuns: 1, totalRuns: 1, countsAsBall: false, strikeRotates: false, pendingLegalBall: true };
  }
  // No Ball + runs (e.g. "NB3" = 3 runs off bat + 1 no-ball penalty)
  if (result.startsWith('NB') && result.length > 2) {
    const batRuns = parseInt(result.slice(2));
    return { type: 'no_ball', batsmanRuns: batRuns, extrasRuns: 1, totalRuns: batRuns + 1, countsAsBall: false, strikeRotates: batRuns % 2 !== 0, pendingLegalBall: true };
  }
  // Leg Bye (legal delivery, runs go to extras not batsman)
  if (result.startsWith('LB')) {
    const lbRuns = parseInt(result.slice(2)) || 1;
    return { type: 'leg_bye', batsmanRuns: 0, extrasRuns: lbRuns, totalRuns: lbRuns, countsAsBall: true, strikeRotates: lbRuns % 2 !== 0, pendingLegalBall: false };
  }
  // Bye (legal delivery, runs go to extras not batsman)
  if (result.startsWith('B')) {
    const byeRuns = parseInt(result.slice(1)) || 1;
    return { type: 'bye', batsmanRuns: 0, extrasRuns: byeRuns, totalRuns: byeRuns, countsAsBall: true, strikeRotates: byeRuns % 2 !== 0, pendingLegalBall: false };
  }
  // Wicket
  if (result === 'W') {
    return { type: 'legal', batsmanRuns: 0, extrasRuns: 0, totalRuns: 0, countsAsBall: true, strikeRotates: false, pendingLegalBall: false };
  }
  // Normal run (0, 1, 2, 3, 4, 6)
  const runs = parseInt(result);
  return { type: 'legal', batsmanRuns: runs, extrasRuns: 0, totalRuns: runs, countsAsBall: true, strikeRotates: runs % 2 !== 0, pendingLegalBall: false };
}

/**
 * Full Event Sourcing replay.
 * Replays ALL ball events from index 0 to derive current state.
 * This is the canonical source of truth.
 */
export function replayInnings(balls: BallEvent[], matchOvers: number): InningsState {
  let totalRuns = 0;
  let totalWickets = 0;
  let totalLegalBalls = 0;
  let totalExtras = 0;
  let currentOver: string[] = [];
  let completedOvers = 0;
  let isComplete = false;
  let completionReason: InningsState['completionReason'] = null;

  const batsmenMap = new Map<string, BatsmanState>();
  const bowlersMap = new Map<string, BowlerState>();
  
  let strikerId: string | null = null;
  let nonStrikerId: string | null = null;
  let currentBowlerId: string | null = null;

  let partnershipRuns = 0;
  let partnershipBalls = 0;

  for (const ball of balls) {
    if (isComplete) break;

    // Ensure players exist in maps
    if (!batsmenMap.has(ball.batsman_id)) {
      batsmenMap.set(ball.batsman_id, {
        id: ball.batsman_id,
        name: 'Batsman', // In a real app, we'd look this up
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: 'in'
      });
    }
    if (!bowlersMap.has(ball.bowler_id)) {
      bowlersMap.set(ball.bowler_id, {
        id: ball.bowler_id,
        name: 'Bowler',
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0
      });
    }

    strikerId = ball.batsman_id;
    currentBowlerId = ball.bowler_id;
    
    // Attempt to find non-striker (the other batsman in the partnership)
    // This is a simplification; in a real replay we'd track who is at which end.

    const striker = batsmenMap.get(strikerId)!;
    const bowler = bowlersMap.get(currentBowlerId)!;

    const classified = classifyDelivery(ball.is_wicket ? 'W' : (
      ball.type === 'wide' ? 'Wd' :
      ball.type === 'no_ball' ? 'NB' :
      ball.type === 'leg_bye' ? `LB${ball.extras}` :
      ball.type === 'bye' ? `B${ball.extras}` :
      ball.runs.toString()
    ));

    const totalBallRuns = ball.runs + ball.extras;
    totalRuns += totalBallRuns;
    totalExtras += ball.extras;

    if (ball.type !== 'wide') {
      striker.runs += ball.runs;
      if (classified.countsAsBall) {
        striker.balls += 1;
      }
      if (ball.runs === 4) striker.fours += 1;
      if (ball.runs === 6) striker.sixes += 1;
    }

    // Bowler runs: In professional rules, Byes and Leg-Byes are NOT charged to the bowler
    if (ball.type !== 'bye' && ball.type !== 'leg_bye') {
      bowler.runs += (ball.runs + (ball.type === 'wide' || ball.type === 'no_ball' ? ball.extras : 0));
    }
    
    if (classified.countsAsBall) {
      bowler.balls += 1;
      if (bowler.balls === 6) {
        bowler.overs += 1;
        bowler.balls = 0;
      }
    }
    if (ball.is_wicket) bowler.wickets += 1;

    partnershipRuns += totalBallRuns;
    if (classified.countsAsBall) partnershipBalls += 1;

    if (classified.countsAsBall) {
      totalLegalBalls += 1;
      const displayStr = ball.is_wicket ? 'W' : (ball.extras > 0 && ball.runs === 0) ? `${ball.extras}` : ball.runs.toString();
      currentOver.push(displayStr);
    } else {
      currentOver.push(ball.type === 'wide' ? 'Wd' : 'NB');
    }

    if (ball.is_wicket) {
      totalWickets += 1;
      striker.status = 'out';
      partnershipRuns = 0;
      partnershipBalls = 0;
    }

    const legalBallsThisOver = currentOver.filter(b => b !== 'Wd' && b !== 'NB').length;
    if (legalBallsThisOver === 6) {
      completedOvers += 1;
      currentOver = [];
    }

    if (totalWickets >= 10) {
      isComplete = true;
      completionReason = 'all_out';
    } else if (totalLegalBalls >= matchOvers * 6) {
      isComplete = true;
      completionReason = 'overs_complete';
    }
  }

  // Get current striker/non-striker from the last ball context
  // This is a rough estimation for the replay state.
  const lastBall = balls[balls.length - 1];
  const currentStriker = lastBall ? batsmenMap.get(lastBall.batsman_id) || null : null;
  const currentBowler = lastBall ? bowlersMap.get(lastBall.bowler_id) || null : null;

  return {
    totalRuns,
    totalWickets,
    totalLegalBalls,
    totalExtras,
    currentOver,
    striker: currentStriker,
    nonStriker: null, // Replay needs more context to track non-striker reliably
    bowler: currentBowler,
    partnership: {
      runs: partnershipRuns,
      balls: partnershipBalls,
      batsmanAId: currentStriker?.id || '',
      batsmanBId: '',
    },
    completedOvers,
    isComplete,
    completionReason,
  };
}

/**
 * Check if innings is over — called AFTER committing a delivery.
 */
export function checkInningsEnd(
  totalWickets: number,
  totalLegalBalls: number,
  matchOvers: number,
  totalRuns?: number,
  target?: number,
): 'all_out' | 'overs_complete' | 'target_reached' | null {
  if (totalWickets >= 10) return 'all_out';
  if (totalLegalBalls >= matchOvers * 6) return 'overs_complete';
  if (target !== undefined && totalRuns !== undefined && totalRuns >= target) return 'target_reached';
  return null;
}

/**
 * Check if a new bowler is needed (end of over, innings not complete).
 */
export function needsNewBowler(
  totalLegalBalls: number,
  matchOvers: number,
  isInningsComplete: boolean,
): boolean {
  return !isInningsComplete && totalLegalBalls > 0 && totalLegalBalls % 6 === 0;
}

/**
 * Generate professional commentary for a delivery.
 */
export function generateBallCommentary(ball: Partial<BallEvent>, batsmanName: string): string {
  if (ball.is_wicket) return `WICKET! ${batsmanName} is OUT! The fielding side celebrates!`;
  if (ball.type === 'wide') return `Wide delivery — poor line from the bowler. Extra run.`;
  if (ball.type === 'no_ball') return `No Ball! Free hit coming up. Extra run to the batting side.`;
  if (ball.type === 'leg_bye') return `Leg bye! Runs off the pad, not the bat.`;
  if (ball.type === 'bye') return `Bye! The keeper fumbles and the batsmen scamper through.`;
  if (ball.runs === 6) return `SIX! ${batsmanName} absolutely LAUNCHES that into the crowd!`;
  if (ball.runs === 4) return `FOUR! ${batsmanName} finds the gap and it races to the boundary!`;
  if (ball.runs === 3) return `Three runs! Excellent running between the wickets.`;
  if (ball.runs === 2) return `Two runs taken. Good placement by ${batsmanName}.`;
  if (ball.runs === 1) return `Single taken. ${batsmanName} rotates the strike.`;
  return `Dot ball. Good delivery — ${batsmanName} keeps it out.`;
}
/**
 * Returns performance color class for Strike Rate
 */
export function getSRClass(sr: number): 'good' | 'average' | 'low' {
  if (sr >= 150) return 'good';
  if (sr >= 100) return 'average';
  return 'low';
}

/**
 * Returns performance color class for Economy Rate
 */
export function getERClass(er: number): 'good' | 'average' | 'bad' {
  if (er <= 7) return 'good';
  if (er <= 10) return 'average';
  return 'bad';
}
