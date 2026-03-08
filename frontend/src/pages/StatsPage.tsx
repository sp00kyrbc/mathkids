import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAppStore, XP_PER_LEVEL } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

export function StatsPage() {
  const navigate = useNavigate();
  const { classes } = useTheme();
  const activeProfile = useAppStore(s => s.activeProfile());

  if (!activeProfile) return null;

  const { xp, level, streak, badges, stats } = activeProfile;
  const xpForNext = XP_PER_LEVEL[level] - xp;
  const xpProgress = ((xp - XP_PER_LEVEL[level - 1]) / (XP_PER_LEVEL[level] - XP_PER_LEVEL[level - 1])) * 100;

  const unlockedBadges = badges.filter(b => b.unlockedAt);
  const lockedBadges = badges.filter(b => !b.unlockedAt);

  const opLabels: Record<string, string> = {
    addition: 'Dodawanie', subtraction: 'Odejmowanie',
    multiplication: 'Mnożenie', division: 'Dzielenie'
  };

  return (
    <Layout>
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/menu')} className={`text-sm ${classes.text} opacity-60`}>← Wróć</button>
          <h2 className={`text-xl font-bold ${classes.text}`}>Moje wyniki</h2>
          <div className="w-10" />
        </div>

        {/* XP i poziom */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${classes.card} p-4 mb-4`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`font-bold ${classes.text}`}>Poziom {level}</span>
            <span className={`text-sm ${classes.text} opacity-60`}>{xp} PD</span>
          </div>
          <div className="w-full h-4 rounded-full bg-black/20 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(xpProgress, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className={`text-xs ${classes.text} opacity-50 mt-1`}>
            {xpForNext} PD do następnego poziomu
          </p>
          {streak > 0 && (
            <p className="text-sm mt-2">🔥 Seria: <strong>{streak}</strong> {streak === 1 ? 'dzień' : streak < 5 ? 'dni' : 'dni'} z rzędu</p>
          )}
        </motion.div>

        {/* Statystyki działań */}
        <div className={`${classes.card} p-4 mb-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>Rozwiązane zadania</h3>
          <div className="space-y-2">
            {Object.entries(stats).map(([op, s]) => (
              <div key={op} className="flex items-center gap-3">
                <span className={`text-sm w-28 ${classes.text} opacity-70`}>{opLabels[op]}</span>
                <div className="flex-1 h-3 rounded-full bg-black/20 overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: s.total > 0 ? `${(s.correct / s.total) * 100}%` : '0%' }}
                  />
                </div>
                <span className={`text-xs ${classes.text} opacity-60 w-16 text-right`}>
                  {s.correct}/{s.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Odznaki */}
        <div className={`${classes.card} p-4`}>
          <h3 className={`font-bold ${classes.text} mb-3`}>
            Odznaki ({unlockedBadges.length}/{badges.length})
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {unlockedBadges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                title={badge.name}
                className="text-2xl text-center cursor-help"
              >
                {badge.emoji}
              </motion.div>
            ))}
            {lockedBadges.map((badge) => (
              <div key={badge.id} title={badge.description} className="text-2xl text-center opacity-20 cursor-help">
                🔒
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
