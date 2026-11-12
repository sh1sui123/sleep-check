import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import HomePage from '@/pages/HomePage/HomePage';
import LogPage from '@/pages/LogPage/LogPage';
import AnalysisPage from '@/pages/AnalysisPage/AnalysisPage';
import PlanPage from '@/pages/PlanPage/PlanPage';
import SettingsPage from '@/pages/SettingsPage/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="log" element={<LogPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
