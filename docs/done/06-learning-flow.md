# 06-learning-flow.md — Tryby Nauki: Teoria, Tutorial, Ćwiczenia, Test

## Kontekst
Cztery tryby nauki tworzą kompletną ścieżkę edukacyjną.
Każdy tryb to osobna strona React z odpowiednim flow.

---

## Utwórz: `frontend/src/pages/LearnPage.tsx`

Wybór operacji + trybu nauki:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAppStore, Operation } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { pl } from '../i18n/pl';

const OPERATIONS: { key: Operation; emoji: string; color: string }[] = [
  { key: 'addition', emoji: '➕', color: 'from-blue-400 to-blue-600' },
  { key: 'subtraction', emoji: '➖', color: 'from-red-400 to-red-600' },
  { key: 'multiplication', emoji: '✖️', color: 'from-green-400 to-green-600' },
  { key: 'division', emoji: '➗', color: 'from-purple-400 to-purple-600' },
];

const MODES = [
  { key: 'theory', emoji: '👁️', description: 'Obejrzyj jak to działa' },
  { key: 'tutorial', emoji: '🤝', description: 'Krok po kroku z pomocą' },
  { key: 'practice', emoji: '✏️', description: 'Ćwicz samodzielnie' },
  { key: 'test', emoji: '📝', description: 'Sprawdź się' },
];

export function LearnPage() {
  const navigate = useNavigate();
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());
  const updateSettings = useAppStore(s => s.updateSettings);

  const [selectedOps, setSelectedOps] = useState<Operation[]>(
    activeProfile?.settings.selectedOperations || ['addition']
  );
  const [maxDigits1, setMaxDigits1] = useState(activeProfile?.settings.maxDigits1 || 3);
  const [maxDigits2, setMaxDigits2] = useState(activeProfile?.settings.maxDigits2 || 2);

  function toggleOp(op: Operation) {
    setSelectedOps(prev =>
      prev.includes(op)
        ? prev.length > 1 ? prev.filter(o => o !== op) : prev  // min 1
        : [...prev, op]
    );
  }

  function startMode(modeKey: string) {
    // Zapisz ustawienia w profilu
    updateSettings({ selectedOperations: selectedOps, maxDigits1, maxDigits2 });
    navigate(`/${modeKey}`, { state: { operations: selectedOps, maxDigits1, maxDigits2 } });
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-2xl font-bold ${classes.text} mb-4 text-center`}
        >
          Co chcesz ćwiczyć?
        </motion.h2>

        {/* Wybór działań */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {OPERATIONS.map((op, i) => (
            <motion.button
              key={op.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleOp(op.key)}
              className={`
                p-4 rounded-xl flex items-center gap-3 border-2 transition-all
                ${selectedOps.includes(op.key)
                  ? `bg-gradient-to-r ${op.color} text-white border-transparent shadow-lg`
                  : `${classes.card} border-transparent opacity-60`
                }
              `}
            >
              <span className="text-2xl">{op.emoji}</span>
              <span className="font-bold">{pl.operations[op.key]}</span>
              {selectedOps.includes(op.key) && <span className="ml-auto">✓</span>}
            </motion.button>
          ))}
        </div>

        {/* Ustawienia liczb */}
        <div className={`${classes.card} p-4 mb-6`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>Trudność</h3>
          <div className="space-y-3">
            <div>
              <label className={`text-sm ${classes.text} opacity-70`}>
                Pierwsza liczba: max {maxDigits1} {maxDigits1 === 1 ? 'cyfra' : maxDigits1 < 5 ? 'cyfry' : 'cyfr'}
              </label>
              <input
                type="range" min={1} max={6} value={maxDigits1}
                onChange={e => setMaxDigits1(Number(e.target.value))}
                className="w-full mt-1"
              />
              <div className="flex justify-between text-xs opacity-50">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
              </div>
            </div>
            <div>
              <label className={`text-sm ${classes.text} opacity-70`}>
                Druga liczba: max {maxDigits2} {maxDigits2 === 1 ? 'cyfra' : maxDigits2 < 5 ? 'cyfry' : 'cyfr'}
              </label>
              <input
                type="range" min={1} max={4} value={maxDigits2}
                onChange={e => setMaxDigits2(Number(e.target.value))}
                className="w-full mt-1"
              />
            </div>
          </div>
        </div>

        {/* Tryby nauki */}
        <h3 className={`font-bold ${classes.text} mb-3`}>Jak chcesz się uczyć?</h3>
        <div className="space-y-2">
          {MODES.map((mode, i) => (
            <motion.button
              key={mode.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              onClick={() => startMode(mode.key)}
              className={`w-full ${classes.card} p-4 flex items-center gap-4 hover:scale-[1.02] transition-transform`}
            >
              <span className="text-3xl">{mode.emoji}</span>
              <div className="text-left">
                <p className={`font-bold ${classes.text}`}>
                  {pl.modes[mode.key as keyof typeof pl.modes].title}
                </p>
                <p className={`text-sm ${classes.text} opacity-60`}>{mode.description}</p>
              </div>
              <span className={`ml-auto ${classes.text} opacity-40`}>→</span>
            </motion.button>
          ))}
        </div>

        <button onClick={() => navigate('/menu')} className={`mt-4 w-full py-2 text-sm ${classes.text} opacity-50`}>
          ← Wróć
        </button>
      </div>
    </Layout>
  );
}
```

---

## Utwórz: `frontend/src/pages/TheoryPage.tsx`

Animowane wyjaśnienie algorytmu:

```typescript
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useTheme } from '../hooks/useTheme';

// Teoria dla każdej operacji (kroki animowane)
const THEORY: Record<string, { title: string; steps: { text: string; visual: string }[] }> = {
  addition: {
    title: 'Jak dodawać pod kreską?',
    steps: [
      { text: 'Zapisujemy liczby jedna pod drugą, wyrównując do prawej strony (jedności pod jednościami, dziesiątki pod dziesiątkami).', visual: '  456\n+ 278\n─────' },
      { text: 'Zaczynamy od prawej kolumny (jedności). Dodajemy: 6 + 8 = 14. Zapisujemy 4 pod kreską, a 1 przenosimy do następnej kolumny.', visual: '  ¹\n  456\n+ 278\n─────\n    4' },
      { text: 'Dziesiątki: 5 + 7 + 1 (przeniesienie) = 13. Zapisujemy 3, przenosimy 1.', visual: '  ¹¹\n  456\n+ 278\n─────\n   34' },
      { text: 'Setki: 4 + 2 + 1 (przeniesienie) = 7. Zapisujemy 7.', visual: '  456\n+ 278\n─────\n  734' },
      { text: 'Wynik: 456 + 278 = 734 ✓', visual: '  456\n+ 278\n─────\n  734\n  ✓' },
    ]
  },
  subtraction: {
    title: 'Jak odejmować pod kreską?',
    steps: [
      { text: 'Zapisujemy liczby jedna pod drugą. Większa liczba na górze!', visual: '  521\n-  78\n─────' },
      { text: 'Jedności: 1 - 8. Za mało! Pożyczamy 10 z dziesiątek. Teraz 11 - 8 = 3.', visual: '  5²¹\n-  78\n─────\n    3' },
      { text: 'Dziesiątki: mamy już tylko 1 (pożyczyliśmy). 1 - 7. Za mało! Pożyczamy z setek. 11 - 7 = 4.', visual: '  4¹¹\n-  78\n─────\n   43' },
      { text: 'Setki: 4 - 0 = 4.', visual: '  521\n-  78\n─────\n  443' },
    ]
  },
  multiplication: {
    title: 'Jak mnożyć pod kreską?',
    steps: [
      { text: 'Mnożymy przez każdą cyfrę mnożnika osobno, od prawej.', visual: '  345\n×  23\n─────' },
      { text: 'Najpierw 345 × 3 (jedności mnożnika).', visual: '  345\n×  23\n─────\n 1035' },
      { text: 'Teraz 345 × 2 (dziesiątki). Wynik piszemy z przesunięciem o jedno miejsce w lewo (bo to dziesiątki).', visual: '  345\n×  23\n─────\n 1035\n6900 ' },
      { text: 'Dodajemy oba wyniki cząstkowe!', visual: '  345\n×  23\n─────\n 1035\n+6900\n─────\n 7935' },
    ]
  },
  division: {
    title: 'Jak dzielić pod kreską?',
    steps: [
      { text: 'Dzielnik piszemy po prawej stronie pionowej kreski. Dzielną po lewej.', visual: '126 | 6\n    |───' },
      { text: 'Bierzemy cyfry dzielnej od lewej — tyle ile potrzeba by podzielić. 12 ÷ 6 = 2.', visual: '126 | 6\n 12 |───\n    | 2' },
      { text: 'Zapisujemy 2 w wyniku. Obliczamy 2 × 6 = 12. Odejmujemy od 12: reszta 0.', visual: '126 | 6\n 12 |───\n─── | 2\n  06' },
      { text: 'Piszemy w dół następną cyfrę dzielnej (6). Teraz 6 ÷ 6 = 1.', visual: '126 | 6\n    |───\n    | 21\nWynik: 21 ✓' },
    ]
  },
};

export function TheoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { classes, theme } = useTheme();
  const ops: string[] = location.state?.operations || ['addition'];
  const [opIndex, setOpIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const currentOp = ops[opIndex];
  const theory = THEORY[currentOp];
  const currentStep = theory.steps[stepIndex];
  const isLast = stepIndex === theory.steps.length - 1;
  const isLastOp = opIndex === ops.length - 1;

  function next() {
    if (!isLast) {
      setStepIndex(i => i + 1);
    } else if (!isLastOp) {
      setOpIndex(i => i + 1);
      setStepIndex(0);
    } else {
      navigate('/tutorial', { state: location.state });
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h2 className={`text-xl font-bold ${classes.text} mb-4 text-center`}>{theory.title}</h2>

        {/* Wizualizacja */}
        <motion.div
          key={`${opIndex}-${stepIndex}`}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${classes.gridBg} ${theme === 'chalk' ? 'chalk-texture' : 'notebook-grid'} rounded-2xl p-6 mb-4 font-mono text-center`}
        >
          <pre className={`text-xl ${classes.text} ${theme === 'chalk' ? 'chalk-text font-chalk' : 'font-notebook'} whitespace-pre`}>
            {currentStep.visual}
          </pre>
        </motion.div>

        {/* Opis */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`desc-${opIndex}-${stepIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`${classes.card} p-4 mb-6 text-center`}
          >
            <p className={`${classes.text} text-base leading-relaxed`}>{currentStep.text}</p>
          </motion.div>
        </AnimatePresence>

        {/* Postęp */}
        <div className="flex justify-center gap-2 mb-4">
          {theory.steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === stepIndex
                  ? theme === 'chalk' ? 'bg-chalk-accent w-6' : 'bg-notebook-text w-6'
                  : i < stepIndex ? 'bg-green-400' : 'bg-gray-400/30'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className={`w-full py-4 rounded-xl font-bold text-lg ${classes.button}`}
        >
          {isLast && isLastOp ? '🚀 Zacznijmy ćwiczyć!' : 'Dalej →'}
        </button>

        <button onClick={() => navigate('/learn')} className={`mt-2 w-full py-2 text-sm ${classes.text} opacity-50`}>
          ← Wróć
        </button>
      </div>
    </Layout>
  );
}
```

---

## Utwórz: `frontend/src/pages/PracticePage.tsx`

Tryb ćwiczeń + tutorial (wspólna logika, różna pomoc):

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout';
import { TaskDisplay } from '../components/TaskDisplay';
import { XPPopup } from '../components/XPPopup';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { Task } from '../types/task';

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
```

---

## Utwórz: `frontend/src/pages/TestPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout';
import { TaskDisplay } from '../components/TaskDisplay';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { Task } from '../types/task';
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
  const [gradeData, setGradeData] = useState<any>(null);
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
```

---

## Utwórz: `frontend/src/components/GradeDisplay.tsx`

```typescript
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

const GRADE_COLORS: Record<number, string> = {
  6: 'from-yellow-400 to-yellow-600',
  5: 'from-green-400 to-green-600',
  4: 'from-blue-400 to-blue-600',
  3: 'from-purple-400 to-purple-600',
  2: 'from-orange-400 to-orange-600',
  1: 'from-red-400 to-red-600',
};

const GRADE_EMOJIS: Record<number, string> = {
  6: '🏆', 5: '⭐', 4: '👍', 3: '📚', 2: '💪', 1: '🌱',
};

interface GradeDisplayProps {
  grade: { grade: number; percentage: number; correct: number; total: number; message: string; stars: number };
  aiMessage: string;
  onRetry: () => void;
  onMenu: () => void;
}

export function GradeDisplay({ grade, aiMessage, onRetry, onMenu }: GradeDisplayProps) {
  const { classes } = useTheme();

  return (
    <div className="max-w-md mx-auto text-center">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${GRADE_COLORS[grade.grade]} flex items-center justify-center mb-6 shadow-2xl`}
      >
        <div>
          <div className="text-5xl font-bold text-white">{grade.grade}</div>
          <div className="text-lg">{GRADE_EMOJIS[grade.grade]}</div>
        </div>
      </motion.div>

      {/* Gwiazdy */}
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3].map(i => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: i <= grade.stars ? 1 : 0.4, opacity: i <= grade.stars ? 1 : 0.3 }}
            transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
            className="text-4xl"
          >
            ⭐
          </motion.span>
        ))}
      </div>

      <p className={`text-xl font-bold ${classes.text} mb-2`}>{grade.message}</p>
      <p className={`${classes.text} opacity-70 mb-2`}>
        {grade.correct} / {grade.total} poprawnych ({grade.percentage}%)
      </p>

      {aiMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={`${classes.card} p-4 mb-6 text-base italic ${classes.text}`}
        >
          {aiMessage}
        </motion.div>
      )}

      <div className="flex gap-3">
        <button onClick={onRetry} className={`flex-1 py-3 rounded-xl font-bold ${classes.button}`}>
          Spróbuj ponownie
        </button>
        <button onClick={onMenu} className={`flex-1 py-3 rounded-xl ${classes.buttonSecondary}`}>
          Menu
        </button>
      </div>
    </div>
  );
}
```

---

## Utwórz: `frontend/src/components/XPPopup.tsx`

```typescript
import { motion } from 'framer-motion';

export function XPPopup({ xp }: { xp: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: 1, y: -60, scale: 1 }}
      exit={{ opacity: 0, y: -100 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-yellow-900 font-bold text-xl px-6 py-3 rounded-full shadow-xl pointer-events-none"
    >
      +{xp} PD ⚡
    </motion.div>
  );
}
```

---

## Zaktualizuj `frontend/src/App.tsx` — dodaj trasy

Dodaj importy i trasy dla nowych stron:

```typescript
import { LearnPage } from './pages/LearnPage';
import { TheoryPage } from './pages/TheoryPage';
import { PracticePage } from './pages/PracticePage';
import { TestPage } from './pages/TestPage';

// W <Routes>:
<Route path="/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
<Route path="/theory" element={<ProtectedRoute><TheoryPage /></ProtectedRoute>} />
<Route path="/tutorial" element={<ProtectedRoute><PracticePage isTutorial={true} /></ProtectedRoute>} />
<Route path="/practice" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} />
<Route path="/test" element={<ProtectedRoute><TestPage /></ProtectedRoute>} />
```

---

## ✅ Weryfikacja po tym kroku

- [ ] Strona `/learn` pokazuje wybór działań i poziomów
- [ ] Tryb Teorii pokazuje animowane wyjaśnienie krok po kroku
- [ ] Tryb Ćwiczeń pobiera zadania z backendu i wyświetla siatkę
- [ ] Test kończy się oceną szkolną 1–6 z animacją
- [ ] XP jest dodawane po poprawnych odpowiedziach

Następny krok: `docs/07-gamification.md`
