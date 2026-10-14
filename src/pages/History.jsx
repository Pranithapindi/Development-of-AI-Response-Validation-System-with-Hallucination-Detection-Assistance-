import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Eye, Clock, X, FileDown, Wifi, WifiOff, RefreshCw, Filter } from 'lucide-react';
import { formatTimestamp, reliabilityLabel, reliabilityColor } from '../utils/scoring.js';
import ClaimCard from '../components/ClaimCard.jsx';
import ReliabilityGauge from '../components/ReliabilityGauge.jsx';
import { fetchHistory, downloadPDFReport, checkHealth } from '../services/api.js';

function normaliseHistoryRecord(r) {
  return {
    id:           r.id || r.timestamp,
    timestamp:    r.timestamp || r.created_at || new Date().toISOString(),
    query:        r.query || '—',
    aiResponse:   r.aiResponse || r.ai_response || '',
    reference:    r.reference || '',
    claimsCount:  r.claimsCount || r.claims_count || r.claims?.length || 0,
    overallScore: r.overallScore ?? r.overall_score ?? 0,
    label:        r.label || r.verdict || '',
    stats:        r.stats || {},
    summary:      r.summary || '',
    claims:       r.claims || [],
    source:       r._source || 'local',
    model:        r._model || r.model_used || r.model || (r._source === 'backend' ? 'NLP Backend' : 'JS Engine'),
  };
}

function buildLocalReport(record) {
  const lines = [
    `VALIDATION REPORT`,
    `==================`,
    `Date:        ${formatTimestamp(record.timestamp)}`,
    `Query:       ${record.query}`,
    `Model:       ${record.model}`,
    `Score:       ${record.overallScore}/100`,
    `Status:      ${reliabilityLabel(record.overallScore)}`,
    ``,
    `SUMMARY`,
    `-------`,
    record.summary || 'No summary available.',
    ``,
    `CLAIM STATS`,
    `-----------`,
    `Supported:     ${record.stats?.supported ?? 0}`,
    `Unsupported:   ${record.stats?.unsupported ?? 0}`,
    `Contradictory: ${record.stats?.contradictory ?? 0}`,
    `Uncertain:     ${record.stats?.uncertain ?? 0}`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `validation-report-${(record.id || 'export').slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History({ history: localHistory, onDelete, onClear }) {
  const [viewItem,       setViewItem]      = useState(null);
  const [backendRecords, setBackendRecords] = useState([]);
  const [backendOnline,  setBackendOnline]  = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [modelFilter,    setModelFilter]    = useState('ALL');
  const [dateFilter,     setDateFilter]     = useState('ALL');
  const [fetchError,     setFetchError]     = useState(null);

  const loadBackendHistory = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const health = await checkHealth();
      const online = health?.status === 'ok';
      setBackendOnline(online);
      if (online) {
        const data = await fetchHistory();
        const records = (data?.records || []).map(r =>
          normaliseHistoryRecord({ ...r, _source: 'backend', _model: 'NLP Backend' })
        );
        setBackendRecords(records);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
      setFetchError('Could not reach backend — showing local sessions only.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBackendHistory(); }, [loadBackendHistory]);

  const allRecords = React.useMemo(() => {
    const localNorm = localHistory.map(r =>
      normaliseHistoryRecord({ ...r, _source: 'local', _model: r.model || 'JS Engine' })
    );
    const seen = new Set(backendRecords.map(r => r.id));
    const merged = [...backendRecords, ...localNorm.filter(r => !seen.has(r.id))];
    return merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [backendRecords, localHistory]);

  const availableModels = React.useMemo(() =>
    [...new Set(allRecords.map(r => r.model).filter(Boolean))],
    [allRecords]
  );

  const filteredRecords = React.useMemo(() => {
    return allRecords.filter(r => {
      if (modelFilter !== 'ALL' && r.model !== modelFilter) return false;
      if (dateFilter === 'today') {
        if (new Date(r.timestamp).toDateString() !== new Date().toDateString()) return false;
      } else if (dateFilter === 'week') {
        if (new Date(r.timestamp) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) return false;
      }
      return true;
    });
  }, [allRecords, modelFilter, dateFilter]);

  const handleDownloadPDF = (record) => {
    if (backendOnline && record.source === 'backend' && record.id) {
      downloadPDFReport(record.id);
    } else {
      buildLocalReport(record);
    }
  };

  if (allRecords.length === 0 && !loading) {
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
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Validation History</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
            </p>
            <div className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
              backendOnline === null ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' :
              backendOnline
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
            }`}>
              {backendOnline === null
                ? <><Wifi size={10} className="animate-pulse" /> Checking...</>
                : backendOnline
                  ? <><Wifi size={10} /> Backend Synced</>
                  : <><WifiOff size={10} /> Local Only</>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadBackendHistory} disabled={loading} className="btn-ghost text-xs flex items-center gap-1">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button id="btn-clear-history" onClick={onClear} className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={15} /> Clear Local
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          {fetchError}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-5 items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Filter size={14} /> Filters
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-semibold">Model:</span>
          {['ALL', ...availableModels].map(m => (
            <button key={m} onClick={() => setModelFilter(m)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                modelFilter === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}>
              {m === 'ALL' ? 'All Models' : m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-semibold">Date:</span>
          {[['ALL', 'All Time'], ['today', 'Today'], ['week', 'This Week']].map(([val, lbl]) => (
            <button key={val} onClick={() => setDateFilter(val)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                dateFilter === val
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto text-blue-500 mb-3" />
          <p className="text-sm text-slate-500">Loading history from backend…</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  {['Date','Query','Model','Claims','Score','Hallucinations','Status','Actions'].map(h => (
                    <th key={h} className={`${h === 'Actions' ? 'text-right pr-5' : h === 'Date' || h === 'Query' ? 'text-left' : 'text-center'} px-4 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredRecords.map((item) => {
                  const colors = reliabilityColor(item.overallScore);
                  const label  = reliabilityLabel(item.overallScore);
                  const halluc = item.stats?.contradictory || 0;
                  return (
                    <tr key={item.id || item.timestamp} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">{formatTimestamp(item.timestamp)}</td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-slate-800 dark:text-slate-200 font-medium truncate">{item.query || '—'}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.model === 'NLP Backend'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                        }`}>
                          {item.model === 'NLP Backend' ? <Wifi size={9} /> : null}
                          {item.model || 'JS Engine'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">{item.claimsCount || 0}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-extrabold text-base ${colors.text}`}>{item.overallScore}/100</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-semibold ${halluc > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{halluc}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.overallScore >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                          item.overallScore >= 75 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                          item.overallScore >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                                    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>{label}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button id={`btn-view-${item.id || item.timestamp}`} onClick={() => setViewItem(item)} className="btn-ghost text-xs py-1 px-2">
                            <Eye size={13} /> View
                          </button>
                          <button id={`btn-pdf-${item.id || item.timestamp}`} onClick={() => handleDownloadPDF(item)} title="Download Report" className="btn-ghost text-xs py-1 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <FileDown size={13} />
                          </button>
                          {item.source !== 'backend' && (
                            <button id={`btn-delete-${item.id || item.timestamp}`} onClick={() => onDelete(item.id || item.timestamp)} className="btn-ghost text-xs py-1 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400 text-sm">No records match the selected filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Validation Report</h3>
                <p className="text-xs text-slate-500 mt-1">{formatTimestamp(viewItem.timestamp)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">Query: {viewItem.query}</p>
                <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  viewItem.model === 'NLP Backend'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                }`}>Model: {viewItem.model}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownloadPDF(viewItem)} className="btn-secondary text-xs flex items-center gap-1.5">
                  <FileDown size={13} />
                  {backendOnline && viewItem.source === 'backend' ? 'Download PDF' : 'Download Report'}
                </button>
                <button onClick={() => setViewItem(null)} className="btn-ghost"><X size={18} /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1 glass-card p-5">
                <ReliabilityGauge score={viewItem.overallScore} stats={viewItem.stats} />
              </div>
              <div className="md:col-span-2 glass-card p-5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Summary</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{viewItem.summary}</p>
              </div>
            </div>
            {viewItem.claims && viewItem.claims.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Claim Analysis</h4>
                <div className="space-y-3">
                  {viewItem.claims.map((claim, i) => <ClaimCard key={claim.id} claim={claim} index={i} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
