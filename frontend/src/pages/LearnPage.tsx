import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';
import type { Operation } from '../store/useAppStore';
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
      <div className="w-full max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-2xl sm:text-3xl font-bold ${classes.text} mb-4 text-center`}
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
              <label className={`text-base sm:text-lg ${classes.text} opacity-70`}>
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
              <label className={`text-base sm:text-lg ${classes.text} opacity-70`}>
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
                <p className={`text-base sm:text-lg ${classes.text} opacity-60`}>{mode.description}</p>
              </div>
              <span className={`ml-auto ${classes.text} opacity-40`}>→</span>
            </motion.button>
          ))}
        </div>

        <button onClick={() => navigate('/menu')} className={`mt-4 w-full py-2 text-base sm:text-lg ${classes.text} opacity-50`}>
          ← Wróć
        </button>
      </div>
    </Layout>
  );
}
