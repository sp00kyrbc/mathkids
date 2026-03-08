import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout';
import { TaskDisplay } from '../components/TaskDisplay';
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
  const [currentStep, setCurrentStep] = useState(0);
  const [taskCorrect, setTaskCorrect] = useState(true);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [streak, setStreak] = useState(0);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setCurrentStep(0);
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
      console.error('Błąd pobierania zadania:', e);
    } finally {
      setLoading(false);
    }
  }, [ops, maxDigits1, maxDigits2]);

  useEffect(() => { fetchTask(); }, []);

  function handleStepComplete(correct: boolean) {
    if (!correct) setTaskCorrect(false);
    if (currentStep < (task?.steps.length || 0) - 1) {
      setCurrentStep(s => s + 1);
    }
  }

  function handleTaskComplete(correct: boolean) {
    if (!activeProfile) return;

    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);

    // XP: 10 base, +5 jeśli poprawna za pierwszym razem, bonus za serię
    let xp = correct ? 10 : 0;
    if (taskCorrect) xp += 5;  // bezbłędne
    if (newStreak > 1) xp += Math.min(newStreak - 1, 5);  // seria max +5

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
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/learn')} className={`text-sm ${classes.text} opacity-60`}>← Wróć</button>
          <div className="flex gap-3">
            <span className={`text-sm ${classes.text} opacity-60`}>
              ✓ {tasksCompleted} zadań
            </span>
            {streak > 1 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-sm font-bold text-orange-400"
              >
                🔥 {streak}
              </motion.span>
            )}
          </div>
        </div>

        <h2 className={`text-xl font-bold ${classes.text} mb-4 text-center`}>
          {isTutorial ? '🤝 Zróbmy razem' : '✏️ Twoja kolej!'}
        </h2>

        {loading ? (
          <div className={`text-center ${classes.text} py-20 opacity-60`}>
            Przygotowuję zadanie...
          </div>
        ) : task ? (
          <TaskDisplay
            task={task}
            mode={isTutorial ? 'tutorial' : 'practice'}
            currentStepId={currentStep}
            onStepComplete={handleStepComplete}
            onTaskComplete={handleTaskComplete}
            feedbackMode={activeProfile?.feedbackMode || 'immediate'}
          />
        ) : (
          <div className={`text-center ${classes.text} py-20`}>
            Nie można załadować zadania. <button onClick={fetchTask} className="underline">Spróbuj ponownie</button>
          </div>
        )}

        {/* XP Popup */}
        <AnimatePresence>
          {xpGained && <XPPopup xp={xpGained} />}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
