import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ReporterPage } from './pages/ReporterPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { SheltersPage } from './pages/SheltersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="report" element={<ReporterPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="shelters" element={<SheltersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
