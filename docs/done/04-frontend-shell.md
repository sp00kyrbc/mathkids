# 04-frontend-shell.md — Frontend: React Shell, Profile, Tematy

## Kontekst
Tworzymy szkielet całej aplikacji React: routing, zarządzanie stanem (Zustand),
system profili z avatarami, przełącznik tematów, layout.

---

## Utwórz: `frontend/src/i18n/pl.ts`

Wszystkie teksty aplikacji w jednym miejscu (przygotowane pod i18n v2):

```typescript
export const pl = {
  app: {
    name: 'Matematyka Pod Kreską',
    tagline: 'Nauka działań pisemnych',
  },
  profiles: {
    title: 'Kto to ja?',
    subtitle: 'Wybierz swój profil lub utwórz nowy',
    newProfile: 'Nowy profil',
    createProfile: 'Stwórz profil',
    editProfile: 'Edytuj profil',
    deleteProfile: 'Usuń profil',
    nameLabel: 'Twoje imię',
    namePlaceholder: 'Wpisz swoje imię',
    ageLabel: 'Ile masz lat?',
    avatarLabel: 'Wybierz awatar',
    save: 'Zapisz',
    cancel: 'Anuluj',
    deleteConfirm: 'Na pewno chcesz usunąć profil?',
  },
  menu: {
    learn: 'Uczę się',
    practice: 'Ćwiczę',
    test: 'Test',
    stats: 'Moje wyniki',
    settings: 'Ustawienia',
  },
  operations: {
    addition: 'Dodawanie',
    subtraction: 'Odejmowanie',
    multiplication: 'Mnożenie',
    division: 'Dzielenie',
  },
  modes: {
    theory: {
      title: 'Jak to działa?',
      subtitle: 'Obejrzyj i zrozum',
      button: 'Zacznij oglądać',
    },
    tutorial: {
      title: 'Zróbmy razem',
      subtitle: 'Krok po kroku z pomocą',
      button: 'Zacznij tutorial',
    },
    practice: {
      title: 'Twoja kolej!',
      subtitle: 'Ćwicz samodzielnie',
      button: 'Zacznij ćwiczyć',
    },
    test: {
      title: 'Sprawdź się',
      subtitle: 'Pokaż co umiesz',
      button: 'Zacznij test',
    },
  },
  feedback: {
    correct: 'Brawo! To dobra odpowiedź! ✓',
    incorrect: 'Nie całkiem... Spróbuj jeszcze raz!',
    hint: 'Wskazówka',
    showSolution: 'Pokaż rozwiązanie',
    nextStep: 'Następny krok',
    nextTask: 'Następne zadanie',
    finish: 'Zakończ',
  },
  gamification: {
    xp: 'PD',  // Punkty Doświadczenia
    level: 'Poziom',
    streak: 'Seria dni',
    badges: 'Odznaki',
    newBadge: 'Nowa odznaka!',
    levelUp: 'Poziom wyżej!',
  },
  settings: {
    title: 'Ustawienia',
    theme: 'Motyw',
    themeChalk: 'Tablica',
    themeNotebook: 'Zeszyt',
    feedbackMode: 'Tryb podpowiedzi',
    feedbackImmediate: 'Pokazuj błędy od razu',
    feedbackAfter: 'Pokaż po zadaniu',
    digits1: 'Cyfry pierwszej liczby',
    digits2: 'Cyfry drugiej liczby',
    sound: 'Dźwięki',
  },
  grades: {
    label: 'Ocena',
    6: 'Celujący',
    5: 'Bardzo dobry',
    4: 'Dobry',
    3: 'Dostateczny',
    2: 'Dopuszczający',
    1: 'Niedostateczny',
  },
};

export type Translations = typeof pl;
```

---

## Utwórz: `frontend/src/store/useAppStore.ts`

Centralny store Zustand:

```typescript
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

function createDefaultProfile(data: any): ChildProfile {
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
```

---

## Utwórz: `frontend/src/hooks/useTheme.ts`

```typescript
import { useAppStore } from '../store/useAppStore';

export function useTheme() {
  const activeProfile = useAppStore(s => s.activeProfile());
  const theme = activeProfile?.theme || 'chalk';

  // Klasy Tailwind zależne od motywu
  const classes = {
    bg: theme === 'chalk' ? 'bg-chalk-bg' : 'bg-notebook-bg',
    text: theme === 'chalk' ? 'text-chalk-text' : 'text-notebook-text',
    accent: theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent',
    card: theme === 'chalk'
      ? 'bg-chalk-bgLight border border-chalk-line rounded-lg'
      : 'bg-white border border-notebook-line rounded-lg shadow-sm',
    button: theme === 'chalk'
      ? 'bg-chalk-accent text-chalk-bg font-chalk font-bold hover:opacity-90'
      : 'bg-notebook-text text-white font-notebook font-bold hover:opacity-90',
    buttonSecondary: theme === 'chalk'
      ? 'border border-chalk-line text-chalk-text font-chalk hover:bg-chalk-bgLight'
      : 'border border-notebook-line text-notebook-text font-notebook hover:bg-notebook-bgDark',
    font: theme === 'chalk' ? 'font-chalk' : 'font-notebook',
    gridBg: theme === 'chalk'
      ? 'bg-chalk-bgLight'
      : 'bg-notebook-bg bg-notebook-grid bg-grid-32',
    error: theme === 'chalk' ? 'text-chalk-error' : 'text-notebook-error',
    success: theme === 'chalk' ? 'text-chalk-success' : 'text-notebook-success',
  };

  return { theme, classes };
}
```

---

## Utwórz: `frontend/src/components/ThemeSwitcher.tsx`

```typescript
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

export function ThemeSwitcher() {
  const setTheme = useAppStore(s => s.setTheme);
  const { theme, classes } = useTheme();

  return (
    <motion.button
      onClick={() => setTheme(theme === 'chalk' ? 'notebook' : 'chalk')}
      className={`fixed top-4 right-4 z-50 p-2 rounded-full text-2xl ${classes.card} cursor-pointer`}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      title={theme === 'chalk' ? 'Przełącz na zeszyt' : 'Przełącz na tablicę'}
    >
      {theme === 'chalk' ? '📓' : '🖊️'}
    </motion.button>
  );
}
```

---

## Utwórz: `frontend/src/components/Layout.tsx`

```typescript
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { XP_PER_LEVEL } from '../store/useAppStore';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function Layout({ children, showHeader = true }: LayoutProps) {
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());

  const xpProgress = activeProfile
    ? ((activeProfile.xp - XP_PER_LEVEL[activeProfile.level - 1]) /
       (XP_PER_LEVEL[activeProfile.level] - XP_PER_LEVEL[activeProfile.level - 1])) * 100
    : 0;

  return (
    <div className={`min-h-screen ${classes.bg} ${classes.font} transition-colors duration-300`}>
      <ThemeSwitcher />

      {showHeader && activeProfile && (
        <header className={`px-4 pt-4 pb-2 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeProfile.avatar}</span>
            <div>
              <p className={`font-bold text-sm ${classes.text}`}>{activeProfile.name}</p>
              <p className={`text-xs opacity-70 ${classes.text}`}>
                Poz. {activeProfile.level} · {activeProfile.xp} PD
              </p>
            </div>
          </div>

          {/* Pasek XP */}
          <div className="flex items-center gap-2">
            <div className="w-32 h-3 rounded-full bg-black/20 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${classes.accent === 'text-chalk-accent' ? 'bg-chalk-accent' : 'bg-notebook-text'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <span className={`text-xs ${classes.text} opacity-70`}>
              🔥 {activeProfile.streak}
            </span>
          </div>
        </header>
      )}

      <main className="p-4">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
}
```

---

## Utwórz: `frontend/src/pages/ProfilesPage.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, ChildProfile } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { pl } from '../i18n/pl';

const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🦄', '🐸', '🦋', '🐬', '🦅', '🐙', '🦕'];

export function ProfilesPage() {
  const { profiles, createProfile, deleteProfile, setActiveProfile } = useAppStore();
  const navigate = useNavigate();
  const { classes } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(8);
  const [newAvatar, setNewAvatar] = useState('🦁');

  function handleSelectProfile(profile: ChildProfile) {
    setActiveProfile(profile.id);
    navigate('/menu');
  }

  function handleCreateProfile() {
    if (!newName.trim()) return;
    createProfile({
      name: newName.trim(),
      age: newAge,
      avatar: newAvatar,
      theme: 'chalk',
      feedbackMode: 'immediate',
      settings: {
        maxDigits1: 3,
        maxDigits2: 2,
        selectedOperations: ['addition'],
        soundEnabled: true,
      },
    });
    setShowCreate(false);
    setNewName('');
  }

  return (
    <div className={`min-h-screen ${classes.bg} flex flex-col items-center justify-center p-6`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className={`text-4xl font-bold ${classes.text} mb-2`}>
          🔢 {pl.app.name}
        </h1>
        <p className={`text-lg ${classes.text} opacity-70`}>{pl.profiles.title}</p>
      </motion.div>

      {/* Lista profili */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 w-full max-w-lg">
        {profiles.map((profile, i) => (
          <motion.button
            key={profile.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleSelectProfile(profile)}
            className={`${classes.card} p-4 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform`}
          >
            <span className="text-4xl">{profile.avatar}</span>
            <span className={`font-bold ${classes.text}`}>{profile.name}</span>
            <span className={`text-xs ${classes.text} opacity-60`}>Poz. {profile.level}</span>
            <button
              onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
              className="text-xs opacity-40 hover:opacity-70 mt-1"
            >
              ✕
            </button>
          </motion.button>
        ))}

        {/* Dodaj nowy profil */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: profiles.length * 0.1 }}
          onClick={() => setShowCreate(true)}
          className={`${classes.card} p-4 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform border-dashed`}
        >
          <span className="text-4xl">➕</span>
          <span className={`font-bold ${classes.text}`}>{pl.profiles.newProfile}</span>
        </motion.button>
      </div>

      {/* Modal tworzenia profilu */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`${classes.card} p-6 w-full max-w-sm`}
            >
              <h2 className={`text-2xl font-bold ${classes.text} mb-4`}>{pl.profiles.createProfile}</h2>

              <input
                type="text"
                placeholder={pl.profiles.namePlaceholder}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className={`w-full p-3 rounded-lg mb-3 text-lg ${classes.text} bg-transparent border ${classes.card} focus:outline-none`}
                maxLength={20}
              />

              <div className="mb-3">
                <label className={`text-sm ${classes.text} opacity-70 mb-1 block`}>{pl.profiles.ageLabel}</label>
                <input
                  type="range" min={6} max={13} value={newAge}
                  onChange={e => setNewAge(Number(e.target.value))}
                  className="w-full"
                />
                <span className={`text-sm ${classes.text}`}>{newAge} lat</span>
              </div>

              <div className="mb-4">
                <label className={`text-sm ${classes.text} opacity-70 mb-2 block`}>{pl.profiles.avatarLabel}</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setNewAvatar(a)}
                      className={`text-2xl p-1 rounded ${newAvatar === a ? 'ring-2 ring-yellow-400 bg-yellow-400/20' : ''}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateProfile}
                  disabled={!newName.trim()}
                  className={`flex-1 py-3 rounded-lg font-bold ${classes.button} disabled:opacity-40`}
                >
                  {pl.profiles.save}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className={`flex-1 py-3 rounded-lg ${classes.buttonSecondary}`}
                >
                  {pl.profiles.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Utwórz: `frontend/src/pages/MenuPage.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { pl } from '../i18n/pl';

const MENU_ITEMS = [
  { key: 'learn', emoji: '📖', path: '/learn', color: 'from-blue-500 to-blue-700' },
  { key: 'practice', emoji: '✏️', path: '/practice', color: 'from-green-500 to-green-700' },
  { key: 'test', emoji: '📝', path: '/test', color: 'from-purple-500 to-purple-700' },
  { key: 'stats', emoji: '⭐', path: '/stats', color: 'from-yellow-500 to-yellow-700' },
  { key: 'settings', emoji: '⚙️', path: '/settings', color: 'from-gray-500 to-gray-700' },
];

export function MenuPage() {
  const navigate = useNavigate();
  const activeProfile = useAppStore(s => s.activeProfile());
  const clearActiveProfile = useAppStore(s => s.clearActiveProfile);
  const { classes } = useTheme();

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-2xl font-bold ${classes.text} mb-6 text-center`}
        >
          Cześć, {activeProfile?.name}! Co robimy?
        </motion.h2>

        <div className="grid grid-cols-2 gap-4">
          {MENU_ITEMS.map((item, i) => (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(item.path)}
              className={`bg-gradient-to-br ${item.color} rounded-2xl p-5 flex flex-col items-center gap-2 text-white shadow-lg hover:shadow-xl transition-shadow col-span-${item.key === 'settings' ? '2' : '1'}`}
            >
              <span className="text-4xl">{item.emoji}</span>
              <span className="font-bold text-lg">
                {pl.menu[item.key as keyof typeof pl.menu]}
              </span>
            </motion.button>
          ))}
        </div>

        <button
          onClick={() => { clearActiveProfile(); navigate('/'); }}
          className={`mt-6 w-full py-2 text-sm ${classes.text} opacity-50 hover:opacity-80`}
        >
          ← Zmień profil
        </button>
      </div>
    </Layout>
  );
}
```

---

## Utwórz: `frontend/src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ProfilesPage } from './pages/ProfilesPage';
import { MenuPage } from './pages/MenuPage';
// Pozostałe strony — zostaną dodane w kolejnych plikach
// import { LearnPage } from './pages/LearnPage';
// import { PracticePage } from './pages/PracticePage';
// import { TestPage } from './pages/TestPage';
// import { StatsPage } from './pages/StatsPage';
// import { SettingsPage } from './pages/SettingsPage';

// Guard — przekieruj do profili jeśli brak aktywnego
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const activeProfileId = useAppStore(s => s.activeProfileId);
  if (!activeProfileId) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProfilesPage />} />
        <Route path="/menu" element={
          <ProtectedRoute><MenuPage /></ProtectedRoute>
        } />
        {/* Pozostałe trasy dodawane w kolejnych plikach docs/ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Utwórz: `frontend/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## Utwórz: `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Efekt tablicy kredowej */
.chalk-texture {
  background-image: 
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
}

/* Efekt kredy na tekście */
.chalk-text {
  text-shadow: 
    1px 1px 1px rgba(255,255,255,0.1),
    -1px -1px 1px rgba(0,0,0,0.2),
    0 0 8px rgba(255,255,255,0.05);
  letter-spacing: 0.02em;
}

/* Animacja wpisywania cyfry kredą */
@keyframes chalkIn {
  0% { opacity: 0; transform: scale(0.7) rotate(-3deg); }
  60% { transform: scale(1.1) rotate(1deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

.chalk-in {
  animation: chalkIn 0.25s ease-out forwards;
}

/* Kratka zeszytu */
.notebook-grid {
  background-color: #fdf6e3;
  background-image:
    repeating-linear-gradient(#b3c5e8 0px, #b3c5e8 1px, transparent 1px, transparent 32px),
    repeating-linear-gradient(90deg, #b3c5e8 0px, #b3c5e8 1px, transparent 1px, transparent 32px);
}

/* Linia marginalna zeszytu */
.notebook-margin {
  border-left: 2px solid #e57373;
  padding-left: 32px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
```

---

## ✅ Weryfikacja po tym kroku

```bash
cd frontend
npm run dev
```

Sprawdź:
- [ ] App ładuje się na http://localhost:5173
- [ ] Strona główna pokazuje "Matematyka Pod Kreską" z opcją tworzenia profilu
- [ ] Można stworzyć profil z imieniem i avatarem
- [ ] Po wyborze profilu przechodzi do menu
- [ ] Przycisk 🖊️/📓 w prawym górnym rogu zmienia motyw (tablica ↔ zeszyt)
- [ ] Brak błędów TypeScript

Następny krok: `docs/05-exercise-component.md`
