# 10-bugfix-grid-final.md — Kompletna naprawa siatki (przepisanie od zera)

## Przeczytaj najpierw
Przeczytaj `CLAUDE.md`. Ten plik CAŁKOWICIE zastępuje podejście z pliku 09.
Poprzednia architektura gridBuilder była zbyt skomplikowana i generowała błędy.
Nowe podejście: **prosta tablica cyfr renderowana bezpośrednio z danych zadania**.

## Diagnoza problemów

### Problem 1: Złe cyfry w siatce
`gridBuilder.ts` budował siatkę z danych kroków (`steps`) zamiast z cyfr operandów.
Kroki zawierają `result_digit` (cyfry wyniku) — nie cyfry operandów.
Przez to `140 + 17` wyświetlało losowe cyfry z kroków.

### Problem 2: Brak odświeżania przy nowym zadaniu
`useState(() => buildGrid(task))` w React uruchamia się RAZ przy montowaniu.
Gdy przyszło nowe zadanie — siatka pokazywała stare dane.

### Problem 3: Mały interfejs
Kontenery miały `max-w-md` i `max-w-sm` — na dużych ekranach zajmowały 1/4 szerokości.

### Problem 4: Krzaczki
Znaki `×`, `−`, `÷` były wpisane literalnie w plikach — przy zapisie/odczycie zepsuło się enkodowanie.

## Rozwiązanie: Nowy komponent ArithmeticDisplay

Zamiast abstrakcyjnej siatki z mappingiem kroków — prosty komponent który:
- Pobiera cyfry bezpośrednio z `task.operand1`, `task.operand2`, `task.result`
- Renderuje wiersz po wierszu jako flex
- Używa tylko Unicode escapów dla znaków specjalnych
- Odświeża się przy każdej zmianie `task`

---

## Krok 1 — Usuń stare pliki

```bash
# Usuń stare pliki które będziemy zastępować:
rm frontend/src/utils/gridBuilder.ts
rm frontend/src/components/MathGrid.tsx
rm frontend/src/components/TaskDisplay.tsx
```

---

## Krok 2 — Utwórz `frontend/src/utils/mathUtils.ts`

```typescript
/**
 * Narzędzia matematyczne — bez znaków specjalnych wpisanych literalnie.
 * Wszystkie znaki specjalne jako Unicode escape.
 */

// Znaki operacji — TYLKO Unicode, nigdy literalne znaki
export const SYMBOLS = {
  addition:       '+',
  subtraction:    '\u2212',   // −
  multiplication: '\u00D7',   // ×
  division:       '\u00F7',   // ÷
} as const;

/**
 * Rozdziela liczbę na cyfry, wyrównując do zadanej długości zerami z lewej.
 * Przykład: splitDigits(17, 3) → ['0', '1', '7']
 */
export function splitDigits(n: number, padTo: number): string[] {
  const s = String(Math.abs(n));
  const padded = s.padStart(padTo, '0');
  return padded.split('');
}

/**
 * Zwraca maksymalną liczbę cyfr spośród podanych liczb.
 */
export function maxDigits(...nums: number[]): number {
  return Math.max(...nums.map(n => String(Math.abs(n)).length));
}

/**
 * Oblicza ocenę szkolną z procentu.
 */
export function calcGrade(correct: number, total: number): number {
  if (total === 0) return 1;
  const pct = (correct / total) * 100;
  if (pct === 100) return 6;
  if (pct >= 90)   return 5;
  if (pct >= 75)   return 4;
  if (pct >= 60)   return 3;
  if (pct >= 40)   return 2;
  return 1;
}
```

---

## Krok 3 — Utwórz `frontend/src/components/ArithmeticDisplay.tsx`

To jest NOWY główny komponent siatki. Zastępuje MathGrid + TaskDisplay + gridBuilder.

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types/task';
import { SYMBOLS, splitDigits, maxDigits } from '../utils/mathUtils';
import { useTheme } from '../hooks/useTheme';

const API = import.meta.env.VITE_API_URL;

interface ArithmeticDisplayProps {
  task: Task;
  mode: 'tutorial' | 'practice' | 'test';
  onStepComplete: (correct: boolean) => void;
  onTaskComplete: (allCorrect: boolean) => void;
  feedbackMode?: 'immediate' | 'after';
}

// Stan pojedynczej komórki wyniku
interface ResultCell {
  colIndex: number;     // indeks kolumny (0 = jedności)
  displayCol: number;   // pozycja wyświetlania od lewej (0-indexed)
  value: string;        // wpisana cyfra
  status: 'empty' | 'active' | 'correct' | 'error' | 'revealed';
  stepId: number | null;
}

export function ArithmeticDisplay({
  task,
  mode,
  onStepComplete,
  onTaskComplete,
  feedbackMode = 'immediate',
}: ArithmeticDisplayProps) {
  const { theme, classes } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Oblicz liczbę kolumn
  const op1 = task.operand1;
  const op2 = task.operand2;
  const result = task.result;
  const cols = maxDigits(op1, op2, result) + (task.operation === 'subtraction' ? 0 : 0);
  // Dla dodawania wynik może mieć więcej cyfr niż operandy
  const resultCols = maxDigits(op1, op2, result);

  // Cyfry operandów wyrównane do prawej
  const digits1 = splitDigits(op1, resultCols);
  const digits2 = splitDigits(op2, resultCols);

  // Inicjalizacja komórek wyniku
  function initResultCells(): ResultCell[] {
    const resultStr = String(result);
    const cells: ResultCell[] = [];
    for (let i = 0; i < resultCols; i++) {
      const colIndex = resultCols - 1 - i; // 0 = jedności (prawo), rośnie w lewo
      const step = task.steps.find(
        s => s.column === colIndex && s.position === 'result'
      );
      // Nie wszystkie pozycje mają odpowiadający krok (np. leading zeros)
      const digit = resultStr.padStart(resultCols, '0')[i];
      cells.push({
        colIndex,
        displayCol: i,
        value: '',
        status: 'empty',
        stepId: step?.step_id ?? null,
      });
    }
    return cells;
  }

  const [resultCells, setResultCells] = useState<ResultCell[]>(initResultCells);
  const [activeColIndex, setActiveColIndex] = useState<number>(-1);
  const [carries, setCarries] = useState<Record<number, string>>({}); // przeniesienia
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [allDone, setAllDone] = useState(false);

  // Odśwież gdy zmieni się zadanie
  useEffect(() => {
    setResultCells(initResultCells());
    setActiveColIndex(-1);
    setCarries({});
    setFeedback(null);
    setCurrentStep(0);
    setAllDone(false);
  }, [task.operand1, task.operand2, task.operation]);

  // Aktywuj pierwszą pustą komórkę przy starcie / po zmianie kroku
  useEffect(() => {
    // Aktywuj komórkę odpowiadającą aktualnemu krokowi
    const step = task.steps[currentStep];
    if (step && step.position === 'result') {
      setActiveColIndex(step.column);
    }
  }, [currentStep, task.steps]);

  // Fokus na ukrytym input gdy aktywna komórka
  useEffect(() => {
    if (activeColIndex >= 0) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeColIndex]);

  const handleDigitInput = useCallback(async (digit: string) => {
    if (allDone || isChecking || activeColIndex < 0) return;
    if (!/^[0-9]$/.test(digit)) return;

    const cellIdx = resultCells.findIndex(c => c.colIndex === activeColIndex);
    if (cellIdx < 0) return;

    // Zaktualizuj wartość komórki
    const newCells = [...resultCells];
    newCells[cellIdx] = { ...newCells[cellIdx], value: digit };
    setResultCells(newCells);

    // Walidacja w trybach tutorial i practice (immediate)
    if (mode !== 'test' && feedbackMode === 'immediate') {
      setIsChecking(true);
      try {
        const step = task.steps[currentStep];
        if (step) {
          const res = await fetch(`${API}/api/validate/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: task.operation,
              step_id: step.step_id,
              task_data: task,
              user_answer: Number(digit),
            }),
          });
          const data = await res.json();

          newCells[cellIdx] = {
            ...newCells[cellIdx],
            status: data.correct ? 'correct' : 'error',
          };
          setResultCells([...newCells]);
          setFeedback({ msg: data.feedback, ok: data.correct });

          if (data.correct) {
            onStepComplete(true);
            // Przejdź do następnego kroku
            const nextStep = findNextResultStep(currentStep + 1, task);
            if (nextStep !== null) {
              setCurrentStep(nextStep);
              setActiveColIndex(task.steps[nextStep].column);
            } else {
              // Wszystkie komórki wypełnione
              finishTask(newCells, true);
            }
          } else {
            onStepComplete(false);
            // Wyczyść po chwili żeby dziecko mogło spróbować ponownie
            setTimeout(() => {
              newCells[cellIdx] = { ...newCells[cellIdx], value: '', status: 'empty' };
              setResultCells([...newCells]);
              setFeedback(null);
            }, 1500);
          }
        }
      } catch (e) {
        console.error('Błąd walidacji:', e);
      } finally {
        setIsChecking(false);
      }
    } else {
      // Tryb test lub after — bez natychmiastowej walidacji
      newCells[cellIdx] = { ...newCells[cellIdx], status: 'correct' };
      setResultCells([...newCells]);

      const nextStep = findNextResultStep(currentStep + 1, task);
      if (nextStep !== null) {
        setCurrentStep(nextStep);
        setActiveColIndex(task.steps[nextStep].column);
      } else {
        finishTask(newCells, false);
      }
    }
  }, [activeColIndex, resultCells, currentStep, task, mode, feedbackMode, allDone, isChecking]);

  function findNextResultStep(fromStep: number, t: Task): number | null {
    for (let i = fromStep; i < t.steps.length; i++) {
      if (t.steps[i].position === 'result') return i;
    }
    return null;
  }

  function finishTask(cells: ResultCell[], wasValidated: boolean) {
    setAllDone(true);
    const allCorrect = cells.every(c => c.status !== 'error');
    onTaskComplete(allCorrect);
  }

  // Obsługa klawiatury
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') handleDigitInput(e.key);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDigitInput]);

  const symbol = SYMBOLS[task.operation as keyof typeof SYMBOLS] || '+';
  const currentStepData = task.steps[currentStep];

  // Klasy motywu
  const digitClass = `
    w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16
    flex items-center justify-center
    text-2xl sm:text-3xl lg:text-4xl font-bold
    ${classes.font}
    ${theme === 'chalk' ? 'chalk-text text-chalk-text' : 'text-notebook-text'}
  `;

  const emptyCellClass = `
    w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16
    flex items-center justify-center
  `;

  return (
    <div className="flex flex-col items-center w-full gap-6">

      {/* Ukryty input dla mobile */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onInput={e => {
          const val = (e.target as HTMLInputElement).value;
          const digit = val.replace(/\D/g, '').slice(-1);
          if (digit) {
            handleDigitInput(digit);
            (e.target as HTMLInputElement).value = '';
          }
        }}
      />

      {/* Pytanie */}
      <motion.p
        key={`${task.operand1}-${task.operand2}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${classes.text} ${classes.font} text-center`}
      >
        {task.operand1} {symbol} {task.operand2} = ?
      </motion.p>

      {/* Opis kroku (tutorial) */}
      {mode === 'tutorial' && currentStepData && (
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${classes.card} p-4 w-full max-w-lg text-center`}
        >
          <p className={`text-base sm:text-lg ${classes.text}`}>
            {currentStepData.description}
          </p>
          {currentStepData.hint && (
            <p className={`text-sm mt-2 opacity-70 ${classes.text}`}>
              \u{1F4A1} {currentStepData.hint}
            </p>
          )}
        </motion.div>
      )}

      {/* SIATKA MATEMATYCZNA */}
      <div
        className={`
          inline-flex flex-col items-end gap-1 p-6 sm:p-8 lg:p-10 rounded-2xl
          ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}
        `}
        onClick={() => inputRef.current?.focus()}
      >

        {/* Wiersz przeniesień (carry) — pokazuj tylko gdy są */}
        {Object.keys(carries).length > 0 && (
          <div className="flex">
            <div className={emptyCellClass} /> {/* symbol placeholder */}
            {digits1.map((_, i) => {
              const colIndex = resultCols - 1 - i;
              return (
                <div key={i} className={`${emptyCellClass} justify-center`}>
                  {carries[colIndex] && (
                    <span className={`text-sm font-bold ${theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent'}`}>
                      {carries[colIndex]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Wiersz 1: Operand1 */}
        <div className="flex items-center">
          <div className={emptyCellClass} /> {/* placeholder na symbol */}
          {digits1.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: d === '0' && i < resultCols - String(op1).length ? 0 : 1 }}
              className={digitClass}
            >
              {/* Nie pokazuj zer wiodących */}
              {i >= resultCols - String(op1).length ? d : ''}
            </motion.div>
          ))}
        </div>

        {/* Wiersz 2: Symbol + Operand2 */}
        <div className="flex items-center">
          <div className={`${digitClass} text-chalk-accent sm:w-14 sm:h-14 lg:w-16 lg:h-16`}>
            {symbol}
          </div>
          {digits2.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: i >= resultCols - String(op2).length ? 1 : 0 }}
              className={digitClass}
            >
              {i >= resultCols - String(op2).length ? d : ''}
            </motion.div>
          ))}
        </div>

        {/* Linia */}
        <div className={`w-full border-t-2 my-1 ${theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text'}`} />

        {/* Wiersz wyniku — edytowalne komórki */}
        <div className="flex items-center">
          <div className={emptyCellClass} />
          {resultCells.map((rc) => {
            const isActive = rc.colIndex === activeColIndex;
            return (
              <motion.div
                key={rc.colIndex}
                onClick={() => {
                  setActiveColIndex(rc.colIndex);
                  inputRef.current?.focus();
                }}
                whileTap={{ scale: 0.9 }}
                className={`
                  w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16
                  flex items-center justify-center
                  text-2xl sm:text-3xl lg:text-4xl font-bold rounded-lg
                  cursor-pointer transition-all duration-150
                  ${classes.font}
                  ${rc.status === 'empty' && !isActive
                    ? `border-2 border-dashed ${theme === 'chalk' ? 'border-chalk-line' : 'border-notebook-line'}`
                    : ''}
                  ${isActive && rc.status === 'empty'
                    ? `border-2 ${theme === 'chalk' ? 'border-chalk-accent shadow-lg shadow-chalk-accent/40 bg-chalk-accent/10' : 'border-notebook-text shadow-md bg-blue-50'}`
                    : ''}
                  ${rc.status === 'correct'
                    ? `border ${theme === 'chalk' ? 'border-chalk-success text-chalk-success' : 'border-green-400 text-green-600'}`
                    : ''}
                  ${rc.status === 'error'
                    ? `border-2 ${theme === 'chalk' ? 'border-chalk-error text-chalk-error bg-chalk-error/10' : 'border-red-400 text-red-600 bg-red-50'} animate-shake`
                    : ''}
                `}
              >
                <AnimatePresence mode="wait">
                  {rc.value ? (
                    <motion.span
                      key={rc.value + rc.status}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={theme === 'chalk' ? 'chalk-text' : ''}
                    >
                      {rc.value}
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={isActive ? { opacity: [1, 0.2, 1] } : { opacity: 0.25 }}
                      transition={isActive ? { repeat: Infinity, duration: 1 } : {}}
                      className="text-lg"
                    >
                      ?
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
              w-full max-w-lg p-4 rounded-xl text-center font-bold text-base sm:text-lg
              ${feedback.ok
                ? theme === 'chalk' ? 'bg-chalk-success/20 text-chalk-success border border-chalk-success/40' : 'bg-green-50 text-green-700 border border-green-200'
                : theme === 'chalk' ? 'bg-chalk-error/20 text-chalk-error border border-chalk-error/40' : 'bg-red-50 text-red-700 border border-red-200'
              }
            `}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wskazówka dla trybu test */}
      {mode === 'test' && !allDone && (
        <p className={`text-sm ${classes.text} opacity-50`}>
          Kliknij kratkę i wpisz cyfrę z klawiatury
        </p>
      )}
    </div>
  );
}
```

---

## Krok 4 — Zaktualizuj `frontend/src/pages/PracticePage.tsx`

Zastąp `TaskDisplay` na `ArithmeticDisplay` i usuń `max-w-md`:

```typescript
import { ArithmeticDisplay } from '../components/ArithmeticDisplay';

// W JSX zastąp:
// <TaskDisplay ... />
// na:
<ArithmeticDisplay
  task={task}
  mode={isTutorial ? 'tutorial' : 'practice'}
  onStepComplete={handleStepComplete}
  onTaskComplete={handleTaskComplete}
  feedbackMode={activeProfile?.feedbackMode || 'immediate'}
/>
```

Usuń też ograniczenie szerokości — zmień:
```typescript
// PRZED:
<div className="max-w-md mx-auto">

// PO:
<div className="w-full max-w-2xl mx-auto">
```

---

## Krok 5 — Zaktualizuj `frontend/src/pages/TestPage.tsx`

Tak samo — zastąp `TaskDisplay` na `ArithmeticDisplay`:

```typescript
import { ArithmeticDisplay } from '../components/ArithmeticDisplay';

// Zastąp TaskDisplay na ArithmeticDisplay z tymi samymi propsami
// Zmień max-w-md na max-w-2xl
```

---

## Krok 6 — Zaktualizuj `frontend/src/pages/LearnPage.tsx`

```typescript
// Zmień:
<div className="max-w-md mx-auto">
// Na:
<div className="w-full max-w-2xl mx-auto">
```

---

## Krok 7 — Zaktualizuj `frontend/src/components/Layout.tsx`

Zmień padding i max-width głównego kontenera:

```typescript
// W <main>:
// PRZED:
<main className="p-4">

// PO:
<main className="px-4 py-4 sm:px-6 lg:px-8">
```

---

## Krok 8 — Zaktualizuj `frontend/src/pages/TheoryPage.tsx`

Zmień max-width:
```typescript
// PRZED:
<div className="max-w-md mx-auto">
// PO:
<div className="w-full max-w-2xl mx-auto">
```

I wizualizację teorii — zwiększ font:
```typescript
// PRZED:
<pre className="text-xl ...">
// PO:
<pre className="text-2xl sm:text-3xl lg:text-4xl ...">
```

---

## Krok 9 — Usuń nieużywane importy

Usuń importy `TaskDisplay`, `MathGrid`, `gridBuilder` z wszystkich plików które je importowały.
TypeScript wskaże błędy kompilacji — napraw je usuwając lub zamieniając na `ArithmeticDisplay`.

---

## Krok 10 — Weryfikacja

```bash
cd frontend
npm run build
```

Nie może być ŻADNYCH błędów TypeScript.

Następnie uruchom i sprawdź wizualnie (`npm run dev`):

### Checklist:

**Dodawanie `140 + 17`:**
- [ ] Wiersz 1 pokazuje: `1 4 0` (nie ma zer wiodących w miejscach gdzie ich nie ma)
- [ ] Wiersz 2 pokazuje: `+ _ 1 7` (symbol + cyfry wyrównane do prawej)
- [ ] Wiersz 3 (wynik): `? ? ?` — trzy puste kratki do wypełnienia
- [ ] Pierwsza aktywna kratka (prawda) = jedności (prawa)

**Mnożenie `894 × 3`:**
- [ ] Wiersz 1 pokazuje: `8 9 4`
- [ ] Wiersz 2 pokazuje: `× _ _ 3`
- [ ] Znak mnożenia to `×` a nie `Ã—` ani `Ä–`

**Ogólne:**
- [ ] Siatka zajmuje co najmniej 50% szerokości ekranu na desktopie
- [ ] Na mobile kratki mają min. 48×48px (wygodne dotykanie)
- [ ] Feedback (zielony/czerwony) wyświetla się pod siatką
- [ ] Klawiatura numeryczna pojawia się na mobile po kliknięciu kratki
