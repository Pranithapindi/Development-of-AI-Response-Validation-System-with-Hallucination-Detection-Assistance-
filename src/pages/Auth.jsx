import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, Mail, User, Building, Briefcase, Eye, EyeOff,
  ArrowRight, CheckCircle2, AlertCircle, Sparkles, KeyRound, Home,
  ChevronRight, LogIn, UserPlus, Info, Check
} from 'lucide-react';

const DEFAULT_USERS = [
  {
    id: 'usr_1',
    name: 'Dr. Elena Vance',
    email: 'elena.vance@ai-safety.org',
    password: 'Password@123',
    organization: 'AI Safety & Alignment Institute',
    role: 'Lead AI Researcher',
    avatarInitials: 'EV',
    color: '#8b5cf6',
  },
  {
    id: 'usr_2',
    name: 'Marcus Sterling',
    email: 'marcus.s@enterprise-audit.com',
    password: 'Password@123',
    organization: 'Sterling Compliance Labs',
    role: 'Enterprise Compliance Auditor',
    avatarInitials: 'MS',
    color: '#06b6d4',
  },
  {
    id: 'usr_3',
    name: 'Aria Takahashi',
    email: 'aria.t@model-eval.io',
    password: 'Password@123',
    organization: 'OpenEval NLP Consortium',
    role: 'NLP Model Engineer',
    avatarInitials: 'AT',
    color: '#10b981',
  },
];

const ROLES = [
  'AI Researcher',
  'NLP / ML Engineer',
  'Compliance & Audit Officer',
  'Quality Assurance Specialist',
  'Enterprise Product Lead',
  'Academic / Student',
];

export default function Auth({ initialMode = 'login', onAuthSuccess, onGoHome }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regRole, setRegRole] = useState(ROLES[0]);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Load existing users from localStorage or initialize with defaults
  const getUsers = () => {
    try {
      const stored = localStorage.getItem('ai_validator_registered_users');
      if (stored) return JSON.parse(stored);
    } catch {}
    localStorage.setItem('ai_validator_registered_users', JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  };

  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0 to 4
  };

  const strength = calculatePasswordStrength(regPassword);
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'];

  // Handle Login submission
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const users = getUsers();
      const user = users.find(
        (u) => u.email.toLowerCase() === loginEmail.trim().toLowerCase()
      );

      if (!user) {
        setLoading(false);
        setError('No registered account found with this email. Try quick demo login or create an account.');
        return;
      }

      if (user.password !== loginPassword) {
        setLoading(false);
        setError('Incorrect password. Please verify your credentials or click a Quick Demo Account.');
        return;
      }

      // Successful login
      const sessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        organization: user.organization || 'Independent Researcher',
        role: user.role || 'AI Researcher',
        avatarInitials: user.avatarInitials || user.name.slice(0, 2).toUpperCase(),
        color: user.color || '#8b5cf6',
        loginTime: new Date().toISOString(),
      };

      try {
        localStorage.setItem('ai_validator_user', JSON.stringify(sessionUser));
      } catch {}

      setSuccessMsg(`Welcome back, ${user.name}! Redirecting to Platform...`);
      setTimeout(() => {
        onAuthSuccess(sessionUser);
      }, 700);
    }, 450);
  };

  // Handle Registration submission
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setError('Please agree to the AI Safety & Evaluation policy.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const users = getUsers();
      const existing = users.find(
        (u) => u.email.toLowerCase() === regEmail.trim().toLowerCase()
      );

      if (existing) {
        setLoading(false);
        setError('An account with this email address already exists. Please sign in.');
        return;
      }

      const initials = regName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'AI';

      const newUser = {
        id: `usr_${Date.now()}`,
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        organization: regOrg.trim() || 'Research Lab',
        role: regRole,
        avatarInitials: initials,
        color: '#06b6d4',
      };

      const updatedUsers = [...users, newUser];
      try {
        localStorage.setItem('ai_validator_registered_users', JSON.stringify(updatedUsers));
        localStorage.setItem('ai_validator_user', JSON.stringify(newUser));
      } catch {}

      setSuccessMsg(`Account created successfully for ${newUser.name}! Opening platform...`);
      setTimeout(() => {
        onAuthSuccess(newUser);
      }, 700);
    }, 500);
  };

  // Quick 1-click demo login
  const handleQuickLogin = (demoUser) => {
    setLoading(true);
    setError('');
    setSuccessMsg(`Signing in as ${demoUser.name}...`);
    setTimeout(() => {
      try {
        localStorage.setItem('ai_validator_user', JSON.stringify(demoUser));
      } catch {}
      onAuthSuccess(demoUser);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#02000a] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background cyber grid & glow effects */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124, 58, 237, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 100%)',
        }}
      />
      <div
        className="fixed -top-40 -left-40 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%)', filter: 'blur(80px)' }}
      />
      <div
        className="fixed -bottom-40 -right-40 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.18), transparent 70%)', filter: 'blur(80px)' }}
      />

      {/* Top Header Bar */}
      <header className="relative z-20 px-8 py-5 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/30">
        <div
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight">AI<span className="text-cyan-400">Validator</span></span>
            <span className="text-[10px] block text-slate-400 font-mono -mt-1 tracking-wider uppercase">Authentication Portal</span>
          </div>
        </div>

        <button
          onClick={onGoHome}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <Home size={14} />
          <span>Back to Landing Page</span>
        </button>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-6">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div
            className="rounded-3xl border border-violet-500/20 bg-slate-950/80 backdrop-blur-2xl p-8 shadow-2xl relative overflow-hidden"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.15)',
            }}
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-cyan-400 to-indigo-600" />

            {/* Title / Description */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono mb-3">
                <Sparkles size={12} className="text-cyan-400" />
                {mode === 'login' ? 'Researcher Portal Access' : 'Create Validator Account'}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {mode === 'login' ? 'Welcome Back' : 'Get Started with AI Validator'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                {mode === 'login'
                  ? 'Sign in to access your validation history, batch evaluations, and judge ensemble.'
                  : 'Register your researcher profile to benchmark AI response hallucination rates.'}
              </p>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex rounded-xl bg-slate-900/90 p-1 border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus size={14} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ══════════ SIGN IN FORM ══════════ */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. elena.vance@ai-safety.org"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setLoginPassword('Password@123')}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Fill Demo Password
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-0"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-slate-500 text-[11px]">Protected by MFA</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Platform</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                {/* Single Click Quick Demo Logins */}
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <KeyRound size={12} className="text-cyan-400" />
                    <span>Or Quick Demo 1-Click Access:</span>
                  </p>
                  <div className="space-y-1.5">
                    {DEFAULT_USERS.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleQuickLogin(user)}
                        className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-violet-900/20 border border-white/5 hover:border-violet-500/40 text-left flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.avatarInitials}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {user.role}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-violet-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Login <ChevronRight size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* ══════════ REGISTER FORM ══════════ */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Jane Smith"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Work / Institutional Email *
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="jane.smith@institution.edu"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Organization
                    </label>
                    <div className="relative">
                      <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={regOrg}
                        onChange={(e) => setRegOrg(e.target.value)}
                        placeholder="Lab / Company"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Professional Role
                    </label>
                    <div className="relative">
                      <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none cursor-pointer"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="bg-slate-950 text-white">
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {regPassword && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className="flex-1 h-full rounded-full transition-colors"
                            style={{
                              backgroundColor:
                                strength >= step ? strengthColors[strength] : '#334155',
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className="text-[10px] font-mono font-medium"
                        style={{ color: strengthColors[strength] }}
                      >
                        {strengthLabels[strength]}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer text-slate-400 text-xs">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-0 mt-0.5"
                      required
                    />
                    <span className="text-[11px] leading-tight">
                      I agree to the <span className="text-violet-400">AI Safety Benchmarking Policy</span> and ethical response validation standards.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center mt-5 text-[11px] text-slate-500">
            <span>Enterprise-grade encryption • ChromaDB Knowledge Isolation</span>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 px-8 py-4 border-t border-white/5 text-center text-xs text-slate-600">
        AI Hallucination Detection & Response Validation System • Secure Authentication
      </footer>
    </div>
  );
}
