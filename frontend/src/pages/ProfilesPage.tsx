import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import type { ChildProfile } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { pl } from '../i18n/pl';

const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🦄', '🐸', '🦋', '🐬', '🦅', '🐙', '🦕'];

export function ProfilesPage() {
  const { profiles, createProfile, deleteProfile, setActiveProfile } = useAppStore();
  const navigate = useNavigate();
  const { classes } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(8);
  const [newAvatar, setNewAvatar] = useState('🦁');

  function handleSelectProfile(profile: ChildProfile) {
    setActiveProfile(profile.id);
    navigate('/menu');
  }

  function handleCreateProfile() {
    if (!newName.trim()) return;
    createProfile({
      name: newName.trim(),
      age: newAge,
      avatar: newAvatar,
      theme: 'chalk',
      feedbackMode: 'immediate',
      settings: {
        maxDigits1: 3,
        maxDigits2: 2,
        selectedOperations: ['addition'],
        soundEnabled: true,
      },
    });
    setShowCreate(false);
    setNewName('');
  }

  return (
    <div className={`min-h-screen ${classes.bg} flex flex-col items-center justify-center p-6`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className={`text-4xl font-bold ${classes.text} mb-2`}>
          🔢 {pl.app.name}
        </h1>
        <p className={`text-lg ${classes.text} opacity-70`}>{pl.profiles.title}</p>
      </motion.div>

      {/* Lista profili */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 w-full max-w-lg">
        {profiles.map((profile, i) => (
          <motion.button
            key={profile.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleSelectProfile(profile)}
            className={`${classes.card} p-4 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform`}
          >
            <span className="text-4xl">{profile.avatar}</span>
            <span className={`font-bold ${classes.text}`}>{profile.name}</span>
            <span className={`text-xs ${classes.text} opacity-60`}>Poz. {profile.level}</span>
            <button
              onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
              className="text-xs opacity-40 hover:opacity-70 mt-1"
            >
              ✕
            </button>
          </motion.button>
        ))}

        {/* Dodaj nowy profil */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: profiles.length * 0.1 }}
          onClick={() => setShowCreate(true)}
          className={`${classes.card} p-4 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform border-dashed`}
        >
          <span className="text-4xl">➕</span>
          <span className={`font-bold ${classes.text}`}>{pl.profiles.newProfile}</span>
        </motion.button>
      </div>

      {/* Modal tworzenia profilu */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`${classes.card} p-6 w-full max-w-sm`}
            >
              <h2 className={`text-2xl font-bold ${classes.text} mb-4`}>{pl.profiles.createProfile}</h2>

              <input
                type="text"
                placeholder={pl.profiles.namePlaceholder}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className={`w-full p-3 rounded-lg mb-3 text-lg ${classes.text} bg-transparent border ${classes.card} focus:outline-none`}
                maxLength={20}
              />

              <div className="mb-3">
                <label className={`text-sm ${classes.text} opacity-70 mb-1 block`}>{pl.profiles.ageLabel}</label>
                <input
                  type="range" min={6} max={13} value={newAge}
                  onChange={e => setNewAge(Number(e.target.value))}
                  className="w-full"
                />
                <span className={`text-sm ${classes.text}`}>{newAge} lat</span>
              </div>

              <div className="mb-4">
                <label className={`text-sm ${classes.text} opacity-70 mb-2 block`}>{pl.profiles.avatarLabel}</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setNewAvatar(a)}
                      className={`text-2xl p-1 rounded ${newAvatar === a ? 'ring-2 ring-yellow-400 bg-yellow-400/20' : ''}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateProfile}
                  disabled={!newName.trim()}
                  className={`flex-1 py-3 rounded-lg font-bold ${classes.button} disabled:opacity-40`}
                >
                  {pl.profiles.save}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className={`flex-1 py-3 rounded-lg ${classes.buttonSecondary}`}
                >
                  {pl.profiles.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
