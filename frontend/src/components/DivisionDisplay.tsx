import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../types/task';
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
          setFeedback({ msg: correct ? 'Brawo! \u2713' : 'Nie, spr\u00f3buj jeszcze raz!', ok: correct });
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
  const CW = 48; // px
  const CELL = 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex items-center justify-center';
  const DIGIT = `${CELL} text-2xl font-bold rounded
    ${classes.font}
    ${theme === 'chalk'
      ? 'text-chalk-text chalk-text border border-chalk-text/30 bg-chalk-text/5'
      : 'text-notebook-text border border-notebook-text/25 bg-black/5'}`;
  const lineColor = theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text';

  const currentStepData = task.steps[currentPos];

  return (
    <div className="flex flex-col items-center gap-4">
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
        {task.operand1} {'\u00F7'} {task.operand2} = ?
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
        className={`inline-flex flex-col p-8 sm:p-10 lg:p-12 rounded-2xl cursor-pointer ${theme === 'chalk' ? 'bg-chalk-bgLight chalk-texture' : 'notebook-grid'}`}
        onClick={() => inputRef.current?.focus()}
      >

        {/* Wiersz 0: iloraz NAD dzielną */}
        <div className="flex">
          {dividendStr.split('').map((_, i) => {
            const qStart = dividendStr.length - quotientStr.length;
            const qi = i - qStart;
            const qCell = qi >= 0 && qi < quotientStr.length ? quotientInputs[qi] : null;

            if (!qCell) return <div key={i} className={CELL} />;

            const isActive = qCell.pos === currentPos && !done;
            return (
              <motion.div key={i} onClick={() => inputRef.current?.focus()} whileTap={{ scale: 0.9 }}
                className={`
                  ${CELL} text-2xl font-bold rounded cursor-pointer transition-all select-none ${classes.font}
                  ${qCell.status === 'correct'
                    ? theme==='chalk'
                      ? 'border border-chalk-success bg-chalk-success/15 text-chalk-success'
                      : 'border border-green-400 bg-green-50 text-green-700'
                    : ''}
                  ${qCell.status === 'error'
                    ? `animate-shake border-2 ${theme==='chalk'
                        ? 'border-chalk-error bg-chalk-error/15 text-chalk-error'
                        : 'border-red-400 bg-red-50 text-red-600'}`
                    : ''}
                  ${qCell.status === 'empty'
                    ? `border-2 border-dashed ${theme==='chalk'
                        ? 'border-chalk-text/40 bg-chalk-text/5'
                        : 'border-gray-400 bg-black/5'}`
                    : ''}
                  ${qCell.status === 'active'
                    ? `border-2 ${theme==='chalk'
                        ? 'border-chalk-accent bg-chalk-accent/15 shadow-lg shadow-chalk-accent/30'
                        : 'border-blue-500 bg-blue-50 shadow-md shadow-blue-200'}`
                    : ''}
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
