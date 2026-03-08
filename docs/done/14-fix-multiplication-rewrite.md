# 14-fix-multiplication-rewrite.md — Mnożenie przepisane od zera

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Co jest źle (screenshot)
1. Wszystko wyrównane do PRAWEJ zamiast do środka — `items-end` na kontenerze
2. Linia rozciągnięta na cały ekran — `w-full` na kresce
3. Losowe `0` w drugim wierszu cząstkowym — błąd w logice partial cells
4. Nie można nic wpisać — input focus nie działa
5. Komponent jest za skomplikowany — za dużo stanów, za dużo abstrakcji

## Rozwiązanie
Usuń stary `ArithmeticDisplay.tsx` i napisz nowy, prosty komponent.
Jeden komponent obsługuje dodawanie, odejmowanie i mnożenie.
Dzielenie zostaje w `DivisionDisplay.tsx` (z pliku 13).

---

## Krok 1 — Usuń stary plik i utwórz nowy

```bash
rm frontend/src/components/ArithmeticDisplay.tsx
```

## Krok 2 — Utwórz `frontend/src/components/ArithmeticDisplay.tsx`

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types/task';
import { useTheme } from '../hooks/useTheme';
import { DivisionDisplay } from './DivisionDisplay';

const API = import.meta.env.VITE_API_URL;

interface Props {
  task: Task;
  mode: 'tutorial' | 'practice' | 'test';
  onStepComplete: (correct: boolean) => void;
  onTaskComplete: (allCorrect: boolean) => void;
  feedbackMode?: 'immediate' | 'after';
}

// Jedna komórka do wypełnienia przez dziecko
interface InputCell {
  id: string;           // unikalny klucz
  row: number;          // wiersz w siatce (0=carry, 1=op1, 2=op2, 3=partial1, 4=partial2, 5=result)
  col: number;          // kolumna od lewej (0..maxCols-1)
  expectedValue: string;// poprawna cyfra
  inputValue: string;   // wpisana cyfra
  status: 'empty' | 'active' | 'correct' | 'error';
  stepId: number | null;
}

// Jedna komórka wyświetlana (dane, nie edytowalna)
interface DisplayCell {
  row: number;
  col: number;
  value: string;        // cyfra do pokazania
}

export function ArithmeticDisplay({ task, mode, onStepComplete, onTaskComplete, feedbackMode = 'immediate' }: Props) {
  const { theme, classes } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Dzielenie ma osobny komponent
  if (task.operation === 'division') {
    return <DivisionDisplay task={task} mode={mode} onStepComplete={onStepComplete} onTaskComplete={onTaskComplete} feedbackMode={feedbackMode} />;
  }

  // ── Oblicz układ ──────────────────────────────────────────────

  const op1str = String(task.operand1);
  const op2str = String(task.operand2);
  const resstr = String(task.result);
  const partials = task.partials || [];
  const isMultiply = task.operation === 'multiplication';

  // Szerokość siatki — max liczba cyfr ze wszystkich wierszy
  const allLengths = [op1str.length, op2str.length, resstr.length];
  if (isMultiply) {
    partials.forEach(p => allLengths.push(String(p.value).length + p.shift));
  }
  const gridCols = Math.max(...allLengths);

  // Pomocnicza: string cyfr wyrównany do prawej w gridCols kolumnach
  // Zwraca tablicę gridCols elementów, gdzie '' = pusta komórka
  function rightAlign(s: string): string[] {
    const arr = Array(gridCols).fill('');
    const digits = s.split('');
    digits.forEach((d, i) => {
      arr[gridCols - digits.length + i] = d;
    });
    return arr;
  }

  // Wiersze do wyświetlenia (stałe cyfry)
  const row_op1 = rightAlign(op1str);
  const row_op2 = rightAlign(op2str);
  const row_res = rightAlign(resstr);

  // Dla mnożenia: wiersze cząstkowe
  // partial[0] = mnożenie przez jedności (bez przesunięcia)
  // partial[1] = mnożenie przez dziesiątki (przesunięcie o 1 w prawo, czyli +1 zero na końcu)
  const partial_rows: string[][] = partials.map(p => {
    const s = String(p.value) + '0'.repeat(p.shift);
    return rightAlign(s);
  });

  // Symbole operacji
  const SYMBOL: Record<string, string> = {
    addition:       '+',
    subtraction:    '\u2212',
    multiplication: '\u00D7',
    division:       '\u00F7',
  };
  const symbol = SYMBOL[task.operation] || '+';

  // ── Stan ─────────────────────────────────────────────────────

  // Kolejka komórek do wypełnienia — od prawej do lewej (jedności pierwsze)
  function buildInputQueue(): InputCell[] {
    const queue: InputCell[] = [];

    if (isMultiply) {
      // Najpierw wypełniamy wiersze cząstkowe (od prawej do lewej, każdy wiersz z osobna)
      partials.forEach((p, pi) => {
        const pstr = String(p.value) + '0'.repeat(p.shift);
        const digits = pstr.split('');
        // Kolumny od prawej do lewej
        for (let i = gridCols - 1; i >= 0; i--) {
          const digitIdx = digits.length - (gridCols - i);
          if (digitIdx >= 0 && digitIdx < digits.length) {
            // Czy to zero wynikające z shiftu? Nie pytamy o nie — auto-wstaw
            const isShiftZero = (gridCols - 1 - i) < p.shift;
            if (!isShiftZero) {
              const step = task.steps.find(s => s.row === pi && s.column === (gridCols - 1 - i - p.shift));
              queue.push({
                id: `p${pi}-c${i}`,
                row: 3 + pi,
                col: i,
                expectedValue: digits[digitIdx],
                inputValue: '',
                status: 'empty',
                stepId: step?.step_id ?? null,
              });
            }
          }
        }
      });
      // Potem wiersz wyniku końcowego
      for (let i = gridCols - 1; i >= 0; i--) {
        const d = row_res[i];
        if (d !== '') {
          queue.push({
            id: `res-c${i}`,
            row: 3 + partials.length + (partials.length > 1 ? 1 : 0),
            col: i,
            expectedValue: d,
            inputValue: '',
            status: 'empty',
            stepId: null,
          });
        }
      }
    } else {
      // Dodawanie / odejmowanie — tylko wiersz wyniku, od prawej
      for (let i = gridCols - 1; i >= 0; i--) {
        const d = row_res[i];
        if (d !== '') {
          const colIndex = gridCols - 1 - i; // 0 = jedności
          const step = task.steps.find(s => s.column === colIndex && s.position === 'result');
          queue.push({
            id: `res-c${i}`,
            row: isMultiply ? 5 : 3,
            col: i,
            expectedValue: d,
            inputValue: '',
            status: 'empty',
            stepId: step?.step_id ?? null,
          });
        }
      }
    }

    return queue;
  }

  const [queue, setQueue] = useState<InputCell[]>(buildInputQueue);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [carries, setCarries] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [done, setDone] = useState(false);

  // Reset przy nowym zadaniu
  useEffect(() => {
    const q = buildInputQueue();
    setQueue(q);
    setCurrentIdx(0);
    setCarries({});
    setFeedback(null);
    setIsChecking(false);
    setDone(false);
    // Aktywuj pierwszą komórkę
    if (q.length > 0) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [task.operand1, task.operand2, task.operation]);

  // Focus przy zmianie aktywnej komórki
  useEffect(() => {
    if (!done) setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentIdx]);

  const activeCell = queue[currentIdx] ?? null;

  const handleDigit = useCallback(async (digit: string) => {
    if (done || isChecking || !activeCell) return;

    const newQueue = queue.map((c, i) =>
      i === currentIdx ? { ...c, inputValue: digit } : c
    );

    if (mode !== 'test' && feedbackMode === 'immediate') {
      setIsChecking(true);
      try {
        let correct = false;

        if (activeCell.stepId !== null) {
          const res = await fetch(`${API}/api/validate/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: task.operation,
              step_id: activeCell.stepId,
              task_data: task,
              user_answer: Number(digit),
            }),
          });
          const data = await res.json();
          correct = data.correct;
          setFeedback({ msg: data.feedback, ok: data.correct });

          // Sprawdź czy następny krok to carry
          if (correct && task.operation === 'addition') {
            const nextStep = task.steps[activeCell.stepId + 1];
            if (nextStep && nextStep.position === 'carry') {
              setCarries(prev => ({ ...prev, [nextStep.column]: String(nextStep.result_digit) }));
            }
          }
        } else {
          // Brak stepId (wynik końcowy mnożenia) — sprawdź bezpośrednio
          correct = digit === activeCell.expectedValue;
          setFeedback({ msg: correct ? 'Brawo! \u2713' : `Nie. Spróbuj jeszcze raz!`, ok: correct });
        }

        newQueue[currentIdx] = { ...newQueue[currentIdx], status: correct ? 'correct' : 'error' };
        setQueue([...newQueue]);
        onStepComplete(correct);

        if (correct) {
          const next = currentIdx + 1;
          if (next >= newQueue.length) {
            setDone(true);
            onTaskComplete(true);
          } else {
            newQueue[next] = { ...newQueue[next], status: 'active' };
            setQueue([...newQueue]);
            setCurrentIdx(next);
          }
          setTimeout(() => setFeedback(null), 1200);
        } else {
          setTimeout(() => {
            setQueue(q => q.map((c, i) =>
              i === currentIdx ? { ...c, inputValue: '', status: 'empty' } : c
            ));
            setFeedback(null);
          }, 1500);
        }
      } finally {
        setIsChecking(false);
      }
    } else {
      // Test / after mode — bez walidacji
      newQueue[currentIdx] = { ...newQueue[currentIdx], inputValue: digit, status: 'correct' };
      const next = currentIdx + 1;
      if (next < newQueue.length) {
        newQueue[next] = { ...newQueue[next], status: 'active' };
      }
      setQueue([...newQueue]);
      if (next >= newQueue.length) {
        setDone(true);
        onTaskComplete(true);
      } else {
        setCurrentIdx(next);
      }
    }
  }, [done, isChecking, activeCell, currentIdx, queue, task, mode, feedbackMode]);

  // Klawiatura
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDigit]);

  // ── Helpers do renderowania ────────────────────────────────────

  const CELL = 'w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center';
  const DIGIT = `${CELL} text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-text chalk-text' : 'text-notebook-text'}`;
  const lineClass = `border-t-2 ${theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text'} my-1`;

  // Zwraca komórkę input lub display dla danego (row, col)
  function renderCell(row: number, col: number, givenValue: string) {
    const inputCell = queue.find(c => c.row === row && c.col === col);
    const isActive = inputCell && activeCell?.id === inputCell.id && !done;

    if (!inputCell) {
      // Zwykła cyfra
      return (
        <div key={`${row}-${col}`} className={DIGIT}>
          {givenValue}
        </div>
      );
    }

    // Edytowalna kratka
    return (
      <motion.div
        key={inputCell.id}
        onClick={() => { inputRef.current?.focus(); }}
        whileTap={{ scale: 0.92 }}
        className={`
          ${CELL} text-2xl sm:text-3xl font-bold rounded-lg cursor-pointer transition-all
          ${classes.font}
          ${inputCell.status === 'empty' || inputCell.status === 'active'
            ? `border-2 ${inputCell.status === 'active' || isActive
                ? theme === 'chalk'
                  ? 'border-chalk-accent bg-chalk-accent/10 shadow-lg shadow-chalk-accent/30'
                  : 'border-blue-500 bg-blue-50 shadow-md'
                : `border-dashed ${theme === 'chalk' ? 'border-chalk-line' : 'border-notebook-line'}`
              }`
            : ''
          }
          ${inputCell.status === 'correct'
            ? theme === 'chalk' ? 'text-chalk-success' : 'text-green-600'
            : ''}
          ${inputCell.status === 'error'
            ? `animate-shake ${theme === 'chalk' ? 'text-chalk-error' : 'text-red-500'}`
            : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {inputCell.inputValue ? (
            <motion.span key="v" initial={{ scale: 0.4 }} animate={{ scale: 1 }} className={theme === 'chalk' ? 'chalk-text' : ''}>
              {inputCell.inputValue}
            </motion.span>
          ) : (
            <motion.span
              key="q"
              animate={isActive ? { opacity: [1, 0.2, 1] } : { opacity: 0.3 }}
              transition={isActive ? { repeat: Infinity, duration: 0.9 } : {}}
            >
              ?
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  function renderRow(rowData: string[], rowIndex: number, symbolCol?: string) {
    return (
      <div className="flex items-center gap-0">
        {/* Kolumna na symbol (+, -, ×) */}
        <div className={`${CELL} text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent'}`}>
          {symbolCol ?? ''}
        </div>
        {rowData.map((d, col) => {
          if (d === '') return <div key={col} className={CELL} />;
          return renderCell(rowIndex, col, d);
        })}
      </div>
    );
  }

  const currentStepData = task.steps.find(s => s.step_id === activeCell?.stepId);

  // ── JSX ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center w-full gap-4">

      {/* Ukryty input mobile */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        className="fixed opacity-0 w-0 h-0"
        onChange={e => {
          const digit = e.target.value.replace(/\D/g, '').slice(-1);
          if (digit) { handleDigit(digit); e.target.value = ''; }
        }}
      />

      {/* Pytanie */}
      <p className={`text-3xl sm:text-4xl font-bold ${classes.text} ${classes.font} text-center`}>
        {task.operand1} {symbol} {task.operand2} = ?
      </p>

      {/* Opis kroku (tutorial) */}
      {mode === 'tutorial' && currentStepData && (
        <motion.div
          key={currentStepData.step_id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${classes.card} p-4 w-full max-w-lg text-center`}
        >
          <p className={`text-base sm:text-lg ${classes.text}`}>{currentStepData.description}</p>
          {currentStepData.hint && (
            <p className={`text-sm mt-1 opacity-60 ${classes.text}`}>
              {currentStepData.hint}
            </p>
          )}
        </motion.div>
      )}

      {/* SIATKA */}
      <div
        className={`inline-flex flex-col p-6 sm:p-8 rounded-2xl cursor-pointer ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}`}
        onClick={() => inputRef.current?.focus()}
      >

        {/* Carry row — tylko dodawanie */}
        {task.operation === 'addition' && Object.keys(carries).length > 0 && (
          <div className="flex items-center gap-0">
            <div className={CELL} />
            {row_op1.map((_, col) => {
              const colIndex = gridCols - 1 - col;
              return (
                <div key={col} className={`${CELL} text-sm font-bold ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-500'}`}>
                  <AnimatePresence>
                    {carries[colIndex] && (
                      <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                        {carries[colIndex]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Operand 1 */}
        {renderRow(row_op1, 1)}

        {/* Operand 2 + symbol */}
        {renderRow(row_op2, 2, symbol)}

        {/* Kreska 1 */}
        <div className={lineClass} />

        {/* Wiersze cząstkowe (mnożenie) */}
        {isMultiply && partial_rows.map((prow, pi) => (
          <div key={pi}>
            {renderRow(prow, 3 + pi)}
          </div>
        ))}

        {/* Kreska 2 — suma cząstkowych (mnożenie 2-cyfrowe) */}
        {isMultiply && partial_rows.length > 1 && (
          <div className={lineClass} />
        )}

        {/* Wiersz wyniku */}
        {renderRow(row_res, isMultiply ? 3 + partial_rows.length + (partial_rows.length > 1 ? 1 : 0) : 3)}

      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`
              w-full max-w-lg p-4 rounded-xl text-center font-bold text-base sm:text-lg
              ${feedback.ok
                ? theme === 'chalk' ? 'bg-chalk-success/20 text-chalk-success border border-chalk-success/30' : 'bg-green-50 text-green-700 border border-green-200'
                : theme === 'chalk' ? 'bg-chalk-error/20 text-chalk-error border border-chalk-error/30' : 'bg-red-50 text-red-700 border border-red-200'
              }
            `}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
```

---

## Krok 3 — Sprawdź `npm run build`

```bash
cd frontend && npm run build
```

Zero błędów TypeScript.

---

## Checklist

**Dodawanie** `490 + 37 = 527`:
- [ ] Cyfry wyrównane do prawej, na środku ekranu
- [ ] Kratki wyniku aktywują się od prawej (jedności pierwsze)
- [ ] Wpisanie cyfry → zielona lub shake
- [ ] Przeniesienie `1` pojawia się małą cyfrą nad właściwą kolumną

**Odejmowanie** `521 - 78 = 443`:
- [ ] Znak `−` (nie myślnik) wyświetla się poprawnie
- [ ] Działa tak samo jak dodawanie

**Mnożenie** `873 × 69`:
- [ ] DWA wiersze cząstkowe: `7857` i `52380`
- [ ] Druhá línka przesunięta o jedną pozycję w lewo (bo dziesiątki)
- [ ] Między wierszami cząstkowymi a wynikiem jest DRUGA kreska
- [ ] Wynik `60237` do wypełnienia
- [ ] Znak `×` wyświetla się poprawnie

**Ogólne**:
- [ ] Siatka na środku ekranu (nie przy prawej krawędzi)
- [ ] Kreska tylko pod siatką (nie na cały ekran)
- [ ] Kliknięcie w siatkę → można wpisywać z klawiatury
- [ ] Na mobile → pojawia się klawiatura numeryczna
