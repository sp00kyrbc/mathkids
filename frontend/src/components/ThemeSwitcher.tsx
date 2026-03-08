import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

export function ThemeSwitcher() {
  const activeProfile = useAppStore(s => s.activeProfile());
  const updateProfile = useAppStore(s => s.updateProfile);
  const { theme } = useTheme();

  function toggle() {
    if (!activeProfile) return;
    updateProfile(activeProfile.id, {
      theme: theme === 'chalk' ? 'notebook' : 'chalk'
    });
  }

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        text-base sm:text-lg font-bold
        transition-all active:scale-95
        ${theme === 'chalk'
          ? 'bg-white/20 text-white hover:bg-white/30'
          : 'bg-black/10 text-gray-800 hover:bg-black/20'}
      `}
    >
      <span className="text-2xl">{theme === 'chalk' ? '\uD83D\uDCD3' : '\uD83D\uDD8A\uFE0F'}</span>
      <span>{theme === 'chalk' ? 'Zeszyt' : 'Tablica'}</span>
    </button>
  );
}
