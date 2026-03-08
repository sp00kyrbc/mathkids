import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout';
import { ArithmeticDisplay } from '../components/ArithmeticDisplay';
import { ProgressBar } from '../components/ProgressBar';
import { XPPopup } from '../components/XPPopup';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import type { Task } from '../types/task';

const API = import.meta.env.VITE_API_URL;

interface PracticePageProps {
  isTutorial?: boolean;
}

export function PracticePage({ isTutorial = false }: PracticePageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());
  const addXP = useAppStore(s => s.addXP);

  const ops = location.state?.operations || activeProfile?.settings.selectedOperations || ['addition'];
  const maxDigits1 = location.state?.maxDigits1 || activeProfile?.settings.maxDigits1 || 3;
  const maxDigits2 = location.state?.maxDigits2 || activeProfile?.settings.maxDigits2 || 2;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskCorrect, setTaskCorrect] = useState(true);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [streak, setStreak] = useState(0);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setTaskCorrect(true);
    try {
      const op = ops[Math.floor(Math.random() * ops.length)];
      const res = await fetch(`${API}/api/tasks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: op, max_digits1: maxDigits1, max_digits2: maxDigits2 })
      });
      const data = await res.json();
      setTask(data);
    } catch (e) {
      console.error('B\u0142\u0105d pobierania zadania:', e);
    } finally {
      setLoading(false);
    }
  }, [ops, maxDigits1, maxDigits2]);

  useEffect(() => { fetchTask(); }, []);

  function handleStepComplete(correct: boolean) {
    if (!correct) setTaskCorrect(false);
  }

  function handleTaskComplete(correct: boolean) {
    if (!activeProfile) return;

    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);

    let xp = correct ? 10 : 0;
    if (taskCorrect) xp += 5;
    if (newStreak > 1) xp += Math.min(newStreak - 1, 5);

    if (xp > 0) {
      addXP(activeProfile.id, xp);
      setXpGained(xp);
      setTimeout(() => setXpGained(null), 2000);
    }

    setTasksCompleted(c => c + 1);
    setTimeout(fetchTask, 800);
  }

  return (
    <Layout>
      <div className="flex flex-col flex-1 w-full h-full">

        {/* Górny pasek: Wróć + postęp */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <button onClick={() => navigate(-1)} className={`text-base sm:text-lg font-bold ${classes.text} opacity-70 hover:opacity-100 flex items-center gap-1`}>
            {'\u2190'} Wróć
          </button>
          <ProgressBar current={tasksCompleted} total={tasksCompleted + 1} />
        </div>

        {/* Tytuł */}
        <div className="text-center py-2 shrink-0">
          <p className={`text-2xl sm:text-3xl font-bold ${classes.text}`}>
            {isTutorial ? '\uD83E\uDDE1 Zr\u00f3bmy razem' : '\u270F\uFE0F Twoja kolej!'}
          </p>
        </div>

        {/* SIATKA — rośnie żeby wypełnić resztę ekranu */}
        <div className="flex flex-1 items-center justify-center p-4 overflow-auto">
          {loading ? (
            <div className={`text-center ${classes.text} opacity-60`}>
              Przygotowuję zadanie...
            </div>
          ) : task ? (
            <ArithmeticDisplay
              task={task}
              mode={isTutorial ? 'tutorial' : 'practice'}
              onStepComplete={handleStepComplete}
              onTaskComplete={handleTaskComplete}
              feedbackMode={activeProfile?.feedbackMode || 'immediate'}
            />
          ) : (
            <div className={`text-center ${classes.text}`}>
              Nie można załadować zadania. <button onClick={fetchTask} className="underline">Spróbuj ponownie</button>
            </div>
          )}
        </div>

        {/* XP Popup */}
        <AnimatePresence>
          {xpGained && <XPPopup xp={xpGained} />}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
