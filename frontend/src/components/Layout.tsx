import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTheme } from '../hooks/useTheme';
import { useAppStore, XP_PER_LEVEL } from '../store/useAppStore';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function Layout({ children, showHeader = true }: LayoutProps) {
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());

  const xpProgress = activeProfile
    ? ((activeProfile.xp - XP_PER_LEVEL[activeProfile.level - 1]) /
       (XP_PER_LEVEL[activeProfile.level] - XP_PER_LEVEL[activeProfile.level - 1])) * 100
    : 0;

  return (
    <div className={`min-h-screen ${classes.bg} ${classes.font} transition-colors duration-300`}>
      <ThemeSwitcher />

      {showHeader && activeProfile && (
        <header className={`px-4 pt-4 pb-2 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeProfile.avatar}</span>
            <div>
              <p className={`font-bold text-sm ${classes.text}`}>{activeProfile.name}</p>
              <p className={`text-xs opacity-70 ${classes.text}`}>
                Poz. {activeProfile.level} · {activeProfile.xp} PD
              </p>
            </div>
          </div>

          {/* Pasek XP */}
          <div className="flex items-center gap-2">
            <div className="w-32 h-3 rounded-full bg-black/20 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${classes.accent === 'text-chalk-accent' ? 'bg-chalk-accent' : 'bg-notebook-text'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <span className={`text-xs ${classes.text} opacity-70`}>
              🔥 {activeProfile.streak}
            </span>
          </div>
        </header>
      )}

      <main className="p-4">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
}
