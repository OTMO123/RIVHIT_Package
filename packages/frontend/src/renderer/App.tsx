import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { I18nProvider, useI18n } from './i18n/i18n';
import { Layout } from './components/Layout/Layout';
import { MainDashboard } from './pages/MainDashboard';
import { OrdersPage } from './pages/OrdersPage';
import { PackingPage } from './pages/PackingPage';
import { PrintingPage } from './pages/PrintingPage';

const AppContent: React.FC = () => {
  const { dir } = useI18n();
  
  return (
    <ConfigProvider direction={dir}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<MainDashboard />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/packing" element={<PackingPage />} />
            <Route path="/printing" element={<PrintingPage />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export const App: React.FC = () => {
  console.log('=== RIVHIT Packing System Loading ===');
  
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
};