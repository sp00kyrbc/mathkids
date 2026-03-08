import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ProfilesPage } from './pages/ProfilesPage';
import { MenuPage } from './pages/MenuPage';
// Pozostałe strony — zostaną dodane w kolejnych plikach
// import { LearnPage } from './pages/LearnPage';
// import { PracticePage } from './pages/PracticePage';
// import { TestPage } from './pages/TestPage';
// import { StatsPage } from './pages/StatsPage';
// import { SettingsPage } from './pages/SettingsPage';

// Guard — przekieruj do profili jeśli brak aktywnego
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const activeProfileId = useAppStore(s => s.activeProfileId);
  if (!activeProfileId) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProfilesPage />} />
        <Route path="/menu" element={
          <ProtectedRoute><MenuPage /></ProtectedRoute>
        } />
        {/* Pozostałe trasy dodawane w kolejnych plikach docs/ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
