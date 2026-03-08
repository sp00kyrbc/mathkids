# 26-dzielenie-final-kolumny-przeniesienia.md

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Jak wygląda polska metoda dzielenia pisemnego

### Przykład: 338 ÷ 2 = 169

```
        1  6  9          ← iloraz NAD kreską, każda cyfra nad odpowiadającą cyfrą dzielnej
   ─────────────
   3  3  8  :  2         ← dzielna : dzielnik
-  2                     ← iloczyn 1×2=2, wyrównany do lewej bieżącej grupy
   ─────
   1  3                  ← reszta (1) + dociągnięta cyfra (3) = 13 [PODANE]
-  1  2                  ← iloczyn 6×2=12
   ─────
      1  8               ← reszta (1) + dociągnięta cyfra (8) = 18 [PODANE]
   -  1  8               ← iloczyn 9×2=18
      ─────
         0               ← reszta końcowa [PODANE]
```

### Przykład z pożyczaniem: 689 ÷ 53 = 13

```
        1  3             ← iloraz
   ──────────────
   6  8  9  :  5  3
-  5  3                  ← iloczyn 1×53=53
   ─────
   1  5  9               ← reszta 15 + dociągnięta 9 = 159 [PODANE]
   [1]                   ← przeniesienie przy odejmowaniu 159-159 (mała cyfra, edytowalna, UKRYTA na start)
-  1  5  9               ← iloczyn 3×53=159
   ─────
      0                  ← reszta 0 [PODANE]
```

### Przykład z pożyczaniem w odejmowaniu: 252 ÷ 7 = 36

```
        3  6             ← iloraz
   ──────────────
   2  5  2  :  7
   [2]                   ← przeniesienie (25-21 wymaga pożyczania) — UKRYTE na start
-  2  1                  ← iloczyn 3×7=21
   ─────
      4  2               ← reszta 4 + dociągnięta 2 = 42 [PODANE]
-     4  2               ← iloczyn 6×7=42
      ─────
         0               ← reszta 0 [PODANE]
```

---

## Zasady układu kolumnowego

### 1. Iloraz nad kreską
- Każda cyfra ilorazu stoi **dokładnie nad** cyfrą dzielnej którą właśnie dzieliliśmy
- Czyli nad ostatnią cyfrą grupy `current_value`

### 2. Iloczyn pod dzielną
- Iloczyn (q_digit × divisor) wyrównany **prawą krawędzią** do prawej krawędzi `current_value`
- Przed nim znak `−`

### 3. Przeniesienia przy odejmowaniu
- Małe kratki **NAD** iloczynem (nie nad dzielną!)
- Ukryte na start, pojawiają się gdy uczeń kliknie lub gdy kolejka do nich dojdzie
- Tej samej szerokości co kratki cyfr
- Pokazujemy tylko tam gdzie faktycznie jest pożyczanie (borrow_info z Pythona)

### 4. Reszta + dociągnięta cyfra
- Pojawia się animacją po wpisaniu ostatniej cyfry iloczynu
- To są cyfry PODANE (nie edytowalne)

---

## Krok 1 — Python: popraw `_compute_division_steps`

```python
def _compute_division_steps(dividend: int, divisor: int):
    dividend_str = str(dividend)
    steps = []
    substeps = []
    step_id = 0
    current = 0
    quotient_digits = []
    # Ślad pozycji w dzielnej (która cyfra była ostatnia w current)
    last_digit_pos = -1  # indeks w dividend_str

    for i, digit_char in enumerate(dividend_str):
        current = current * 10 + int(digit_char)

        if current < divisor and i < len(dividend_str) - 1:
            quotient_digits.append(0)
            last_digit_pos = i
            continue

        q_digit = current // divisor
        product = q_digit * divisor
        remainder = current - product
        quotient_digits.append(q_digit)

        # Pozycja w dzielnej gdzie stoi ta cyfra ilorazu
        quotient_col = i  # indeks licząc od lewej w dividend_str

        # Oblicz przeniesienia przy odejmowaniu current - product
        borrow_info = _compute_subtraction_borrows(current, product)

        # Krok: cyfra ilorazu
        steps.append(Step(
            step_id=step_id,
            position="result",
            row=None,
            column=len(quotient_digits) - 1,
            result_digit=q_digit,
            description=(
                f"Biore {current}. "
                f"Ile razy {divisor} miesci sie w {current}? "
                f"{q_digit} razy, bo {q_digit} x {divisor} = {product}."
            ),
            hint=f"Ile razy {divisor} miesci sie w {current}?",
            carry=0,
            input_digits=[current, divisor],
        ))
        step_id += 1

        # Kroki: cyfry iloczynu od lewej do prawej
        product_len = len(str(product)) if product > 0 else 1
        current_len = len(str(current))
        product_str_padded = str(product).zfill(current_len)

        for pi, pd in enumerate(product_str_padded):
            steps.append(Step(
                step_id=step_id,
                position="product",
                row=len(substeps),      # który substep (0, 1, 2...)
                column=pi,              # pozycja cyfry w product_str_padded
                result_digit=int(pd),
                description=f"{q_digit} x {divisor} = {product}. Zapisuje cyfre {pd}.",
                hint=f"Ile to {q_digit} x {divisor}?",
                carry=0,
                input_digits=[q_digit, divisor],
            ))
            step_id += 1

        substeps.append({
            "current_value": current,
            "current_len": current_len,
            "quotient_digit": q_digit,
            "quotient_col": quotient_col,   # pozycja w dividend_str (0-based od lewej)
            "product": product,
            "product_str": product_str_padded,
            "product_len": current_len,     # wyrównany do current_len
            "remainder": remainder,
            "borrow": borrow_info,
        })

        current = remainder
        last_digit_pos = i

    return steps, substeps


def _compute_subtraction_borrows(a: int, b: int) -> dict:
    """Pozyczanie przy odejmowaniu a - b. Zwraca {indeks_od_lewej: 1}."""
    a_str = str(a)
    b_str = str(b).zfill(len(a_str))
    n = len(a_str)
    borrows = {}
    borrow = 0
    for i in range(n - 1, -1, -1):
        da = int(a_str[i]) - borrow
        db = int(b_str[i])
        if da < db:
            borrows[i] = 1
            borrow = 1
        else:
            borrow = 0
    return borrows
```

---

## Krok 2 — Frontend: przepisz `DivisionDisplay.tsx`

Zastąp CAŁY plik:

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

interface DCell {
  id: string;
  type: 'quotient' | 'product';
  stepIdx: number;
  expected: string;
  entered: string;
  status: 'empty' | 'active' | 'correct' | 'error';
  stepId: number | null;
}

export function DivisionDisplay({
  task, mode, onStepComplete, onTaskComplete, feedbackMode = 'immediate'
}: Props) {
  const { theme, classes } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const dividendStr = String(task.operand1);
  const divisorStr  = String(task.operand2);
  const quotientStr = String(task.result);
  const substeps    = (task as any).division_steps as any[] || [];

  function buildQueue(): DCell[] {
    const q: DCell[] = [];
    task.steps.forEach((s: any, idx: number) => {
      q.push({
        id: `s${idx}`,
        type: s.position === 'result' ? 'quotient' : 'product',
        stepIdx: idx,
        expected: String(s.result_digit),
        entered: '',
        status: 'empty',
        stepId: s.step_id,
      });
    });
    if (q.length > 0) q[0].status = 'active';
    return q;
  }

  const [queue, setQueue]           = useState<DCell[]>(buildQueue);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [done, setDone]             = useState(false);
  // substepy których iloczyn został wpisany → pokaż resztę
  const [revealedRemainders, setRevealedRemainders] = useState<number[]>([]);
  // kratki przeniesień odblokowane przez kliknięcie
  const [unlockedBorrows, setUnlockedBorrows]       = useState<Set<string>>(new Set());

  useEffect(() => {
    setQueue(buildQueue());
    setCurrentIdx(0);
    setFeedback(null);
    setDone(false);
    setRevealedRemainders([]);
    setUnlockedBorrows(new Set());
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
        setFeedback({ msg: correct ? 'Dobrze!' : 'Nie, sprobuj jeszcze raz!', ok: correct });
      } finally {
        setIsChecking(false);
      }
    } else {
      correct = digit === activeCell.expected;
    }

    const newQueue = queue.map((c, i) =>
      i === currentIdx
        ? { ...c, entered: digit, status: correct ? 'correct' as const : 'error' as const }
        : c
    );
    setQueue(newQueue);
    onStepComplete(correct);

    if (correct) {
      // Sprawdź czy wpisano ostatnią cyfrę iloczynu → odkryj resztę
      const step = (task.steps as any[])[activeCell.stepIdx];
      if (step?.position === 'product') {
        const substepIdx = step.row ?? 0;
        const sub = substeps[substepIdx];
        if (sub && step.column === sub.product_len - 1) {
          setRevealedRemainders(prev => [...prev, substepIdx]);
        }
      }

      const next = currentIdx + 1;
      if (next >= newQueue.length) {
        setDone(true);
        onTaskComplete(true);
      } else {
        setQueue(newQueue.map((c, i) =>
          i === next ? { ...c, status: 'active' as const } : c
        ));
        setCurrentIdx(next);
      }
      setTimeout(() => setFeedback(null), 900);
    } else {
      setTimeout(() => {
        setQueue(q => q.map((c, i) =>
          i === currentIdx ? { ...c, entered: '', status: 'active' as const } : c
        ));
        setFeedback(null);
      }, 1400);
    }
  }, [done, isChecking, activeCell, currentIdx, queue, task, mode, feedbackMode, substeps]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleDigit]);

  // ── Style ─────────────────────────────────────────────────────────
  const CS  = 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16';  // pełna kratka
  const CSb = 'w-12 h-6 sm:w-14 sm:h-6 lg:w-16 lg:h-7';     // mała kratka przeniesień
  const FS  = 'text-2xl sm:text-3xl lg:text-4xl';
  const FSb = 'text-xs sm:text-sm';

  const lineCol = theme === 'chalk' ? 'border-chalk-text/70' : 'border-gray-600';
  const textCls = `${classes.font} ${theme === 'chalk' ? 'text-chalk-text chalk-text' : 'text-notebook-text'}`;

  const givenCls = `${CS} flex items-center justify-center ${FS} font-bold rounded
    ${textCls} border ${theme === 'chalk' ? 'border-chalk-text/30 bg-chalk-text/5' : 'border-gray-300 bg-black/5'}`;
  const emptyCls = `${CS} flex items-center justify-center flex-shrink-0`;
  const emptyBCls = `${CSb} flex-shrink-0`;

  function renderInput(cell: DCell, small = false) {
    const isActive = activeCell?.id === cell.id;
    const sz = small ? CSb : CS;
    const fs = small ? FSb : FS;
    return (
      <motion.div
        key={cell.id}
        onClick={() => inputRef.current?.focus()}
        whileTap={{ scale: 0.9 }}
        className={`
          ${sz} flex items-center justify-center ${fs} font-bold rounded cursor-pointer transition-all flex-shrink-0
          ${classes.font}
          ${cell.status === 'correct'
            ? theme === 'chalk' ? 'border border-chalk-success text-chalk-success bg-chalk-success/10' : 'border border-green-400 text-green-600 bg-green-50'
            : ''}
          ${cell.status === 'error'
            ? `animate-shake border-2 ${theme === 'chalk' ? 'border-chalk-error text-chalk-error bg-chalk-error/10' : 'border-red-400 text-red-600 bg-red-50'}`
            : ''}
          ${cell.status === 'empty'
            ? `border-2 border-dashed ${theme === 'chalk' ? 'border-chalk-text/40' : 'border-gray-400'}`
            : ''}
          ${cell.status === 'active'
            ? `border-2 ${theme === 'chalk' ? 'border-chalk-accent bg-chalk-accent/15 shadow-lg shadow-chalk-accent/30' : 'border-blue-500 bg-blue-50 shadow-md'}`
            : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {cell.entered
            ? <motion.span key="v" initial={{ scale: 0.4 }} animate={{ scale: 1 }}>{cell.entered}</motion.span>
            : <motion.span
                key="q"
                animate={isActive ? { opacity: [1, 0.2, 1] } : { opacity: 0.3 }}
                transition={isActive ? { repeat: Infinity, duration: 0.9 } : {}}
              >?</motion.span>
          }
        </AnimatePresence>
      </motion.div>
    );
  }

  function getQuotientCell(col: number) {
    return queue.find(c => c.type === 'quotient' && (task.steps as any[])[c.stepIdx]?.column === col);
  }

  function getProductCell(substepIdx: number, col: number) {
    return queue.find(c =>
      c.type === 'product' &&
      (task.steps as any[])[c.stepIdx]?.row === substepIdx &&
      (task.steps as any[])[c.stepIdx]?.column === col
    );
  }

  const quotientLen = quotientStr.length;
  const dividendLen = dividendStr.length;

  const currentStepData = activeCell ? (task.steps as any[])[activeCell.stepIdx] : null;

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
      <p className={`text-3xl sm:text-4xl font-bold text-center ${textCls}`}>
        {task.operand1} {operationSymbol(task.operation)} {task.operand2} = ?
      </p>

      {/* Tutorial hint */}
      {mode === 'tutorial' && currentStepData && (
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className={`${classes.card} p-4 w-full max-w-lg text-center`}
        >
          <p className={`text-base sm:text-lg ${textCls}`}>{currentStepData.description}</p>
          {currentStepData.hint && (
            <p className={`text-sm mt-1 opacity-60 ${textCls}`}>{currentStepData.hint}</p>
          )}
        </motion.div>
      )}

      {/* SIATKA */}
      <div
        className={`inline-flex flex-col p-6 sm:p-8 rounded-2xl cursor-pointer select-none
          ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}`}
        onClick={() => inputRef.current?.focus()}
      >

        {/* ── Wiersz ilorazu (nad kreską) ────────────────────── */}
        <div className="flex">
          {/* Puste miejsca na cyfry dzielnej które nie mają nad sobą cyfry ilorazu */}
          {Array.from({ length: dividendLen }).map((_, i) => {
            // Cyfra ilorazu stoi nad cyfrą dzielnej o indeksie:
            // dividendLen - quotientLen + qi  gdzie qi = 0,1,...
            const qi = i - (dividendLen - quotientLen);
            if (qi < 0) return <div key={i} className={emptyCls} />;
            const qcell = getQuotientCell(qi);
            if (!qcell) return <div key={i} className={emptyCls} />;
            return renderInput(qcell);
          })}
        </div>

        {/* ── Kreska nad dzielną ─────────────────────────────── */}
        <div className={`border-t-2 ${lineCol}`} />

        {/* ── Wiersz: dzielna : dzielnik ─────────────────────── */}
        <div className="flex items-center gap-0">
          {dividendStr.split('').map((d, i) => (
            <div key={i} className={givenCls}>{d}</div>
          ))}
          <div className={`${emptyCls} text-3xl font-bold ${textCls} px-1`}>:</div>
          {divisorStr.split('').map((d, i) => (
            <div key={i} className={givenCls}>{d}</div>
          ))}
        </div>

        {/* ── Substepy ──────────────────────────────────────────── */}
        {substeps.map((sub: any, si: number) => {
          const isRemainderRevealed = revealedRemainders.includes(si);

          // quotient_col = indeks ostatniej cyfry current w dividend_str
          // Wcięcie od lewej = quotient_col - current_len + 1
          const indent = sub.quotient_col - sub.current_len + 1;
          const productStr: string = sub.product_str;
          const productLen: number = sub.product_len;

          // Borrow: dict {index_od_lewej_w_product: 1}
          const borrow: Record<number, number> = sub.borrow || {};
          const hasBorrow = Object.keys(borrow).length > 0;

          return (
            <motion.div
              key={si}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
            >

              {/* Małe kratki przeniesień NAD iloczynem */}
              {hasBorrow && (
                <div className="flex">
                  {/* Placeholder na minus + wcięcie */}
                  <div className={emptyBCls} />
                  {Array(indent).fill(null).map((_, k) =>
                    <div key={k} className={emptyBCls} />
                  )}
                  {productStr.split('').map((_, pi) => {
                    const hasBorrowHere = borrow[pi] === 1;
                    const borrowKey = `${si}-${pi}`;
                    const isUnlocked = unlockedBorrows.has(borrowKey);

                    if (!hasBorrowHere) {
                      return <div key={pi} className={emptyBCls} />;
                    }

                    // Kratka przeniesienia — ukryta na start, klikalana
                    if (!isUnlocked) {
                      return (
                        <div
                          key={pi}
                          className={`${CSb} flex items-center justify-center cursor-pointer
                            rounded opacity-0 hover:opacity-40 transition-opacity`}
                          title="Kliknij aby zapisac przeniesienie"
                          onClick={e => {
                            e.stopPropagation();
                            setUnlockedBorrows(prev => new Set(prev).add(borrowKey));
                          }}
                        />
                      );
                    }

                    // Odblokowana — pokaż "1"
                    return (
                      <div
                        key={pi}
                        className={`${CSb} flex items-end justify-center pb-0.5 text-xs font-bold
                          ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-500'}`}
                      >
                        1
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Iloczyn z minusem */}
              <div className="flex items-center">
                {/* Minus */}
                <div className={`${emptyCls} text-2xl sm:text-3xl font-bold ${textCls}`}>−</div>
                {/* Wcięcie */}
                {Array(indent).fill(null).map((_, k) =>
                  <div key={k} className={emptyCls} />
                )}
                {/* Cyfry iloczynu — edytowalne */}
                {productStr.split('').map((d, pi) => {
                  const pcell = getProductCell(si, pi);
                  if (pcell) return renderInput(pcell);
                  return <div key={pi} className={givenCls}>{d}</div>;
                })}
              </div>

              {/* Kreska odejmowania */}
              <div className="flex">
                <div className={emptyCls} />
                {Array(indent).fill(null).map((_, k) =>
                  <div key={k} className={emptyCls} />
                )}
                <div
                  className={`border-t-2 ${lineCol} my-0.5 flex-shrink-0`}
                  style={{ width: `${productLen * 56}px` }}
                />
              </div>

              {/* Reszta + dociągnięta cyfra (PODANE) — pojawia się animacją */}
              <AnimatePresence>
                {isRemainderRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex"
                  >
                    <div className={emptyCls} />
                    {/* wcięcie = indeks ostatniej cyfry następnego current */}
                    {si < substeps.length - 1 ? (
                      <>
                        {/* Wcięcie dla następnego current */}
                        {Array(substeps[si + 1].quotient_col - substeps[si + 1].current_len + 1)
                          .fill(null).map((_, k) =>
                            <div key={k} className={emptyCls} />
                        )}
                        {String(substeps[si + 1].current_value).split('').map((d, k) => (
                          <div key={k} className={givenCls}>{d}</div>
                        ))}
                      </>
                    ) : (
                      <>
                        {/* Reszta końcowa — wcięcie do prawej */}
                        {Array(dividendLen - 1).fill(null).map((_, k) =>
                          <div key={k} className={emptyCls} />
                        )}
                        <div className={givenCls}>{sub.remainder}</div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          );
        })}

      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`w-full max-w-lg p-4 rounded-xl text-center font-bold text-base sm:text-lg
              ${feedback.ok
                ? theme === 'chalk' ? 'bg-chalk-success/20 text-chalk-success border border-chalk-success/30' : 'bg-green-50 text-green-700 border border-green-200'
                : theme === 'chalk' ? 'bg-chalk-error/20 text-chalk-error border border-chalk-error/30' : 'bg-red-50 text-red-700 border border-red-200'
              }`}
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

## Checklist

### 338 ÷ 2 = 169
```
      [1][6][9]
   ─────────────
   3  3  8  :  2
 − [2]              ← wpisz 2 (iloczyn 1×2)
   ─────
   1  3             ← pojawia się po wpisaniu "2"
 − [1][2]           ← wpisz 1, 2 (iloczyn 6×2=12)
   ─────
      1  8          ← pojawia się po wpisaniu "12"
 −    [1][8]        ← wpisz 1, 8 (iloczyn 9×2=18)
      ─────
         0          ← pojawia się na końcu
```
- [ ] Cyfry ilorazu stoją nad odpowiadającymi cyframi dzielnej
- [ ] Wcięcia iloczynu są poprawne (wyrównanie do prawej do current_value)
- [ ] Reszta pojawia się animacją po wpisaniu ostatniej cyfry iloczynu

### 252 ÷ 7 = 36
- [ ] Po kliknięciu w obszar przeniesień nad "21" — pojawia się mała kratka z "1"
- [ ] Kratki przeniesień są tej samej szerokości co kratki cyfr
- [ ] Bez kliknięcia — kratki przeniesień niewidoczne

### 689 ÷ 53 = 13
- [ ] Pierwszy current = 68 (nie 6!)
- [ ] Iloczyn 1×53=53 wyrównany do prawej pod "68"
- [ ] Reszta 15 + dociągnięta 9 = "159" pojawia się poprawnie
