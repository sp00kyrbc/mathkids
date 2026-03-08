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
        <span className={`text-base sm:text-lg font-bold ${classes.text}`}>
          {'\u2713'} {current}/{total}
        </span>
      )}
      <div className={`
        w-40 sm:w-56 h-4 sm:h-5 rounded-full overflow-hidden
        ${theme === 'chalk' ? 'bg-white/20' : 'bg-gray-200'}
      `}>
        <div
          className={`h-full rounded-full transition-all duration-500
            ${theme === 'chalk' ? 'bg-green-400' : 'bg-green-500'}
          `}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
