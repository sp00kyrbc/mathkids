# 15-layouts-final.md — Prawidłowe układy mnożenia i dzielenia (polska szkoła)

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Źródło: przykłady z podręcznika polskiej szkoły podstawowej.
## Ten plik definiuje DOKŁADNIE jak wyglądają oba działania i jak je zakodować.

---

# CZĘŚĆ 1 — MNOŻENIE

## Jak to wygląda (przykład: 467 × 37 = 17279)

```
       4  6  7       ← operand1, wyrównany do prawej
    ×     3  7       ← znak × + operand2, wyrównany do prawej
    ----------
    3  2  6  9       ← 467 × 7 = 3269  (cyfra jedności, shift=0)
 +1  4  0  1         ← 467 × 3 = 1401  (cyfra dziesiątek, shift=1 = jeden krok w lewo)
 ----------
 1  7  2  7  9       ← wynik końcowy
```

## Zasada generowania wierszy cząstkowych

Dla `op1 × op2` gdzie `op2` ma cyfry `d0` (jedności), `d1` (dziesiątki), `d2` (setki):
- partial[0] = op1 × d0, wyświetlony bez przesunięcia (shift=0)
- partial[1] = op1 × d1, wyświetlony przesunięty o 1 kolumnę w lewo (shift=1)
- partial[2] = op1 × d2, wyświetlony przesunięty o 2 kolumny w lewo (shift=2)

**Przesunięcie = cyfra przesunięta w lewo, NIE dopisywanie zer.**
Prawa cyfra partial[i] stoi w kolumnie `shift` (licząc od prawej, 0=jedności).

## Znak `+`
- `+` pojawia się TYLKO przed ostatnim wierszem cząstkowym
- Dla mnożnika jednocyfrowego — brak znaku `+` (tylko jedna linia cząstkowa → od razu wynik)
- Dla mnożnika dwucyfrowego — `+` przed drugim (ostatnim) wierszem cząstkowym
- Dla mnożnika trzycyfrowego — `+` przed trzecim (ostatnim) wierszem cząstkowym

## Linie poziome
- Jedna kreska po operandach (przed wierszami cząstkowymi)
- Druga kreska po ostatnim wierszu cząstkowym (przed wynikiem końcowym)
- Dla mnożnika jednocyfrowego: tylko JEDNA kreska (bo brak drugiej sumy)

## Przykłady z obrazków

### 467 × 37 = 17279
```
col:  0  1  2  3  4  5
         4  6  7          ← op1 (cols 1-3)
      ×     3  7          ← symbol + op2 (cols 2-3)
      -----------
         3  2  6  9       ← 467×7=3269 (cols 1-4, shift=0)
      +1  4  0  1         ← 467×3=1401 (cols 0-3, shift=1)
      -----------
      1  7  2  7  9       ← wynik (cols 0-4)
```

### 5321 × 129 = 686409
```
         5  3  2  1       ← op1
      ×     1  2  9       ← op2
      -----------
      4  7  8  8  9       ← 5321×9=47889 (shift=0)
      1  0  6  4  2       ← 5321×2=10642 (shift=1)
   +5  3  2  1            ← 5321×1=5321  (shift=2)
   -----------
   6  8  6  4  0  9       ← wynik
```

---

## Implementacja: zmień funkcję `buildInputQueue()` w `ArithmeticDisplay.tsx`

### Krok A — Popraw jak Python zwraca partials

W `backend/src/python/arithmetic_engine.py` upewnij się że `_compute_multiplication_steps` zwraca:

```python
def _compute_multiplication_steps(a: int, b: int):
    b_str = str(b)
    digits = [int(c) for c in reversed(b_str)]  # od jedności do najstarszej
    partials = []
    steps = []
    step_id = 0

    for shift, digit in enumerate(digits):
        partial_value = a * digit
        partial_str = str(partial_value)

        partials.append({
            "value": partial_value,
            "shift": shift,
            "digit_used": digit,
        })

        # Kroki dla tego wiersza cząstkowego (od prawej do lewej)
        partial_digits = list(reversed(str(partial_value)))
        for col, d in enumerate(partial_digits):
            steps.append(Step(
                step_id=step_id,
                position="partial",
                row=shift,            # który wiersz cząstkowy (0=jedności, 1=dziesiątki)
                column=col,           # kolumna w WIERSZU CZĄSTKOWYM (0=jedności tego wiersza)
                result_digit=int(d),
                description=f"{a} \u00D7 {digit} = {partial_value}. Cyfra na pozycji {col}: {d}.",
                hint=f"Ile to {a} \u00D7 {digit}?",
                carry=0,
                input_digits=[a, digit],
            ))
            step_id += 1

    # Kroki dla wyniku końcowego
    result = a * b
    for col, d in enumerate(reversed(str(result))):
        steps.append(Step(
            step_id=step_id,
            position="result",
            row=None,
            column=col,
            result_digit=int(d),
            description=f"Dodaj wyniki cząstkowe. Cyfra wyniku na pozycji {col}: {d}.",
            hint="Dodaj kolumnę pionowo.",
            carry=0,
            input_digits=[],
        ))
        step_id += 1

    return steps, partials
```

### Krok B — Nowy `renderRow` dla partial w `ArithmeticDisplay.tsx`

Zastąp całą sekcję renderowania siatki tym kodem (wewnątrz `return`):

```typescript
{/* SIATKA */}
<div
  className={`inline-flex flex-col p-6 sm:p-8 rounded-2xl cursor-pointer ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}`}
  onClick={() => inputRef.current?.focus()}
>

  {/* Wiersz carry (przeniesienia) — tylko dodawanie */}
  {task.operation === 'addition' && Object.keys(carries).length > 0 && (
    <div className="flex">
      <div className={CELL} /> {/* placeholder symbol */}
      {row_op1.map((_, i) => {
        const colFromRight = gridCols - 1 - i;
        return (
          <div key={i} className={`${CELL} text-xs font-bold ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-500'}`}>
            <AnimatePresence>
              {carries[colFromRight] && (
                <motion.span initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
                  {carries[colFromRight]}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  )}

  {/* Operand 1 */}
  <div className="flex">
    <div className={CELL} />
    {row_op1.map((d, i) => (
      <div key={i} className={d ? DIGIT : CELL}>{d}</div>
    ))}
  </div>

  {/* Operand 2 + symbol */}
  <div className="flex">
    <div className={`${CELL} text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent'}`}>
      {symbol}
    </div>
    {row_op2.map((d, i) => (
      <div key={i} className={d ? DIGIT : CELL}>{d}</div>
    ))}
  </div>

  {/* Kreska 1 */}
  <div className={`border-t-2 ${theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text'} my-1`} />

  {/* Wiersze cząstkowe — mnożenie */}
  {isMultiply && (task.partials || []).map((partial, pi) => {
    const isLast = pi === (task.partials || []).length - 1;
    const hasMultiple = (task.partials || []).length > 1;
    // Wartość wiersza cząstkowego jako string cyfr
    const pval = String(partial.value);
    // Buduj wiersz: gridCols+1 komórek (0=symbol/plus, 1..gridCols=cyfry)
    // Partial jest wyrównany tak że jego PRAWA cyfra jest w kolumnie (gridCols - shift)
    // czyli: prawa cyfra partial → kolumna (gridCols - 1 - shift) od lewej (w 0-indexed 1..gridCols)
    const pDigits = pval.split('');
    // rightmost digit of partial goes to gridCol index: (gridCols - 1 - partial.shift)
    // so digit at position j from right goes to: (gridCols - 1 - partial.shift - j) from left (0-indexed in 1..gridCols)
    const rowCells: (string | null)[] = Array(gridCols).fill(null);
    for (let j = 0; j < pDigits.length; j++) {
      const colFromLeft = (gridCols - 1 - partial.shift) - (pDigits.length - 1 - j);
      if (colFromLeft >= 0 && colFromLeft < gridCols) {
        rowCells[colFromLeft] = pDigits[j];
      }
    }

    return (
      <div key={pi} className="flex items-center">
        {/* Symbol + lub puste */}
        <div className={`${CELL} text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent'}`}>
          {hasMultiple && isLast ? '+' : ''}
        </div>
        {rowCells.map((d, col) => {
          if (d === null) return <div key={col} className={CELL} />;
          // Znajdź komórkę input dla tej pozycji
          const inputCell = queue.find(c => c.row === 3 + pi && c.col === col);
          if (inputCell) return renderInputCell(inputCell, col);
          return <div key={col} className={DIGIT}>{d}</div>;
        })}
      </div>
    );
  })}

  {/* Kreska 2 — tylko gdy jest więcej niż 1 wiersz cząstkowy */}
  {isMultiply && (task.partials || []).length > 1 && (
    <div className={`border-t-2 ${theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text'} my-1`} />
  )}

  {/* Wiersz wyniku */}
  <div className="flex items-center">
    <div className={CELL} />
    {row_res.map((d, col) => {
      if (d === '') return <div key={col} className={CELL} />;
      const inputCell = queue.find(c =>
        c.row === (isMultiply ? 3 + (task.partials||[]).length + ((task.partials||[]).length > 1 ? 1 : 0) : 3)
        && c.col === col
      );
      if (inputCell) return renderInputCell(inputCell, col);
      return <div key={col} className={DIGIT}>{d}</div>;
    })}
  </div>

</div>
```

### Krok C — Dodaj `renderInputCell` helper

Przed `return` w komponencie dodaj tę funkcję:

```typescript
function renderInputCell(ic: InputCell, key: number) {
  const isActive = activeCell?.id === ic.id && !done;
  return (
    <motion.div
      key={ic.id}
      onClick={() => inputRef.current?.focus()}
      whileTap={{ scale: 0.9 }}
      className={`
        ${CELL} text-2xl sm:text-3xl font-bold rounded-lg cursor-pointer transition-all
        ${classes.font}
        ${ic.status === 'correct' ? (theme === 'chalk' ? 'text-chalk-success' : 'text-green-600') : ''}
        ${ic.status === 'error' ? `animate-shake ${theme === 'chalk' ? 'text-chalk-error' : 'text-red-500'}` : ''}
        ${(ic.status === 'empty' || ic.status === 'active') ? `border-2 ${
          isActive
            ? theme === 'chalk'
              ? 'border-chalk-accent bg-chalk-accent/10 shadow-lg'
              : 'border-blue-500 bg-blue-50 shadow-md'
            : `border-dashed ${theme === 'chalk' ? 'border-chalk-line' : 'border-gray-300'}`
        }` : ''}
      `}
    >
      <AnimatePresence mode="wait">
        {ic.inputValue ? (
          <motion.span key="v" initial={{ scale: 0.4 }} animate={{ scale: 1 }}>
            {ic.inputValue}
          </motion.span>
        ) : (
          <motion.span
            key="q"
            animate={isActive ? { opacity: [1, 0.2, 1] } : { opacity: 0.25 }}
            transition={isActive ? { repeat: Infinity, duration: 0.9 } : {}}
          >
            ?
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

---

# CZĘŚĆ 2 — DZIELENIE

## Jak to wygląda (przykład: 40139 ÷ 17 = 2361 r. 2)

```
  2  3  6  1           ← iloraz (wynik), pisany NAD dzielną
4  0  1  3  9  :  1  7  ← dzielna : dzielnik
-  3  4                 ← 2×17=34, odjęte pod pierwszymi cyframi dzielnej
   ------
      6  1              ← reszta 6, dociągnięta kolejna cyfra (1) = 61
   -  5  1              ← 3×17=51
      ---
      1  0  3           ← reszta 10, dociągnięta kolejna cyfra (3) = 103
   -  1  0  2           ← 6×17=102
      -----
            1  9        ← reszta 1, dociągnięta kolejna cyfra (9) = 19
         -  1  7        ← 1×17=17
            --
               2        ← końcowa reszta
```

## Zasada układu

1. Pierwsza linia: iloraz pisany NAD dzielną (wyrównany prawą stroną)
2. Druga linia: `dzielna : dzielnik`
3. Dla każdej cyfry ilorazu:
   - Weź tyle cyfr dzielnej ile potrzeba (current_value)
   - Napisz iloczyn `q × dzielnik` pod current_value z minusem
   - Narysuj linię
   - Napisz resztę
   - Dociągnij kolejną cyfrę dzielnej (schodzi do dołu)
4. Każdy kolejny krok jest wcięty o 1 pozycję w prawo

## Implementacja `DivisionDisplay.tsx` — przepisz od zera

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types/task';
import { useTheme } from '../hooks/useTheme';

const API = import.meta.env.VITE_API_URL;

interface Props {
  task: Task;
  mode: 'tutorial' | 'practice' | 'test';
  onStepComplete: (correct: boolean) => void;
  onTaskComplete: (allCorrect: boolean) => void;
  feedbackMode?: 'immediate' | 'after';
}

export function DivisionDisplay({ task, mode, onStepComplete, onTaskComplete, feedbackMode = 'immediate' }: Props) {
  const { theme, classes } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const dividendStr = String(task.operand1);
  const divisorStr  = String(task.operand2);
  const quotientStr = String(task.result);
  const substeps    = task.division_steps || [];

  // Stan: cyfry ilorazu do wpisania
  const [quotientInputs, setQuotientInputs] = useState<{
    pos: number; value: string; status: 'empty'|'active'|'correct'|'error';
  }[]>(() => quotientStr.split('').map((_, i) => ({
    pos: i, value: '', status: i === 0 ? 'active' : 'empty'
  })));

  const [currentPos, setCurrentPos]   = useState(0);
  const [revealed, setRevealed]       = useState<number[]>([]);
  const [feedback, setFeedback]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [isChecking, setIsChecking]   = useState(false);
  const [done, setDone]               = useState(false);

  useEffect(() => {
    setQuotientInputs(quotientStr.split('').map((_, i) => ({
      pos: i, value: '', status: i === 0 ? 'active' : 'empty'
    })));
    setCurrentPos(0);
    setRevealed([]);
    setFeedback(null);
    setDone(false);
  }, [task.operand1, task.operand2]);

  useEffect(() => {
    if (!done) setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentPos]);

  const handleDigit = useCallback(async (digit: string) => {
    if (done || isChecking) return;

    const step = task.steps[currentPos];
    const newInputs = [...quotientInputs];
    newInputs[currentPos] = { ...newInputs[currentPos], value: digit };
    setQuotientInputs(newInputs);

    if (mode !== 'test' && feedbackMode === 'immediate') {
      setIsChecking(true);
      try {
        let correct = false;
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
          correct = data.correct;
          setFeedback({ msg: data.feedback, ok: data.correct });
        } else {
          correct = digit === quotientStr[currentPos];
          setFeedback({ msg: correct ? 'Brawo! \u2713' : 'Nie, sp\u00f3buj jeszcze raz!', ok: correct });
        }

        newInputs[currentPos] = { ...newInputs[currentPos], status: correct ? 'correct' : 'error' };
        setQuotientInputs([...newInputs]);
        onStepComplete(correct);

        if (correct) {
          setRevealed(prev => [...prev, currentPos]);
          const next = currentPos + 1;
          if (next >= quotientStr.length) {
            setDone(true);
            onTaskComplete(true);
          } else {
            newInputs[next] = { ...newInputs[next], status: 'active' };
            setQuotientInputs([...newInputs]);
            setCurrentPos(next);
          }
          setTimeout(() => setFeedback(null), 1200);
        } else {
          setTimeout(() => {
            setQuotientInputs(q => q.map((c, i) =>
              i === currentPos ? { ...c, value: '', status: 'active' } : c
            ));
            setFeedback(null);
          }, 1500);
        }
      } finally {
        setIsChecking(false);
      }
    } else {
      newInputs[currentPos] = { ...newInputs[currentPos], status: 'correct' };
      const next = currentPos + 1;
      if (next < quotientStr.length) newInputs[next] = { ...newInputs[next], status: 'active' };
      setQuotientInputs([...newInputs]);
      setRevealed(prev => [...prev, currentPos]);
      if (next >= quotientStr.length) { setDone(true); onTaskComplete(true); }
      else setCurrentPos(next);
    }
  }, [done, isChecking, currentPos, quotientInputs, task, mode, feedbackMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key >= '0' && e.key <= '9') handleDigit(e.key); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDigit]);

  // Szerokość komórki
  const CW = 48; // px — musi zgadzać się z klasą Tailwind poniżej
  const CELL = 'w-12 h-12 flex items-center justify-center';
  const DIGIT = `${CELL} text-2xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-text chalk-text' : 'text-notebook-text'}`;
  const lineColor = theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text';

  const currentStepData = task.steps[currentPos];

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        className="fixed opacity-0 w-0 h-0"
        onChange={e => {
          const d = e.target.value.replace(/\D/g,'').slice(-1);
          if (d) { handleDigit(d); e.target.value = ''; }
        }}
      />

      {/* Pytanie */}
      <p className={`text-3xl sm:text-4xl font-bold ${classes.text} ${classes.font} text-center`}>
        {task.operand1} \u00F7 {task.operand2} = ?
      </p>

      {/* Tutorial opis kroku */}
      {mode === 'tutorial' && currentStepData && (
        <motion.div key={currentPos} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
          className={`${classes.card} p-4 w-full max-w-lg text-center`}>
          <p className={`text-base sm:text-lg ${classes.text}`}>{currentStepData.description}</p>
          {currentStepData.hint && <p className={`text-sm mt-1 opacity-60 ${classes.text}`}>{currentStepData.hint}</p>}
        </motion.div>
      )}

      {/* SIATKA DZIELENIA */}
      <div
        className={`inline-flex flex-col p-6 sm:p-8 rounded-2xl cursor-pointer ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}`}
        onClick={() => inputRef.current?.focus()}
      >

        {/* Wiersz 0: iloraz NAD dzielną */}
        {/* Iloraz wyrównany prawą stroną nad dzielną (bez kolumn dzielnika i ":") */}
        <div className="flex">
          {/* Puste miejsca wyrównujące — tyle kolumn co dzielna, iloraz wyrównany do prawej */}
          {dividendStr.split('').map((_, i) => {
            // Iloraz ma quotientStr.length cyfr, wyrównany do prawej nad dzielną
            const qStart = dividendStr.length - quotientStr.length;
            const qi = i - qStart;
            const qCell = qi >= 0 && qi < quotientStr.length ? quotientInputs[qi] : null;

            if (!qCell) return <div key={i} className={CELL} />;

            const isActive = qCell.pos === currentPos && !done;
            return (
              <motion.div key={i} onClick={() => inputRef.current?.focus()} whileTap={{ scale: 0.9 }}
                className={`
                  ${CELL} text-2xl font-bold rounded-lg cursor-pointer transition-all ${classes.font}
                  ${qCell.status === 'correct' ? (theme==='chalk'?'text-chalk-success':'text-green-600') : ''}
                  ${qCell.status === 'error' ? `animate-shake ${theme==='chalk'?'text-chalk-error':'text-red-500'}` : ''}
                  ${(qCell.status==='empty'||qCell.status==='active') ? `border-2 ${isActive
                    ? theme==='chalk'?'border-chalk-accent bg-chalk-accent/10 shadow-lg':'border-blue-500 bg-blue-50 shadow-md'
                    : `border-dashed ${theme==='chalk'?'border-chalk-line':'border-gray-300'}`
                  }` : ''}
                `}
              >
                <AnimatePresence mode="wait">
                  {qCell.value ? (
                    <motion.span key="v" initial={{scale:0.4}} animate={{scale:1}}>{qCell.value}</motion.span>
                  ) : (
                    <motion.span key="q"
                      animate={isActive?{opacity:[1,0.2,1]}:{opacity:0.3}}
                      transition={isActive?{repeat:Infinity,duration:0.9}:{}}
                    >?</motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Wiersz 1: dzielna : dzielnik */}
        <div className="flex items-center">
          {dividendStr.split('').map((d, i) => (
            <div key={i} className={DIGIT}>{d}</div>
          ))}
          <div className={`${CELL} text-xl font-bold ${classes.font} ${theme==='chalk'?'text-chalk-text':'text-notebook-text'}`}>:</div>
          {divisorStr.split('').map((d, i) => (
            <div key={i} className={DIGIT}>{d}</div>
          ))}
        </div>

        {/* Podkroki odejmowania */}
        {substeps.map((sub, si) => {
          const isRevealedStep = revealed.includes(si) || mode === 'test';
          if (!isRevealedStep && si > 0) return null;
          // Wcięcie: si cyfr z lewej
          const indent = si;
          const currentStr = String(sub.current_value);
          const productStr  = String(sub.product);
          const remainderStr = String(sub.remainder);
          const lineWidth = Math.max(currentStr.length, productStr.length);

          return (
            <motion.div key={si} initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} className="flex flex-col">
              {/* Iloczyn do odjęcia */}
              <div className="flex">
                {Array(indent).fill(null).map((_,i)=><div key={i} className={CELL}/>)}
                <div className={`${CELL} text-xl font-bold ${theme==='chalk'?'text-chalk-text':'text-notebook-text'}`}>-</div>
                {productStr.split('').map((d,i)=><div key={i} className={DIGIT}>{d}</div>)}
              </div>
              {/* Kreska */}
              <div className="flex">
                {Array(indent).fill(null).map((_,i)=><div key={i} className={CELL}/>)}
                <div className={CELL}/>{/* placeholder na minus */}
                <div className={`border-t-2 ${lineColor} my-1`} style={{width:`${lineWidth * CW}px`}}/>
              </div>
              {/* Reszta (+ dociągnięta cyfra) — pokazuj tylko jeśli nie ostatni krok */}
              {si < substeps.length - 1 && isRevealedStep && (
                <div className="flex">
                  {Array(indent + 1).fill(null).map((_,i)=><div key={i} className={CELL}/>)}
                  {/* Następny current_value to reszta + dociągnięta cyfra */}
                  {String(substeps[si+1].current_value).split('').map((d,i)=>(
                    <div key={i} className={DIGIT}>{d}</div>
                  ))}
                </div>
              )}
              {/* Ostatni krok: pokaż końcową resztę */}
              {si === substeps.length - 1 && isRevealedStep && remainderStr !== '0' && (
                <div className="flex">
                  {Array(indent + 1).fill(null).map((_,i)=><div key={i} className={CELL}/>)}
                  {remainderStr.split('').map((d,i)=>(
                    <div key={i} className={DIGIT}>{d}</div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className={`w-full max-w-lg p-4 rounded-xl text-center font-bold text-base sm:text-lg
              ${feedback.ok
                ? theme==='chalk'?'bg-chalk-success/20 text-chalk-success border border-chalk-success/30':'bg-green-50 text-green-700 border border-green-200'
                : theme==='chalk'?'bg-chalk-error/20 text-chalk-error border border-chalk-error/30':'bg-red-50 text-red-700 border border-red-200'
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

# CZĘŚĆ 3 — Weryfikacja

## Mnożenie: sprawdź te przypadki

### 467 × 37 = 17279
Oczekiwany układ:
```
     4 6 7
   ×   3 7
   -------
   3 2 6 9     ← 467×7, kratki edytowalne
+1 4 0 1       ← 467×3=1401, przesunięty o 1 w lewo, kratki edytowalne
-----------
1 7 2 7 9      ← kratki edytowalne
```

### 128 × 47 = 6016
```
     1 2 8
   ·   4 7
   -------
     8 9 6     ← 128×7
+  5 1 2       ← 128×4=512, shift=1
   -------
   6 0 1 6
```

## Dzielenie: sprawdź ten przypadek

### 40139 ÷ 17 = 2361 r.2
Oczekiwany układ:
```
  2 3 6 1          ← iloraz nad dzielną
4 0 1 3 9 : 1 7    ← dzielna : dzielnik
- 3 4              ← 2×17
  ----
    6 1            ← 61 (reszta 6 + cyfra 1)
  - 5 1            ← 3×17
    ---
    1 0 3          ← 103
  - 1 0 2          ← 6×17
    -----
          1 9      ← 19
        - 1 7      ← 1×17
          --
            2      ← reszta końcowa
```

## Checklist

- [ ] Mnożenie jednocyfrowe: 1 wiersz cząstkowy, 1 kreska, wynik
- [ ] Mnożenie dwucyfrowe: 2 wiersze cząstkowe, `+` przy ostatnim, 2 kreski, wynik
- [ ] Mnożenie trzycyfrowe: 3 wiersze cząstkowe, `+` przy ostatnim, 2 kreski, wynik
- [ ] Przesunięcie: partial[1] przesuwa się o 1 w lewo (nie dodaje zera!)
- [ ] Dzielenie: iloraz NAD dzielną, format `dzielna : dzielnik`
- [ ] Dzielenie: po wpisaniu cyfry ilorazu pojawia się odejmowanie
- [ ] Żadnych krzaczków w znakach ×, ÷, −
- [ ] Siatka na środku ekranu (nie przy krawędzi)
- [ ] Input działa — można wpisywać cyfry
