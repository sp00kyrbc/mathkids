# 24-division-posrednie.md — Dzielenie: liczby pośrednie do wpisania

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Co jest potrzebne

Dla `252 ÷ 7 = 36` dziecko musi wpisać:

```
        3  6          ← cyfry ilorazu (edytowalne)
  2  5  2  :  7
  -  2  1             ← iloczyn 3×7=21 (edytowalny)
     ────
        4  2          ← reszta 4, dociągnięta cyfra 2 → 42 (PODANE)
     -  4  2          ← iloczyn 6×7=42 (edytowalny)
        ────
           0          ← reszta końcowa (podana)
```

## Kolejność wpisywania (kolumna po kolumnie):

```
krok 1: wpisz 3  (pierwsza cyfra ilorazu)
krok 2: wpisz 2  (dziesiątki iloczynu 3×7=21)
krok 3: wpisz 1  (jedności iloczynu 3×7=21)
krok 4: wpisz 6  (druga cyfra ilorazu)
krok 5: wpisz 4  (dziesiątki iloczynu 6×7=42)
krok 6: wpisz 2  (jedności iloczynu 6×7=42)
```

---

## Krok 1 — Rozszerz `_compute_division_steps` w Python

```python
def _compute_division_steps(dividend: int, divisor: int):
    dividend_str = str(dividend)
    steps = []
    substeps = []
    step_id = 0
    current = 0
    quotient_digits = []

    for i, digit_char in enumerate(dividend_str):
        current = current * 10 + int(digit_char)

        if current < divisor and i < len(dividend_str) - 1:
            quotient_digits.append(0)
            continue

        q_digit = current // divisor
        product = q_digit * divisor
        remainder = current - product
        quotient_digits.append(q_digit)

        desc = (
            f"Biore {current}. "
            f"{current} : {divisor} = {q_digit} "
            f"(bo {q_digit} x {divisor} = {product}). "
            f"Reszta: {remainder}."
        )

        # Krok 1: cyfra ilorazu
        steps.append(Step(
            step_id=step_id,
            position="result",
            row=None,
            column=len(quotient_digits) - 1,
            result_digit=q_digit,
            description=desc,
            hint=f"Ile razy {divisor} miesci sie w {current}?",
            carry=0,
            input_digits=[current, divisor],
        ))
        step_id += 1

        # Kroki 2+: cyfry iloczynu (product) od lewej do prawej
        product_str = str(product).zfill(len(str(current)))
        for pi, pd in enumerate(product_str):
            steps.append(Step(
                step_id=step_id,
                position="product",
                row=len(quotient_digits) - 1,   # który krok dzielenia
                column=pi,                        # pozycja cyfry w produkcie
                result_digit=int(pd),
                description=f"{q_digit} x {divisor} = {product}. Cyfra: {pd}.",
                hint=f"Ile to {q_digit} x {divisor}?",
                carry=0,
                input_digits=[q_digit, divisor],
            ))
            step_id += 1

        substeps.append({
            "current_value": current,
            "quotient_digit": q_digit,
            "product": product,
            "remainder": remainder,
            "product_digits": len(product_str),
            "indent": i - len(str(current)) + 1,  # wcięcie w gridzie
        })

        current = remainder

    return steps, substeps
```

---

## Krok 2 — Przepisz `DivisionDisplay.tsx`

Zastąp cały plik:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types/task';
import { useTheme } from '../hooks/useTheme';
import { operationSymbol } from '../utils/symbols';

const API = import.meta.env.VITE_API_URL;

interface Props {
  task: Task;
  mode: 'tutorial' | 'practice' | 'test';
  onStepComplete: (correct: boolean) => void;
  onTaskComplete: (allCorrect: boolean) => void;
  feedbackMode?: 'immediate' | 'after';
}

interface DivCell {
  id: string;
  type: 'quotient' | 'product';
  stepIndex: number;   // indeks w task.steps
  expected: string;
  entered: string;
  status: 'empty' | 'active' | 'correct' | 'error';
  stepId: number | null;
}

export function DivisionDisplay({ task, mode, onStepComplete, onTaskComplete, feedbackMode = 'immediate' }: Props) {
  const { theme, classes } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const dividendStr = String(task.operand1);
  const divisorStr  = String(task.operand2);
  const quotientStr = String(task.result);
  const substeps    = task.division_steps || [];

  // Buduj kolejkę wszystkich pól do wpisania
  function buildQueue(): DivCell[] {
    const q: DivCell[] = [];
    task.steps.forEach((s, idx) => {
      q.push({
        id: `step-${idx}`,
        type: s.position === 'result' ? 'quotient' : 'product',
        stepIndex: idx,
        expected: String(s.result_digit),
        entered: '',
        status: 'empty',
        stepId: s.step_id,
      });
    });
    if (q.length > 0) q[0].status = 'active';
    return q;
  }

  const [queue, setQueue]       = useState<DivCell[]>(buildQueue);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [done, setDone]         = useState(false);

  // Które substepy już odkryte (po wpisaniu cyfry ilorazu)
  const [revealedSubsteps, setRevealedSubsteps] = useState<number[]>([]);

  useEffect(() => {
    const q = buildQueue();
    setQueue(q);
    setCurrentIdx(0);
    setFeedback(null);
    setDone(false);
    setRevealedSubsteps([]);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [task.operand1, task.operand2]);

  useEffect(() => {
    if (!done) setTimeout(() => inputRef.current?.focus(), 80);
  }, [currentIdx]);

  const activeCell = done ? null : queue[currentIdx];

  const handleDigit = useCallback(async (digit: string) => {
    if (done || isChecking || !activeCell) return;

    let correct = false;

    if (mode !== 'test' && feedbackMode === 'immediate') {
      setIsChecking(true);
      try {
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
        setFeedback({ msg: data.feedback, ok: correct });
      } catch {
        correct = digit === activeCell.expected;
        setFeedback({ msg: correct ? 'Dobrze!' : 'Sprobuj jeszcze raz!', ok: correct });
      } finally {
        setIsChecking(false);
      }
    } else {
      correct = digit === activeCell.expected;
    }

    const newQueue = queue.map((c, i) =>
      i === currentIdx ? { ...c, entered: digit, status: correct ? 'correct' as const : 'error' as const } : c
    );
    setQueue(newQueue);
    onStepComplete(correct);

    if (correct) {
      // Jeśli to była cyfra ilorazu — odkryj substep (pokaże iloczyn do wypełnienia)
      if (activeCell.type === 'quotient') {
        const step = task.steps[activeCell.stepIndex];
        if (step) setRevealedSubsteps(prev => [...prev, step.column ?? 0]);
      }

      const next = currentIdx + 1;
      if (next >= newQueue.length) {
        setDone(true);
        onTaskComplete(true);
      } else {
        setQueue(newQueue.map((c, i) => i === next ? { ...c, status: 'active' as const } : c));
        setCurrentIdx(next);
      }
      setTimeout(() => setFeedback(null), 900);
    } else {
      setTimeout(() => {
        setQueue(q => q.map((c, i) => i === currentIdx ? { ...c, entered: '', status: 'active' as const } : c));
        setFeedback(null);
      }, 1400);
    }
  }, [done, isChecking, activeCell, currentIdx, queue, task, mode, feedbackMode]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key >= '0' && e.key <= '9') handleDigit(e.key); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleDigit]);

  // Style
  const CS = 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16';
  const FS = 'text-2xl sm:text-3xl lg:text-4xl';
  const givenCell = `${CS} flex items-center justify-center ${FS} font-bold rounded
    ${classes.font}
    ${theme === 'chalk'
      ? 'text-chalk-text chalk-text border border-chalk-text/30 bg-chalk-text/5'
      : 'text-notebook-text border border-notebook-text/25 bg-black/5'}`;
  const emptySlot = `${CS} flex items-center justify-center`;
  const lineC = theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text';

  function renderInput(cell: DivCell) {
    const isActive = activeCell?.id === cell.id;
    return (
      <motion.div
        key={cell.id}
        onClick={() => inputRef.current?.focus()}
        whileTap={{ scale: 0.88 }}
        className={`
          ${CS} flex items-center justify-center ${FS} font-bold rounded cursor-pointer transition-all
          ${classes.font}
          ${cell.status === 'correct' ? (theme === 'chalk' ? 'border border-chalk-success text-chalk-success bg-chalk-success/10' : 'border border-green-400 text-green-600 bg-green-50') : ''}
          ${cell.status === 'error' ? `animate-shake border-2 ${theme === 'chalk' ? 'border-chalk-error text-chalk-error bg-chalk-error/10' : 'border-red-400 text-red-600 bg-red-50'}` : ''}
          ${cell.status === 'empty' ? `border-2 border-dashed ${theme === 'chalk' ? 'border-chalk-text/40' : 'border-gray-400'}` : ''}
          ${cell.status === 'active' ? `border-2 ${theme === 'chalk' ? 'border-chalk-accent bg-chalk-accent/15 shadow-lg shadow-chalk-accent/30' : 'border-blue-500 bg-blue-50 shadow-md'}` : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {cell.entered
            ? <motion.span key="v" initial={{ scale: 0.3 }} animate={{ scale: 1 }}>{cell.entered}</motion.span>
            : <motion.span key="q"
                animate={isActive ? { opacity: [0.9, 0.2, 0.9] } : { opacity: 0.3 }}
                transition={isActive ? { repeat: Infinity, duration: 0.85 } : {}}
              >?</motion.span>
          }
        </AnimatePresence>
      </motion.div>
    );
  }

  // Znajdź komórkę queue po typie i parametrach
  function getQuotientCell(pos: number): DivCell | undefined {
    return queue.find(c => c.type === 'quotient' && task.steps[c.stepIndex]?.column === pos);
  }

  function getProductCell(substepIdx: number, colInProduct: number): DivCell | undefined {
    return queue.find(c =>
      c.type === 'product' &&
      task.steps[c.stepIndex]?.row === substepIdx &&
      task.steps[c.stepIndex]?.column === colInProduct
    );
  }

  const currentStepData = activeCell ? task.steps[activeCell.stepIndex] : null;

  // Oblicz max szerokość gridu (dla wyrównania)
  const gridW = Math.max(
    dividendStr.length,
    ...substeps.map((s, i) => i + String(s.product).length)
  );

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        className="fixed opacity-0 w-0 h-0 pointer-events-none"
        onChange={e => {
          const d = e.target.value.replace(/\D/g, '').slice(-1);
          if (d) { handleDigit(d); e.target.value = ''; }
        }}
      />

      {/* Pytanie */}
      <p className={`text-3xl sm:text-4xl font-bold ${classes.text} ${classes.font} text-center`}>
        {task.operand1} {operationSymbol(task.operation)} {task.operand2} = ?
      </p>

      {/* Tutorial */}
      {mode === 'tutorial' && currentStepData && (
        <motion.div key={currentIdx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className={`${classes.card} p-4 w-full max-w-lg text-center`}>
          <p className={`text-base sm:text-lg ${classes.text}`}>{currentStepData.description}</p>
          {currentStepData.hint && <p className={`text-sm mt-1 opacity-60 ${classes.text}`}>{currentStepData.hint}</p>}
        </motion.div>
      )}

      {/* SIATKA */}
      <div
        className={`inline-flex flex-col p-6 sm:p-8 lg:p-10 rounded-2xl cursor-pointer gap-0 ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}`}
        onClick={() => inputRef.current?.focus()}
      >

        {/* Wiersz ilorazu — nad dzielną, wyrównany do prawej */}
        <div className="flex">
          {dividendStr.split('').map((_, i) => {
            // Iloraz wyrównany do prawej nad dzielną
            const qStart = dividendStr.length - quotientStr.length;
            const qi = i - qStart;
            if (qi < 0) return <div key={i} className={emptySlot} />;
            const qcell = getQuotientCell(qi);
            if (!qcell) return <div key={i} className={emptySlot} />;
            return renderInput(qcell);
          })}
        </div>

        {/* Wiersz dzielna : dzielnik */}
        <div className="flex items-center">
          {dividendStr.split('').map((d, i) => (
            <div key={i} className={givenCell}>{d}</div>
          ))}
          <div className={`${emptySlot} text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-text' : 'text-notebook-text'}`}>:</div>
          {divisorStr.split('').map((d, i) => (
            <div key={i} className={givenCell}>{d}</div>
          ))}
        </div>

        {/* Substepy */}
        {substeps.map((sub, si) => {
          const isRevealed = revealedSubsteps.includes(si) || mode === 'test';
          if (!isRevealed) return null;

          const productStr = String(sub.product).padStart(String(sub.current_value).length, '0');
          const currentStr = String(sub.current_value);

          // Wcięcie: ile kolumn z lewej
          const indent = sub.indent ?? si;

          return (
            <motion.div key={si} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">

              {/* Iloczyn do odjęcia */}
              <div className="flex">
                {/* Minus */}
                <div className={`${emptySlot} text-2xl font-bold ${theme === 'chalk' ? 'text-chalk-text' : 'text-notebook-text'}`}>−</div>
                {/* Wcięcie */}
                {Array(indent).fill(null).map((_, i) => <div key={i} className={emptySlot} />)}
                {/* Cyfry iloczynu — edytowalne */}
                {productStr.split('').map((d, pi) => {
                  const pcell = getProductCell(si, pi);
                  if (pcell) return renderInput(pcell);
                  return <div key={pi} className={givenCell}>{d}</div>;
                })}
              </div>

              {/* Kreska */}
              <div className="flex">
                <div className={emptySlot} /> {/* placeholder na minus */}
                {Array(indent).fill(null).map((_, i) => <div key={i} className={emptySlot} />)}
                <div
                  className={`border-t-2 ${lineC} my-1`}
                  style={{ width: `${currentStr.length * 56}px` }}
                />
              </div>

              {/* Reszta / następny current_value */}
              {si < substeps.length - 1 && (
                <div className="flex">
                  <div className={emptySlot} />
                  {Array(indent).fill(null).map((_, i) => <div key={i} className={emptySlot} />)}
                  {String(substeps[si + 1].current_value).split('').map((d, i) => (
                    <div key={i} className={givenCell}>{d}</div>
                  ))}
                </div>
              )}

              {/* Ostatni krok — reszta końcowa */}
              {si === substeps.length - 1 && (
                <div className="flex">
                  <div className={emptySlot} />
                  {Array(indent + (currentStr.length - 1)).fill(null).map((_, i) => <div key={i} className={emptySlot} />)}
                  <div className={givenCell}>{sub.remainder}</div>
                </div>
              )}

            </motion.div>
          );
        })}

      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`w-full max-w-lg p-4 rounded-xl text-center font-bold text-base sm:text-lg
              ${feedback.ok
                ? theme === 'chalk' ? 'bg-chalk-success/20 text-chalk-success border border-chalk-success/30' : 'bg-green-50 text-green-700 border border-green-200'
                : theme === 'chalk' ? 'bg-chalk-error/20 text-chalk-error border border-chalk-error/30' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Checklist

**`252 ÷ 7 = 36`** — kolejność kroków:
- [ ] krok 1: wpisz `3` (iloraz, `25÷7=3`)
- [ ] krok 2: wpisz `2` (dziesiątki iloczynu `3×7=21`)
- [ ] krok 3: wpisz `1` (jedności iloczynu `21`)
- [ ] → pojawia się `42` (reszta 4 + cyfra 2, podane)
- [ ] krok 4: wpisz `6` (iloraz, `42÷7=6`)
- [ ] krok 5: wpisz `4` (dziesiątki iloczynu `6×7=42`)
- [ ] krok 6: wpisz `2` (jedności iloczynu `42`)
- [ ] → pojawia się reszta `0`

**`689 ÷ 53 = 13`**:
- [ ] krok 1: wpisz `1` (iloraz, `68÷53=1`)
- [ ] krok 2-3: wpisz `5`, `3` (iloczyn `1×53=53`)
- [ ] → pojawia się `159`
- [ ] krok 4: wpisz `3` (iloraz, `159÷53=3`)
- [ ] krok 5-7: wpisz `1`, `5`, `9` (iloczyn `3×53=159`)
- [ ] → pojawia się reszta `0`
