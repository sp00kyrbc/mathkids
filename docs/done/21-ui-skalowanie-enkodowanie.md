# 21-ui-skalowanie-enkodowanie.md — Skalowanie UI + enkodowanie + avatar → menu

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Trzy zmiany

1. Enkodowanie — raz na zawsze, jedno miejsce
2. Wszystkie elementy UI 2× większe
3. Kliknięcie avatara → główne menu

---

## ZMIANA 1 — Enkodowanie: jeden plik konfiguracyjny

Utwórz `frontend/src/utils/symbols.ts`:

```typescript
// Wszystkie znaki specjalne w jednym miejscu.
// NIGDY nie używaj literalnych znaków ÷ × − poza tym plikiem.
export const SYM = {
  multiply:   '\u00D7',   // ×
  divide:     '\u00F7',   // ÷
  minus:      '\u2212',   // −
  plus:       '+',
  check:      '\u2713',   // ✓
  bullet:     '\u2022',   // •
} as const;

export function operationSymbol(op: string): string {
  switch (op) {
    case 'multiplication': return SYM.multiply;
    case 'division':       return SYM.divide;
    case 'subtraction':    return SYM.minus;
    default:               return SYM.plus;
  }
}
```

Następnie w KAŻDYM pliku który używa znaków specjalnych:
```bash
# Znajdź wszystkie pliki z literalnymi znakami:
grep -rn "÷\|×\|−\|&times\|&divide" frontend/src/
```

W każdym znalezionym pliku:
```typescript
// Dodaj import na górze:
import { SYM, operationSymbol } from '../utils/symbols';

// Zastąp literalne znaki:
// '×'  →  SYM.multiply
// '÷'  →  SYM.divide
// '−'  →  SYM.minus
// operationSymbol(task.operation)  →  zamiast ręcznego switch
```

W `ArithmeticDisplay.tsx` i `DivisionDisplay.tsx` — zmień:
```typescript
// STARY:
const SYMBOL: Record<string, string> = {
  addition:       '+',
  subtraction:    '\u2212',
  multiplication: '\u00D7',
  division:       '\u00F7',
};
const symbol = SYMBOL[task.operation] || '+';

// NOWY:
import { operationSymbol } from '../utils/symbols';
const symbol = operationSymbol(task.operation);
```

W Pythonie — `backend/src/python/arithmetic_engine.py`:
```bash
# Sprawdź czy są literalne znaki:
grep -n "÷\|×\|−" backend/src/python/arithmetic_engine.py
```

Każde trafienie zastąp Unicode escape:
```python
# × → \u00D7
# ÷ → \u00F7  
# − → \u2212
```

---

## ZMIANA 2 — Skalowanie UI 2×

### `frontend/src/components/Layout.tsx`

```typescript
export function Layout({ children, showHeader = true }: LayoutProps) {
  const { theme, classes } = useTheme();
  const { activeProfile } = useAppStore();
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col w-full min-h-screen ${classes.bg} ${classes.font}`}>

      {showHeader && (
        <header className={`flex items-center justify-between px-6 py-3 shrink-0`}>

          {/* Lewo: avatar + dane profilu — KLIKALNE → menu */}
          <button
            onClick={() => navigate('/menu')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity active:scale-95"
          >
            <span className="text-4xl sm:text-5xl">
              {activeProfile?.avatar ?? '🐨'}
            </span>
            <div className="flex flex-col leading-tight text-left">
              <span className={`font-bold text-base sm:text-lg ${classes.text}`}>
                {activeProfile?.name ?? ''}
              </span>
              <span className={`text-sm sm:text-base opacity-70 ${classes.text}`}>
                Poz. {activeProfile?.level ?? 1} · {activeProfile?.xp ?? 0} PD
              </span>
            </div>
          </button>

          {/* Prawo: ThemeSwitcher */}
          <ThemeSwitcher />

        </header>
      )}

      <main className="flex flex-col flex-1 w-full overflow-auto">
        {children}
      </main>

    </div>
  );
}
```

### `frontend/src/components/ThemeSwitcher.tsx`

```typescript
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
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        text-base sm:text-lg font-bold
        transition-all active:scale-95
        ${theme === 'chalk'
          ? 'bg-white/20 text-white hover:bg-white/30'
          : 'bg-black/10 text-gray-800 hover:bg-black/20'}
      `}
    >
      <span className="text-2xl">{theme === 'chalk' ? '📓' : '🖊️'}</span>
      <span>{theme === 'chalk' ? 'Zeszyt' : 'Tablica'}</span>
    </button>
  );
}
```

### `frontend/src/components/ProgressBar.tsx`

```typescript
export function ProgressBar({ current, total, showText = true }: ProgressBarProps) {
  const { theme, classes } = useTheme();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      {showText && (
        <span className={`text-base sm:text-lg font-bold ${classes.text}`}>
          ✓ {current}/{total}
        </span>
      )}
      <div className={`
        w-40 sm:w-56 h-4 sm:h-5 rounded-full overflow-hidden
        ${theme === 'chalk' ? 'bg-white/20' : 'bg-gray-200'}
      `}>
        <div
          className={`h-full rounded-full transition-all duration-500
            ${theme === 'chalk' ? 'bg-green-400' : 'bg-green-500'}
          `}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

### `frontend/src/pages/PracticePage.tsx` — górny pasek

```typescript
{/* Górny pasek */}
<div className="flex items-center justify-between px-6 py-3 shrink-0">
  <button
    onClick={() => navigate(-1)}
    className={`text-base sm:text-lg font-bold ${classes.text} opacity-70 hover:opacity-100 flex items-center gap-1`}
  >
    ← Wróć
  </button>
  <ProgressBar current={completedCount} total={totalCount} />
</div>

{/* Tytuł */}
<div className="text-center py-2 shrink-0">
  <p className={`text-2xl sm:text-3xl font-bold ${classes.text}`}>
    {isTutorial ? '🧡 Zróbmy razem' : '✏️ Twoja kolej!'}
  </p>
</div>
```

### `frontend/src/components/ArithmeticDisplay.tsx` — rozmiar kratek

```typescript
// Zmień CELL_SIZE na większe:
const CELL_SIZE = 'w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20';
const FONT_SIZE = 'text-3xl sm:text-4xl lg:text-5xl';

// Zaktualizuj DIGIT_CLS:
const DIGIT_CLS = `${CELL_SIZE} flex items-center justify-center ${FONT_SIZE} font-bold rounded
  ${classes.font}
  ${theme === 'chalk'
    ? 'text-chalk-text chalk-text border border-chalk-text/30 bg-chalk-text/5'
    : 'text-notebook-text border border-notebook-text/25 bg-black/5'}`;
```

### Wszystkie pozostałe strony — zwiększ bazowy font

W `frontend/src/pages/MenuPage.tsx`, `LearnPage.tsx`, `StatsPage.tsx`, `ProfilesPage.tsx`:

```bash
# Znajdź małe teksty:
grep -n "text-sm\|text-xs\|text-base" frontend/src/pages/MenuPage.tsx
```

Zmień:
```
text-xs   →  text-sm sm:text-base
text-sm   →  text-base sm:text-lg
text-base →  text-lg sm:text-xl
text-lg   →  text-xl sm:text-2xl
text-xl   →  text-2xl sm:text-3xl
```

---

## ZMIANA 3 — Avatar klikalny → menu

Już zawarte w Layout.tsx powyżej (`onClick={() => navigate('/menu')}`).

Upewnij się że `Layout.tsx` importuje `useNavigate`:
```typescript
import { useNavigate } from 'react-router-dom';
```

---

## Weryfikacja

```bash
cd frontend && npm run build
```

Sprawdź wizualnie:

- [ ] Avatar w lewym górnym rogu: rozmiar ~48px (`text-5xl`)
- [ ] Imię profilu i poziom: czytelne (`text-lg`)
- [ ] Przycisk motywu: duży, z emoji i tekstem
- [ ] Pasek postępu: grubszy (`h-5`), szerszy (`w-56`)
- [ ] Tytuł "Twoja kolej!": `text-3xl`
- [ ] Kratki cyfr: `lg:w-20 lg:h-20` na dużym ekranie
- [ ] Kliknięcie avatara → przejście do `/menu`
- [ ] Żadnych krzaczków w znakach ×, ÷, −
