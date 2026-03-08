# 18-pelny-ekran-ui.md — Pełny ekran + theme switcher + pasek postępu

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Trzy problemy do naprawienia

1. Siatka matematyczna zajmuje ~50% ekranu zamiast pełnej wysokości
2. Przełącznik motywu (ThemeSwitcher) — sprawdź czy jest widoczny i działa
3. Pasek postępu zadań — sprawdź czy jest widoczny i poprawnie wypełniany

---

## PROBLEM 1 — Pełny ekran

### Diagnoza
Uruchom w terminalu:
```bash
grep -rn "h-screen\|min-h-screen\|flex-1\|overflow\|max-h" frontend/src/pages/PracticePage.tsx frontend/src/pages/TestPage.tsx frontend/src/components/Layout.tsx
```

Typowe przyczyny zbyt małego układu:
- Brak `h-screen` na root containerze
- `overflow-hidden` ucinające zawartość
- Zagnieżdżone `max-h-` ograniczające wysokość
- Siatka nie rozciąga się — `inline-flex` zamiast `flex flex-1`

### Napraw `frontend/src/components/Layout.tsx`

Cały plik musi wyglądać tak:

```typescript
import { ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useAppStore } from '../store/useAppStore';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function Layout({ children, showHeader = true }: LayoutProps) {
  const { theme, classes } = useTheme();
  const { activeProfile } = useAppStore();

  return (
    <div className={`flex flex-col w-full min-h-screen ${classes.bg} ${classes.font}`}>

      {showHeader && (
        <header className={`flex items-center justify-between px-4 py-2 shrink-0 ${classes.headerBg || ''}`}>
          {/* Lewo: profil */}
          <div className="flex items-center gap-2">
            {activeProfile && (
              <>
                <span className="text-2xl">{activeProfile.avatar}</span>
                <div className="flex flex-col leading-tight">
                  <span className={`font-bold text-sm ${classes.text}`}>{activeProfile.name}</span>
                  <span className={`text-xs opacity-60 ${classes.text}`}>
                    Poz. {activeProfile.level} · {activeProfile.xp} PD
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Prawo: ThemeSwitcher */}
          <ThemeSwitcher />
        </header>
      )}

      {/* Główna treść — zajmuje całą pozostałą wysokość */}
      <main className="flex flex-col flex-1 w-full overflow-auto">
        {children}
      </main>

    </div>
  );
}
```

### Napraw `frontend/src/pages/PracticePage.tsx`

Znajdź główny wrapper i zmień na layout który WYPEŁNIA ekran:

```typescript
// Cały return musi mieć tę strukturę:
return (
  <Layout>
    <div className="flex flex-col flex-1 w-full h-full">

      {/* Górny pasek: Wróć + postęp */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={() => navigate(-1)} className={`text-sm ${classes.text} opacity-70 hover:opacity-100`}>
          ← Wróć
        </button>
        <ProgressBar current={completedCount} total={totalCount} />
      </div>

      {/* Tytuł */}
      <div className="text-center py-2 shrink-0">
        <p className={`text-lg font-bold ${classes.text}`}>
          {isTutorial ? '🧡 Zróbmy razem' : '✏️ Twoja kolej!'}
        </p>
      </div>

      {/* SIATKA — rośnie żeby wypełnić resztę ekranu */}
      <div className="flex flex-1 items-center justify-center p-4 overflow-auto">
        <ArithmeticDisplay
          task={task}
          mode={isTutorial ? 'tutorial' : 'practice'}
          onStepComplete={handleStepComplete}
          onTaskComplete={handleTaskComplete}
          feedbackMode={activeProfile?.feedbackMode || 'immediate'}
        />
      </div>

    </div>
  </Layout>
);
```

### Napraw `frontend/src/pages/TestPage.tsx`

Tak samo jak PracticePage — ta sama struktura:

```typescript
return (
  <Layout>
    <div className="flex flex-col flex-1 w-full h-full">

      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={() => navigate(-1)} className={`text-sm ${classes.text} opacity-70`}>
          ← Wróć
        </button>
        <ProgressBar current={currentTaskIndex} total={totalTasks} />
      </div>

      <div className="text-center py-2 shrink-0">
        <p className={`text-lg font-bold ${classes.text}`}>📝 Test</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 overflow-auto">
        <ArithmeticDisplay
          task={task}
          mode="test"
          onStepComplete={handleStepComplete}
          onTaskComplete={handleTaskComplete}
        />
      </div>

    </div>
  </Layout>
);
```

### Napraw `frontend/src/components/ArithmeticDisplay.tsx` i `DivisionDisplay.tsx`

Siatka matematyczna NIE powinna sama ograniczać swojego rozmiaru.
Usuń wszelkie `max-w-`, `max-h-`, `w-full` z zewnętrznego diva komponentu.
Siatka ma być `inline-flex` (naturalny rozmiar treści), wyśrodkowana przez rodzica (`flex items-center justify-center`).

Zewnętrzny div obu komponentów:
```typescript
// STARY (różne wersje które były):
<div className="flex flex-col items-center w-full gap-4">
// lub:
<div className="w-full flex flex-col ...">

// NOWY — niech rodzic (PracticePage) centruje, komponent podaje tylko swoją zawartość:
<div className="flex flex-col items-center gap-4">
```

Sama siatka (div z kratkami) — zostaw `inline-flex`, NIE `w-full`:
```typescript
// ZOSTAW:
<div className={`inline-flex flex-col p-8 sm:p-10 lg:p-12 rounded-2xl cursor-pointer ...`}>
```

### Zwiększ font i komórki proporcjonalnie do ekranu

W `ArithmeticDisplay.tsx` zmień `CELL_SIZE`:

```typescript
// Responsywne rozmiary — na dużym ekranie większe kratki
const CELL_SIZE = 'w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20';
const FONT_SIZE = 'text-2xl sm:text-3xl lg:text-4xl';
const DIGIT_CLS = `${CELL_SIZE} flex items-center justify-center ${FONT_SIZE} font-bold rounded
  ${classes.font}
  ${theme === 'chalk'
    ? 'text-chalk-text chalk-text border border-chalk-text/30 bg-chalk-text/5'
    : 'text-notebook-text border border-notebook-text/25 bg-black/5'}`;
```

---

## PROBLEM 2 — ThemeSwitcher

### Sprawdź czy komponent istnieje i działa

```bash
cat frontend/src/components/ThemeSwitcher.tsx
```

Jeśli nie istnieje lub jest pusty — utwórz:

```typescript
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

export function ThemeSwitcher() {
  const { activeProfile, updateProfile } = useAppStore();
  const { theme } = useTheme();

  function toggle() {
    if (!activeProfile) return;
    updateProfile(activeProfile.id, {
      theme: theme === 'chalk' ? 'notebook' : 'chalk'
    });
  }

  return (
    <button
      onClick={toggle}
      title={theme === 'chalk' ? 'Przełącz na zeszyt' : 'Przełącz na tablicę'}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold
        transition-all active:scale-95
        ${theme === 'chalk'
          ? 'bg-chalk-text/20 text-chalk-text hover:bg-chalk-text/30'
          : 'bg-notebook-text/10 text-notebook-text hover:bg-notebook-text/20'}
      `}
    >
      <span>{theme === 'chalk' ? '📓' : '🖊️'}</span>
      <span className="hidden sm:inline">
        {theme === 'chalk' ? 'Zeszyt' : 'Tablica'}
      </span>
    </button>
  );
}
```

---

## PROBLEM 3 — Pasek postępu

### Sprawdź czy komponent ProgressBar istnieje

```bash
cat frontend/src/components/ProgressBar.tsx 2>/dev/null || echo "BRAK"
```

Jeśli brak — utwórz `frontend/src/components/ProgressBar.tsx`:

```typescript
import { useTheme } from '../hooks/useTheme';

interface ProgressBarProps {
  current: number;
  total: number;
  showText?: boolean;
}

export function ProgressBar({ current, total, showText = true }: ProgressBarProps) {
  const { theme, classes } = useTheme();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      {showText && (
        <span className={`text-sm font-bold ${classes.text}`}>
          ✓ {current}/{total}
        </span>
      )}
      <div className={`w-32 sm:w-48 h-3 rounded-full overflow-hidden ${theme === 'chalk' ? 'bg-chalk-text/20' : 'bg-gray-200'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${theme === 'chalk' ? 'bg-chalk-success' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

Upewnij się że `PracticePage` i `TestPage` importują i używają `ProgressBar`:

```typescript
import { ProgressBar } from '../components/ProgressBar';
```

---

## Weryfikacja

```bash
cd frontend && npm run build
```

Zero błędów. Następnie:

```bash
npm run dev
```

Otwórz http://localhost:5173 i sprawdź:

- [ ] Siatka matematyczna zajmuje całą dostępną wysokość ekranu (nie 50%)
- [ ] Na ekranie 1920×1080 kratki mają min. 64×64px (klasa `lg:w-20 lg:h-20`)
- [ ] Przełącznik motywu widoczny w prawym górnym rogu nagłówka
- [ ] Kliknięcie przełącznika zmienia motyw natychmiast
- [ ] Pasek postępu widoczny w górnej belce obok "Wróć"
- [ ] Pasek wypełnia się po każdym ukończonym zadaniu
- [ ] Na mobile (DevTools) siatka też zajmuje cały ekran
