import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { pl } from '../i18n/pl';

export function SettingsPage() {
  const navigate = useNavigate();
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());
  const setTheme = useAppStore(s => s.setTheme);
  const setFeedbackMode = useAppStore(s => s.setFeedbackMode);

  if (!activeProfile) return null;

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/menu')} className={`text-sm ${classes.text} opacity-60`}>← Wróć</button>
          <h2 className={`text-xl font-bold ${classes.text}`}>{pl.settings.title}</h2>
        </div>

        <div className={`${classes.card} p-4 mb-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>{pl.settings.theme}</h3>
          <div className="flex gap-3">
            {(['chalk', 'notebook'] as const).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeProfile.theme === t ? classes.button : classes.buttonSecondary}`}>
                {t === 'chalk' ? '🖊️ Tablica' : '📓 Zeszyt'}
              </button>
            ))}
          </div>
        </div>

        <div className={`${classes.card} p-4 mb-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>{pl.settings.feedbackMode}</h3>
          <div className="space-y-2">
            {(['immediate', 'after'] as const).map(mode => (
              <button key={mode} onClick={() => setFeedbackMode(mode)}
                className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${activeProfile.feedbackMode === mode ? classes.button : classes.buttonSecondary}`}>
                <span>{mode === 'immediate' ? '⚡' : '🎭'}</span>
                <div>
                  <div className="font-bold text-sm">{mode === 'immediate' ? pl.settings.feedbackImmediate : pl.settings.feedbackAfter}</div>
                  <div className="text-xs opacity-70">{mode === 'immediate' ? 'Błąd zaznaczany natychmiast' : 'Pokaż poprawne po ukończeniu'}</div>
                </div>
                {activeProfile.feedbackMode === mode && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={`${classes.card} p-4`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{activeProfile.avatar}</span>
            <div>
              <p className={`font-bold ${classes.text}`}>{activeProfile.name}</p>
              <p className={`text-sm ${classes.text} opacity-60`}>{activeProfile.age} lat · Poziom {activeProfile.level}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
