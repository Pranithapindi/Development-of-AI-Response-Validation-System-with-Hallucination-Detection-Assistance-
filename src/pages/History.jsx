import React, { useState } from 'react';
import { Trash2, Eye, Clock, ChevronRight, X } from 'lucide-react';
import { statusMeta, formatTimestamp, reliabilityLabel, reliabilityColor } from '../utils/scoring.js';
import ClaimCard from '../components/ClaimCard.jsx';
import ReliabilityGauge from '../components/ReliabilityGauge.jsx';

export default function History({ history, onDelete, onClear }) {
  const [viewItem, setViewItem] = useState(null);

  if (history.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Clock size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No History Yet</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Validation results will appear here after you analyze an AI response.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Validation History
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {history.length} saved session{history.length !== 1 ? 's' : ''} — stored in localStorage
          </p>
        </div>
        <button
          id="btn-clear-history"
          onClick={onClear}
          className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 size={15} />
          Clear All
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Query</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Claims</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hallucinations</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {[...history].reverse().map((item) => {
                const colors = reliabilityColor(item.overallScore);
                const label  = reliabilityLabel(item.overallScore);
                const halluc = item.stats?.contradictory || 0;

                return (
                  <tr
                    key={item.id || item.timestamp}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {formatTimestamp(item.timestamp)}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-slate-800 dark:text-slate-200 font-medium truncate">
                        {item.query || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {item.claimsCount || item.claims?.length || 0}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-extrabold text-base ${colors.text}`}>
                        {item.overallScore}/100
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-semibold ${halluc > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {halluc}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.overallScore >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                        item.overallScore >= 75 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                        item.overallScore >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                                  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      }`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`btn-view-${item.timestamp}`}
                          onClick={() => setViewItem(item)}
                          className="btn-ghost text-xs py-1 px-2"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <button
                          id={`btn-delete-${item.timestamp}`}
                          onClick={() => onDelete(item.id || item.timestamp)}
                          className="btn-ghost text-xs py-1 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Validation Report
                </h3>
                <p className="text-xs text-slate-500 mt-1">{formatTimestamp(viewItem.timestamp)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                  Query: {viewItem.query}
                </p>
              </div>
              <button onClick={() => setViewItem(null)} className="btn-ghost">
                <X size={18} />
              </button>
            </div>

            {/* Gauge + summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1 glass-card p-5">
                <ReliabilityGauge score={viewItem.overallScore} stats={viewItem.stats} />
              </div>
              <div className="md:col-span-2 glass-card p-5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Summary</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {viewItem.summary}
                </p>
              </div>
            </div>

            {/* Claims if available */}
            {viewItem.claims && viewItem.claims.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">
                  Claim Analysis
                </h4>
                <div className="space-y-3">
                  {viewItem.claims.map((claim, i) => (
                    <ClaimCard key={claim.id} claim={claim} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
