import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trash2, Eye, Clock, X, FileDown, Wifi, WifiOff, RefreshCw, Filter,
  Sparkles, Database, Layers, CheckCircle, AlertTriangle, AlertCircle,
  ChevronDown, ChevronUp, Search, ExternalLink, ShieldCheck
} from 'lucide-react';
import { formatTimestamp, reliabilityLabel, reliabilityColor } from '../utils/scoring.js';
import ClaimCard from '../components/ClaimCard.jsx';
import ReliabilityGauge from '../components/ReliabilityGauge.jsx';
import { fetchHistory, downloadPDFReport, checkHealth, downloadBatchPDFReport } from '../services/api.js';

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
    source:       r._source || (r.source || 'local'),
    model:        r._model || r.model_used || r.model || (r.source === 'backend' ? 'NLP Backend' : 'JS Engine'),
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
  a.download = `validation-report-${String(record.id || 'export').slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildLocalBatchReport(batch) {
  const lines = [
    `BATCH VALIDATION REPORT`,
    `======================`,
    `Batch ID:           ${batch.batch_id || 'N/A'}`,
    `Date:               ${formatTimestamp(batch.timestamp)}`,
    `Evaluation Engine:  ${batch.model || 'JS Engine'}`,
    `Total Records:      ${batch.total_records || 0}`,
    `Pass Count:         ${batch.pass_count || 0}`,
    `Needs Improvement:  ${batch.needs_improvement_count || 0}`,
    `Fail Count:         ${batch.fail_count || 0}`,
    `Average Score:      ${batch.avg_overall_score ?? 0}/100`,
    `Hallucination Rate: ${batch.hallucination_rate_pct ?? 0}%`,
    ``,
    `DIMENSION AVERAGES`,
    `------------------`,
    `Relevance:          ${batch.avg_relevance ?? 'N/A'}`,
    `Accuracy:           ${batch.avg_accuracy ?? 'N/A'}`,
    `Hallucination Risk: ${batch.avg_hallucination_risk ?? 'N/A'}`,
    `Completeness:       ${batch.avg_completeness ?? 'N/A'}`,
    ``,
    `ITEMIZED RESULTS`,
    `----------------`,
  ];

  (batch.results || []).forEach((item, idx) => {
    lines.push(
      `#${idx + 1} | Verdict: ${item.verdict || 'N/A'} | Overall Score: ${item.overall_score ?? 'N/A'}/100`,
      `Query:     ${item.query || '—'}`,
      `Response:  ${item.ai_response || '—'}`,
      `Scores:    Relevance: ${item.relevance_score ?? '—'}, Accuracy: ${item.accuracy_score ?? '—'}, Hallucination: ${item.hallucination_score ?? '—'}, Completeness: ${item.completeness_score ?? '—'}`,
      item.validation_report?.summary ? `Reasoning: ${item.validation_report.summary}` : '',
      `--------------------------------------------------------------------------------`
    );
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `batch-report-${String(batch.batch_id || 'export').slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History({
  history: localHistory = [],
  batchHistory = [],
  onDelete,
  onClear,
  onDeleteBatch,
  onClearBatch,
  onNavigate,
}) {
  const [activeTab,       setActiveTab]       = useState('single'); // 'single' | 'batch'
  const [viewItem,        setViewItem]        = useState(null);
  const [viewBatchItem,   setViewBatchItem]   = useState(null);
  const [expandedBatchRows, setExpandedBatchRows] = useState({});
  const [backendRecords,  setBackendRecords]  = useState([]);
  const [backendOnline,   setBackendOnline]   = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [modelFilter,     setModelFilter]     = useState('ALL');
  const [dateFilter,      setDateFilter]      = useState('ALL');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [fetchError,      setFetchError]      = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Load backend records
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
      setFetchError('Could not reach backend — showing local sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBackendHistory(); }, [loadBackendHistory]);

  // Unified single evaluation records
  const allSingleRecords = useMemo(() => {
    const localNorm = (localHistory || []).map(r =>
      normaliseHistoryRecord({ ...r, _source: r.source || 'local', _model: r.model || 'JS Engine' })
    );
    const seen = new Set(backendRecords.map(r => r.id));
    const merged = [...backendRecords, ...localNorm.filter(r => !seen.has(r.id))];
    return merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [backendRecords, localHistory]);

  // Filter single records
  const filteredSingleRecords = useMemo(() => {
    return allSingleRecords.filter(r => {
      if (modelFilter !== 'ALL' && r.model !== modelFilter) return false;
      if (dateFilter === 'today') {
        if (new Date(r.timestamp).toDateString() !== new Date().toDateString()) return false;
      } else if (dateFilter === 'week') {
        if (new Date(r.timestamp) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = (r.query || '').toLowerCase().includes(q);
        const matchesResp = (r.aiResponse || '').toLowerCase().includes(q);
        const matchesSummary = (r.summary || '').toLowerCase().includes(q);
        if (!matchesQuery && !matchesResp && !matchesSummary) return false;
      }
      return true;
    });
  }, [allSingleRecords, modelFilter, dateFilter, searchQuery]);

  // Filter batch records
  const filteredBatchRecords = useMemo(() => {
    return (batchHistory || []).filter(b => {
      const bModel = b.model || (b.batch_id?.startsWith('js_') ? 'JS Engine' : 'NLP Backend');
      if (modelFilter !== 'ALL' && bModel !== modelFilter) return false;
      if (dateFilter === 'today') {
        if (new Date(b.timestamp).toDateString() !== new Date().toDateString()) return false;
      } else if (dateFilter === 'week') {
        if (new Date(b.timestamp) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = (b.batch_id || '').toLowerCase().includes(q);
        const matchesInResults = (b.results || []).some(
          r => (r.query || '').toLowerCase().includes(q) || (r.ai_response || '').toLowerCase().includes(q)
        );
        if (!matchesId && !matchesInResults) return false;
      }
      return true;
    });
  }, [batchHistory, modelFilter, dateFilter, searchQuery]);

  // Handle single PDF download
  const handleDownloadPDF = (record) => {
    if (backendOnline && record.source === 'backend' && record.id) {
      downloadPDFReport(record.id);
    } else {
      buildLocalReport(record);
    }
  };

  // Handle batch PDF download
  const handleDownloadBatch = async (batchRecord) => {
    setIsDownloadingPdf(true);
    try {
      const success = await downloadBatchPDFReport(batchRecord);
      if (!success) {
        buildLocalBatchReport(batchRecord);
      }
    } catch {
      buildLocalBatchReport(batchRecord);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const toggleBatchRowExpand = (rowIndex) => {
    setExpandedBatchRows(prev => ({ ...prev, [rowIndex]: !prev[rowIndex] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="text-indigo-600" />
            Validation History
          </h2>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-xs text-slate-500">
              Browse and inspect all historical evaluation records across single queries and batch sessions.
            </p>
            <div className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
              backendOnline === null ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' :
              backendOnline
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
            }`}>
              {backendOnline === null
                ? <><Wifi size={10} className="animate-pulse" /> Checking Backend...</>
                : backendOnline
                  ? <><Wifi size={10} /> Backend Synced</>
                  : <><WifiOff size={10} /> Local Storage Only</>}
            </div>
          </div>
        </div>

        {/* Tab Switcher Controls */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            id="tab-single-history"
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'single'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            Single Queries
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              {filteredSingleRecords.length}
            </span>
          </button>

          <button
            id="tab-batch-history"
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'batch'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers size={14} />
            Batch Evaluations
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              {filteredBatchRecords.length}
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadBackendHistory}
            disabled={loading}
            className="btn-ghost text-xs flex items-center gap-1.5"
            title="Refresh history from backend"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {activeTab === 'single' ? (
            <button
              id="btn-clear-single-history"
              onClick={onClear}
              className="btn-ghost text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"
            >
              <Trash2 size={13} /> Clear Single
            </button>
          ) : (
            <button
              id="btn-clear-batch-history"
              onClick={onClearBatch}
              className="btn-ghost text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"
            >
              <Trash2 size={13} /> Clear Batch
            </button>
          )}
        </div>
      </div>

      {fetchError && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            <Filter size={14} className="text-indigo-500" /> Filters:
          </div>

          {/* Model Engine Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-semibold">Engine:</span>
            {[
              { id: 'ALL', label: 'All Engines' },
              { id: 'NLP Backend', label: 'NLP Backend' },
              { id: 'JS Engine', label: 'JS Engine' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setModelFilter(m.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  modelFilter === m.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-semibold">Date:</span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dateFilter === d.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'single' ? "Search query or summary..." : "Search batch ID or query..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── TAB 1: SINGLE QUERIES TABLE ─────────────────────────────────────── */}
      {activeTab === 'single' && (
        <>
          {loading ? (
            <div className="glass-card p-12 text-center">
              <RefreshCw size={28} className="animate-spin mx-auto text-indigo-500 mb-3" />
              <p className="text-sm text-slate-500">Loading validation history…</p>
            </div>
          ) : filteredSingleRecords.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Clock size={44} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                No Single Validation Records Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {allSingleRecords.length === 0
                  ? 'Run your first AI response validation to populate this list.'
                  : 'No records matched the current filter criteria.'}
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('validate')}
                  className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Validate a Response
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      {['Date & Time', 'Query', 'Model Engine', 'Claims', 'Overall Score', 'Hallucinations', 'Status', 'Actions'].map(h => (
                        <th
                          key={h}
                          className={`${
                            h === 'Actions' ? 'text-right pr-5' :
                            h === 'Date & Time' || h === 'Query' ? 'text-left' :
                            'text-center'
                          } px-4 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredSingleRecords.map((item) => {
                      const colors = reliabilityColor(item.overallScore);
                      const label  = item.label || reliabilityLabel(item.overallScore);
                      const halluc = item.stats?.contradictory || 0;
                      return (
                        <tr
                          key={item.id || item.timestamp}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                            {formatTimestamp(item.timestamp)}
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <p className="text-slate-800 dark:text-slate-200 font-medium truncate" title={item.query}>
                              {item.query || '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.model === 'NLP Backend'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                            }`}>
                              {item.model === 'NLP Backend' ? <Wifi size={9} /> : null}
                              {item.model || 'JS Engine'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300 text-xs">
                            {item.claimsCount || 0}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`font-extrabold text-sm ${colors.text}`}>
                              {item.overallScore}/100
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`font-bold text-xs ${halluc > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {halluc}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.overallScore >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                              item.overallScore >= 75 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                              item.overallScore >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                                        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}>
                              {label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right pr-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`btn-view-${item.id || item.timestamp}`}
                                onClick={() => setViewItem(item)}
                                className="btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                                title="View full report"
                              >
                                <Eye size={13} /> View
                              </button>
                              <button
                                id={`btn-pdf-${item.id || item.timestamp}`}
                                onClick={() => handleDownloadPDF(item)}
                                title="Download Report"
                                className="btn-ghost text-xs py-1 px-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                              >
                                <FileDown size={13} />
                              </button>
                              {item.source !== 'backend' && onDelete && (
                                <button
                                  id={`btn-delete-${item.id || item.timestamp}`}
                                  onClick={() => onDelete(item.id || item.timestamp)}
                                  className="btn-ghost text-xs py-1 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Delete record"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: BATCH EVALUATIONS TABLE ──────────────────────────────────── */}
      {activeTab === 'batch' && (
        <>
          {filteredBatchRecords.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Database size={44} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                No Batch Evaluations Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {batchHistory.length === 0
                  ? 'Upload and run a CSV batch evaluation to see comprehensive run histories here.'
                  : 'No batch runs matched the selected filter criteria.'}
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('batch')}
                  className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  <Layers size={14} /> Run Batch Evaluation
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      {['Date & Time', 'Batch ID', 'Model Engine', 'Total Queries', 'Verdict Breakdown', 'Avg Overall Score', 'Hallucination Rate', 'Actions'].map(h => (
                        <th
                          key={h}
                          className={`${
                            h === 'Actions' ? 'text-right pr-5' :
                            h === 'Date & Time' || h === 'Batch ID' ? 'text-left' :
                            'text-center'
                          } px-4 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredBatchRecords.map((batch) => {
                      const bModel = batch.model || (batch.batch_id?.startsWith('js_') ? 'JS Engine' : 'NLP Backend');
                      const avgScore = Math.round(batch.avg_overall_score ?? 0);
                      const colors = reliabilityColor(avgScore);
                      const hallRate = batch.hallucination_rate_pct ?? 0;
                      return (
                        <tr
                          key={batch.batch_id || batch.timestamp}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                            {formatTimestamp(batch.timestamp)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                              {batch.batch_id ? batch.batch_id.slice(0, 14) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              bModel === 'NLP Backend'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                            }`}>
                              {bModel === 'NLP Backend' ? <Wifi size={9} /> : null}
                              {bModel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-xs text-slate-800 dark:text-slate-200">
                            {batch.total_records || (batch.results ? batch.results.length : 0)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" title="Pass count">
                                P: {batch.pass_count ?? 0}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" title="Needs Improvement count">
                                NI: {batch.needs_improvement_count ?? 0}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400" title="Fail count">
                                F: {batch.fail_count ?? 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`font-extrabold text-sm ${colors.text}`}>
                              {avgScore}/100
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              hallRate > 0
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {hallRate}%
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right pr-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`btn-view-batch-${batch.batch_id}`}
                                onClick={() => {
                                  setViewBatchItem(batch);
                                  setExpandedBatchRows({});
                                }}
                                className="btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                                title="Inspect batch results"
                              >
                                <Eye size={13} /> View Details
                              </button>
                              <button
                                id={`btn-pdf-batch-${batch.batch_id}`}
                                onClick={() => handleDownloadBatch(batch)}
                                disabled={isDownloadingPdf}
                                title="Download Batch Report"
                                className="btn-ghost text-xs py-1 px-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                              >
                                <FileDown size={13} />
                              </button>
                              {onDeleteBatch && (
                                <button
                                  id={`btn-del-batch-${batch.batch_id}`}
                                  onClick={() => onDeleteBatch(batch.batch_id || batch.timestamp)}
                                  className="btn-ghost text-xs py-1 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Delete batch record"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODAL 1: SINGLE EVALUATION DETAIL MODAL ───────────────────────── */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="text-indigo-600" />
                  Validation Report
                </h3>
                <p className="text-xs text-slate-500 mt-1">{formatTimestamp(viewItem.timestamp)}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 font-medium">
                  <span className="font-bold text-slate-500">Query: </span>{viewItem.query}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    viewItem.model === 'NLP Backend'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                  }`}>
                    Engine: {viewItem.model}
                  </span>
                  <span className="text-xs text-slate-400">
                    Source: {viewItem.source === 'backend' ? 'FastAPI DB' : 'Local Session'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(viewItem)}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <FileDown size={13} />
                  {backendOnline && viewItem.source === 'backend' ? 'Download PDF' : 'Download Report'}
                </button>
                <button onClick={() => setViewItem(null)} className="btn-ghost p-1.5">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1 glass-card p-5">
                <ReliabilityGauge score={viewItem.overallScore} stats={viewItem.stats} />
              </div>
              <div className="md:col-span-2 glass-card p-5 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Consolidated Summary</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {viewItem.summary || 'No summary text recorded.'}
                </p>
                {viewItem.aiResponse && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 mb-1">AI Response Evaluated:</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-h-32 overflow-y-auto font-mono bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      {viewItem.aiResponse}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {viewItem.claims && viewItem.claims.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                  <span>Claim-by-Claim Breakdown</span>
                  <span className="text-xs text-slate-500 font-normal">
                    {viewItem.claims.length} claims extracted & verified
                  </span>
                </h4>
                <div className="space-y-3">
                  {viewItem.claims.map((claim, i) => (
                    <ClaimCard key={claim.id || i} claim={claim} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 2: BATCH EVALUATION INSPECTION MODAL ─────────────────────── */}
      {viewBatchItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto glass-card p-6 space-y-6 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="text-indigo-600" />
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    Batch Evaluation Inspection
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {viewBatchItem.batch_id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Processed on {formatTimestamp(viewBatchItem.timestamp)} • Engine:{' '}
                  <strong>{viewBatchItem.model || 'JS Engine'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadBatch(viewBatchItem)}
                  disabled={isDownloadingPdf}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <FileDown size={13} />
                  {isDownloadingPdf ? 'Generating PDF...' : 'Download Batch Report'}
                </button>
                <button onClick={() => setViewBatchItem(null)} className="btn-ghost p-1.5">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* KPI Overview Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="glass-card p-3 text-center border-blue-500/20 bg-blue-500/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Queries</p>
                <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                  {viewBatchItem.total_records || (viewBatchItem.results ? viewBatchItem.results.length : 0)}
                </p>
              </div>
              <div className="glass-card p-3 text-center border-emerald-500/20 bg-emerald-500/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Pass</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {viewBatchItem.pass_count ?? 0}
                </p>
              </div>
              <div className="glass-card p-3 text-center border-amber-500/20 bg-amber-500/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Needs Imp.</p>
                <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                  {viewBatchItem.needs_improvement_count ?? 0}
                </p>
              </div>
              <div className="glass-card p-3 text-center border-red-500/20 bg-red-500/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Fail</p>
                <p className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">
                  {viewBatchItem.fail_count ?? 0}
                </p>
              </div>
              <div className="glass-card p-3 text-center border-indigo-500/20 bg-indigo-500/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Avg Overall</p>
                <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {Math.round(viewBatchItem.avg_overall_score ?? 0)}/100
                </p>
              </div>
              <div className="glass-card p-3 text-center border-rose-500/20 bg-rose-500/5">
                <p className="text-[10px] uppercase font-bold text-slate-400">Hallucination</p>
                <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                  {viewBatchItem.hallucination_rate_pct ?? 0}%
                </p>
              </div>
            </div>

            {/* Dimension Breakdown Bar */}
            <div className="glass-card p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Agent Dimension Performance Averages
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Relevance</span>
                    <span className="font-bold">{viewBatchItem.avg_relevance ?? 'N/A'}/100</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, viewBatchItem.avg_relevance || 0)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Accuracy</span>
                    <span className="font-bold">{viewBatchItem.avg_accuracy ?? 'N/A'}/100</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, viewBatchItem.avg_accuracy || 0)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Hallucination Risk</span>
                    <span className="font-bold text-rose-500">{viewBatchItem.avg_hallucination_risk ?? 'N/A'}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, viewBatchItem.avg_hallucination_risk || 0)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Completeness</span>
                    <span className="font-bold">{viewBatchItem.avg_completeness ?? 'N/A'}/100</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, viewBatchItem.avg_completeness || 0)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Item Results in Batch */}
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Itemized Batch Query Results</span>
                <span className="text-xs text-slate-500 font-normal">
                  {(viewBatchItem.results || []).length} items evaluated
                </span>
              </h4>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
                        <th className="px-3 py-2.5 text-center w-12">#</th>
                        <th className="px-3 py-2.5 text-left">Query & Response Snippet</th>
                        <th className="px-3 py-2.5 text-center">Relevance</th>
                        <th className="px-3 py-2.5 text-center">Accuracy</th>
                        <th className="px-3 py-2.5 text-center">Halluc.</th>
                        <th className="px-3 py-2.5 text-center">Overall</th>
                        <th className="px-3 py-2.5 text-center">Verdict</th>
                        <th className="px-3 py-2.5 text-right pr-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {(viewBatchItem.results || []).map((row, idx) => {
                        const isExpanded = !!expandedBatchRows[idx];
                        const rowVerdict = row.verdict || (row.overall_score >= 75 ? 'Pass' : 'Fail');
                        const rowScore = Math.round(row.overall_score ?? 0);
                        const rowColors = reliabilityColor(rowScore);

                        return (
                          <React.Fragment key={idx}>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-3 py-2.5 text-center font-bold text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2.5 max-w-sm">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {row.query || '—'}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {row.ai_response || '—'}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold">
                                {row.relevance_score ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold">
                                {row.accuracy_score ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`font-bold ${row.hallucination_score > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {row.hallucination_score ?? 0}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`font-extrabold ${rowColors.text}`}>
                                  {rowScore}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  rowVerdict === 'Pass' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
                                  rowVerdict === 'Needs Improvement' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' :
                                  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                                }`}>
                                  {rowVerdict}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right pr-4">
                                <button
                                  onClick={() => toggleBatchRowExpand(idx)}
                                  className="btn-ghost py-0.5 px-2 text-[11px] inline-flex items-center gap-1 text-slate-600 dark:text-slate-400"
                                >
                                  {isExpanded ? <>Less <ChevronUp size={12} /></> : <>Inspect <ChevronDown size={12} /></>}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded row details */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 dark:bg-slate-900/40">
                                <td colSpan={8} className="p-4 space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                      <p className="font-bold text-slate-500 mb-1">Full Query:</p>
                                      <p className="text-slate-800 dark:text-slate-200">{row.query || '—'}</p>
                                      {row.reference && (
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                          <p className="font-bold text-slate-500 mb-1">Reference Context:</p>
                                          <p className="text-slate-700 dark:text-slate-300 italic">{row.reference}</p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                      <p className="font-bold text-slate-500 mb-1">Full AI Response:</p>
                                      <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
                                        {row.ai_response || '—'}
                                      </p>
                                    </div>
                                  </div>

                                  {row.validation_report?.summary && (
                                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-700 dark:text-indigo-300">
                                      <strong>Consolidated Reasoning: </strong>
                                      {row.validation_report.summary}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
