import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, MinusCircle, ChevronDown, ChevronUp, BookOpen, Lightbulb } from 'lucide-react';
import { statusMeta } from '../utils/scoring.js';

const ICONS = { CheckCircle, XCircle, AlertCircle, MinusCircle };

/**
 * ClaimCard — displays a single validated claim with status, confidence,
 * evidence, and explanation. Expandable for full detail.
 */
export default function ClaimCard({ claim, index }) {
  const [expanded, setExpanded] = useState(true);
  const meta = statusMeta(claim.status);
  const Icon = ICONS[meta.icon] || AlertCircle;

  return (
    <div className={`
      glass-card overflow-hidden border-l-4 transition-all duration-300
      ${claim.status === 'supported'    ? 'border-l-emerald-500' : ''}
      ${claim.status === 'contradictory'? 'border-l-red-500'     : ''}
      ${claim.status === 'uncertain'    ? 'border-l-amber-500'   : ''}
      ${claim.status === 'unsupported'  ? 'border-l-orange-500'  : ''}
    `}>
      {/* Header */}
      <button
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
        id={`claim-card-${claim.id}`}
      >
        <span className="mt-0.5 shrink-0">
          <Icon size={18} className={`
            ${claim.status === 'supported'    ? 'text-emerald-500' : ''}
            ${claim.status === 'contradictory'? 'text-red-500'     : ''}
            ${claim.status === 'uncertain'    ? 'text-amber-500'   : ''}
            ${claim.status === 'unsupported'  ? 'text-orange-500'  : ''}
          `} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Claim #{index + 1}
            </span>
            <span className={meta.badge}>{meta.label}</span>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
            {claim.text}
          </p>
        </div>
        <div className="ml-2 shrink-0 flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {claim.confidencePct}%
            </p>
            <p className="text-xs text-slate-400">confidence</p>
          </div>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-700/50 pt-4">
          {/* Confidence bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Confidence Score
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {claim.confidencePct}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${meta.progressColor}`}
                style={{ width: `${claim.confidencePct}%` }}
              />
            </div>
          </div>

          {/* Secondary scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Similarity Score</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {Math.round(claim.similarityScore * 100)}%
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Contradiction Score</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {Math.round(claim.contradictionScore * 100)}%
              </p>
            </div>
          </div>

          {/* Evidence */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen size={13} className="text-blue-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Evidence
              </span>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed italic">
                "{claim.evidence}"
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Reasoning
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {claim.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
