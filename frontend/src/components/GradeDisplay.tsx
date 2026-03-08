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
