import React, { useState } from 'react';
import {
  User, Mail, Building, Briefcase, Key, ShieldCheck,
  CheckCircle, Copy, RefreshCw, LogOut, UserCheck, Sliders,
  Bell, Database, Cpu, Lock, Check, Sparkles, ExternalLink,
  ChevronRight, AlertTriangle
} from 'lucide-react';

export default function AccountSettings({
  currentUser,
  onUpdateUser,
  onLogout,
  onOpenAuth,
  historyCount = 0,
  batchCount = 0,
  darkMode,
  onToggleDark,
}) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey, setApiKey] = useState('val_live_9f83a42c7e108d5b41ac902e887');
  const [sensitivity, setSensitivity] = useState('standard'); // 'strict' | 'standard' | 'lenient'
  const [autoExportPdf, setAutoExportPdf] = useState(false);
  const [notificationAlerts, setNotificationAlerts] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Editable user state
  const [name, setName] = useState(currentUser?.name || 'Dr. Elena Vance');
  const [organization, setOrganization] = useState(currentUser?.organization || 'AI Safety & Alignment Institute');
  const [role, setRole] = useState(currentUser?.role || 'Lead AI Researcher');
  const [isEditing, setIsEditing] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = () => {
    const newKey = 'val_live_' + Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setApiKey(newKey);
    setSaveSuccess('API Key regenerated successfully.');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (onUpdateUser && currentUser) {
      const updated = {
        ...currentUser,
        name,
        organization,
        role,
        avatarInitials: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'AI',
      };
      onUpdateUser(updated);
    }
    setIsEditing(false);
    setSaveSuccess('Profile information updated successfully.');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const userEmail = currentUser?.email || 'elena.vance@ai-safety.org';
  const userInitials = currentUser?.avatarInitials || (name ? name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : 'AI');
  const userColor = currentUser?.color || '#8b5cf6';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Banner Notice if saved */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3 animate-fadeIn shadow-lg">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle, ${userColor}, transparent 70%)` }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl shrink-0"
              style={{
                backgroundColor: userColor,
                boxShadow: `0 10px 30px -5px ${userColor}60`,
              }}
            >
              {userInitials}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {name}
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  {role}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Session
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  {userEmail}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building size={13} className="text-slate-400" />
                  {organization}
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-cyan-500" />
                  Researcher Level 4
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-300 dark:border-slate-700"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-colors flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Edit Form Toggle */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Edit Profile Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Organization / Lab</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Professional Role</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Single Validations</span>
            <ShieldCheck size={16} className="text-violet-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{historyCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Saved response audits</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Batch Runs</span>
            <Cpu size={16} className="text-cyan-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{batchCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Automated CSV test batches</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Vector Store</span>
            <Database size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">ChromaDB</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">● Grounding Connected</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Judge Ensemble</span>
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">5 / 5</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Agents active in consensus</p>
        </div>
      </div>

      {/* Two Column Layout: API Credentials & Validation Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Credentials */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-cyan-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">API Access & SDK Key</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Live Token
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Use this key to authorize automated CI/CD pipeline tests and Python SDK evaluation requests against the FastAPI backend.
          </p>

          <div className="space-y-2">
            <label className="block text-[11px] font-mono text-slate-400 uppercase">Secret API Key</label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={apiKey}
                className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300 select-all"
              />
              <button
                onClick={handleCopyKey}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 text-[11px]">Last rotated: Today</span>
            <button
              onClick={handleRegenerateKey}
              className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 text-xs font-medium"
            >
              <RefreshCw size={12} />
              <span>Regenerate Key</span>
            </button>
          </div>
        </div>

        {/* Validation Engine Preferences */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Validation Engine Preferences</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Customize the threshold sensitivity for flagging unsupported claims and automated report generation.
          </p>

          {/* Sensitivity Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-slate-400 uppercase">Hallucination Sensitivity</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'strict', label: 'Strict (0.75)', desc: 'High rigor for medical / legal' },
                { id: 'standard', label: 'Standard (0.65)', desc: 'Balanced default' },
                { id: 'lenient', label: 'Lenient (0.50)', desc: 'Higher recall' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSensitivity(lvl.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    sensitivity === lvl.id
                      ? 'border-violet-500 bg-violet-500/10 text-violet-400 font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <p className="text-xs">{lvl.label}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{lvl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300">Auto-Export PDF Report on completion</span>
              <input
                type="checkbox"
                checked={autoExportPdf}
                onChange={(e) => setAutoExportPdf(e.target.checked)}
                className="rounded border-slate-700 text-violet-600 focus:ring-0"
              />
            </label>
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300">Live Audio / Visual Alerts for Low Reliability (&lt;60%)</span>
              <input
                type="checkbox"
                checked={notificationAlerts}
                onChange={(e) => setNotificationAlerts(e.target.checked)}
                className="rounded border-slate-700 text-violet-600 focus:ring-0"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Switch Account / Multi-Profile Manager */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck size={16} className="text-cyan-500" />
            <span>Switch Researcher Account</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Need to sign in as another auditor or test with a different organization account?
          </p>
        </div>

        <button
          onClick={() => onOpenAuth && onOpenAuth('login')}
          className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700 shrink-0 cursor-pointer"
        >
          <span>Switch Account / Sign In</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
