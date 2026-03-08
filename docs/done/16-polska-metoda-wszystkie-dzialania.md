# 16-polska-metoda-wszystkie-dzialania.md

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## ZASADA NADRZĘDNA
Wszystkie działania muszą być realizowane POLSKĄ METODĄ szkolną (klasy 4-8).
Ten plik jest jedynym źródłem prawdy. Pliki 10-15 traktuj jako kontekst, nie jako instrukcje.

---

# METODA 1 — DODAWANIE

## Układ (przykład: 490 + 37 = 527)

```
        [1]           ← wiersz przeniesień — małe cyfry, edytowalne przez dziecko
     4  9  0
  +     3  7
  ---------
     5  2  7          ← kratki edytowalne
```

## Zasady
- Przeniesienie pisane MAŁĄ cyfrą nad kolumną do której jest przenoszone
- Dziecko WPISUJE przeniesienie (nie pojawia się automatycznie)
- Kolejność kroków: od prawej do lewej
  1. Wpisz cyfrę jedności wyniku
  2. Jeśli jest przeniesienie → wpisz je małą cyfrą nad kolumną dziesiątek
  3. Wpisz cyfrę dziesiątek wyniku
  4. Jeśli jest przeniesienie → wpisz je małą cyfrą nad kolumną setek
  5. itd.

---

# METODA 2 — ODEJMOWANIE

## Układ (przykład: 521 - 78 = 443)

```
  5  2̶  1           ← operand1, przekreślone cyfry gdy pożyczamy (CSS line-through)
-    7  8
---------
  4  4  3            ← kratki edytowalne
```

## Zasady (metoda pożyczania — jedyna używana w Polsce)
- Gdy cyfra górna < cyfra dolna → pożyczamy 1 z kolumny wyżej
- Pożyczona cyfra górna zwiększa się o 10 (pokazujemy małą „1" przed cyfrą)
- Cyfra z której pożyczyliśmy zmniejsza się o 1 (pokazujemy przekreślenie i małą cyfrę obok)
- Kolejność kroków: od prawej do lewej
  1. Oblicz cyfrę jedności (z ewentualnym pożyczeniem)
  2. Zaznacz pożyczenie wizualnie
  3. Oblicz cyfrę dziesiątek
  4. itd.

## Wizualizacja pożyczenia
Gdy dziecko sygnalizuje że pożycza (np. klika przycisk "pożycz"), pokaż:
- Małą cyfrę `1` przed aktualną cyfrą górną (w aktywnej kolumnie): np. `¹1` oznacza 11
- Małą przekreśloną cyfrę obok cyfry z której pożyczono: `5̶4` → `4`

---

# METODA 3 — MNOŻENIE

## Układ (przykład: 323 × 26 = 8398)

```
              3  2  3       ← operand1
           ×     2  6       ← symbol × + operand2
           ---------
   [1][ ][ ][ ]             ← wiersz przeniesień dla 323×6 (małe, edytowalne)
        1  9  3  8          ← 323×6=1938  (kratki edytowalne, shift=0)
   [ ][1][ ][ ]             ← wiersz przeniesień dla 323×2 (OSOBNY rząd, edytowalne)
     +  6  4  6             ← 323×2=646   (kratki edytowalne, shift=1 = przesuń o 1 w lewo)
     -----------
        8  3  9  8          ← wynik końcowy (kratki edytowalne)
```

## Zasady
1. Mnożymy przez KAŻDĄ cyfrę mnożnika osobno, od prawej do lewej
2. Każdy wiersz cząstkowy ma **własny** wiersz przeniesień bezpośrednio NAD sobą
3. Przeniesienie dla danego wiersza cząstkowego to wynik `carry` z mnożenia tej cyfry
4. Shift = numer cyfry mnożnika (0=jedności, 1=dziesiątki, 2=setki) — przesuwa wiersz w lewo
5. Przesunięcie = pozycjonowanie kolumnowe, NIE dopisywanie zer
6. `+` pojawia się tylko przed OSTATNIM wierszem cząstkowym (gdy jest ich więcej niż 1)
7. Dla mnożnika jednocyfrowego: brak `+`, jedna kreska, bezpośredni wynik
8. Kolejność kroków dla każdego wiersza cząstkowego:
   - Od prawej do lewej: pomnóż cyfrę, wpisz wynik, wpisz przeniesienie nad następną kolumną
9. Na końcu: wypełnij wiersz wyniku końcowego (suma cząstkowych)

## Przykład kroków dla 323 × 6:
```
krok 1: 3×6=18 → wpisz 8 w jedności,  wpisz 1 (przeniesienie) nad dziesiątkami
krok 2: 2×6=12 + 1(przeniesienie)=13 → wpisz 3 w dziesiątkach, wpisz 1 nad setkami
krok 3: 3×6=18 + 1(przeniesienie)=19 → wpisz 9 w setkach, wpisz 1 nad tysiącami
krok 4: wpisz 1 w tysiącach (reszta przeniesienia)
wynik wiersza: 1938
```

---

# METODA 4 — DZIELENIE

## Układ (przykład: 40139 ÷ 17 = 2361 r. 2)

```
  2  3  6  1               ← iloraz NAD dzielną (wyrównany do prawej)
4  0  1  3  9  :  1  7     ← dzielna : dzielnik  (dwukropek, nie pionowa kreska)
-  3  4                    ← 2×17=34
   ────────
      6  1                 ← reszta 6, dociągnięta cyfra 1 → 61
   -  5  1                 ← 3×17=51
      ────
      1  0  3              ← reszta 10, dociągnięta cyfra 3 → 103
   -  1  0  2              ← 6×17=102
         ────
            1  9           ← reszta 1, dociągnięta cyfra 9 → 19
         -  1  7           ← 1×17=17
            ──
               2           ← reszta końcowa
```

## Zasady
1. Iloraz pisany NAD dzielną, wyrównany do prawej krawędzi dzielnej
2. Format `dzielna : dzielnik` (dwukropek jak w polskiej szkole)
3. Każdy podkrok (dla każdej cyfry ilorazu):
   - Weź tyle cyfr dzielnej ile potrzeba żeby było >= dzielnik (current_value)
   - Dziecko wpisuje cyfrę ilorazu
   - Po wpisaniu pojawia się: iloczyn `q × dzielnik` z minusem, kreska, reszta
   - Reszta + następna cyfra dzielnej = nowe current_value dla następnego kroku
4. Ostatni krok: pokaż resztę końcową (może być 0)
5. Wcięcie: każdy kolejny podkrok jest wcięty o 1 kolumnę w prawo

---

# IMPLEMENTACJA

## Krok 1 — Python backend

### `_generate_addition` — dodaj pole `symbol`:
```python
"symbol": "+",
"question": f"{a} + {b} = ?",
```

### `_generate_subtraction`:
```python
"symbol": "\u2212",
"question": f"{a} \u2212 {b} = ?",
```

### `_compute_multiplication_steps` — przepisz:
```python
def _compute_multiplication_steps(a: int, b: int):
    b_str = str(b)
    b_digits = [int(c) for c in reversed(b_str)]  # jedności pierwsze
    a_str = str(a)
    a_digits_rev = [int(c) for c in reversed(a_str)]

    partials = []
    all_steps = []
    step_id = 0

    for shift, digit_b in enumerate(b_digits):
        partial_value = a * digit_b

        # Oblicz przeniesienia wiersza cząstkowego
        carry = 0
        carries_for_row = {}
        for col, digit_a in enumerate(a_digits_rev):
            product = digit_a * digit_b + carry
            carry = product // 10
            if carry > 0:
                carries_for_row[col + 1] = carry

        partials.append({
            "value": partial_value,
            "shift": shift,
            "digit_used": digit_b,
            "carries": carries_for_row,
        })

        # Kroki przeniesień (carry) — dziecko je wpisuje
        for col_fr, carry_val in sorted(carries_for_row.items()):
            all_steps.append(Step(
                step_id=step_id,
                position="carry",
                row=shift,
                column=col_fr,
                result_digit=carry_val,
                description=f"Przenoszę {carry_val} do nast\u0119pnej kolumny (wiersz {shift+1}).",
                hint=f"Ile przenoszę?",
                carry=carry_val,
                input_digits=[digit_b],
            ))
            step_id += 1

        # Kroki cyfr wyniku cząstkowego (od prawej)
        for col, d in enumerate(reversed(str(partial_value))):
            all_steps.append(Step(
                step_id=step_id,
                position="partial",
                row=shift,
                column=col,
                result_digit=int(d),
                description=f"Mnożę: {a_str[-(col+1)] if col < len(a_str) else 0} \u00D7 {digit_b}. Cyfra: {d}.",
                hint=f"Ile to {digit_b} \u00D7 ... ?",
                carry=0,
                input_digits=[digit_b],
            ))
            step_id += 1

    # Wynik końcowy
    result = a * b
    for col, d in enumerate(reversed(str(result))):
        all_steps.append(Step(
            step_id=step_id,
            position="result",
            row=None,
            column=col,
            result_digit=int(d),
            description=f"Dodaj wyniki cz\u0105stkowe. Cyfra wyniku: {d}.",
            hint="Dodaj kolumn\u0119 pionowo.",
            carry=0,
            input_digits=[],
        ))
        step_id += 1

    return all_steps, partials
```

### `_generate_multiplication` — upewnij się że zwraca `partials` i `symbol`:
```python
"symbol": "\u00D7",
"question": f"{a} \u00D7 {b} = ?",
"partials": partials,
```

### `_generate_division` — upewnij się że zwraca `symbol` i `division_steps`:
```python
"symbol": "\u00F7",
"question": f"{dividend} \u00F7 {divisor} = ?",
"division_steps": substeps,
```

Sprawdź curl po zmianach:
```bash
curl -s -X POST http://localhost:3001/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"operation":"multiplication","max_digits1":3,"max_digits2":2}' | python3 -m json.tool
```
Muszą być pola: `symbol`, `partials` (tablica z `carries`), `steps` (z `position: "carry"` i `position: "partial"`).

---

## Krok 2 — Frontend: `ArithmeticDisplay.tsx` — kompletny plik

Zastąp cały plik `frontend/src/components/ArithmeticDisplay.tsx`:

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

// Jedna komórka do wpisania
interface Cell {
  id: string;
  type: 'carry' | 'partial' | 'result';
  row: number;        // dla carry/partial: indeks wiersza cząstkowego; dla result: 99
  col: number;        // kolumna od lewej w gridzie (0..gridCols-1)
  expected: string;   // oczekiwana cyfra
  entered: string;    // wpisana cyfra
  status: 'empty' | 'active' | 'correct' | 'error';
  stepId: number | null;
}

export function ArithmeticDisplay({ task, mode, onStepComplete, onTaskComplete, feedbackMode = 'immediate' }: Props) {
  const { theme, classes } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  if (task.operation === 'division') {
    return <DivisionDisplay task={task} mode={mode} onStepComplete={onStepComplete} onTaskComplete={onTaskComplete} feedbackMode={feedbackMode} />;
  }

  const isMultiply = task.operation === 'multiplication';
  const isAdd      = task.operation === 'addition';

  const op1str  = String(task.operand1);
  const op2str  = String(task.operand2);
  const resstr  = String(task.result);
  const partials = task.partials || [];

  // Oblicz szerokość siatki
  const allLens = [op1str.length, op2str.length, resstr.length];
  if (isMultiply) partials.forEach(p => allLens.push(String(p.value).length + p.shift));
  const gridCols = Math.max(...allLens);

  // Wyrównaj string do gridCols (puste = '')
  function ra(s: string): string[] {
    const out = Array(gridCols).fill('');
    s.split('').forEach((d, i) => { out[gridCols - s.length + i] = d; });
    return out;
  }

  const row_op1 = ra(op1str);
  const row_op2 = ra(op2str);
  const row_res = ra(resstr);

  // Dla każdego partial: tablica komórek wyrównana do gridu
  // partial[pi].value = np. 1938, shift=0 → rightmost digit at col (gridCols-1)
  // partial[pi].value = np. 646,  shift=1 → rightmost digit at col (gridCols-2)
  const partial_rows: string[][] = partials.map(p => {
    const pstr = String(p.value);
    const out = Array(gridCols).fill('');
    // rightmost digit of pstr goes to gridCols-1-p.shift
    const rightCol = gridCols - 1 - p.shift;
    pstr.split('').forEach((d, i) => {
      const col = rightCol - (pstr.length - 1 - i);
      if (col >= 0 && col < gridCols) out[col] = d;
    });
    return out;
  });

  // Dla każdego partial: tablica przeniesień (carry) wyrównana do gridu
  // carries[pi][col] = cyfra przeniesienia nad kolumną col
  const carry_rows: (string | null)[][] = partials.map(p => {
    const out: (string | null)[] = Array(gridCols).fill(null);
    if (p.carries) {
      Object.entries(p.carries).forEach(([colFR, val]) => {
        // colFR = col from right (0=jedności) w ramach WIERSZA CZĄSTKOWEGO
        // w gridzie: col = gridCols - 1 - p.shift - Number(colFR)
        const col = gridCols - 1 - p.shift - Number(colFR);
        if (col >= 0 && col < gridCols) out[col] = String(val);
      });
    }
    return out;
  });

  // Przeniesienia dla dodawania
  const add_carry_row: (string | null)[] = Array(gridCols).fill(null);
  if (isAdd) {
    task.steps.filter(s => s.position === 'carry').forEach(s => {
      const col = gridCols - 1 - s.column;
      if (col >= 0 && col < gridCols) add_carry_row[col] = String(s.result_digit);
    });
  }

  // ── Buduj kolejkę komórek do wypełnienia ─────────────────────────────────

  function buildQueue(): Cell[] {
    const q: Cell[] = [];

    if (isMultiply) {
      partials.forEach((p, pi) => {
        // 1. Najpierw komórki CARRY dla tego wiersza (od prawej do lewej)
        if (p.carries) {
          const carryEntries = Object.entries(p.carries)
            .map(([colFR, val]) => ({ colFR: Number(colFR), val: String(val) }))
            .sort((a, b) => a.colFR - b.colFR); // od najmniejszego (rightmost)

          carryEntries.forEach(({ colFR, val }) => {
            const col = gridCols - 1 - p.shift - colFR;
            if (col < 0 || col >= gridCols) return;
            const step = task.steps.find(s => s.position === 'carry' && s.row === pi && s.column === colFR);
            q.push({
              id: `carry-${pi}-${col}`,
              type: 'carry',
              row: pi,
              col,
              expected: val,
              entered: '',
              status: 'empty',
              stepId: step?.step_id ?? null,
            });
          });
        }

        // 2. Cyfry wyniku cząstkowego (od prawej do lewej)
        const pstr = String(p.value);
        const rightCol = gridCols - 1 - p.shift;
        for (let j = pstr.length - 1; j >= 0; j--) {
          const col = rightCol - (pstr.length - 1 - j);
          if (col < 0 || col >= gridCols) continue;
          const colFR = pstr.length - 1 - j;
          const step = task.steps.find(s => s.position === 'partial' && s.row === pi && s.column === colFR);
          q.push({
            id: `partial-${pi}-${col}`,
            type: 'partial',
            row: pi,
            col,
            expected: pstr[j],
            entered: '',
            status: 'empty',
            stepId: step?.step_id ?? null,
          });
        }
      });

      // 3. Wynik końcowy (od prawej do lewej)
      for (let i = gridCols - 1; i >= 0; i--) {
        if (!row_res[i]) continue;
        const colFR = gridCols - 1 - i;
        const step = task.steps.find(s => s.position === 'result' && s.column === colFR);
        q.push({
          id: `result-${i}`,
          type: 'result',
          row: 99,
          col: i,
          expected: row_res[i],
          entered: '',
          status: 'empty',
          stepId: step?.step_id ?? null,
        });
      }
    } else {
      // Dodawanie / odejmowanie — przeniesienia i wynik
      // Interleave: dla każdej kolumny od prawej: cyfra wyniku, potem ewentualne przeniesienie
      for (let i = gridCols - 1; i >= 0; i--) {
        if (!row_res[i]) continue;
        const colFR = gridCols - 1 - i;
        const resultStep = task.steps.find(s => s.position === 'result' && s.column === colFR);
        q.push({
          id: `result-${i}`,
          type: 'result',
          row: 99,
          col: i,
          expected: row_res[i],
          entered: '',
          status: 'empty',
          stepId: resultStep?.step_id ?? null,
        });
        // Przeniesienie do następnej kolumny (carry)
        if (isAdd && add_carry_row[i - 1] !== null && i > 0) {
          const carryStep = task.steps.find(s => s.position === 'carry' && s.column === colFR + 1);
          q.push({
            id: `carry-add-${i-1}`,
            type: 'carry',
            row: 0,
            col: i - 1,
            expected: add_carry_row[i - 1]!,
            entered: '',
            status: 'empty',
            stepId: carryStep?.step_id ?? null,
          });
        }
      }
    }

    // Aktywuj pierwszą
    if (q.length > 0) q[0].status = 'active';
    return q;
  }

  const [queue, setQueue] = useState<Cell[]>(buildQueue);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const q = buildQueue();
    setQueue(q);
    setCurrentIdx(0);
    setFeedback(null);
    setIsChecking(false);
    setDone(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [task.operand1, task.operand2, task.operation]);

  useEffect(() => {
    if (!done) setTimeout(() => inputRef.current?.focus(), 80);
  }, [currentIdx]);

  const activeCell = done ? null : queue[currentIdx];

  const handleDigit = useCallback(async (digit: string) => {
    if (done || isChecking || !activeCell) return;

    let correct = false;

    if (mode !== 'test' && feedbackMode === 'immediate' && activeCell.stepId !== null) {
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
        setFeedback({ msg: data.feedback, ok: data.correct });
      } finally {
        setIsChecking(false);
      }
    } else {
      correct = digit === activeCell.expected;
      if (mode !== 'test') setFeedback({ msg: correct ? 'Brawo! \u2713' : 'Nie, spr\u00f3buj jeszcze raz!', ok: correct });
    }

    const newQueue = queue.map((c, i) =>
      i === currentIdx ? { ...c, entered: digit, status: correct ? 'correct' as const : 'error' as const } : c
    );
    setQueue(newQueue);
    onStepComplete(correct);

    if (correct) {
      const next = currentIdx + 1;
      if (next >= newQueue.length) {
        setDone(true);
        onTaskComplete(true);
      } else {
        const q2 = newQueue.map((c, i) => i === next ? { ...c, status: 'active' as const } : c);
        setQueue(q2);
        setCurrentIdx(next);
      }
      setTimeout(() => setFeedback(null), 1000);
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

  // ── Style ──────────────────────────────────────────────────────────────
  const CELL_SIZE = 'w-11 h-11 sm:w-13 sm:h-13';
  const DIGIT_CLS = `${CELL_SIZE} flex items-center justify-center text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-text chalk-text' : 'text-notebook-text'}`;
  const EMPTY_CLS = `${CELL_SIZE} flex items-center justify-center`;
  const LINE_CLS  = `border-t-2 my-1 ${theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text'}`;
  const SYM_CLS   = `${CELL_SIZE} flex items-center justify-center text-2xl sm:text-3xl font-bold ${classes.font} ${theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent'}`;

  function renderInputCell(cell: Cell) {
    const isActive = activeCell?.id === cell.id;
    const isCarry  = cell.type === 'carry';
    return (
      <motion.div
        key={cell.id}
        onClick={() => inputRef.current?.focus()}
        whileTap={{ scale: 0.88 }}
        className={`
          ${isCarry ? 'w-11 h-6 sm:w-13' : CELL_SIZE}
          flex items-center justify-center
          ${isCarry ? 'text-xs sm:text-sm' : 'text-2xl sm:text-3xl'}
          font-bold rounded cursor-pointer transition-all
          ${classes.font}
          ${cell.status === 'correct'
            ? theme === 'chalk' ? 'text-chalk-success' : 'text-green-600'
            : ''}
          ${cell.status === 'error'
            ? `animate-shake ${theme === 'chalk' ? 'text-chalk-error' : 'text-red-500'}`
            : ''}
          ${cell.status === 'empty' || cell.status === 'active'
            ? `border-2 ${isActive
                ? theme === 'chalk'
                  ? 'border-chalk-accent bg-chalk-accent/10 shadow-lg shadow-chalk-accent/30'
                  : 'border-blue-500 bg-blue-50 shadow-md'
                : `border-dashed ${theme === 'chalk' ? 'border-chalk-line' : 'border-gray-300'}`
              }`
            : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {cell.entered
            ? <motion.span key="v" initial={{ scale: 0.3 }} animate={{ scale: 1 }}>{cell.entered}</motion.span>
            : <motion.span key="q"
                animate={isActive ? { opacity: [1, 0.15, 1] } : { opacity: 0.25 }}
                transition={isActive ? { repeat: Infinity, duration: 0.85 } : {}}
              >?</motion.span>
          }
        </AnimatePresence>
      </motion.div>
    );
  }

  // Znajdź komórkę input dla danej pozycji
  function getInputCell(type: 'carry' | 'partial' | 'result', row: number, col: number): Cell | undefined {
    return queue.find(c => c.type === type && c.row === row && c.col === col);
  }

  function getAddCarryCell(col: number): Cell | undefined {
    return queue.find(c => c.type === 'carry' && c.row === 0 && c.col === col);
  }

  const SYMBOL: Record<string, string> = {
    addition: '+',
    subtraction: '\u2212',
    multiplication: '\u00D7',
    division: '\u00F7',
  };
  const symbol = SYMBOL[task.operation] || '+';
  const currentStepData = task.steps.find(s => s.step_id === activeCell?.stepId);

  // ── JSX ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center w-full gap-4">

      {/* Ukryty input */}
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
        {task.operand1} {symbol} {task.operand2} = ?
      </p>

      {/* Tutorial krok */}
      {mode === 'tutorial' && currentStepData && (
        <motion.div key={currentStepData.step_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className={`${classes.card} p-4 w-full max-w-lg text-center`}>
          <p className={`text-base sm:text-lg ${classes.text}`}>{currentStepData.description}</p>
          {currentStepData.hint && <p className={`text-sm mt-1 opacity-60 ${classes.text}`}>{currentStepData.hint}</p>}
        </motion.div>
      )}

      {/* SIATKA */}
      <div
        className={`inline-flex flex-col p-6 sm:p-8 rounded-2xl cursor-pointer ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}`}
        onClick={() => inputRef.current?.focus()}
      >

        {/* Wiersz przeniesień dodawania */}
        {isAdd && (
          <div className="flex">
            <div className={EMPTY_CLS} />
            {row_op1.map((_, i) => {
              const carryCell = getAddCarryCell(i);
              const hasCarry = add_carry_row[i] !== null;
              if (!hasCarry && !carryCell) return <div key={i} className="w-11 h-6 sm:w-13" />;
              if (carryCell) return renderInputCell(carryCell);
              return (
                <div key={i} className={`w-11 h-6 sm:w-13 flex items-center justify-center text-xs font-bold ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-500'}`}>
                  {add_carry_row[i]}
                </div>
              );
            })}
          </div>
        )}

        {/* Operand 1 */}
        <div className="flex">
          <div className={EMPTY_CLS} />
          {row_op1.map((d, i) => (
            <div key={i} className={d ? DIGIT_CLS : EMPTY_CLS}>{d}</div>
          ))}
        </div>

        {/* Operand 2 + symbol */}
        <div className="flex">
          <div className={SYM_CLS}>{symbol}</div>
          {row_op2.map((d, i) => (
            <div key={i} className={d ? DIGIT_CLS : EMPTY_CLS}>{d}</div>
          ))}
        </div>

        {/* Kreska 1 */}
        <div className={LINE_CLS} />

        {/* Wiersze cząstkowe mnożenia z własnymi przeniesieniami */}
        {isMultiply && partials.map((p, pi) => {
          const isLast = pi === partials.length - 1;
          const hasMultiple = partials.length > 1;

          return (
            <div key={pi} className="flex flex-col">

              {/* Wiersz przeniesień dla tego partial */}
              {p.carries && Object.keys(p.carries).length > 0 && (
                <div className="flex">
                  <div className={EMPTY_CLS} /> {/* placeholder symbol */}
                  {carry_rows[pi].map((c, col) => {
                    const carryCell = getInputCell('carry', pi, col);
                    if (carryCell) return renderInputCell(carryCell);
                    if (c !== null) {
                      return (
                        <div key={col} className={`w-11 h-6 sm:w-13 flex items-center justify-center text-xs font-bold ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-500'}`}>
                          {c}
                        </div>
                      );
                    }
                    return <div key={col} className="w-11 h-6 sm:w-13" />;
                  })}
                </div>
              )}

              {/* Wiersz cyfr cząstkowych */}
              <div className="flex">
                <div className={hasMultiple && isLast ? SYM_CLS : EMPTY_CLS}>
                  {hasMultiple && isLast ? '+' : ''}
                </div>
                {partial_rows[pi].map((d, col) => {
                  if (!d) return <div key={col} className={EMPTY_CLS} />;
                  const inputCell = getInputCell('partial', pi, col);
                  if (inputCell) return renderInputCell(inputCell);
                  return <div key={col} className={DIGIT_CLS}>{d}</div>;
                })}
              </div>

            </div>
          );
        })}

        {/* Kreska 2 (tylko mnożenie wielocyfrowe) */}
        {isMultiply && partials.length > 1 && <div className={LINE_CLS} />}

        {/* Wynik */}
        <div className="flex">
          <div className={EMPTY_CLS} />
          {row_res.map((d, col) => {
            if (!d) return <div key={col} className={EMPTY_CLS} />;
            const inputCell = getInputCell('result', 99, col);
            if (inputCell) return renderInputCell(inputCell);
            return <div key={col} className={DIGIT_CLS}>{d}</div>;
          })}
        </div>

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

## Krok 3 — `DivisionDisplay.tsx` — kompletny plik

Zastąp cały plik `frontend/src/components/DivisionDisplay.tsx` zawartością z pliku `13-fix-division.md` (sekcja "Krok 2").
Jedyna zmiana: upewnij się że w wierszu z dzielną używasz `:` (dwukropek) a NIE `|` (pionowa kreska):

```typescript
// STARY — usuń jeśli jest:
<div className="border-l-2 ...">

// NOWY — dwukropek jak w polskiej szkole:
<div className={`${CELL_SIZE} flex items-center justify-center text-2xl font-bold`}>:</div>
```

---

## Krok 4 — `npm run build`

```bash
cd frontend && npm run build
```

Zero błędów TypeScript.

---

## Checklist wizualna

### Dodawanie `490 + 37 = 527`
- [ ] Przeniesienie `1` — mała kratka edytowalna nad kolumną dziesiątek
- [ ] Kolejność: wpisz jedności wyniku → wpisz przeniesienie → wpisz dziesiątki → wpisz setki

### Mnożenie `323 × 26 = 8398`
- [ ] Wiersz carry nad `323×6=1938` — małe kratki edytowalne
- [ ] Wiersz `1938` — kratki edytowalne od prawej
- [ ] OSOBNY wiersz carry nad `323×2=646` — inne małe kratki
- [ ] Wiersz `646` przesunięty o 1 w lewo — kratki edytowalne
- [ ] `+` przed wierszem `646`
- [ ] Dwie kreski poziome
- [ ] Wynik `8398` — kratki edytowalne

### Mnożenie `128 × 47 = 6016`
- [ ] Dwa wiersze cząstkowe: `896` i `512` (przesunięty)
- [ ] Własne przeniesienia nad każdym

### Dzielenie `40139 ÷ 17 = 2361 r.2`
- [ ] Iloraz NAD dzielną
- [ ] Format `40139 : 17` (dwukropek)
- [ ] Po wpisaniu każdej cyfry ilorazu — pojawia się odejmowanie z resztą
