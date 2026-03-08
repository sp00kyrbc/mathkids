import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout';
import { ArithmeticDisplay } from '../components/ArithmeticDisplay';
import { ProgressBar } from '../components/ProgressBar';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import type { Task } from '../types/task';
import { GradeDisplay } from '../components/GradeDisplay';

const API = import.meta.env.VITE_API_URL;

export function TestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());
  const addXP = useAppStore(s => s.addXP);

  const ops = location.state?.operations || activeProfile?.settings.selectedOperations || ['addition'];
  const maxDigits1 = location.state?.maxDigits1 || activeProfile?.settings.maxDigits1 || 3;
  const maxDigits2 = location.state?.maxDigits2 || activeProfile?.settings.maxDigits2 || 2;
  const COUNT = 5;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [testComplete, setTestComplete] = useState(false);
  const [gradeData, setGradeData] = useState<{
    grade: number; percentage: number; correct: number; total: number; message: string; stars: number;
  } | null>(null);
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch(`${API}/api/tasks/generate-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operations: ops, max_digits1: maxDigits1, max_digits2: maxDigits2, count: COUNT })
        });
        const data = await res.json();
        setTasks(data.tasks);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  async function handleTaskComplete(correct: boolean) {
    const newResults = [...results, correct];
    setResults(newResults);

    if (newResults.length === tasks.length) {
      const correctCount = newResults.filter(Boolean).length;
      const gradeRes = await fetch(`${API}/api/validate/test-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct: correctCount, total: tasks.length })
      });
      const grade = await gradeRes.json();
      setGradeData(grade);

      if (activeProfile) {
        const xp = 50 + grade.grade * 10;
        addXP(activeProfile.id, xp);

        try {
          const aiRes = await fetch(`${API}/api/ai/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'test_result',
              childName: activeProfile.name,
              childAge: activeProfile.age,
              level: activeProfile.level,
              context: { grade: grade.grade, correct: correctCount, total: tasks.length }
            })
          });
          const aiData = await aiRes.json();
          setAiMessage(aiData.message);
        } catch {
          // AI message jest opcjonalny
        }
      }

      setTestComplete(true);
    } else {
      setTimeout(() => setCurrentTaskIndex(i => i + 1), 600);
    }
  }

  if (testComplete && gradeData) {
    return (
      <Layout>
        <GradeDisplay
          grade={gradeData}
          aiMessage={aiMessage}
          onRetry={() => navigate('/test', { state: location.state })}
          onMenu={() => navigate('/menu')}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col flex-1 w-full h-full">

        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <button onClick={() => navigate(-1)} className={`text-base sm:text-lg font-bold ${classes.text} opacity-70 hover:opacity-100 flex items-center gap-1`}>
            {'\u2190'} Wróć
          </button>
          <ProgressBar current={currentTaskIndex} total={COUNT} />
        </div>

        <div className="text-center py-2 shrink-0">
          <p className={`text-2xl sm:text-3xl font-bold ${classes.text}`}>{'\uD83D\uDCDD'} Test</p>
        </div>

        <div className="flex flex-1 items-center justify-center p-4 overflow-auto">
          {loading ? (
            <div className={`text-center ${classes.text} opacity-60`}>Przygotowuję test...</div>
          ) : tasks[currentTaskIndex] ? (
            <AnimatePresence mode="wait">
              <motion.div key={currentTaskIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}>
                <ArithmeticDisplay
                  task={tasks[currentTaskIndex]}
                  mode="test"
                  onStepComplete={() => {}}
                  onTaskComplete={handleTaskComplete}
                  feedbackMode="after"
                />
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>

      </div>
    </Layout>
  );
}
