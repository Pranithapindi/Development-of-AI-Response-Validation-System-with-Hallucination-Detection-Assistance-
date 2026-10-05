import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Validate from './pages/Validate.jsx';
import BatchEvaluation from './pages/BatchEvaluation.jsx';
import History from './pages/History.jsx';
import Analytics from './pages/Analytics.jsx';
import Architecture from './pages/Architecture.jsx';
import CodeWalkthrough from './pages/CodeWalkthrough.jsx';
import About from './pages/About.jsx';
import EvaluationDashboard from './pages/EvaluationDashboard.jsx';
import TechnicalDocumentation from './pages/TechnicalDocumentation.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Auth from './pages/Auth.jsx';
import AccountSettings from './pages/AccountSettings.jsx';
import { SEED_HISTORY } from './data/demoData.js';

const STORAGE_KEY       = 'ai_validator_history';
const BATCH_STORAGE_KEY = 'ai_validator_batch_history';

const PAGE_TITLES = {
  dashboard:    { title: 'Dashboard',                  subtitle: 'Overview of validation activity and analytics' },
  validate:     { title: 'Validate Response',           subtitle: 'Analyze AI responses for hallucinations and unsupported claims' },
  batch:        { title: 'Batch Evaluation',            subtitle: 'Automated CSV batch validation across all Judge Agents' },
  evaldash:     { title: 'Evaluation Dashboard',        subtitle: 'Scoring trends, pass/fail rates, and drill-down analytics' },
  documentation:{ title: 'Technical Docs & Report',     subtitle: 'Architecture, scoring rubrics, 2-system AI demonstration, and project report' },
  history:      { title: 'Validation History',          subtitle: 'Browse and manage past validation sessions' },
  analytics:    { title: 'Analytics',                   subtitle: 'Visualize trends, distributions, and system metrics' },
  architecture: { title: 'System Architecture',         subtitle: 'End-to-end pipeline diagram and module details' },
  walkthrough:  { title: 'Code Walkthrough',            subtitle: 'Step-by-step explanation of the validation algorithm' },
  about:        { title: 'About the Project',           subtitle: 'Research context, objectives, and technology stack' },
  account:      { title: 'Account & Settings',         subtitle: 'Researcher profile, credentials, system preferences, and security' },
  auth:         { title: 'Authentication Portal',      subtitle: 'Manage user access and researcher sign-in' },
};

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return SEED_HISTORY;
}

function loadBatchHistory() {
  try {
    const stored = localStorage.getItem(BATCH_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

function saveBatchHistory(batchHistory) {
  try {
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batchHistory));
  } catch {}
}

export default function App() {
  const [showLanding,  setShowLanding]  = useState(true);
  const [showAuth,     setShowAuth]     = useState(false);
  const [authMode,     setAuthMode]     = useState('login');
  const [page,         setPage]         = useState('dashboard');
  const [darkMode,     setDarkMode]     = useState(() => {
    try { return localStorage.getItem('ai_validator_dark') === 'true'; } catch { return false; }
  });
  const [history,      setHistory]      = useState(loadHistory);
  const [batchHistory, setBatchHistory] = useState(loadBatchHistory);

  // Authenticated user state
  const [currentUser,  setCurrentUser]  = useState(() => {
    try {
      const stored = localStorage.getItem('ai_validator_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Apply dark mode class to <html> — must be declared before any conditional return
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

  // Save batch history to localStorage
  useEffect(() => {
    saveBatchHistory(batchHistory);
  }, [batchHistory]);

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

  const handleSaveBatch = useCallback((batchResult) => {
    setBatchHistory(prev => [...prev, batchResult]);
  }, []);

  const handleDeleteHistory = useCallback((idOrTimestamp) => {
    setHistory(prev => prev.filter(h => h.id !== idOrTimestamp && h.timestamp !== idOrTimestamp));
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleOpenAuth = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setShowAuth(true);
  }, []);

  const handleAuthSuccess = useCallback((user) => {
    setCurrentUser(user);
    setShowAuth(false);
    setShowLanding(false);
    setPage('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('ai_validator_user');
    } catch {}
    setCurrentUser(null);
    setShowAuth(false);
    setShowLanding(true);
    setPage('dashboard');
  }, []);

  const handleUpdateUser = useCallback((updated) => {
    setCurrentUser(updated);
    try {
      localStorage.setItem('ai_validator_user', JSON.stringify(updated));
    } catch {}
  }, []);

  // Full-screen Auth Portal Gate (when user explicitly clicks Login / Register)
  if (showAuth) {
    return (
      <Auth
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
        onGoHome={() => setShowAuth(false)}
      />
    );
  }

  // Gate: show animated landing page first, then the main app
  if (showLanding) {
    return (
      <LandingPage
        onEnter={(targetPage = 'dashboard') => {
          setPage(targetPage);
          setShowLanding(false);
        }}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />
    );
  }

  const { title, subtitle } = PAGE_TITLES[page] || PAGE_TITLES.dashboard;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        onGoHome={() => setShowLanding(true)}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div className="ml-64 min-h-screen flex flex-col">
        <Navbar
          title={title}
          subtitle={subtitle}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onNavigate={setPage}
        />

        <main className="flex-1 p-8">
          {page === 'dashboard'    && <Dashboard onNavigate={setPage} history={history} />}
          {page === 'validate'     && <Validate onSaveHistory={handleSaveHistory} />}
          {page === 'batch'        && <BatchEvaluation onSaveBatch={handleSaveBatch} />}
          {page === 'evaldash'     && <EvaluationDashboard batchHistory={batchHistory} />}
          {page === 'documentation'&& <TechnicalDocumentation />}
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
          {page === 'account'      && (
            <AccountSettings
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
              onOpenAuth={handleOpenAuth}
              historyCount={history.length}
              batchCount={batchHistory.length}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(d => !d)}
            />
          )}
          {page === 'auth'         && (
            <div className="max-w-2xl mx-auto py-6">
              <Auth
                initialMode={currentUser ? 'login' : 'register'}
                onAuthSuccess={handleAuthSuccess}
                onGoHome={() => setPage('dashboard')}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
