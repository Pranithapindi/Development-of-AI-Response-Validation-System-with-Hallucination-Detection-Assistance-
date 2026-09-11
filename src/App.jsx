import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Validate from './pages/Validate.jsx';
import History from './pages/History.jsx';
import Analytics from './pages/Analytics.jsx';
import Architecture from './pages/Architecture.jsx';
import CodeWalkthrough from './pages/CodeWalkthrough.jsx';
import About from './pages/About.jsx';
import { SEED_HISTORY } from './data/demoData.js';

const STORAGE_KEY = 'ai_validator_history';

const PAGE_TITLES = {
  dashboard:    { title: 'Dashboard',             subtitle: 'Overview of validation activity and analytics' },
  validate:     { title: 'Validate Response',      subtitle: 'Analyze AI responses for hallucinations and unsupported claims' },
  history:      { title: 'Validation History',     subtitle: 'Browse and manage past validation sessions' },
  analytics:    { title: 'Analytics',              subtitle: 'Visualize trends, distributions, and system metrics' },
  architecture: { title: 'System Architecture',    subtitle: 'End-to-end pipeline diagram and module details' },
  walkthrough:  { title: 'Code Walkthrough',       subtitle: 'Step-by-step explanation of the validation algorithm' },
  about:        { title: 'About the Project',      subtitle: 'Research context, objectives, and technology stack' },
};

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return SEED_HISTORY;
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

export default function App() {
  const [page,      setPage]     = useState('dashboard');
  const [darkMode,  setDarkMode] = useState(() => {
    try { return localStorage.getItem('ai_validator_dark') === 'true'; } catch { return false; }
  });
  const [history, setHistory]   = useState(loadHistory);

  // Apply dark mode class to <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('ai_validator_dark', darkMode); } catch {}
  }, [darkMode]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const handleSaveHistory = useCallback((result) => {
    const record = {
      id:         `h${Date.now()}`,
      timestamp:  result.timestamp,
      query:      result.query,
      aiResponse: result.aiResponse,
      reference:  result.reference,
      claimsCount: result.claims.length,
      overallScore: result.overallScore,
      stats:      result.stats,
      summary:    result.summary,
      claims:     result.claims,
    };
    setHistory(prev => [...prev, record]);
  }, []);

  const handleDeleteHistory = useCallback((idOrTimestamp) => {
    setHistory(prev => prev.filter(h => h.id !== idOrTimestamp && h.timestamp !== idOrTimestamp));
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const { title, subtitle } = PAGE_TITLES[page] || PAGE_TITLES.dashboard;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar currentPage={page} onNavigate={setPage} />

      {/* Main content */}
      <div className="ml-64 min-h-screen flex flex-col">
        <Navbar
          title={title}
          subtitle={subtitle}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />

        <main className="flex-1 p-8">
          {page === 'dashboard'    && <Dashboard onNavigate={setPage} history={history} />}
          {page === 'validate'     && <Validate onSaveHistory={handleSaveHistory} />}
          {page === 'history'      && (
            <History
              history={history}
              onDelete={handleDeleteHistory}
              onClear={handleClearHistory}
            />
          )}
          {page === 'analytics'    && <Analytics history={history} />}
          {page === 'architecture' && <Architecture />}
          {page === 'walkthrough'  && <CodeWalkthrough />}
          {page === 'about'        && <About />}
        </main>
      </div>
    </div>
  );
}
