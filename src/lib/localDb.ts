import AsyncStorage from '@react-native-async-storage/async-storage';

const MATCHES_KEY = '@lazycric_matches';

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
    const matches = await localDb.getMatches();
    const filtered = matches.filter((m: any) => m.id !== id);
    await safeSet(MATCHES_KEY, JSON.stringify(filtered));
  },

  clearAllMatches: async () => {
    await safeSet(MATCHES_KEY, JSON.stringify([]));
    memoryStorage = {};
  }
};
