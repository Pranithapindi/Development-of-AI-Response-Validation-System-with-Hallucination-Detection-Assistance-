import React from 'react';
import { Sun, Moon, Bell, LogIn, LogOut, User, Home } from 'lucide-react';

export default function Navbar({
  title,
  subtitle,
  darkMode,
  onToggleDark,
  currentUser,
  onOpenAuth,
  onLogout,
  onNavigate,
  onGoHome,
}) {
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

        {/* User Profile / Auth Area */}
        {currentUser ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onNavigate && onNavigate('account')}
              className="flex items-center gap-2.5 hover:opacity-85 transition-opacity text-left cursor-pointer"
              title="View Account & Settings"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
                style={{ backgroundColor: currentUser.color || '#8b5cf6' }}
              >
                {currentUser.avatarInitials || 'AI'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {currentUser.role || 'Researcher'}
                </p>
              </div>
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenAuth ? onOpenAuth('login') : onNavigate && onNavigate('auth')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
