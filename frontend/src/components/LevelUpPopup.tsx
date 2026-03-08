import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

interface LevelUpPopupProps {
  level: number | null;
  aiMessage?: string;
  onDismiss: () => void;
}

// Prosta animacja "konfetti" w CSS
const CONFETTI_COLORS = ['#ffd700', '#ff6b6b', '#69db7c', '#74c0fc', '#da77f2'];

export function LevelUpPopup({ level, aiMessage, onDismiss }: LevelUpPopupProps) {
  const { classes } = useTheme();

  useEffect(() => {
    if (level) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [level]);

  return (
    <AnimatePresence>
      {level && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center overflow-hidden"
        >
          {/* Animowane kółka w tle */}
          {CONFETTI_COLORS.map((color, i) => (
            <motion.div
              key={i}
              initial={{ y: '110vh', x: `${10 + i * 20}vw`, rotate: 0 }}
              animate={{ y: '-10vh', rotate: 360 }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
              className="absolute w-4 h-4 rounded-full opacity-70"
              style={{ backgroundColor: color }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={`${classes.card} p-8 w-full max-w-xl text-center relative z-10`}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: 3, duration: 0.6 }}
              className="text-6xl mb-3"
            >
              🚀
            </motion.div>
            <p className="text-yellow-400 font-bold text-sm uppercase tracking-widest mb-2">
              Poziom wyżej!
            </p>
            <p className={`text-5xl font-bold ${classes.text} mb-4`}>
              Poziom {level}
            </p>
            {aiMessage && (
              <p className={`${classes.text} opacity-80 text-base italic mb-4`}>
                {aiMessage}
              </p>
            )}
            <button onClick={onDismiss} className={`py-2 px-6 rounded-xl font-bold ${classes.button}`}>
              Wchodzę wyżej! 💪
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
