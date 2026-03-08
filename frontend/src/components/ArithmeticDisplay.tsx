import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../types/task';
import { useTheme } from '../hooks/useTheme';
import { DivisionDisplay } from './DivisionDisplay';
import { operationSymbol } from '../utils/symbols';

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
  const partial_rows: string[][] = partials.map(p => {
    const pstr = String(p.value);
    const out = Array(gridCols).fill('');
    const rightCol = gridCols - 1 - p.shift;
    pstr.split('').forEach((d, i) => {
      const col = rightCol - (pstr.length - 1 - i);
      if (col >= 0 && col < gridCols) out[col] = d;
    });
    return out;
  });

  // Dla każdego partial: tablica przeniesień (carry) wyrównana do gridu
  const carry_rows: (string | null)[][] = partials.map(p => {
    const out: (string | null)[] = Array(gridCols).fill(null);
    if (p.carries) {
      Object.entries(p.carries).forEach(([colFR, val]) => {
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
        const pstr = String(p.value);
        const pDigits = pstr.split('').reverse(); // od jedności do najstarszej
        const rightCol = gridCols - 1 - p.shift;

        // Iteruj kolumna po kolumnie od prawej do lewej
        // Dla każdej kolumny: najpierw cyfra wyniku cząstkowego, potem przeniesienie
        for (let colInPartial = 0; colInPartial < pDigits.length + (p.carries ? Object.keys(p.carries).length : 0); colInPartial++) {
          // Czy dla tej kolumny jest cyfra wyniku cząstkowego?
          if (colInPartial < pDigits.length) {
            const digitChar = pDigits[colInPartial];
            const col = rightCol - colInPartial;
            if (col >= 0 && col < gridCols) {
              const step = task.steps.find(
                s => s.position === 'partial' && s.row === pi && s.column === colInPartial
              );
              q.push({
                id: `partial-${pi}-${col}`,
                type: 'partial',
                row: pi,
                col,
                expected: digitChar,
                entered: '',
                status: 'empty',
                stepId: step?.step_id ?? null,
              });
            }
          }

          // Czy po tej kolumnie jest przeniesienie?
          const carryAtCol = colInPartial + 1;
          if (p.carries && p.carries[carryAtCol] !== undefined) {
            const carryVal = String(p.carries[carryAtCol]);
            const carryGridCol = rightCol - carryAtCol;
            if (carryGridCol >= 0 && carryGridCol < gridCols) {
              const step = task.steps.find(
                s => s.position === 'carry' && s.row === pi && s.column === carryAtCol
              );
              q.push({
                id: `carry-${pi}-${carryGridCol}`,
                type: 'carry',
                row: pi,
                col: carryGridCol,
                expected: carryVal,
                entered: '',
                status: 'empty',
                stepId: step?.step_id ?? null,
              });
            }
          }
        }

        // Przeniesienia które wychodzą poza długość cyfr partial
        if (p.carries) {
          Object.entries(p.carries)
            .map(([k, v]) => ({ colFR: Number(k), val: String(v) }))
            .filter(({ colFR }) => colFR >= pDigits.length)
            .sort((a, b) => a.colFR - b.colFR)
            .forEach(({ colFR, val }) => {
              const carryGridCol = rightCol - colFR;
              if (carryGridCol < 0 || carryGridCol >= gridCols) return;
              if (q.find(c => c.id === `carry-${pi}-${carryGridCol}`)) return;
              const step = task.steps.find(
                s => s.position === 'carry' && s.row === pi && s.column === colFR
              );
              q.push({
                id: `carry-${pi}-${carryGridCol}`,
                type: 'carry',
                row: pi,
                col: carryGridCol,
                expected: val,
                entered: '',
                status: 'empty',
                stepId: step?.step_id ?? null,
              });
            });
        }
      });

      // Wynik końcowy — od prawej do lewej
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
      // Dodawanie / odejmowanie
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
        if (isAdd && i > 0 && add_carry_row[i - 1] !== null) {
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
  const [unlockedCarries, setUnlockedCarries] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = buildQueue();
    setQueue(q);
    setCurrentIdx(0);
    setFeedback(null);
    setIsChecking(false);
    setDone(false);
    setUnlockedCarries(new Set());
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
        const nextCell = newQueue[next];
        if (nextCell.type === 'carry') {
          setUnlockedCarries(prev => new Set(prev).add(nextCell.id));
        }
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
  const CELL_SIZE = 'w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20';
  const FONT_SIZE = 'text-3xl sm:text-4xl lg:text-5xl';
  const DIGIT_CLS = `${CELL_SIZE} flex items-center justify-center ${FONT_SIZE} font-bold rounded
    ${classes.font}
    ${theme === 'chalk'
      ? 'text-chalk-text chalk-text border border-chalk-text/30 bg-chalk-text/5'
      : 'text-notebook-text border border-notebook-text/25 bg-black/5'}`;
  const EMPTY_CLS = `${CELL_SIZE} flex items-center justify-center`;
  const LINE_CLS  = `border-t-2 my-1 ${theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text'}`;
  const SYM_CLS   = `${CELL_SIZE} flex items-center justify-center ${FONT_SIZE} font-bold rounded
    ${classes.font}
    ${theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent'}`;

  function renderInputCell(cell: Cell) {
    const isActive = activeCell?.id === cell.id;
    const isCarry  = cell.type === 'carry';

    return (
      <motion.div
        key={cell.id}
        onClick={() => inputRef.current?.focus()}
        whileTap={{ scale: 0.88 }}
        className={`
          ${isCarry
            ? `${CELL_SIZE.split(' ').filter(c => c.startsWith('w-') || c.startsWith('sm:w-') || c.startsWith('lg:w-')).join(' ')} h-7 sm:h-8 text-sm sm:text-base`
            : `${CELL_SIZE} ${FONT_SIZE}`}
          flex items-center justify-center
          font-bold rounded cursor-pointer transition-all select-none
          ${classes.font}
          ${cell.status === 'correct'
            ? theme === 'chalk'
              ? 'border border-chalk-success bg-chalk-success/15 text-chalk-success'
              : 'border border-green-400 bg-green-50 text-green-700'
            : ''}
          ${cell.status === 'error'
            ? `animate-shake border-2 ${theme === 'chalk'
                ? 'border-chalk-error bg-chalk-error/15 text-chalk-error'
                : 'border-red-400 bg-red-50 text-red-600'}`
            : ''}
          ${cell.status === 'empty'
            ? `border-2 border-dashed ${theme === 'chalk'
                ? 'border-chalk-text/40 bg-chalk-text/5'
                : 'border-gray-400 bg-black/5'}`
            : ''}
          ${cell.status === 'active'
            ? `border-2 ${theme === 'chalk'
                ? 'border-chalk-accent bg-chalk-accent/15 shadow-lg shadow-chalk-accent/30'
                : 'border-blue-500 bg-blue-50 shadow-md shadow-blue-200'}`
            : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {cell.entered
            ? (
              <motion.span key="v" initial={{ scale: 0.3 }} animate={{ scale: 1 }}>
                {cell.entered}
              </motion.span>
            ) : (
              <motion.span
                key="q"
                className="opacity-40"
                animate={cell.status === 'active' ? { opacity: [0.8, 0.2, 0.8] } : { opacity: 0.35 }}
                transition={cell.status === 'active' ? { repeat: Infinity, duration: 0.85 } : {}}
              >
                ?
              </motion.span>
            )
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

  const symbol = operationSymbol(task.operation);
  const currentStepData = task.steps.find(s => s.step_id === activeCell?.stepId);

  // ── JSX ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4">

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
        className={`inline-flex flex-col p-8 sm:p-10 lg:p-12 rounded-2xl cursor-pointer ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}`}
        onClick={() => inputRef.current?.focus()}
      >

        {/* Wiersz przeniesień dodawania */}
        {isAdd && (
          <div className="flex">
            <div className={EMPTY_CLS} />
            {row_op1.map((_, i) => {
              const carryCell = getAddCarryCell(i);
              if (!carryCell) return <div key={i} className={EMPTY_CLS} />;

              const isUnlocked = unlockedCarries.has(carryCell.id);
              const isActiveCarry = activeCell?.id === carryCell.id;

              if (!isUnlocked && !isActiveCarry) {
                return (
                  <div
                    key={i}
                    className={`${CELL_SIZE.split(' ').filter(c => c.startsWith('w-') || c.startsWith('sm:w-') || c.startsWith('lg:w-')).join(' ')} h-7 sm:h-8 flex items-center justify-center cursor-pointer rounded opacity-0 hover:opacity-30 transition-opacity`}
                    onClick={() => setUnlockedCarries(prev => new Set(prev).add(carryCell.id))}
                  />
                );
              }

              return renderInputCell(carryCell);
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

              {/* Wiersz przeniesień — zawsze renderowany (żeby zachować wyrównanie) */}
              {isMultiply && (
                <div className="flex">
                  <div className={EMPTY_CLS} />
                  {Array.from({ length: gridCols }).map((_, col) => {
                    const carryCell = getInputCell('carry', pi, col);
                    const isUnlocked = carryCell && unlockedCarries.has(carryCell.id);
                    const isActiveCarry = carryCell && activeCell?.id === carryCell.id;

                    if (!carryCell) {
                      return <div key={col} className={EMPTY_CLS} />;
                    }

                    if (!isUnlocked && !isActiveCarry) {
                      return (
                        <div
                          key={col}
                          className={`${CELL_SIZE} flex items-center justify-center cursor-pointer rounded opacity-0 hover:opacity-30 transition-opacity`}
                          title="Kliknij żeby zapisać przeniesienie"
                          onClick={() => {
                            setUnlockedCarries(prev => new Set(prev).add(carryCell.id));
                          }}
                        >
                          <span className={`text-xs ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-400'}`}>+</span>
                        </div>
                      );
                    }

                    return renderInputCell(carryCell);
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
