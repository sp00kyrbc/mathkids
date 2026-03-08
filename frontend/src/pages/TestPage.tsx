import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout';
import { TaskDisplay } from '../components/TaskDisplay';
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
      // Test zakończony
      const correctCount = newResults.filter(Boolean).length;
      const gradeRes = await fetch(`${API}/api/validate/test-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct: correctCount, total: tasks.length })
      });
      const grade = await gradeRes.json();
      setGradeData(grade);

      // XP za test
      if (activeProfile) {
        const xp = 50 + grade.grade * 10;
        addXP(activeProfile.id, xp);

        // Komunikat AI
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
      <div className="max-w-md mx-auto">
        {/* Postęp */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm ${classes.text} opacity-60`}>
            Zadanie {currentTaskIndex + 1} / {COUNT}
          </span>
          <div className="flex gap-1">
            {Array(COUNT).fill(null).map((_, i) => (
              <div key={i} className={`w-6 h-2 rounded-full transition-all ${
                i < results.length
                  ? results[i] ? 'bg-green-400' : 'bg-red-400'
                  : i === currentTaskIndex ? 'bg-yellow-400' : 'bg-gray-400/30'
              }`} />
            ))}
          </div>
        </div>

        {loading ? (
          <div className={`text-center ${classes.text} py-20 opacity-60`}>Przygotowuję test...</div>
        ) : tasks[currentTaskIndex] ? (
          <AnimatePresence mode="wait">
            <motion.div key={currentTaskIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}>
              <TaskDisplay
                task={tasks[currentTaskIndex]}
                mode="test"
                currentStepId={0}
                onStepComplete={() => {}}
                onTaskComplete={handleTaskComplete}
                feedbackMode="after"
              />
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </Layout>
  );
}
