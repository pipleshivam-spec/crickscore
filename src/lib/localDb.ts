import AsyncStorage from '@react-native-async-storage/async-storage';

const MATCHES_KEY = '@lazycric_matches';
const PLAYERS_KEY = '@lazycric_players';
const TOURNAMENTS_KEY = '@lazycric_tournaments';

// In-memory fallback if AsyncStorage fails
let memoryStorage: Record<string, string> = {};

const safeGet = async (key: string) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn('AsyncStorage failed, using memory fallback');
    return memoryStorage[key] || null;
  }
};

const safeSet = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn('AsyncStorage failed, saving to memory');
    memoryStorage[key] = value;
  }
};

export const localDb = {
  getMatches: async () => {
    const data = await safeGet(MATCHES_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveMatch: async (match: any) => {
    const matches = await localDb.getMatches();
    const index = matches.findIndex((m: any) => m.id === match.id);
    if (index >= 0) {
      matches[index] = match;
    } else {
      matches.push(match);
    }
    await safeSet(MATCHES_KEY, JSON.stringify(matches));
  },
  
  getMatch: async (id: string) => {
    const matches = await localDb.getMatches();
    return matches.find((m: any) => m.id === id);
  },

  deleteMatch: async (id: string) => {
    // 1. Remove from global matches list
    const matches = await localDb.getMatches();
    const filteredMatches = matches.filter((m: any) => m.id !== id);
    await safeSet(MATCHES_KEY, JSON.stringify(filteredMatches));

    // 2. Remove reference from any tournament that contains it
    const tournaments = await localDb.getTournaments();
    let updatedTournaments = false;
    const newTournaments = tournaments.map((t: any) => {
      if (t.matches && t.matches.some((m: any) => m.id === id)) {
        updatedTournaments = true;
        return {
          ...t,
          matches: t.matches.filter((m: any) => m.id !== id)
        };
      }
      return t;
    });

    if (updatedTournaments) {
      await safeSet(TOURNAMENTS_KEY, JSON.stringify(newTournaments));
    }
  },

  getPlayers: async () => {
    const data = await safeGet(PLAYERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  updatePlayerCareer: async (playerData: any) => {
    const players = await localDb.getPlayers();
    const index = players.findIndex((p: any) => p.name.toLowerCase() === playerData.name.toLowerCase());
    
    if (index >= 0) {
      const p = players[index];
      p.runs = (p.runs || 0) + (playerData.runs || 0);
      p.wickets = (p.wickets || 0) + (playerData.wickets || 0);
      p.balls = (p.balls || 0) + (playerData.balls || 0);
      p.matches = (p.matches || 0) + 1;
      p.fours = (p.fours || 0) + (playerData.fours || 0);
      p.sixes = (p.sixes || 0) + (playerData.sixes || 0);
      players[index] = p;
    } else {
      players.push({
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: playerData.name,
        runs: playerData.runs || 0,
        wickets: playerData.wickets || 0,
        balls: playerData.balls || 0,
        matches: 1,
        fours: playerData.fours || 0,
        sixes: playerData.sixes || 0,
      });
    }
    await safeSet(PLAYERS_KEY, JSON.stringify(players));
  },

  getTournaments: async () => {
    const data = await safeGet(TOURNAMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTournament: async (tournament: any) => {
    const tournaments = await localDb.getTournaments();
    const index = tournaments.findIndex((t: any) => t.id === tournament.id);
    if (index >= 0) {
      tournaments[index] = tournament;
    } else {
      tournaments.push(tournament);
    }
    await safeSet(TOURNAMENTS_KEY, JSON.stringify(tournaments));
  },

  getTournament: async (id: string) => {
    const tournaments = await localDb.getTournaments();
    return tournaments.find((t: any) => t.id === id);
  },

  deleteTournament: async (id: string) => {
    // 1. Remove the tournament
    const tournaments = await localDb.getTournaments();
    const filtered = tournaments.filter((t: any) => t.id !== id);
    await safeSet(TOURNAMENTS_KEY, JSON.stringify(filtered));

    // 2. Remove all matches linked to this tournament id
    const matches = await localDb.getMatches();
    const remainingMatches = matches.filter((m: any) => m.tournament_id !== id);
    await safeSet(MATCHES_KEY, JSON.stringify(remainingMatches));
  },

  clearAllMatches: async () => {
    await safeSet(MATCHES_KEY, JSON.stringify([]));
    memoryStorage = {};
  }
};
