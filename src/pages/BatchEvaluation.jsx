import React, { useState, useCallback } from 'react';
import {
  Upload, FileText, Download, CheckCircle, AlertTriangle, XCircle,
  Search, Filter, Eye, RefreshCw, Layers, ShieldCheck, HelpCircle, X,
} from 'lucide-react';
import { uploadBatchCSV, downloadSampleCSV } from '../services/api.js';

export default function BatchEvaluation() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchResult, setBatchResult] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | Pass | Needs Improvement | Fail
  const [selectedRecord, setSelectedRecord] = useState(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped);
      setError(null);
    } else {
      setError('Please upload a valid .csv file.');
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.name.endsWith('.csv')) {
      setFile(selected);
      setError(null);
    } else if (selected) {
      setError('Please upload a valid .csv file.');
    }
  };

  const runBatchProcess = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(15);

    try {
      const timer = setInterval(() => {
        setProgress(prev => (prev < 85 ? prev + 15 : prev));
      }, 400);

      const result = await uploadBatchCSV(file);
      clearInterval(timer);
      setProgress(100);
      setBatchResult(result);
    } catch (err) {
      console.error('Batch evaluation error:', err);
      setError(err.response?.data?.detail || 'Failed to process batch CSV. Ensure file format is valid.');
    } finally {
      setIsProcessing(false);
    }
  }, [file]);

  const resetBatch = () => {
    setFile(null);
    setBatchResult(null);
    setError(null);
    setProgress(0);
    setSelectedRecord(null);
  };

  // Filtered rows for data table
  const filteredResults = (batchResult?.results || []).filter(item => {
    const matchesFilter =
      statusFilter === 'ALL' || item.verdict === statusFilter;
    const matchesSearch =
      !searchQuery ||
      item.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ai_response.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="text-blue-500" size={22} /> Batch Evaluation Module
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automated multi-record response validation across all evaluation agents
          </p>
        </div>
        <button
          onClick={downloadSampleCSV}
          className="btn-secondary flex items-center gap-2 text-xs"
        >
          <Download size={14} className="text-blue-500" /> Download Sample CSV Template
        </button>
      </div>

      {/* Upload Zone (if no result loaded yet) */}
      {!batchResult && (
        <div className="glass-card p-8 space-y-6">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-10 text-center transition-all bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer"
          >
            <input
              type="file"
              accept=".csv"
              id="csv-upload-input"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="csv-upload-input" className="cursor-pointer space-y-3 block">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-md">
                <Upload size={28} />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
                  {file ? file.name : 'Drag & Drop CSV file here or click to browse'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supported fields: <code className="text-blue-600 dark:text-blue-400">question</code>, <code className="text-blue-600 dark:text-blue-400">ai_response</code>, <code className="text-blue-600 dark:text-blue-400">reference</code> (optional)
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Evaluating Batch Entries with RAG Pipeline...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            {file && (
              <button
                onClick={resetBatch}
                className="btn-secondary"
                disabled={isProcessing}
              >
                Clear File
              </button>
            )}
            <button
              onClick={runBatchProcess}
              disabled={!file || isProcessing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing Batch...' : 'Start Batch Evaluation'}
            </button>
          </div>
        </div>
      )}

      {/* Batch Summary & Interactive Results */}
      {batchResult && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-xs">
                Batch ID: {batchResult.batch_id.slice(0, 8)}
              </div>
              <span className="text-xs text-slate-500">
                Evaluated {batchResult.valid_records} record(s)
              </span>
            </div>
            <button onClick={resetBatch} className="btn-secondary text-xs flex items-center gap-2">
              <RefreshCw size={14} /> Evaluate New CSV
            </button>
          </div>

          {/* Aggregated Batch Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="glass-card p-4 text-center">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Evaluated</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{batchResult.total_records}</p>
            </div>
            <div className="glass-card p-4 text-center border-b-4 border-b-emerald-500">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Pass</p>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">{batchResult.pass_count}</p>
            </div>
            <div className="glass-card p-4 text-center border-b-4 border-b-amber-500">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Needs Improvement</p>
              <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1">{batchResult.needs_improvement_count}</p>
            </div>
            <div className="glass-card p-4 text-center border-b-4 border-b-red-500">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">Fail</p>
              <p className="text-2xl font-extrabold text-red-700 dark:text-red-300 mt-1">{batchResult.fail_count}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Overall Score</p>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{batchResult.avg_overall_score}/100</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hallucination Rate</p>
              <p className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 mt-1">{batchResult.hallucination_rate_pct}%</p>
            </div>
          </div>

          {/* Average Dimension Scores Breakdown */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
              Batch Average Dimension Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold block">Avg Relevance</span>
                <span className="text-lg font-bold text-violet-600 dark:text-violet-400">{batchResult.avg_relevance}/100</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold block">Avg Accuracy</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{batchResult.avg_accuracy}/100</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold block">Avg Hallucination Risk</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">{batchResult.avg_hallucination_risk}%</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold block">Avg Completeness</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{batchResult.avg_completeness}/100</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search questions or responses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Verdict:</span>
              {['ALL', 'Pass', 'Needs Improvement', 'Fail'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Structured Results Data Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Row</th>
                    <th className="p-3.5">Question Prompt</th>
                    <th className="p-3.5">AI Response</th>
                    <th className="p-3.5 text-center">Relevance</th>
                    <th className="p-3.5 text-center">Accuracy</th>
                    <th className="p-3.5 text-center">Hallucination</th>
                    <th className="p-3.5 text-center">Completeness</th>
                    <th className="p-3.5 text-center">Overall</th>
                    <th className="p-3.5 text-center">Verdict</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredResults.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-400">#{item.row_index}</td>
                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate" title={item.query}>
                        {item.query}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.ai_response}>
                        {item.ai_response}
                      </td>
                      <td className="p-3.5 text-center font-semibold text-violet-600">{item.relevance_score}</td>
                      <td className="p-3.5 text-center font-semibold text-emerald-600">{item.accuracy_score}</td>
                      <td className="p-3.5 text-center font-semibold text-red-500">{item.hallucination_score}%</td>
                      <td className="p-3.5 text-center font-semibold text-blue-600">{item.completeness_score}</td>
                      <td className="p-3.5 text-center font-extrabold text-slate-900 dark:text-slate-100">{item.overall_score}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.verdict === 'Pass' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                          item.verdict === 'Needs Improvement' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {item.verdict}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedRecord(item)}
                          className="btn-ghost p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title="Inspect Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                        No batch records matching search/filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Detail Modal Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto p-6 space-y-6 shadow-2xl border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Batch Entry Row #{selectedRecord.row_index} Details
                </h3>
                <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                  selectedRecord.verdict === 'Pass' ? 'bg-emerald-100 text-emerald-700' :
                  selectedRecord.verdict === 'Needs Improvement' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  Verdict: {selectedRecord.verdict} ({selectedRecord.overall_score}/100)
                </span>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="btn-ghost p-2 text-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* Prompt & Response */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <p className="font-bold text-slate-500 mb-1">Question Prompt:</p>
                <p className="text-slate-800 dark:text-slate-200">{selectedRecord.query}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <p className="font-bold text-slate-500 mb-1">AI Response:</p>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{selectedRecord.ai_response}</p>
              </div>
              {selectedRecord.reference && (
                <div className="bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-xl">
                  <p className="font-bold text-blue-600 mb-1">Reference Context:</p>
                  <p className="text-slate-700 dark:text-slate-300">{selectedRecord.reference}</p>
                </div>
              )}
            </div>

            {/* 4 Dimension Judge Scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold block">Relevance</span>
                <span className="text-lg font-bold text-violet-600">{selectedRecord.relevance_score}/100</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold block">Accuracy</span>
                <span className="text-lg font-bold text-emerald-600">{selectedRecord.accuracy_score}/100</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold block">Hallucination Risk</span>
                <span className="text-lg font-bold text-red-500">{selectedRecord.hallucination_score}%</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-semibold block">Completeness</span>
                <span className="text-lg font-bold text-blue-600">{selectedRecord.completeness_score}/100</span>
              </div>
            </div>

            {/* Full Validation Summary */}
            {selectedRecord.validation_report && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">Consolidated Verdict Reasoning</p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{selectedRecord.validation_report.summary}</p>
                </div>

                {selectedRecord.validation_report.completeness_eval?.missing_aspects?.length > 0 && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    <p className="font-bold mb-1">Omitted Question Aspects:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {selectedRecord.validation_report.completeness_eval.missing_aspects.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
