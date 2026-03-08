import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import type { Badge } from '../store/useAppStore';

interface BadgePopupProps {
  badge: Badge | null;
  onDismiss: () => void;
}

export function BadgePopup({ badge, onDismiss }: BadgePopupProps) {
  const { classes } = useTheme();

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`${classes.card} p-8 max-w-xs text-center`}
          >
            {/* Konfetti animacja */}
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: 3, duration: 0.5 }}
              className="text-7xl mb-4"
            >
              {badge.emoji}
            </motion.div>

            <p className={`text-sm font-bold uppercase tracking-wider ${classes.text} opacity-60 mb-1`}>
              Nowa odznaka!
            </p>
            <p className={`text-2xl font-bold ${classes.text} mb-2`}>{badge.name}</p>
            <p className={`text-sm ${classes.text} opacity-70 mb-6`}>{badge.description}</p>

            <button
              onClick={onDismiss}
              className={`py-2 px-6 rounded-xl font-bold ${classes.button}`}
            >
              Super! 🎉
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
