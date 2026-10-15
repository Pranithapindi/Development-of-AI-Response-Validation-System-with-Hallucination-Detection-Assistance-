import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Validate from './pages/Validate.jsx';
import BatchEvaluation from './pages/BatchEvaluation.jsx';
import History from './pages/History.jsx';
import Architecture from './pages/Architecture.jsx';
import CodeWalkthrough from './pages/CodeWalkthrough.jsx';
import About from './pages/About.jsx';
import EvaluationDashboard from './pages/EvaluationDashboard.jsx';
import TechnicalDocumentation from './pages/TechnicalDocumentation.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Auth from './pages/Auth.jsx';
import AccountSettings from './pages/AccountSettings.jsx';
import { SEED_HISTORY } from './data/demoData.js';

import { checkHealth, fetchHistory } from './services/api.js';

const STORAGE_KEY       = 'ai_validator_history';
const BATCH_STORAGE_KEY = 'ai_validator_batch_history';

const PAGE_TITLES = {
  dashboard:    { title: 'Dashboard',                  subtitle: 'Overview of validation activity and analytics' },
  validate:     { title: 'Validate Response',           subtitle: 'Analyze AI responses for hallucinations and unsupported claims' },
  batch:        { title: 'Batch Evaluation',            subtitle: 'Automated CSV batch validation across all Judge Agents' },
  evaldash:     { title: 'Evaluation & Analytics Dashboard', subtitle: 'Unified single-validation and batch-evaluation scoring analytics' },
  documentation:{ title: 'Technical Docs & Report',     subtitle: 'Architecture, scoring rubrics, 2-system AI demonstration, and project report' },
  history:      { title: 'Validation History',          subtitle: 'Browse and manage past validation sessions' },
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

  // Sync backend history records on mount so single analytics and history are always up to date
  useEffect(() => {
    let mounted = true;
    checkHealth().then(health => {
      if (health?.status === 'ok') {
        fetchHistory().then(data => {
          if (!mounted || !data?.records) return;
          const backendRecs = data.records.map(r => ({
            id:           r.id || r.timestamp,
            timestamp:    r.timestamp || new Date().toISOString(),
            query:        r.query || '—',
            aiResponse:   r.ai_response || r.aiResponse || '',
            reference:    r.reference || '',
            claimsCount:  r.claims_count || r.claims?.length || 0,
            overallScore: r.overall_score ?? r.overallScore ?? 0,
            label:        r.label || r.verdict || '',
            stats:        r.stats || {},
            summary:      r.summary || '',
            claims:       r.claims || [],
            source:       'backend',
            model:        'NLP Backend',
          }));

          setHistory(prev => {
            const seen = new Set(prev.map(p => p.id || p.timestamp));
            const newBackend = backendRecs.filter(b => !seen.has(b.id) && !seen.has(b.timestamp));
            if (newBackend.length === 0) return prev;
            return [...newBackend, ...prev];
          });
        }).catch(() => {});
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleSaveHistory = useCallback((result) => {
    const record = {
      id:          result.id || `h${Date.now()}`,
      timestamp:   result.timestamp || new Date().toISOString(),
      query:       result.query || '—',
      aiResponse:  result.aiResponse || result.ai_response || '',
      reference:   result.reference || '',
      claimsCount: result.claims ? result.claims.length : (result.claimsCount || 0),
      overallScore: result.overallScore ?? result.overall_score ?? 0,
      stats:       result.stats || {},
      summary:     result.summary || '',
      claims:      result.claims || [],
      label:       result.label || result.verdict || '',
      model:       result.model || (result.processing_time_ms ? 'NLP Backend' : 'JS Engine'),
    };
    setHistory(prev => [record, ...prev.filter(h => h.id !== record.id)]);
  }, []);

  const handleSaveBatch = useCallback((batchResult) => {
    if (!batchResult.model) {
      batchResult.model = batchResult.batch_id?.startsWith('js_') ? 'JS Engine' : 'NLP Backend';
    }
    setBatchHistory(prev => [batchResult, ...prev.filter(b => b.batch_id !== batchResult.batch_id)]);
  }, []);

  const handleDeleteHistory = useCallback((idOrTimestamp) => {
    setHistory(prev => prev.filter(h => h.id !== idOrTimestamp && h.timestamp !== idOrTimestamp));
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleDeleteBatch = useCallback((batchIdOrTimestamp) => {
    setBatchHistory(prev => prev.filter(b => b.batch_id !== batchIdOrTimestamp && b.timestamp !== batchIdOrTimestamp));
  }, []);

  const handleClearBatchHistory = useCallback(() => {
    setBatchHistory([]);
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
          {page === 'evaldash'     && <EvaluationDashboard history={history} batchHistory={batchHistory} />}
          {page === 'documentation'&& <TechnicalDocumentation />}
          {page === 'history'      && (
            <History
              history={history}
              batchHistory={batchHistory}
              onDelete={handleDeleteHistory}
              onClear={handleClearHistory}
              onDeleteBatch={handleDeleteBatch}
              onClearBatch={handleClearBatchHistory}
              onNavigate={setPage}
            />
          )}
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
