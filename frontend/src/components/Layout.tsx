import type { ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function Layout({ children, showHeader = true }: LayoutProps) {
  const { theme, classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());

  return (
    <div className={`flex flex-col w-full min-h-screen ${classes.bg} ${classes.font}`}>

      {showHeader && (
        <header className="flex items-center justify-between px-4 py-2 shrink-0">
          {/* Lewo: profil */}
          <div className="flex items-center gap-2">
            {activeProfile && (
              <>
                <span className="text-2xl">{activeProfile.avatar}</span>
                <div className="flex flex-col leading-tight">
                  <span className={`font-bold text-sm ${classes.text}`}>{activeProfile.name}</span>
                  <span className={`text-xs opacity-60 ${classes.text}`}>
                    Poz. {activeProfile.level} \u00B7 {activeProfile.xp} PD
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Prawo: ThemeSwitcher */}
          <ThemeSwitcher />
        </header>
      )}

      {/* Główna treść — zajmuje całą pozostałą wysokość */}
      <main className="flex flex-col flex-1 w-full overflow-auto">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>

    </div>
  );
}
