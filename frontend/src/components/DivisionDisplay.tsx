import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../types/task';
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
  type: 'quotient' | 'product' | 'remainder' | 'final_remainder';
  stepIdx: number;
  expected: string;
  entered: string;
  status: 'empty' | 'active' | 'correct' | 'error';
  stepId: number | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

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
        type: s.position === 'result' ? 'quotient'
            : s.position === 'remainder' ? 'remainder'
            : s.position === 'final_remainder' ? 'final_remainder'
            : 'product',
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
  const [revealedSubsteps, setRevealedSubsteps] = useState<number[]>([0]);
  const [unlockedBorrows, setUnlockedBorrows]       = useState<Set<string>>(new Set());
  const [testAnswers, setTestAnswers] = useState<string[]>([]);

  useEffect(() => {
    setQueue(buildQueue());
    setCurrentIdx(0);
    setFeedback(null);
    setDone(false);
    setRevealedSubsteps([0]);
    setUnlockedBorrows(new Set());
    setTestAnswers([]);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [task.operand1, task.operand2]);

  useEffect(() => {
    if (!done) setTimeout(() => inputRef.current?.focus(), 80);
  }, [currentIdx]);

  const activeCell = done ? null : queue[currentIdx];

  const handleDigit = useCallback(async (digit: string) => {
    if (done || isChecking || !activeCell) return;
    let correct = false;

    if (mode === 'test') {
      // ── TRYB TEST: akceptuj bez oceny, idz dalej ──────────────────
      const newQueue = queue.map((c, i) =>
        i === currentIdx ? { ...c, entered: digit, status: 'correct' as const } : c
      );
      setQueue(newQueue);
      setTestAnswers(prev => [...prev, digit]);

      // Po ostatniej cyfrze remainder -> odkryj nastepny substep
      const step = (task.steps as any[])[activeCell.stepIdx];
      if (step?.position === 'remainder') {
        const substepIdx = step.row ?? 0;
        const sub = substeps[substepIdx];
        if (sub && step.column === (sub.next_current_str?.length ?? 1) - 1) {
          setRevealedSubsteps(prev => [...prev, substepIdx + 1]);
        }
      }

      const next = currentIdx + 1;
      if (next >= newQueue.length) {
        setDone(true);
        const allAnswers = [...testAnswers, digit];
        const scoredQueue = newQueue.map((c, i) => ({
          ...c,
          status: (allAnswers[i] === c.expected ? 'correct' : 'error') as 'correct' | 'error',
        }));
        setQueue(scoredQueue);
        setTimeout(() => {
          const allCorrect = allAnswers.every((ans, i) => ans === newQueue[i]?.expected);
          onTaskComplete(allCorrect);
        }, 1800);
      } else {
        setQueue(newQueue.map((c, i) =>
          i === next ? { ...c, status: 'active' as const } : c
        ));
        setCurrentIdx(next);
      }
      return;
    }

    // ── TRYB LEARN / PRACTICE: natychmiastowy feedback ─────────────
    if (feedbackMode === 'immediate') {
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
      // Po ostatniej cyfrze remainder -> odkryj nastepny substep
      const step = (task.steps as any[])[activeCell.stepIdx];
      if (step?.position === 'remainder') {
        const substepIdx = step.row ?? 0;
        const sub = substeps[substepIdx];
        if (sub && step.column === (sub.next_current_str?.length ?? 1) - 1) {
          setRevealedSubsteps(prev => [...prev, substepIdx + 1]);
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
  }, [done, isChecking, activeCell, currentIdx, queue, task, mode, feedbackMode, substeps, testAnswers, onStepComplete, onTaskComplete]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleDigit]);

  // ── Style ───────────────────────────────────────────────────────
  const CELL_W  = 'w-12 sm:w-14 lg:w-16';
  const CELL_H  = 'h-12 sm:h-14 lg:h-16';
  const CELL_Hs = 'h-6 sm:h-6 lg:h-7';

  const CS  = `${CELL_W} ${CELL_H}`;
  const CSb = `${CELL_W} ${CELL_Hs}`;
  const FS  = 'text-2xl sm:text-3xl lg:text-4xl';
  const FSb = 'text-xs sm:text-sm';

  // Musi zgadzac sie z CELL_W: w-12=48px, sm:w-14=56px, lg:w-16=64px
  const cellPx = 56;

  const lineCol = theme === 'chalk' ? 'border-chalk-text/70' : 'border-gray-600';
  const textCls = `${classes.font} ${theme === 'chalk' ? 'text-chalk-text chalk-text' : 'text-notebook-text'}`;

  // Symbol column — minus/dwukropek poza siatka kolumn dzielnej
  const SYMBOL_COL = `${CELL_W} flex-shrink-0 flex items-center justify-center
    text-2xl sm:text-3xl font-bold ${textCls}`;

  const givenCls = `${CS} flex items-center justify-center ${FS} font-bold rounded
    ${textCls} border ${theme === 'chalk' ? 'border-chalk-text/30 bg-chalk-text/5' : 'border-gray-300 bg-black/5'}`;
  const emptyCls = `${CS} flex items-center justify-center flex-shrink-0`;
  const emptyBCls = `${CSb} flex-shrink-0`;

  function renderInput(cell: DCell, small = false) {
    const isActive = activeCell?.id === cell.id;
    const sz = small ? CSb : CS;
    const fs = small ? FSb : FS;
    const isTestInProgress = mode === 'test' && !done;
    return (
      <motion.div
        key={cell.id}
        onClick={() => inputRef.current?.focus()}
        whileTap={{ scale: 0.9 }}
        className={`
          ${sz} flex items-center justify-center ${fs} font-bold rounded cursor-pointer transition-all flex-shrink-0
          ${classes.font}
          ${isTestInProgress && cell.entered
            ? theme === 'chalk'
              ? 'border border-chalk-text/50 text-chalk-text bg-chalk-text/10'
              : 'border border-gray-400 text-gray-700 bg-gray-100'
            : ''}
          ${!isTestInProgress && cell.status === 'correct'
            ? theme === 'chalk' ? 'border border-chalk-success text-chalk-success bg-chalk-success/10' : 'border border-green-400 text-green-600 bg-green-50'
            : ''}
          ${!isTestInProgress && cell.status === 'error'
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

  function getRemainderCell(substepIdx: number, col: number) {
    return queue.find(c =>
      c.type === 'remainder' &&
      (task.steps as any[])[c.stepIdx]?.row === substepIdx &&
      (task.steps as any[])[c.stepIdx]?.column === col
    );
  }

  function getFinalRemainderCell(col: number) {
    return queue.find(c =>
      c.type === 'final_remainder' &&
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

        {/* Wiersz ilorazu (nad kreska) */}
        <div className="flex">
          {/* Pusta kolumna symbolu */}
          <div className={`${CELL_W} ${CELL_H} flex-shrink-0`} />
          {/* Cyfry ilorazu — nad cyframi dzielnej */}
          {dividendStr.split('').map((_, i) => {
            const subIdx = substeps.findIndex((s: any) => s.quotient_col === i);
            if (subIdx === -1) return <div key={i} className={`${CELL_W} ${CELL_H} flex-shrink-0`} />;
            const qcell = getQuotientCell(subIdx);
            if (!qcell) return <div key={i} className={`${CELL_W} ${CELL_H} flex-shrink-0`} />;
            return renderInput(qcell);
          })}
        </div>

        {/* Kreska nad dzielna */}
        <div className="flex">
          <div className={`${CELL_W} flex-shrink-0`} />
          <div
            className={`border-t-2 ${lineCol}`}
            style={{ width: `${dividendStr.length * cellPx}px` }}
          />
        </div>

        {/* Wiersz: dzielna : dzielnik */}
        <div className="flex items-center">
          {/* Pusta kolumna symbolu (wyrownanie z minusami nizej) */}
          <div className={SYMBOL_COL}>&nbsp;</div>
          {/* Cyfry dzielnej */}
          {dividendStr.split('').map((d, i) => (
            <div key={i} className={givenCls}>{d}</div>
          ))}
          {/* Dwukropek */}
          <div className={`${CELL_W} flex-shrink-0 flex items-center justify-center
            text-2xl sm:text-3xl font-bold ${textCls}`}>:</div>
          {/* Cyfry dzielnika */}
          {divisorStr.split('').map((d, i) => (
            <div key={i} className={givenCls}>{d}</div>
          ))}
        </div>

        {/* Substepy */}
        {substeps.map((sub: any, si: number) => {
          if (!revealedSubsteps.includes(si)) return null;

          const indent = sub.quotient_col - sub.current_len + 1;
          const productStr: string = sub.product_str;

          const borrow: Record<number, number> = sub.borrow || {};
          const hasBorrow = Object.keys(borrow).length > 0;

          // Reszta koncowa (ostatni substep) — pokaż gdy wszystkie product cells wpisane
          const isLastSub = si === substeps.length - 1;
          const showFinalRemainder = isLastSub && productStr.split('').every((_: string, pi: number) => {
            const pcell = getProductCell(si, pi);
            return pcell && pcell.entered !== '';
          });

          return (
            <motion.div
              key={si}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
            >

              {/* Male kratki przeniesien NAD iloczynem */}
              {hasBorrow && (
                <div className="flex">
                  {/* Pusta kolumna symbolu */}
                  <div className={`${CELL_W} ${CELL_Hs} flex-shrink-0`} />
                  {/* Wciecie */}
                  {Array(indent).fill(null).map((_, k) =>
                    <div key={k} className={`${CELL_W} ${CELL_Hs} flex-shrink-0`} />
                  )}
                  {/* Kratki przeniesien */}
                  {productStr.split('').map((_: string, pi: number) => {
                    const hasBorrowHere = borrow[pi] === 1;
                    const borrowKey = `${si}-${pi}`;
                    const isUnlocked = unlockedBorrows.has(borrowKey);

                    if (!hasBorrowHere) return <div key={pi} className={emptyBCls} />;

                    if (!isUnlocked) {
                      return (
                        <div
                          key={pi}
                          className={`${CSb} cursor-pointer opacity-0 hover:opacity-40 transition-opacity rounded`}
                          title="Kliknij aby zapisac przeniesienie"
                          onClick={e => {
                            e.stopPropagation();
                            setUnlockedBorrows(prev => new Set(prev).add(borrowKey));
                          }}
                        />
                      );
                    }

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
                {/* Minus w kolumnie symbolu */}
                <div className={SYMBOL_COL}>{'\u2212'}</div>
                {/* Wciecie wewnatrz siatki */}
                {Array(indent).fill(null).map((_, k) =>
                  <div key={k} className={`${CELL_W} flex-shrink-0`} />
                )}
                {/* Cyfry iloczynu */}
                {productStr.split('').map((d: string, pi: number) => {
                  const pcell = getProductCell(si, pi);
                  if (pcell) return renderInput(pcell);
                  return <div key={pi} className={givenCls}>{d}</div>;
                })}
              </div>

              {/* Kreska odejmowania */}
              <div className="flex">
                <div className={`${CELL_W} flex-shrink-0`} />
                {Array(indent).fill(null).map((_, k) =>
                  <div key={k} style={{ width: cellPx }} className="flex-shrink-0" />
                )}
                <div
                  className={`border-t-2 ${lineCol} my-0.5 flex-shrink-0`}
                  style={{ width: `${sub.product_len * cellPx}px` }}
                />
              </div>

              {/* Wiersz reszty — edytowalne kratki (nie-ostatni substep) */}
              {si < substeps.length - 1 && sub.next_current_str && (
                <div className="flex">
                  {/* Pusta kolumna symbolu */}
                  <div className={`${CELL_W} flex-shrink-0`} />
                  {/* Wciecie do pozycji next_current w dzielnej */}
                  {(() => {
                    const nextSub = substeps[si + 1];
                    const nextIndent = nextSub.quotient_col - nextSub.current_len + 1;
                    return Array(nextIndent).fill(null).map((_: null, k: number) =>
                      <div key={k} className={`${CELL_W} flex-shrink-0`} />
                    );
                  })()}
                  {/* Kratki edytowalne dla cyfr reszty+dociagnietej */}
                  {sub.next_current_str.split('').map((_d: string, ci: number) => {
                    const rcell = getRemainderCell(si, ci);
                    if (rcell) return renderInput(rcell);
                    return <div key={ci} className={givenCls}>{_d}</div>;
                  })}
                </div>
              )}

              {/* Reszta koncowa (ostatni substep) */}
              {isLastSub && showFinalRemainder && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className={`${CELL_W} flex-shrink-0`} />
                  {Array(sub.quotient_col).fill(null).map((_: null, k: number) =>
                    <div key={k} className={`${CELL_W} flex-shrink-0`} />
                  )}

                  {task.remainder === 0 ? (
                    <div className={givenCls}>0</div>
                  ) : (
                    <>
                      <div className={`text-lg font-bold flex-shrink-0 ${textCls} opacity-70`}>r.</div>
                      {String(task.remainder).split('').map((_: string, ci: number) => {
                        const rcell = getFinalRemainderCell(ci);
                        if (rcell) return renderInput(rcell);
                        return null;
                      })}
                    </>
                  )}
                </motion.div>
              )}

            </motion.div>
          );
        })}

      </div>

      {/* Wynik z reszta */}
      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center text-2xl font-bold ${textCls} mt-2`}
        >
          {task.operand1} {'\u00F7'} {task.operand2} = {(task as any).result_display || task.result}
        </motion.div>
      )}

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
