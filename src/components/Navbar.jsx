import React from 'react';
import { Sun, Moon, Bell } from 'lucide-react';

export default function Navbar({ title, subtitle, darkMode, onToggleDark }) {
  return (
    <header className="
      sticky top-0 z-40
      bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
      border-b border-slate-200 dark:border-slate-700/50
      px-8 py-4
      flex items-center justify-between
    ">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          id="btn-toggle-dark"
          onClick={onToggleDark}
          className="btn-ghost"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} />
          }
        </button>

        {/* Notification placeholder */}
        <button className="btn-ghost relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow">
          AI
        </div>
      </div>
    </header>
  );
}
