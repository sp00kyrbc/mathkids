import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col w-full min-h-screen ${classes.bg} ${classes.font}`}>

      {showHeader && (
        <header className={`flex items-center justify-between px-6 py-3 shrink-0`}>

          {/* Lewo: avatar + dane profilu — KLIKALNE → menu */}
          <button
            onClick={() => navigate('/menu')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity active:scale-95"
          >
            <span className="text-4xl sm:text-5xl">
              {activeProfile?.avatar ?? '\uD83D\uDC28'}
            </span>
            <div className="flex flex-col leading-tight text-left">
              <span className={`font-bold text-base sm:text-lg ${classes.text}`}>
                {activeProfile?.name ?? ''}
              </span>
              <span className={`text-sm sm:text-base opacity-70 ${classes.text}`}>
                Poz. {activeProfile?.level ?? 1} {'\u00B7'} {activeProfile?.xp ?? 0} PD
              </span>
            </div>
          </button>

          {/* Prawo: ThemeSwitcher */}
          <ThemeSwitcher />

        </header>
      )}

      <main className="flex flex-col flex-1 w-full overflow-auto">
        {children}
      </main>

    </div>
  );
}
