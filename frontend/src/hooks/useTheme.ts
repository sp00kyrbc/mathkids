import { useAppStore } from '../store/useAppStore';

export function useTheme() {
  const activeProfile = useAppStore(s => s.activeProfile());
  const theme = activeProfile?.theme || 'chalk';

  // Klasy Tailwind zależne od motywu
  const classes = {
    bg: theme === 'chalk' ? 'bg-chalk-bg' : 'bg-notebook-bg',
    text: theme === 'chalk' ? 'text-chalk-text' : 'text-notebook-text',
    accent: theme === 'chalk' ? 'text-chalk-accent' : 'text-notebook-accent',
    card: theme === 'chalk'
      ? 'bg-chalk-bgLight border border-chalk-line rounded-lg'
      : 'bg-white border border-notebook-line rounded-lg shadow-sm',
    button: theme === 'chalk'
      ? 'bg-chalk-accent text-chalk-bg font-chalk font-bold hover:opacity-90'
      : 'bg-notebook-text text-white font-notebook font-bold hover:opacity-90',
    buttonSecondary: theme === 'chalk'
      ? 'border border-chalk-line text-chalk-text font-chalk hover:bg-chalk-bgLight'
      : 'border border-notebook-line text-notebook-text font-notebook hover:bg-notebook-bgDark',
    font: theme === 'chalk' ? 'font-chalk' : 'font-notebook',
    gridBg: theme === 'chalk'
      ? 'bg-chalk-bgLight'
      : 'bg-notebook-bg bg-notebook-grid bg-grid-32',
    error: theme === 'chalk' ? 'text-chalk-error' : 'text-notebook-error',
    success: theme === 'chalk' ? 'text-chalk-success' : 'text-notebook-success',
  };

  return { theme, classes };
}
