import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

export function ThemeSwitcher() {
  const setTheme = useAppStore(s => s.setTheme);
  const { theme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'chalk' ? 'notebook' : 'chalk')}
      title={theme === 'chalk' ? 'Prze\u0142\u0105cz na zeszyt' : 'Prze\u0142\u0105cz na tablic\u0119'}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold
        transition-all active:scale-95
        ${theme === 'chalk'
          ? 'bg-chalk-text/20 text-chalk-text hover:bg-chalk-text/30'
          : 'bg-notebook-text/10 text-notebook-text hover:bg-notebook-text/20'}
      `}
    >
      <span>{theme === 'chalk' ? '\uD83D\uDCD3' : '\uD83D\uDD8A\uFE0F'}</span>
      <span className="hidden sm:inline">
        {theme === 'chalk' ? 'Zeszyt' : 'Tablica'}
      </span>
    </button>
  );
}
