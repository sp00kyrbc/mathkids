import { useTheme } from '../hooks/useTheme';

interface ProgressBarProps {
  current: number;
  total: number;
  showText?: boolean;
}

export function ProgressBar({ current, total, showText = true }: ProgressBarProps) {
  const { theme, classes } = useTheme();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      {showText && (
        <span className={`text-sm font-bold ${classes.text}`}>
          \u2713 {current}/{total}
        </span>
      )}
      <div className={`w-32 sm:w-48 h-3 rounded-full overflow-hidden ${theme === 'chalk' ? 'bg-chalk-text/20' : 'bg-gray-200'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${theme === 'chalk' ? 'bg-chalk-success' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
