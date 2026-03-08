import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ProfilesPage } from './pages/ProfilesPage';
import { MenuPage } from './pages/MenuPage';
import { LearnPage } from './pages/LearnPage';
import { TheoryPage } from './pages/TheoryPage';
import { PracticePage } from './pages/PracticePage';
import { TestPage } from './pages/TestPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';

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
        <Route path="/learn" element={
          <ProtectedRoute><LearnPage /></ProtectedRoute>
        } />
        <Route path="/theory" element={
          <ProtectedRoute><TheoryPage /></ProtectedRoute>
        } />
        <Route path="/tutorial" element={
          <ProtectedRoute><PracticePage isTutorial={true} /></ProtectedRoute>
        } />
        <Route path="/practice" element={
          <ProtectedRoute><PracticePage /></ProtectedRoute>
        } />
        <Route path="/test" element={
          <ProtectedRoute><TestPage /></ProtectedRoute>
        } />
        <Route path="/stats" element={
          <ProtectedRoute><StatsPage /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><SettingsPage /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
