import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── TYPY ───────────────────────────────────

export type Theme = 'chalk' | 'notebook';
export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type FeedbackMode = 'immediate' | 'after';
export type LearningMode = 'theory' | 'tutorial' | 'practice' | 'test';

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlockedAt: string | null;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatar: string;         // emoji lub ID ilustracji
  theme: Theme;
  feedbackMode: FeedbackMode;
  xp: number;
  level: number;
  streak: number;
  lastPlayedAt: string | null;
  badges: Badge[];
  stats: {
    addition: { correct: number; total: number };
    subtraction: { correct: number; total: number };
    multiplication: { correct: number; total: number };
    division: { correct: number; total: number };
  };
  settings: {
    maxDigits1: number;
    maxDigits2: number;
    selectedOperations: Operation[];
    soundEnabled: boolean;
  };
}

interface AppState {
  // Profile
  profiles: ChildProfile[];
  activeProfileId: string | null;

  // Gettery
  activeProfile: () => ChildProfile | null;

  // Akcje profili
  createProfile: (data: Omit<ChildProfile, 'id' | 'xp' | 'level' | 'streak' | 'lastPlayedAt' | 'badges' | 'stats'>) => void;
  updateProfile: (id: string, data: Partial<ChildProfile>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  clearActiveProfile: () => void;

  // Gamifikacja
  addXP: (profileId: string, amount: number) => void;
  unlockBadge: (profileId: string, badgeId: string) => void;
  updateStreak: (profileId: string) => void;

  // Ustawienia aktywnego profilu
  setTheme: (theme: Theme) => void;
  setFeedbackMode: (mode: FeedbackMode) => void;
  updateSettings: (settings: Partial<ChildProfile['settings']>) => void;
}

// ─── XP DO NASTĘPNEGO POZIOMU ───────────────

export const XP_PER_LEVEL = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 9999999];

export function getLevelFromXP(xp: number): number {
  for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
    if (xp >= XP_PER_LEVEL[i]) return i + 1;
  }
  return 1;
}

// ─── DOMYŚLNE WARTOŚCI ───────────────────────

function createDefaultProfile(data: Omit<ChildProfile, 'id' | 'xp' | 'level' | 'streak' | 'lastPlayedAt' | 'badges' | 'stats'>): ChildProfile {
  return {
    id: crypto.randomUUID(),
    xp: 0,
    level: 1,
    streak: 0,
    lastPlayedAt: null,
    badges: [],
    stats: {
      addition: { correct: 0, total: 0 },
      subtraction: { correct: 0, total: 0 },
      multiplication: { correct: 0, total: 0 },
      division: { correct: 0, total: 0 },
    },
    ...data,
  };
}

// ─── STORE ───────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      activeProfile: () => {
        const { profiles, activeProfileId } = get();
        return profiles.find(p => p.id === activeProfileId) || null;
      },

      createProfile: (data) => set((state) => ({
        profiles: [...state.profiles, createDefaultProfile(data)]
      })),

      updateProfile: (id, data) => set((state) => ({
        profiles: state.profiles.map(p => p.id === id ? { ...p, ...data } : p)
      })),

      deleteProfile: (id) => set((state) => ({
        profiles: state.profiles.filter(p => p.id !== id),
        activeProfileId: state.activeProfileId === id ? null : state.activeProfileId
      })),

      setActiveProfile: (id) => set({ activeProfileId: id }),

      clearActiveProfile: () => set({ activeProfileId: null }),

      addXP: (profileId, amount) => set((state) => ({
        profiles: state.profiles.map(p => {
          if (p.id !== profileId) return p;
          const newXP = p.xp + amount;
          const newLevel = getLevelFromXP(newXP);
          return { ...p, xp: newXP, level: newLevel };
        })
      })),

      unlockBadge: (profileId, badgeId) => set((state) => ({
        profiles: state.profiles.map(p => {
          if (p.id !== profileId) return p;
          const badge = p.badges.find(b => b.id === badgeId);
          if (!badge || badge.unlockedAt) return p;
          return {
            ...p,
            badges: p.badges.map(b =>
              b.id === badgeId ? { ...b, unlockedAt: new Date().toISOString() } : b
            )
          };
        })
      })),

      updateStreak: (profileId) => set((state) => ({
        profiles: state.profiles.map(p => {
          if (p.id !== profileId) return p;
          const today = new Date().toDateString();
          const lastPlayed = p.lastPlayedAt ? new Date(p.lastPlayedAt).toDateString() : null;
          const yesterday = new Date(Date.now() - 86400000).toDateString();

          let newStreak = p.streak;
          if (lastPlayed === today) return p;  // Już grał dziś
          if (lastPlayed === yesterday) newStreak += 1;  // Kontynuacja serii
          else newStreak = 1;  // Reset serii

          return { ...p, streak: newStreak, lastPlayedAt: new Date().toISOString() };
        })
      })),

      setTheme: (theme) => set((state) => {
        const id = state.activeProfileId;
        if (!id) return state;
        return {
          profiles: state.profiles.map(p =>
            p.id === id ? { ...p, theme } : p
          )
        };
      }),

      setFeedbackMode: (mode) => set((state) => {
        const id = state.activeProfileId;
        if (!id) return state;
        return {
          profiles: state.profiles.map(p =>
            p.id === id ? { ...p, feedbackMode: mode } : p
          )
        };
      }),

      updateSettings: (settings) => set((state) => {
        const id = state.activeProfileId;
        if (!id) return state;
        return {
          profiles: state.profiles.map(p =>
            p.id === id ? { ...p, settings: { ...p.settings, ...settings } } : p
          )
        };
      }),
    }),
    {
      name: 'mathkids_profiles',  // klucz localStorage
      version: 1,
    }
  )
);
