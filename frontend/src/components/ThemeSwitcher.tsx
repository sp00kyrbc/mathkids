import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

export function ThemeSwitcher() {
  const setTheme = useAppStore(s => s.setTheme);
  const { theme, classes } = useTheme();

  return (
    <motion.button
      onClick={() => setTheme(theme === 'chalk' ? 'notebook' : 'chalk')}
      className={`fixed top-4 right-4 z-50 p-2 rounded-full text-2xl ${classes.card} cursor-pointer`}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      title={theme === 'chalk' ? 'Przełącz na zeszyt' : 'Przełącz na tablicę'}
    >
      {theme === 'chalk' ? '📓' : '🖊️'}
    </motion.button>
  );
}
