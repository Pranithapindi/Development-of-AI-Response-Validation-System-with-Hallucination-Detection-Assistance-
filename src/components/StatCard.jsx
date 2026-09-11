import React from 'react';

/**
 * StatCard — dashboard summary card with icon, value, label, and trend.
 */
export default function StatCard({ icon: Icon, label, value, trend, iconBg, iconColor }) {
  return (
    <div className="glass-card p-5 flex items-start gap-4 hover:shadow-xl transition-shadow duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
          {value}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
        {trend && (
          <p className={`text-xs mt-1 font-medium ${
            trend.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
          }`}>
            {trend} vs last month
          </p>
        )}
      </div>
    </div>
  );
}
