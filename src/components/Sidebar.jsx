import React from 'react';
import {
  LayoutDashboard, ShieldCheck, History, BarChart2,
  GitBranch, Info, ChevronRight, Zap,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard',    label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'validate',     label: 'Validate Response',  icon: ShieldCheck },
  { id: 'history',      label: 'Validation History', icon: History },
  { id: 'analytics',    label: 'Analytics',          icon: BarChart2 },
  { id: 'architecture', label: 'System Architecture',icon: GitBranch },
  { id: 'walkthrough',  label: 'Code Walkthrough',   icon: Info },
  { id: 'about',        label: 'About Project',      icon: Info },
];

export default function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="
      fixed left-0 top-0 h-screen w-64 z-50
      bg-slate-900 dark:bg-slate-950
      border-r border-slate-700/50
      flex flex-col
      shadow-2xl
    ">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">AI Validator</p>
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
            onClick={() => onNavigate(id)}
            className={`nav-item w-full text-left ${currentPage === id ? 'active' : ''}`}
          >
            <Icon size={17} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {currentPage === id && <ChevronRight size={14} className="shrink-0 opacity-70" />}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        <div className="rounded-xl bg-slate-800/60 p-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 mb-1">Research Project</p>
          <p>AI Hallucination Detection & Response Validation System</p>
        </div>
      </div>
    </aside>
  );
}
