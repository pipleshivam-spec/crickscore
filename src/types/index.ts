export type SessionStatus = 'waiting' | 'active' | 'completed';
export type TossChoice = 'bat' | 'bowl';
export type InningsStatus = 'pending' | 'active' | 'completed';

export interface Session {
  id: string; code: string; created_at: string; status: SessionStatus;
}
export interface Match {
  id: string; session_id: string; team_a: string; team_b: string;
  overs: number; toss_winner: string | null; toss_choice: TossChoice | null; created_at: string;
}
export interface Player {
  id: string; match_id: string; name: string; team: string;
}
export interface Innings {
  id: string; match_id: string; innings_number: 1 | 2;
  batting_team: string; bowling_team: string;
  total_runs: number; total_wickets: number; total_balls: number; status: InningsStatus;
}
export interface Ball {
  id: string; innings_id: string; over_number: number; ball_number: number;
  batsman_id: string; bowler_id: string; runs: number;
  is_wide: boolean; is_no_ball: boolean; is_wicket: boolean;
  dismissal_type: string | null; fielder_id: string | null; created_at: string;
}
