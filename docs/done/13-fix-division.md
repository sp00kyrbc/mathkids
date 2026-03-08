# 13-fix-division.md — Poprawne dzielenie pisemne + enkodowanie

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Co jest źle

### Problem 1 — Python: literalne znaki specjalne w stringach

W `backend/src/python/arithmetic_engine.py` znaki `÷` i `×` są wpisane literalnie
w f-stringach. To powoduje krzaczki. Zmień WSZYSTKIE wystąpienia:

Znajdź funkcję `_generate_division` — linia z `"question"`:
```python
# STARY (krzaczki):
"question": f"{dividend} ÷ {divisor} = ?"

# NOWY:
"question": f"{dividend} \u00F7 {divisor} = ?",
"symbol": "\u00F7",
```

Znajdź funkcję `_compute_division_steps` — linia z `desc`:
```python
# STARY (krzaczki):
desc = f"Biorę {current}. {current} ÷ {divisor} = {q_digit} (bo {q_digit} × {divisor} = {product}). Reszta: {remainder}."

# NOWY:
desc = f"Biorę {current}. {current} \u00F7 {divisor} = {q_digit} (bo {q_digit} \u00D7 {divisor} = {product}). Reszta: {remainder}."
```

Sprawdź też `_generate_subtraction` — symbol minusa:
```python
# STARY:
"symbol": "−",   # literalny znak

# NOWY:
"symbol": "\u2212",
```

I `_generate_addition` — question:
```python
# Dodaj brakujące pole symbol jeśli nie ma:
"symbol": "+",
```

### Problem 2 — Frontend: brak renderowania dzielenia

`ArithmeticDisplay.tsx` (z pliku 10) obsługuje tylko dodawanie, odejmowanie i mnożenie.
Dzielenie nie jest renderowane wcale — dziecko widzi pustą siatkę lub błąd.

### Problem 3 — Układ dzielenia w polskiej szkole

Dzielenie pisemne wygląda TAK (np. `126 ÷ 6 = 21`):

```
1 2 6 | 6
1 2   |-----
─────  | 2 1
  0 6
    6
  ───
    0
```

Czyli:
- Dzielna po LEWEJ, pionowa kreska pośrodku, dzielnik po PRAWEJ od kreski
- Pod dzielnikiem pozioma kreska, pod nią cyfry WYNIKU
- Pod dzielną kolejne odejmowania (reszty cząstkowe) schodzą w dół i w prawo

---

## Krok 1 — Napraw Python (enkodowanie)

Wykonaj wszystkie zmiany opisane w Problemie 1 powyżej.

Zrestartuj backend i sprawdź curl:
```bash
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"division","max_digits1":3,"max_digits2":1}'
```

W JSON sprawdź:
- `"symbol"` = `"÷"` (poprawny znak)
- `"question"` nie ma krzaczków
- `"division_steps"` = tablica z podkrokami
- każdy substep ma: `current_value`, `quotient_digit`, `product`, `remainder`

---

## Krok 2 — Utwórz nowy komponent `frontend/src/components/DivisionDisplay.tsx`

Dzielenie ma tak inny układ że zasługuje na osobny komponent:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types/task';
import { useTheme } from '../hooks/useTheme';

const API = import.meta.env.VITE_API_URL;

interface DivisionDisplayProps {
  task: Task;
  mode: 'tutorial' | 'practice' | 'test';
  onStepComplete: (correct: boolean) => void;
  onTaskComplete: (allCorrect: boolean) => void;
  feedbackMode?: 'immediate' | 'after';
}

interface QuotientCell {
  position: number;   // pozycja w wyniku (0 = lewa cyfra)
  value: string;
  status: 'empty' | 'active' | 'correct' | 'error';
  stepId: number | null;
}

export function DivisionDisplay({
  task, mode, onStepComplete, onTaskComplete, feedbackMode = 'immediate'
}: DivisionDisplayProps) {
  const { theme, classes } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const dividendStr = String(task.operand1);
  const divisorStr  = String(task.operand2);
  const quotientStr = String(task.result);
  const substeps    = task.division_steps || [];

  // Komórki wyniku (cyfry ilorazu)
  function initQuotientCells(): QuotientCell[] {
    return quotientStr.split('').map((_, i) => {
      const step = task.steps.find(s => s.column === i && s.position === 'result');
      return {
        position: i,
        value: '',
        status: i === 0 ? 'active' : 'empty',
        stepId: step?.step_id ?? null,
      };
    });
  }

  const [quotientCells, setQuotientCells] = useState<QuotientCell[]>(initQuotientCells);
  const [activePosition, setActivePosition] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [allDone, setAllDone] = useState(false);
  // Które podkroki są już odkryte (dzieci widzą odejmowania)
  const [revealedSubsteps, setRevealedSubsteps] = useState<number[]>([]);

  useEffect(() => {
    setQuotientCells(initQuotientCells());
    setActivePosition(0);
    setCurrentStep(0);
    setFeedback(null);
    setAllDone(false);
    setRevealedSubsteps([]);
  }, [task.operand1, task.operand2]);

  useEffect(() => {
    if (activePosition >= 0) setTimeout(() => inputRef.current?.focus(), 100);
  }, [activePosition]);

  const handleDigitInput = useCallback(async (digit: string) => {
    if (allDone || isChecking || activePosition < 0) return;
    if (!/^[0-9]$/.test(digit)) return;

    const cellIdx = quotientCells.findIndex(c => c.position === activePosition);
    if (cellIdx < 0) return;

    const newCells = [...quotientCells];
    newCells[cellIdx] = { ...newCells[cellIdx], value: digit };
    setQuotientCells(newCells);

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
          setQuotientCells([...newCells]);
          setFeedback({ msg: data.feedback, ok: data.correct });

          if (data.correct) {
            onStepComplete(true);
            // Odkryj podkrok (odejmowanie) dla tej cyfry
            setRevealedSubsteps(prev => [...prev, activePosition]);

            const nextPos = activePosition + 1;
            if (nextPos < quotientStr.length) {
              setActivePosition(nextPos);
              setCurrentStep(currentStep + 1);
              newCells[nextPos] = { ...newCells[nextPos], status: 'active' };
              setQuotientCells([...newCells]);
            } else {
              setAllDone(true);
              onTaskComplete(true);
            }
          } else {
            onStepComplete(false);
            setTimeout(() => {
              newCells[cellIdx] = { ...newCells[cellIdx], value: '', status: 'active' };
              setQuotientCells([...newCells]);
              setFeedback(null);
            }, 1500);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsChecking(false);
      }
    } else {
      newCells[cellIdx] = { ...newCells[cellIdx], status: 'correct' };
      setQuotientCells([...newCells]);
      const nextPos = activePosition + 1;
      if (nextPos < quotientStr.length) {
        setActivePosition(nextPos);
        newCells[nextPos] = { ...newCells[nextPos], status: 'active' };
        setQuotientCells([...newCells]);
      } else {
        setAllDone(true);
        onTaskComplete(true);
      }
    }
  }, [activePosition, quotientCells, currentStep, task, mode, feedbackMode, allDone, isChecking]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') handleDigitInput(e.key);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDigitInput]);

  const cellW = 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16';
  const cellText = `text-2xl sm:text-3xl lg:text-4xl font-bold ${classes.font} ${theme === 'chalk' ? 'chalk-text text-chalk-text' : 'text-notebook-text'}`;
  const lineColor = theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text';

  const currentStepData = task.steps[currentStep];

  return (
    <div className="flex flex-col items-center w-full gap-6">
      {/* Ukryty input mobile */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onInput={e => {
          const val = (e.target as HTMLInputElement).value;
          const digit = val.replace(/\D/g, '').slice(-1);
          if (digit) { handleDigitInput(digit); (e.target as HTMLInputElement).value = ''; }
        }}
      />

      {/* Pytanie */}
      <p className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${classes.text} ${classes.font} text-center`}>
        {task.operand1} \u00F7 {task.operand2} = ?
      </p>

      {/* Opis kroku tutorial */}
      {mode === 'tutorial' && currentStepData && (
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${classes.card} p-4 w-full max-w-lg text-center`}
        >
          <p className={`text-base sm:text-lg ${classes.text}`}>{currentStepData.description}</p>
          {currentStepData.hint && (
            <p className={`text-sm mt-2 opacity-70 ${classes.text}`}>
              \u{1F4A1} {currentStepData.hint}
            </p>
          )}
        </motion.div>
      )}

      {/* SIATKA DZIELENIA */}
      <div
        className={`
          w-full p-8 sm:p-10 rounded-2xl
          ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex w-full">

          {/* LEWA STRONA: dzielna + podkroki */}
          <div className="flex flex-col">

            {/* Wiersz 1: cyfry dzielnej */}
            <div className="flex">
              {dividendStr.split('').map((d, i) => (
                <div key={i} className={`${cellW} flex items-center justify-center ${cellText}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Podkroki odejmowania — odkrywane po kolei */}
            {substeps.map((sub, si) => {
              const isRevealed = revealedSubsteps.includes(si) || mode === 'test';
              if (!isRevealed) return null;

              const currentStr  = String(sub.current_value);
              const productStr  = String(sub.product);
              const remainderStr = String(sub.remainder);
              // Wcięcie: si cyfr z lewej (bo bierzemy kolejne cyfry dzielnej)
              const indent = si;

              return (
                <motion.div
                  key={si}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col"
                >
                  {/* Aktualna reszta × 10 + kolejna cyfra */}
                  <div className="flex">
                    {Array(indent).fill(null).map((_, i) => (
                      <div key={i} className={cellW} />
                    ))}
                    {currentStr.split('').map((d, i) => (
                      <div key={i} className={`${cellW} flex items-center justify-center ${cellText}`}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Iloczyn (quotient_digit × divisor) do odjęcia */}
                  <div className="flex">
                    {Array(indent).fill(null).map((_, i) => (
                      <div key={i} className={cellW} />
                    ))}
                    {productStr.split('').map((d, i) => (
                      <div key={i} className={`${cellW} flex items-center justify-center ${cellText}`}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Linia odejmowania */}
                  <div className="flex">
                    {Array(indent).fill(null).map((_, i) => (
                      <div key={i} className={cellW} />
                    ))}
                    <div
                      className={`border-t-2 ${lineColor} my-1`}
                      style={{ width: `${currentStr.length * (56)}px` }}
                    />
                  </div>

                  {/* Reszta */}
                  {si < substeps.length - 1 && (
                    <div className="flex">
                      {Array(indent).fill(null).map((_, i) => (
                        <div key={i} className={cellW} />
                      ))}
                      {remainderStr === '0'
                        ? <div className={`${cellW} flex items-center justify-center ${cellText}`}>0</div>
                        : remainderStr.split('').map((d, i) => (
                            <div key={i} className={`${cellW} flex items-center justify-center ${cellText}`}>
                              {d}
                            </div>
                          ))
                      }
                    </div>
                  )}
                </motion.div>
              );
            })}

          </div>

          {/* PIONOWA KRESKA */}
          <div className={`border-l-2 mx-2 ${lineColor} self-stretch`} />

          {/* PRAWA STRONA: dzielnik + wynik */}
          <div className="flex flex-col">

            {/* Dzielnik */}
            <div className="flex">
              {divisorStr.split('').map((d, i) => (
                <div key={i} className={`${cellW} flex items-center justify-center ${cellText}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Pozioma kreska pod dzielnikiem */}
            <div className={`border-t-2 ${lineColor} my-1 w-full`} />

            {/* Cyfry wyniku (edytowalne) */}
            <div className="flex">
              {quotientCells.map((qc) => {
                const isActive = qc.position === activePosition && !allDone;
                return (
                  <motion.div
                    key={qc.position}
                    onClick={() => { setActivePosition(qc.position); inputRef.current?.focus(); }}
                    whileTap={{ scale: 0.9 }}
                    className={`
                      ${cellW} flex items-center justify-center
                      text-2xl sm:text-3xl lg:text-4xl font-bold rounded-lg cursor-pointer transition-all
                      ${classes.font}
                      ${qc.status === 'empty' && !isActive
                        ? `border-2 border-dashed ${theme === 'chalk' ? 'border-chalk-line' : 'border-notebook-line'}`
                        : ''}
                      ${isActive && qc.status !== 'correct'
                        ? `border-2 ${theme === 'chalk'
                            ? 'border-chalk-accent shadow-lg shadow-chalk-accent/40 bg-chalk-accent/10'
                            : 'border-notebook-text shadow-md bg-blue-50'}`
                        : ''}
                      ${qc.status === 'correct'
                        ? `border ${theme === 'chalk' ? 'border-chalk-success text-chalk-success' : 'border-green-400 text-green-600'}`
                        : ''}
                      ${qc.status === 'error'
                        ? `border-2 animate-shake ${theme === 'chalk'
                            ? 'border-chalk-error text-chalk-error bg-chalk-error/10'
                            : 'border-red-400 text-red-600 bg-red-50'}`
                        : ''}
                    `}
                  >
                    <AnimatePresence mode="wait">
                      {qc.value ? (
                        <motion.span
                          key={qc.value}
                          initial={{ scale: 0.3, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={theme === 'chalk' ? 'chalk-text' : ''}
                        >
                          {qc.value}
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
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`
              w-full max-w-lg p-4 rounded-xl text-center font-bold text-base sm:text-lg
              ${feedback.ok
                ? theme === 'chalk'
                  ? 'bg-chalk-success/20 text-chalk-success border border-chalk-success/40'
                  : 'bg-green-50 text-green-700 border border-green-200'
                : theme === 'chalk'
                  ? 'bg-chalk-error/20 text-chalk-error border border-chalk-error/40'
                  : 'bg-red-50 text-red-700 border border-red-200'
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

## Krok 3 — Podłącz DivisionDisplay w ArithmeticDisplay.tsx

W `frontend/src/components/ArithmeticDisplay.tsx` dodaj na górze:

```typescript
import { DivisionDisplay } from './DivisionDisplay';
```

Na POCZĄTKU funkcji `ArithmeticDisplay`, przed całym JSX, dodaj:

```typescript
// Dzielenie ma osobny układ — oddeleguj do DivisionDisplay
if (task.operation === 'division') {
  return (
    <DivisionDisplay
      task={task}
      mode={mode}
      onStepComplete={onStepComplete}
      onTaskComplete={onTaskComplete}
      feedbackMode={feedbackMode}
    />
  );
}
```

---

## Krok 4 — Weryfikacja curl

```bash
# Dzielenie
curl -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"division","max_digits1":3,"max_digits2":1}'
```

Sprawdź w JSON:
- `"symbol"` = `"÷"` (poprawny znak, nie krzaczek)
- `"division_steps"` zawiera podkroki z `current_value`, `product`, `remainder`
- `"question"` = np. `"126 ÷ 6 = ?"` bez krzaczków

---

## Checklist końcowa

Przetestuj wizualnie wszystkie 4 operacje:

**Dodawanie** `490 + 37`:
- [ ] Cyfry `4 9 0` i `0 3 7` wyrównane do prawej
- [ ] Przeniesienie `1` pojawia się nad kolumną dziesiątek po wpisaniu jedności
- [ ] Wynik `5 2 7` do wypełnienia

**Odejmowanie** `521 - 78`:
- [ ] Cyfry poprawnie wyrównane
- [ ] Pożyczanie zaznaczone (np. małe `1` w opisie kroku)

**Mnożenie** `873 × 69`:
- [ ] DWA wiersze cząstkowe: `7857` i `52380`
- [ ] Znak `×` wyświetla się poprawnie
- [ ] Wynik końcowy `60237`

**Dzielenie** `126 ÷ 6`:
- [ ] Dzielna `1 2 6` po lewej
- [ ] Pionowa kreska pośrodku
- [ ] Dzielnik `6` po prawej od kreski
- [ ] Cyfry wyniku `2 1` pod kreską po prawej — edytowalne
- [ ] Po wpisaniu `2` pojawia się odejmowanie `12 - 12 = 0` po lewej
- [ ] Znak `÷` wyświetla się poprawnie
