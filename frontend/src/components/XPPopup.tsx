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
