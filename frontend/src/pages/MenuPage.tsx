import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { pl } from '../i18n/pl';

const MENU_ITEMS = [
  { key: 'learn', emoji: '📖', path: '/learn', color: 'from-blue-500 to-blue-700' },
  { key: 'practice', emoji: '✏️', path: '/practice', color: 'from-green-500 to-green-700' },
  { key: 'test', emoji: '📝', path: '/test', color: 'from-purple-500 to-purple-700' },
  { key: 'stats', emoji: '⭐', path: '/stats', color: 'from-yellow-500 to-yellow-700' },
  { key: 'settings', emoji: '⚙️', path: '/settings', color: 'from-gray-500 to-gray-700' },
];

export function MenuPage() {
  const navigate = useNavigate();
  const activeProfile = useAppStore(s => s.activeProfile());
  const clearActiveProfile = useAppStore(s => s.clearActiveProfile);
  const { classes } = useTheme();

  const [greeting, setGreeting] = useState('');
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!activeProfile) return;
    fetch(`${API}/api/ai/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'greeting',
        childName: activeProfile.name,
        childAge: activeProfile.age,
        level: activeProfile.level,
      })
    })
      .then(r => r.json())
      .then(data => setGreeting(data.message))
      .catch(() => setGreeting(`Cześć, ${activeProfile.name}! Co robimy dziś? 🎯`));
  }, [activeProfile?.id]);

  return (
    <Layout>
      <div className="w-full max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-2xl font-bold ${classes.text} mb-6 text-center`}
        >
          {greeting || `Cześć, ${activeProfile?.name}!`}
        </motion.h2>

        <div className="grid grid-cols-2 gap-4">
          {MENU_ITEMS.map((item, i) => (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(item.path)}
              className={`bg-gradient-to-br ${item.color} rounded-2xl p-5 flex flex-col items-center gap-2 text-white shadow-lg hover:shadow-xl transition-shadow ${item.key === 'settings' ? 'col-span-2' : ''}`}
            >
              <span className="text-4xl">{item.emoji}</span>
              <span className="font-bold text-lg">
                {pl.menu[item.key as keyof typeof pl.menu]}
              </span>
            </motion.button>
          ))}
        </div>

        <button
          onClick={() => { clearActiveProfile(); navigate('/'); }}
          className={`mt-6 w-full py-2 text-sm ${classes.text} opacity-50 hover:opacity-80`}
        >
          ← Zmień profil
        </button>
      </div>
    </Layout>
  );
}
