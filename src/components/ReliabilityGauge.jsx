import React from 'react';
import { reliabilityLabel, reliabilityColor } from '../utils/scoring.js';

/**
 * ReliabilityGauge — circular SVG gauge showing the overall reliability score.
 */
export default function ReliabilityGauge({ score, stats }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = reliabilityColor(score);
  const label  = reliabilityLabel(score);

  // Stroke color by score
  let strokeColor = '#3b82f6';
  if (score >= 90) strokeColor = '#10b981';
  else if (score >= 75) strokeColor = '#3b82f6';
  else if (score >= 50) strokeColor = '#f59e0b';
  else strokeColor = '#ef4444';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Circular gauge */}
      <div className="relative">
        <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={70} cy={70} r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={12}
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Progress ring */}
          <circle
            cx={70} cy={70} r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={12}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-extrabold ${colors.text}`}>{score}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/100</span>
        </div>
      </div>

      <div className="text-center">
        <p className={`text-lg font-bold ${colors.text}`}>{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">AI Response Reliability</p>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.supported}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-500 font-medium">Supported</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.contradictory}</p>
            <p className="text-xs text-red-700 dark:text-red-500 font-medium">Contradictory</p>
          </div>
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 p-3 text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.unsupported}</p>
            <p className="text-xs text-orange-700 dark:text-orange-500 font-medium">Unsupported</p>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.uncertain}</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 font-medium">Uncertain</p>
          </div>
        </div>
      )}

      {stats && (
        <div className="w-full rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">Hallucination Risk</span>
          <span className="text-xl font-extrabold text-red-600 dark:text-red-400">{stats.hallucinationRisk}%</span>
        </div>
      )}
    </div>
  );
}
