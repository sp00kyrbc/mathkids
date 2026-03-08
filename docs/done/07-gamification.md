# 07-gamification.md — Grywalizacja, Nagrody, Motywacja

## Kontekst
Grywalizacja jest kluczowa dla utrzymania motywacji dziecka.
Wszystkie mechanizmy muszą być: widoczne, natychmiastowe, proporcjonalne.

---

## Utwórz: `frontend/src/data/badges.ts`

Pełna lista odznak:

```typescript
import { Badge } from '../store/useAppStore';

export const ALL_BADGES: Omit<Badge, 'unlockedAt'>[] = [
  // Pierwsze kroki
  { id: 'first_task', name: 'Pierwszy krok', emoji: '👣', description: 'Ukończ swoje pierwsze zadanie' },
  { id: 'first_correct', name: 'Celna odpowiedź', emoji: '🎯', description: 'Odpowiedz poprawnie na pierwsze zadanie' },
  { id: 'first_test', name: 'Odważny testujący', emoji: '📝', description: 'Ukończ swój pierwszy test' },

  // Serie
  { id: 'streak_3', name: 'Trzy z rzędu', emoji: '🔥', description: '3 poprawne odpowiedzi pod rząd' },
  { id: 'streak_5', name: 'Gorąca passa', emoji: '🔥🔥', description: '5 poprawnych pod rząd' },
  { id: 'streak_10', name: 'Niepokonany!', emoji: '⚡', description: '10 poprawnych pod rząd' },

  // Dodawanie
  { id: 'add_10', name: 'Sumator', emoji: '➕', description: 'Rozwiąż 10 zadań z dodawania' },
  { id: 'add_50', name: 'Mistrz dodawania', emoji: '🏅', description: 'Rozwiąż 50 zadań z dodawania' },

  // Odejmowanie
  { id: 'sub_10', name: 'Odejminator', emoji: '➖', description: 'Rozwiąż 10 zadań z odejmowania' },
  { id: 'sub_50', name: 'Mistrz odejmowania', emoji: '🏅', description: 'Rozwiąż 50 zadań z odejmowania' },

  // Mnożenie
  { id: 'mul_10', name: 'Mnożyciel', emoji: '✖️', description: 'Rozwiąż 10 zadań z mnożenia' },
  { id: 'mul_50', name: 'Mistrz mnożenia', emoji: '🏅', description: 'Rozwiąż 50 zadań z mnożenia' },

  // Dzielenie
  { id: 'div_10', name: 'Dzieliciel', emoji: '➗', description: 'Rozwiąż 10 zadań z dzielenia' },
  { id: 'div_50', name: 'Mistrz dzielenia', emoji: '🏅', description: 'Rozwiąż 50 zadań z dzielenia' },

  // Oceny
  { id: 'grade_5', name: 'Prymus', emoji: '⭐', description: 'Dostań ocenę 5 w teście' },
  { id: 'grade_6', name: 'Geniusz!', emoji: '🏆', description: 'Dostań ocenę 6 w teście — bezbłędnie!' },

  // Poziomy
  { id: 'level_3', name: 'Wschodzący matematyk', emoji: '📈', description: 'Osiągnij poziom 3' },
  { id: 'level_5', name: 'Zaawansowany', emoji: '🚀', description: 'Osiągnij poziom 5' },
  { id: 'level_10', name: 'Ekspert!', emoji: '💎', description: 'Osiągnij poziom 10' },

  // Dni z rzędu
  { id: 'daily_3', name: '3 dni z rzędu', emoji: '📅', description: 'Ćwicz 3 dni pod rząd' },
  { id: 'daily_7', name: 'Tygodniowy wojownik', emoji: '🗓️', description: 'Ćwicz 7 dni pod rząd' },
  { id: 'daily_30', name: 'Miesiąc nauki!', emoji: '🎖️', description: 'Ćwicz 30 dni pod rząd' },

  // Specjalne
  { id: 'all_ops', name: 'Czteropak', emoji: '🎲', description: 'Rozwiąż zadanie z każdej operacji' },
  { id: 'xp_500', name: 'Zbieracz punktów', emoji: '💰', description: 'Zdobądź 500 punktów doświadczenia' },
  { id: 'xp_2000', name: 'Bogaty w wiedzę', emoji: '💎', description: 'Zdobądź 2000 punktów doświadczenia' },
];

// Inicjalizuj odznaki dla nowego profilu (wszystkie zablokowane)
export function initBadges(): Badge[] {
  return ALL_BADGES.map(b => ({ ...b, unlockedAt: null }));
}
```

---

## Utwórz: `frontend/src/hooks/useBadgeChecker.ts`

Automatyczne sprawdzanie odznak:

```typescript
import { useCallback } from 'react';
import { useAppStore, ChildProfile } from '../store/useAppStore';

export function useBadgeChecker() {
  const unlockBadge = useAppStore(s => s.unlockBadge);

  const checkBadges = useCallback((profile: ChildProfile, context: {
    streak?: number;
    newLevel?: number;
    testGrade?: number;
    operation?: string;
    xp?: number;
  }) => {
    const unlocked: string[] = [];
    const profileStreak = profile.streak;
    const stats = profile.stats;

    // Pierwsze zadanie
    const totalTasks = Object.values(stats).reduce((s, v) => s + v.total, 0);
    if (totalTasks >= 1) unlocked.push('first_task');
    const totalCorrect = Object.values(stats).reduce((s, v) => s + v.correct, 0);
    if (totalCorrect >= 1) unlocked.push('first_correct');

    // Serie
    const streak = context.streak ?? 0;
    if (streak >= 3) unlocked.push('streak_3');
    if (streak >= 5) unlocked.push('streak_5');
    if (streak >= 10) unlocked.push('streak_10');

    // Statystyki operacji
    if (stats.addition.total >= 10) unlocked.push('add_10');
    if (stats.addition.total >= 50) unlocked.push('add_50');
    if (stats.subtraction.total >= 10) unlocked.push('sub_10');
    if (stats.subtraction.total >= 50) unlocked.push('sub_50');
    if (stats.multiplication.total >= 10) unlocked.push('mul_10');
    if (stats.multiplication.total >= 50) unlocked.push('mul_50');
    if (stats.division.total >= 10) unlocked.push('div_10');
    if (stats.division.total >= 50) unlocked.push('div_50');

    // Wszystkie operacje użyte
    const allUsed = Object.values(stats).every(v => v.total > 0);
    if (allUsed) unlocked.push('all_ops');

    // Poziomy
    const level = profile.level;
    if (level >= 3) unlocked.push('level_3');
    if (level >= 5) unlocked.push('level_5');
    if (level >= 10) unlocked.push('level_10');

    // Oceny testu
    if (context.testGrade && context.testGrade >= 5) unlocked.push('grade_5');
    if (context.testGrade && context.testGrade >= 6) unlocked.push('grade_6');

    // XP
    const xp = context.xp ?? profile.xp;
    if (xp >= 500) unlocked.push('xp_500');
    if (xp >= 2000) unlocked.push('xp_2000');

    // Streak dzienny
    if (profileStreak >= 3) unlocked.push('daily_3');
    if (profileStreak >= 7) unlocked.push('daily_7');
    if (profileStreak >= 30) unlocked.push('daily_30');

    // Odblokuj niezdobyte
    const newBadges: string[] = [];
    unlocked.forEach(badgeId => {
      const existing = profile.badges.find(b => b.id === badgeId);
      if (!existing || !existing.unlockedAt) {
        unlockBadge(profile.id, badgeId);
        newBadges.push(badgeId);
      }
    });

    return newBadges;  // zwróć nowo odblokowane (do animacji)
  }, [unlockBadge]);

  return { checkBadges };
}
```

---

## Utwórz: `frontend/src/components/BadgePopup.tsx`

Animacja nowej odznaki:

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { Badge } from '../store/useAppStore';

interface BadgePopupProps {
  badge: Badge | null;
  onDismiss: () => void;
}

export function BadgePopup({ badge, onDismiss }: BadgePopupProps) {
  const { classes } = useTheme();

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`${classes.card} p-8 max-w-xs text-center`}
          >
            {/* Konfetti animacja */}
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: 3, duration: 0.5 }}
              className="text-7xl mb-4"
            >
              {badge.emoji}
            </motion.div>

            <p className={`text-sm font-bold uppercase tracking-wider ${classes.text} opacity-60 mb-1`}>
              Nowa odznaka!
            </p>
            <p className={`text-2xl font-bold ${classes.text} mb-2`}>{badge.name}</p>
            <p className={`text-sm ${classes.text} opacity-70 mb-6`}>{badge.description}</p>

            <button
              onClick={onDismiss}
              className={`py-2 px-6 rounded-xl font-bold ${classes.button}`}
            >
              Super! 🎉
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Utwórz: `frontend/src/components/LevelUpPopup.tsx`

```typescript
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

interface LevelUpPopupProps {
  level: number | null;
  aiMessage?: string;
  onDismiss: () => void;
}

// Prosta animacja "konfetti" w CSS
const CONFETTI_COLORS = ['#ffd700', '#ff6b6b', '#69db7c', '#74c0fc', '#da77f2'];

export function LevelUpPopup({ level, aiMessage, onDismiss }: LevelUpPopupProps) {
  const { classes } = useTheme();

  useEffect(() => {
    if (level) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [level]);

  return (
    <AnimatePresence>
      {level && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center overflow-hidden"
        >
          {/* Animowane kółka w tle */}
          {CONFETTI_COLORS.map((color, i) => (
            <motion.div
              key={i}
              initial={{ y: '110vh', x: `${10 + i * 20}vw`, rotate: 0 }}
              animate={{ y: '-10vh', rotate: 360 }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
              className="absolute w-4 h-4 rounded-full opacity-70"
              style={{ backgroundColor: color }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={`${classes.card} p-8 max-w-sm text-center relative z-10`}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: 3, duration: 0.6 }}
              className="text-6xl mb-3"
            >
              🚀
            </motion.div>
            <p className="text-yellow-400 font-bold text-sm uppercase tracking-widest mb-2">
              Poziom wyżej!
            </p>
            <p className={`text-5xl font-bold ${classes.text} mb-4`}>
              Poziom {level}
            </p>
            {aiMessage && (
              <p className={`${classes.text} opacity-80 text-base italic mb-4`}>
                {aiMessage}
              </p>
            )}
            <button onClick={onDismiss} className={`py-2 px-6 rounded-xl font-bold ${classes.button}`}>
              Wchodzę wyżej! 💪
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Utwórz: `frontend/src/pages/StatsPage.tsx`

Strona statystyk z odznakami:

```typescript
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAppStore, XP_PER_LEVEL } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

export function StatsPage() {
  const navigate = useNavigate();
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());

  if (!activeProfile) return null;

  const { xp, level, streak, badges, stats } = activeProfile;
  const xpForNext = XP_PER_LEVEL[level] - xp;
  const xpProgress = ((xp - XP_PER_LEVEL[level - 1]) / (XP_PER_LEVEL[level] - XP_PER_LEVEL[level - 1])) * 100;

  const unlockedBadges = badges.filter(b => b.unlockedAt);
  const lockedBadges = badges.filter(b => !b.unlockedAt);

  const opLabels: Record<string, string> = {
    addition: 'Dodawanie', subtraction: 'Odejmowanie',
    multiplication: 'Mnożenie', division: 'Dzielenie'
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/menu')} className={`text-sm ${classes.text} opacity-60`}>← Wróć</button>
          <h2 className={`text-xl font-bold ${classes.text}`}>Moje wyniki</h2>
          <div className="w-10" />
        </div>

        {/* XP i poziom */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${classes.card} p-4 mb-4`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`font-bold ${classes.text}`}>Poziom {level}</span>
            <span className={`text-sm ${classes.text} opacity-60`}>{xp} PD</span>
          </div>
          <div className="w-full h-4 rounded-full bg-black/20 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(xpProgress, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className={`text-xs ${classes.text} opacity-50 mt-1`}>
            {xpForNext} PD do następnego poziomu
          </p>
          {streak > 0 && (
            <p className="text-sm mt-2">🔥 Seria: <strong>{streak}</strong> {streak === 1 ? 'dzień' : streak < 5 ? 'dni' : 'dni'} z rzędu</p>
          )}
        </motion.div>

        {/* Statystyki działań */}
        <div className={`${classes.card} p-4 mb-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>Rozwiązane zadania</h3>
          <div className="space-y-2">
            {Object.entries(stats).map(([op, s]) => (
              <div key={op} className="flex items-center gap-3">
                <span className={`text-sm w-28 ${classes.text} opacity-70`}>{opLabels[op]}</span>
                <div className="flex-1 h-3 rounded-full bg-black/20 overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: s.total > 0 ? `${(s.correct / s.total) * 100}%` : '0%' }}
                  />
                </div>
                <span className={`text-xs ${classes.text} opacity-60 w-16 text-right`}>
                  {s.correct}/{s.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Odznaki */}
        <div className={`${classes.card} p-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>
            Odznaki ({unlockedBadges.length}/{badges.length})
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {unlockedBadges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                title={badge.name}
                className="text-2xl text-center cursor-help"
              >
                {badge.emoji}
              </motion.div>
            ))}
            {lockedBadges.map((badge) => (
              <div key={badge.id} title={badge.description} className="text-2xl text-center opacity-20 cursor-help">
                🔒
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

---

## Zaktualizuj profil przy tworzeniu — dodaj odznaki

W `frontend/src/store/useAppStore.ts`, funkcja `createDefaultProfile`:

```typescript
import { initBadges } from '../data/badges';

function createDefaultProfile(data: any): ChildProfile {
  return {
    id: crypto.randomUUID(),
    xp: 0,
    level: 1,
    streak: 0,
    lastPlayedAt: null,
    badges: initBadges(),  // ← DODAJ TO
    // ...reszta
    ...data,
  };
}
```

---

## Zaktualizuj `App.tsx` — dodaj trasę StatsPage

```typescript
import { StatsPage } from './pages/StatsPage';

// W <Routes>:
<Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
```

---

## ✅ Weryfikacja po tym kroku

- [ ] Strona `/stats` pokazuje poziom z paskiem XP
- [ ] Odznaki zablokowane pokazują kłódkę
- [ ] Zdobycie XP animuje pasek postępu
- [ ] Przy awansie na nowy poziom pojawia się LevelUpPopup
- [ ] Nowa odznaka pokazuje BadgePopup z animacją

Następny krok: `docs/08-gemini-setup.md`
