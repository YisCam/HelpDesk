import { useState } from 'react';
import './index.css';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import NewTicketPage from './pages/NewTicketPage';
import KnowledgePage from './pages/KnowledgePage';
import { UsersPage, ReportsPage } from './pages/OtherPages';
import ChangesPage from './pages/ChangesPage';
import { ProblemsPage, AssetsPage } from './pages/ProblemsAssetsPage';

function Toast({ toast }) {
  if (!toast) return null;
  const colors = { success: 'var(--accent-green)', error: 'var(--accent-red)', info: 'var(--accent-blue)' };
  const icons = { success: '✓', error: '⚠', info: '◈' };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '11px 16px', borderRadius: 8,
      background: 'var(--bg-elevated)', border: `1px solid ${colors[toast.type] || colors.info}`,
      color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
      boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.25s ease',
      display: 'flex', alignItems: 'center', gap: 10, maxWidth: 380,
    }}>
      <span style={{ color: colors[toast.type] || colors.info, flexShrink: 0 }}>{icons[toast.type] || '◈'}</span>
      {toast.message}
    </div>
  );
}

function AppShell() {
  const { user, toast } = useApp();
  const [activePage, setActivePage] = useState('dashboard');

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':  return <DashboardPage onNavigate={setActivePage} />;
      case 'tickets':    return <TicketsPage />;
      case 'new-ticket': return <NewTicketPage onNavigate={setActivePage} />;
      case 'changes':    return <ChangesPage />;
      case 'problems':   return <ProblemsPage />;
      case 'assets':     return <AssetsPage />;
      case 'knowledge':  return <KnowledgePage />;
      case 'users':      return <UsersPage />;
      case 'reports':    return <ReportsPage />;
      default:           return <DashboardPage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="main-content">
        <Header activePage={activePage} onNavigate={setActivePage} />
        <main className="page-content">{renderPage()}</main>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
