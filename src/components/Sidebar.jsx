import React from 'react';
import {
  Home, LayoutDashboard, ShieldCheck, History, BarChart2,
  GitBranch, Info, ChevronRight, Zap, Layers, PieChart, BookOpen,
  UserCheck, LogOut, LogIn,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard',    label: 'Dashboard',              icon: LayoutDashboard },
  { id: 'validate',     label: 'Validate Response',      icon: ShieldCheck },
  { id: 'batch',        label: 'Batch Evaluation',       icon: Layers },
  { id: 'evaldash',     label: 'Evaluation Dashboard',   icon: PieChart },
  { id: 'history',      label: 'Validation History',     icon: History },
  { id: 'analytics',    label: 'Analytics',              icon: BarChart2 },
  { id: 'documentation',label: 'Technical Docs & Report',icon: BookOpen },
  { id: 'architecture', label: 'System Architecture',    icon: GitBranch },
  { id: 'walkthrough',  label: 'Code Walkthrough',       icon: Info },
  { id: 'about',        label: 'About Project',          icon: Info },
  { id: 'account',      label: 'Account & Settings',     icon: UserCheck },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  onGoHome,
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  return (
    <aside className="
      fixed left-0 top-0 h-screen w-64 z-50
      bg-slate-900 dark:bg-slate-950
      border-r border-slate-700/50
      flex flex-col
      shadow-2xl
    ">
      {/* Logo */}
      <div
        className="px-6 py-5 border-b border-slate-700/50 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight group-hover:text-cyan-400 transition-colors">AI Validator</p>
            <p className="text-slate-400 text-xs">Hallucination Detection</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => {
              if (id === 'landing') {
                onGoHome();
              } else {
                onNavigate(id);
              }
            }}
            className={`nav-item w-full text-left ${currentPage === id ? 'active' : ''}`}
          >
            <Icon size={17} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {currentPage === id && <ChevronRight size={14} className="shrink-0 opacity-70" />}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700/50 space-y-2.5">
        {/* User Profile Card */}
        {currentUser ? (
          <div className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between gap-2 shadow-sm transition-colors">
            <div
              onClick={() => onNavigate('account')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
              title="View Account & Settings"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                style={{ backgroundColor: currentUser.color || '#8b5cf6' }}
              >
                {currentUser.avatarInitials || 'AI'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate hover:text-cyan-400 transition-colors">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.role || 'Researcher'}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/60 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('account')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 hover:border-cyan-500/70 transition-all cursor-pointer"
          >
            <LogIn size={14} />
            <span>Account & Settings</span>
          </button>
        )}

        {/* Research Project Card */}
        <div className="rounded-xl bg-slate-800/60 p-2.5 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 mb-0.5">Research Project</p>
          <p className="text-[11px] leading-tight">AI Hallucination Detection & Response Validation System</p>
        </div>
      </div>
    </aside>
  );
}
