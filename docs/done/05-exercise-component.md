# 05-exercise-component.md — Komponent Kratki / Tablicy (Serce Aplikacji)

## Kontekst
To najważniejszy komponent całej aplikacji — wizualizacja działania pisemnego.
Dziecko wpisuje cyfry w odpowiednie kratki, jak na kartce lub tablicy.

**Zasady**:
- Każda cyfra = jedna kratka (komórka siatki)
- Kratki są aktywne/nieaktywne/wypełnione/błędne/poprawne
- Podświetlana jest aktualnie aktywna komórka
- Cyfry "pojawiają się" z animacją (kredą lub atramentem)
- Na małych ekranach kratki muszą być czytelne (min. 40x40px)

---

## Utwórz: `frontend/src/types/task.ts`

```typescript
export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface TaskStep {
  step_id: number;
  description: string;
  column: number;
  input_digits: number[];
  result_digit: number;
  carry_in: number;
  carry_out: number;
  borrow: boolean;
  position: 'result' | 'carry' | 'partial' | 'remainder';
  row: number | null;
  hint: string;
}

export interface TaskLayout {
  type: 'vertical' | 'multiplication' | 'division';
  cols: number;
  operand1: string;
  operand2: string;
  result: string;
  symbol: string;
  max_len: number;
  carries?: Record<number, number>;
  borrows?: Record<number, boolean>;
  partials?: PartialResult[];
  substeps?: DivisionSubstep[];
}

export interface PartialResult {
  multiplier_digit: number;
  multiplier_position: number;
  shift: number;
  value: number;
  display: string;
}

export interface DivisionSubstep {
  position: number;
  current_value: number;
  quotient_digit: number;
  product: number;
  remainder: number;
}

export interface Task {
  operation: Operation;
  operand1: number;
  operand2: number;
  result: number;
  remainder: number;
  steps: TaskStep[];
  layout: TaskLayout;
  difficulty: number;
  symbol: string;
  question: string;
  partials?: PartialResult[];
  division_steps?: DivisionSubstep[];
}

// Stan komórki w siatce
export type CellState = 'empty' | 'given' | 'active' | 'filled-correct' | 'filled-error' | 'revealed';

export interface GridCell {
  id: string;            // np. "r2-c3"
  row: number;
  col: number;
  value: string;         // cyfra lub '' lub ' '
  state: CellState;
  editable: boolean;     // czy dziecko może tu wpisać
  stepId: number | null; // który krok zadania
}
```

---

## Utwórz: `frontend/src/utils/gridBuilder.ts`

```typescript
import { Task, GridCell, TaskLayout } from '../types/task';

/**
 * Buduje siatkę komórek dla działania pisemnego.
 * Różne layouty dla różnych operacji.
 */
export function buildGrid(task: Task): GridCell[][] {
  switch (task.layout.type) {
    case 'vertical': return buildVerticalGrid(task);
    case 'multiplication': return buildMultiplicationGrid(task);
    case 'division': return buildDivisionGrid(task);
    default: return buildVerticalGrid(task);
  }
}

function makeCell(
  row: number, col: number,
  value: string = '',
  editable: boolean = false,
  stepId: number | null = null
): GridCell {
  return {
    id: `r${row}-c${col}`,
    row, col, value,
    state: value !== '' ? 'given' : 'empty',
    editable,
    stepId,
  };
}

function makeEmpty(row: number, col: number): GridCell {
  return makeCell(row, col, '', false);
}

/**
 * Siatka dla dodawania i odejmowania:
 * 
 * Row 0: [przeniesienia / pożyczki]
 * Row 1: operand1 (cyfry)
 * Row 2: symbol + operand2 (cyfry)
 * Row 3: linia (separator — nie kratka, CSS)
 * Row 4: wynik (puste do wypełnienia)
 */
function buildVerticalGrid(task: Task): GridCell[][] {
  const { layout } = task;
  const maxLen = layout.max_len;
  const cols = maxLen + 1; // +1 na symbol operacji

  // 5 wierszy: carry/borrow, op1, op2, (linia), wynik
  const grid: GridCell[][] = Array(5).fill(null).map(() =>
    Array(cols).fill(null).map(() => makeEmpty(0, 0))
  );

  // Inicjalizacja poprawnie
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < cols; c++) {
      grid[r][c] = makeEmpty(r, c);
    }
  }

  // Wiersz 0: przeniesienia (puste, do wypełnienia przez dziecko przy carry-mode)
  // Zostawione puste — filled in during tutoring

  // Wiersz 1: operand1 (cyfry z prawego wyrównania)
  const op1 = layout.operand1.padStart(maxLen, ' ');
  for (let i = 0; i < maxLen; i++) {
    const c = i + 1; // col 0 = symbol
    const digit = op1[i];
    if (digit !== ' ') {
      grid[1][c] = makeCell(1, c, digit, false);
    }
  }

  // Wiersz 2: symbol + operand2
  grid[2][0] = makeCell(2, 0, layout.symbol, false);
  const op2 = layout.operand2.padStart(maxLen, ' ');
  for (let i = 0; i < maxLen; i++) {
    const c = i + 1;
    const digit = op2[i];
    if (digit !== ' ') {
      grid[2][c] = makeCell(2, c, digit, false);
    }
  }

  // Wiersz 3: marker linii (specjalny)
  grid[3][0] = makeCell(3, 0, '—', false);

  // Wiersz 4: wynik — puste komórki do wypełnienia
  const result = layout.result;
  for (let i = 0; i < maxLen; i++) {
    const c = i + 1;
    const colIndex = maxLen - 1 - i; // odwrotna kolejność: kolIndex 0 = jedności
    // Znajdź krok dla tej kolumny
    const step = task.steps.find(s => s.column === colIndex && s.position === 'result');
    grid[4][c] = makeCell(4, c, '', true, step?.step_id ?? null);
  }

  return grid;
}

/**
 * Siatka dla mnożenia:
 * Row 0: operand1
 * Row 1: symbol × + operand2
 * Row 2: linia
 * Row 3..N: wyniki cząstkowe (jeden na mnożnik-cyfrę)
 * Row N+1: linia sumy (jeśli > 1 wynik cząstkowy)
 * Row N+2: wynik końcowy
 */
function buildMultiplicationGrid(task: Task): GridCell[][] {
  const { layout } = task;
  const maxLen = layout.max_len;
  const partials = layout.partials || [];
  const cols = maxLen + 2;
  const rows = 3 + partials.length + (partials.length > 1 ? 2 : 0);

  const grid: GridCell[][] = Array(rows).fill(null).map((_, r) =>
    Array(cols).fill(null).map((_, c) => makeEmpty(r, c))
  );

  // Wiersz 0: operand1
  const op1 = layout.operand1.padStart(maxLen, ' ');
  for (let i = 0; i < maxLen; i++) {
    const digit = op1[i];
    if (digit !== ' ') grid[0][i + 1] = makeCell(0, i + 1, digit, false);
  }

  // Wiersz 1: symbol + operand2
  grid[1][0] = makeCell(1, 0, '×', false);
  const op2 = layout.operand2.padStart(maxLen, ' ');
  for (let i = 0; i < maxLen; i++) {
    const digit = op2[i];
    if (digit !== ' ') grid[1][i + 1] = makeCell(1, i + 1, digit, false);
  }

  // Wiersz 2: linia
  grid[2][0] = makeCell(2, 0, '—', false);

  // Wiersze cząstkowe
  partials.forEach((p, pi) => {
    const row = 3 + pi;
    const display = p.display.padStart(maxLen, ' ');
    for (let i = 0; i < display.length; i++) {
      const digit = display[i];
      if (digit !== ' ') grid[row][i + 1] = makeCell(row, i + 1, '', true, pi);
    }
  });

  // Wynik końcowy
  if (partials.length > 1) {
    const sumRow = 3 + partials.length;
    grid[sumRow][0] = makeCell(sumRow, 0, '—', false);
    const result = layout.result.padStart(maxLen, ' ');
    for (let i = 0; i < maxLen; i++) {
      const digit = result[i];
      if (digit !== ' ') {
        grid[sumRow + 1][i + 1] = makeCell(sumRow + 1, i + 1, '', true, null);
      }
    }
  }

  return grid;
}

/**
 * Siatka dla dzielenia (polska metoda):
 * ┌──────────────────────┐
 * │ dzielna  │  dzielnik │
 * │ ─────    │ ────────  │
 * │  reszta  │  wynik    │
 * └──────────────────────┘
 */
function buildDivisionGrid(task: Task): GridCell[][] {
  const dividend = task.layout.dividend;
  const divisor = task.layout.divisor;
  const quotient = task.layout.quotient;
  const substeps = task.layout.substeps || [];

  // Szerokość: dzielna + separator + dzielnik/wynik
  const leftWidth = dividend.length + 2;
  const rightWidth = Math.max(divisor.length, quotient.length) + 2;
  const cols = leftWidth + rightWidth;
  // Wiersze: dzielna/dzielnik + kroki
  const rows = Math.max(4, substeps.length * 2 + 2);

  const grid: GridCell[][] = Array(rows).fill(null).map((_, r) =>
    Array(cols).fill(null).map((_, c) => makeEmpty(r, c))
  );

  // Wiersz 0: dzielna po lewej, dzielnik po prawej
  for (let i = 0; i < dividend.length; i++) {
    grid[0][i] = makeCell(0, i, dividend[i], false);
  }
  // Separator pionowy (wizualny — CSS)
  for (let i = 0; i < divisor.length; i++) {
    grid[0][leftWidth + i] = makeCell(0, leftWidth + i, divisor[i], false);
  }

  // Wiersz 1: linia pod dzielnikiem + wynik do wypełnienia
  for (let i = 0; i < quotient.length; i++) {
    const step = task.steps.find(s => s.column === i && s.position === 'result');
    grid[1][leftWidth + i] = makeCell(1, leftWidth + i, '', true, step?.step_id ?? null);
  }

  // Podkroki (reszty cząstkowe)
  substeps.forEach((sub, si) => {
    const row = si * 2 + 1;
    const remainder_str = String(sub.current_value);
    const product_str = String(sub.product);

    // Reszta (aktualna wartość)
    for (let i = 0; i < remainder_str.length; i++) {
      if (row < rows) {
        grid[row][si + i] = makeCell(row, si + i, remainder_str[i], false);
      }
    }
    // Iloczyn (do odjęcia)
    if (row + 1 < rows) {
      for (let i = 0; i < product_str.length; i++) {
        grid[row + 1][si + i] = makeCell(row + 1, si + i, '', true, si);
      }
    }
  });

  return grid;
}
```

---

## Utwórz: `frontend/src/components/MathGrid.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridCell, CellState } from '../types/task';
import { useTheme } from '../hooks/useTheme';

interface MathGridProps {
  grid: GridCell[][];
  onCellInput: (row: number, col: number, value: string) => void;
  activeCell: { row: number; col: number } | null;
  showLine?: boolean;  // pokaż linię pod kreską
  lineRow?: number;    // który wiersz to linia
  cellSize?: number;   // rozmiar kratki w px (default 48)
}

// Kolory komórek zależnie od stanu i motywu
function getCellClasses(cell: GridCell, isActive: boolean, theme: string): string {
  const base = 'flex items-center justify-center font-bold text-xl transition-all duration-150 select-none';
  const sizeClass = 'w-12 h-12 rounded';

  if (!cell.editable && cell.value === '') return `${base} ${sizeClass}`;
  if (cell.value === '—') return `${base} ${sizeClass} opacity-0`; // linia osobno

  if (theme === 'chalk') {
    const stateClasses: Record<CellState, string> = {
      empty: `border border-dashed border-chalk-line bg-transparent`,
      given: `text-chalk-text`,
      active: `border-2 border-chalk-accent bg-chalk-accent/10 shadow-lg shadow-chalk-accent/30`,
      'filled-correct': `text-chalk-success border border-chalk-success/30`,
      'filled-error': `text-chalk-error border-2 border-chalk-error bg-chalk-error/10 animate-shake`,
      revealed: `text-chalk-accent/70 border border-chalk-accent/30`,
    };
    return `${base} ${sizeClass} ${stateClasses[cell.state]} font-chalk`;
  } else {
    const stateClasses: Record<CellState, string> = {
      empty: `border border-dashed border-notebook-line bg-white`,
      given: `text-notebook-text`,
      active: `border-2 border-notebook-text bg-blue-50 shadow-md`,
      'filled-correct': `text-notebook-success border border-green-200`,
      'filled-error': `text-notebook-error border-2 border-red-400 bg-red-50 animate-shake`,
      revealed: `text-notebook-accent/80 border border-notebook-accent/30`,
    };
    return `${base} ${sizeClass} ${stateClasses[cell.state]} font-notebook`;
  }
}

export function MathGrid({ grid, onCellInput, activeCell, lineRow = 3 }: MathGridProps) {
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fokus na ukrytym inpucie gdy aktywna komórka
  useEffect(() => {
    if (activeCell) inputRef.current?.focus();
  }, [activeCell]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!activeCell) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
      onCellInput(activeCell.row, activeCell.col, key);
    } else if (key === 'Backspace') {
      onCellInput(activeCell.row, activeCell.col, '');
    }
  }

  const cols = grid[0]?.length || 1;
  const lineColor = theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text';

  return (
    <div className="relative inline-block" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Ukryty input dla mobile keyboard */}
      <input
        ref={inputRef}
        type="number"
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={(e) => {
          if (activeCell && e.target.value) {
            const digit = e.target.value.slice(-1);
            if (digit >= '0' && digit <= '9') {
              onCellInput(activeCell.row, activeCell.col, digit);
              e.target.value = '';
            }
          }
        }}
      />

      <div className="flex flex-col gap-1">
        {grid.map((row, rowIdx) => (
          <div key={rowIdx}>
            {/* Linia pod kreską */}
            {rowIdx === lineRow && (
              <div className={`border-t-2 ${lineColor} my-1 mx-1`} />
            )}

            <div className="flex gap-1">
              {row.map((cell) => (
                <CellComponent
                  key={cell.id}
                  cell={cell}
                  isActive={
                    activeCell?.row === cell.row && activeCell?.col === cell.col
                  }
                  theme={theme}
                  onCellClick={() => {
                    if (cell.editable) {
                      onCellInput(cell.row, cell.col, '__focus__');
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CellComponent({
  cell, isActive, theme, onCellClick
}: {
  cell: GridCell;
  isActive: boolean;
  theme: string;
  onCellClick: () => void;
}) {
  const classes = getCellClasses(cell, isActive, theme);

  // Komórki puste (niewidoczne spacery)
  if (!cell.editable && !cell.value) {
    return <div className="w-12 h-12" />;
  }

  // Symbol operacji (po lewej)
  if (cell.value === '—') return null;

  return (
    <motion.div
      className={`${classes} cursor-${cell.editable ? 'pointer' : 'default'}`}
      onClick={onCellClick}
      whileTap={cell.editable ? { scale: 0.92 } : undefined}
    >
      <AnimatePresence mode="wait">
        {cell.value && cell.value !== '' && (
          <motion.span
            key={cell.value + cell.state}
            initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15, type: 'spring', stiffness: 400 }}
            className={theme === 'chalk' ? 'chalk-text' : ''}
          >
            {cell.value}
          </motion.span>
        )}
        {(!cell.value || cell.value === '') && cell.editable && (
          <motion.span
            animate={isActive ? {
              opacity: [1, 0, 1],
              transition: { repeat: Infinity, duration: 1 }
            } : { opacity: 0.3 }}
            className="text-sm opacity-30"
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

## Utwórz: `frontend/src/components/TaskDisplay.tsx`

Główny komponent łączący siatkę z logiką:

```typescript
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Task, GridCell } from '../types/task';
import { MathGrid } from './MathGrid';
import { buildGrid } from '../utils/gridBuilder';
import { useTheme } from '../hooks/useTheme';
import { pl } from '../i18n/pl';

const API = import.meta.env.VITE_API_URL;

interface TaskDisplayProps {
  task: Task;
  mode: 'tutorial' | 'practice' | 'test';
  currentStepId: number;
  onStepComplete: (correct: boolean) => void;
  onTaskComplete: (correct: boolean) => void;
  feedbackMode?: 'immediate' | 'after';
}

export function TaskDisplay({
  task, mode, currentStepId,
  onStepComplete, onTaskComplete,
  feedbackMode = 'immediate'
}: TaskDisplayProps) {
  const { classes, theme } = useTheme();
  const [grid, setGrid] = useState<GridCell[][]>(() => buildGrid(task));
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'hint' } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Znajdź aktualną aktywną komórkę na podstawie kroku
  const activateStepCell = useCallback((stepId: number) => {
    for (const row of grid) {
      for (const cell of row) {
        if (cell.stepId === stepId && cell.editable) {
          setActiveCell({ row: cell.row, col: cell.col });
          return;
        }
      }
    }
  }, [grid]);

  async function handleCellInput(row: number, col: number, value: string) {
    if (value === '__focus__') {
      setActiveCell({ row, col });
      return;
    }

    // Zaktualizuj komórkę
    const newGrid = grid.map(r => r.map(c => {
      if (c.row === row && c.col === col) {
        return { ...c, value, state: value ? 'filled-correct' as const : 'empty' as const };
      }
      return c;
    }));

    if (!value) {
      setGrid(newGrid);
      return;
    }

    // Walidacja
    if (mode !== 'test' && feedbackMode === 'immediate') {
      setIsValidating(true);
      try {
        const cell = grid[row][col];
        if (cell.stepId !== null) {
          const res = await fetch(`${API}/api/validate/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: task.operation,
              step_id: cell.stepId,
              task_data: task,
              user_answer: Number(value)
            })
          });
          const result = await res.json();

          setGrid(newGrid.map(r => r.map(c => {
            if (c.row === row && c.col === col) {
              return {
                ...c,
                value,
                state: result.correct ? 'filled-correct' : 'filled-error'
              };
            }
            return c;
          })));

          setFeedback({
            message: result.feedback,
            type: result.correct ? 'success' : 'error'
          });

          onStepComplete(result.correct);
        }
      } catch (e) {
        console.error('Błąd walidacji:', e);
      } finally {
        setIsValidating(false);
      }
    } else {
      setGrid(newGrid);
    }
  }

  const currentStep = task.steps[currentStepId];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pytanie */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-2xl font-bold ${classes.text} text-center`}
      >
        {task.question}
      </motion.div>

      {/* Opis kroku (tutorial mode) */}
      {mode === 'tutorial' && currentStep && (
        <motion.div
          key={currentStepId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${classes.card} p-3 max-w-sm text-center`}
        >
          <p className={`text-sm ${classes.text}`}>{currentStep.description}</p>
          {currentStep.hint && (
            <p className={`text-xs mt-1 opacity-70 ${classes.text}`}>
              💡 {currentStep.hint}
            </p>
          )}
        </motion.div>
      )}

      {/* Siatka */}
      <div className={`p-4 rounded-2xl ${classes.gridBg} ${theme === 'chalk' ? 'chalk-texture' : 'notebook-grid'}`}>
        <MathGrid
          grid={grid}
          onCellInput={handleCellInput}
          activeCell={activeCell}
          lineRow={task.operation === 'addition' || task.operation === 'subtraction' ? 3 : 2}
        />
      </div>

      {/* Symbol operacji (duży, po lewej siatki) */}
      <div className={`absolute left-0 text-3xl font-bold ${classes.accent}`}>
        {task.symbol}
      </div>

      {/* Feedback */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`${classes.card} p-3 max-w-sm text-center`}
        >
          <p className={`font-bold ${feedback.type === 'success' ? classes.success : classes.error}`}>
            {feedback.message}
          </p>
        </motion.div>
      )}

      {/* Wskaźnik ładowania */}
      {isValidating && (
        <div className={`text-sm ${classes.text} opacity-50`}>Sprawdzam...</div>
      )}
    </div>
  );
}
```

---

## ✅ Weryfikacja po tym kroku

Tymczasowy test w MenuPage — dodaj przycisk który tworzy przykładowe zadanie:

```typescript
// Tymczasowo w MenuPage.tsx, aby przetestować komponent:
import { TaskDisplay } from '../components/TaskDisplay';
// ... wewnątrz komponentu:
const [testTask, setTestTask] = useState(null);
// Przycisk: <button onClick={fetchTestTask}>Test siatki</button>
```

Sprawdź:
- [ ] Kratki renderują się w obu motywach
- [ ] Można kliknąć na pustą kratkę i wpisać cyfrę klawiaturą
- [ ] Poprawna cyfra → zielona kratka
- [ ] Błędna cyfra → czerwona kratka z animacją shake
- [ ] Na mobile klawiatura numeryczna się pojawia

Następny krok: `docs/06-learning-flow.md`
