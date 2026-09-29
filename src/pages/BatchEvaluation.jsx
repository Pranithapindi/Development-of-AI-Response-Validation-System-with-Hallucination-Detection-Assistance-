import React, { useState, useCallback } from 'react';
import {
  Upload, FileText, Download, CheckCircle, AlertTriangle, XCircle,
  Search, Filter, Eye, RefreshCw, Layers, ShieldCheck, HelpCircle, X, FlaskConical,
  FileDown,
} from 'lucide-react';
import { uploadBatchCSV, downloadSampleCSV, downloadBatchPDFReport } from '../services/api.js';

import { runValidation } from '../services/validationEngine.js';

function parseCSVClientSide(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Simple CSV line parser respecting quotes
  const parseRow = (str) => {
    const row = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim().replace(/^"+|"+$/g, '').replace(/""/g, '"'));
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim().replace(/^"+|"+$/g, '').replace(/""/g, '"'));
    return row;
  };

  const header = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const queryCol = header.findIndex(h => ['question', 'query', 'prompt'].includes(h));
  const respCol = header.findIndex(h => ['ai_response', 'response', 'answer'].includes(h));
  const refCol = header.findIndex(h => ['reference', 'context', 'evidence'].includes(h));

  if (queryCol === -1 || respCol === -1) return [];

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const q = cols[queryCol] || '';
    const r = cols[respCol] || '';
    const ref = refCol !== -1 ? (cols[refCol] || '') : '';
    if (q && r) {
      items.push({ row_index: i + 1, query: q, ai_response: r, reference: ref });
    }
  }
  return items;
}

export default function BatchEvaluation({ onSaveBatch }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchResult, setBatchResult] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | Pass | Needs Improvement | Fail
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [pdfExporting, setPdfExporting] = useState(false);

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

    let timer;
    try {
      timer = setInterval(() => {
        setProgress(prev => (prev < 85 ? prev + 15 : prev));
      }, 400);

      const result = await uploadBatchCSV(file);
      clearInterval(timer);
      setProgress(100);
      setBatchResult(result);
      if (onSaveBatch) onSaveBatch(result);
    } catch (err) {
      clearInterval(timer);
      console.warn('Backend batch API unavailable/error, running JS engine fallback:', err);
      try {
        const text = await file.text();
        const parsedRows = parseCSVClientSide(text);
        if (parsedRows.length === 0) {
          setError('Failed to parse CSV. Ensure CSV has question and ai_response columns.');
          return;
        }

        const batchItems = [];
        let passCount = 0, needsCount = 0, failCount = 0;
        let sumRel = 0, sumAcc = 0, sumHall = 0, sumComp = 0, sumOver = 0;
        let hallRecords = 0;

        for (const row of parsedRows) {
          const rep = runValidation({ query: row.query, aiResponse: row.ai_response, reference: row.reference });
          const v = rep.verdictEval?.verdict || rep.label || 'Fail';
          const relS = rep.relevanceEval?.relevanceScore ?? 80;
          const accS = rep.accuracyEval?.accuracyScore ?? 80;
          const hallS = rep.hallucinationEval?.hallucinationScore ?? rep.stats?.hallucinationRisk ?? 0;
          const compS = rep.completenessEval?.completenessScore ?? 80;
          const overS = rep.verdictEval?.weightedOverallScore ?? rep.overallScore ?? 80;

          if (v === 'Pass') passCount++;
          else if (v === 'Needs Improvement') needsCount++;
          else failCount++;

          if (hallS > 0) hallRecords++;

          sumRel += relS; sumAcc += accS; sumHall += hallS; sumComp += compS; sumOver += overS;

          batchItems.push({
            row_index: row.row_index,
            id: `b${Date.now()}_${row.row_index}`,
            query: row.query,
            ai_response: row.ai_response,
            reference: row.reference,
            relevance_score: relS,
            accuracy_score: accS,
            hallucination_score: hallS,
            completeness_score: compS,
            overall_score: overS,
            verdict: v,
            status: 'success',
            validation_report: rep
          });
        }

        const total = parsedRows.length;
        const fallbackResult = {
          batch_id: `js_${Date.now()}`,
          timestamp: new Date().toISOString(),
          total_records: total,
          valid_records: total,
          failed_records: 0,
          pass_count: passCount,
          needs_improvement_count: needsCount,
          fail_count: failCount,
          avg_relevance: Math.round((sumRel / total) * 10) / 10,
          avg_accuracy: Math.round((sumAcc / total) * 10) / 10,
          avg_hallucination_risk: Math.round((sumHall / total) * 10) / 10,
          avg_completeness: Math.round((sumComp / total) * 10) / 10,
          avg_overall_score: Math.round((sumOver / total) * 10) / 10,
          hallucination_rate_pct: Math.round((hallRecords / total) * 1000) / 10,
          results: batchItems,
        };
        setBatchResult(fallbackResult);
        if (onSaveBatch) onSaveBatch(fallbackResult);
        setProgress(100);
      } catch (jsErr) {
        console.error('JS CSV parse error:', jsErr);
        setError('Failed to process batch CSV.');
      }
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

          <div className="flex justify-end gap-3 flex-wrap">
            <button
              onClick={() => {
                const sampleText = `question,ai_response,reference
"Who invented the World Wide Web and when?","Tim Berners-Lee invented the World Wide Web in 1989 while working at CERN.","Tim Berners-Lee invented the World Wide Web in 1989 at CERN."
"Can antibiotics effectively cure influenza or the common cold?","Antibiotics like amoxicillin and azithromycin kill cold viruses within 24 hours.","Antibiotics are solely effective against bacterial infections and do not affect viruses like influenza or the common cold."
"Why did Albert Einstein receive the Nobel Prize?","Albert Einstein received the 1921 Nobel Prize in Physics for developing the theory of general relativity.","The Nobel Prize in Physics 1921 was awarded to Albert Einstein for his discovery of the law of the photoelectric effect, not relativity."
"What is the boiling point of water at sea level?","At standard sea level atmospheric pressure, pure water boils at 100 degrees Celsius or 212 degrees Fahrenheit.","Standard atmospheric pressure at sea level corresponds to a boiling point for pure water of 100 degrees Celsius."
"Explain the cause of World War I, key battles, and the Treaty of Versailles outcome.","World War I started in 1914.","World War I was triggered by the assassination of Archduke Franz Ferdinand in 1914. Key battles included the Somme and Verdun. The Treaty of Versailles imposed harsh penalties on Germany in 1919."`;
                const demoBlob = new File([sampleText], "sample_batch_5_questions.csv", { type: "text/csv" });
                setFile(demoBlob);
                setTimeout(() => runBatchProcess(), 100);
              }}
              className="btn-secondary text-xs flex items-center gap-2"
              disabled={isProcessing}
            >
              <FlaskConical size={15} className="text-violet-500" />
              Load & Run 5 Demo Scenarios
            </button>
            {file && (
              <button
                onClick={resetBatch}
                className="btn-secondary text-xs"
                disabled={isProcessing}
              >
                Clear File
              </button>
            )}
            <button
              onClick={runBatchProcess}
              disabled={!file || isProcessing}
              className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex justify-between items-center flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-xs">
                Batch ID: {batchResult.batch_id.slice(0, 8)}
              </div>
              <span className="text-xs text-slate-500">
                Evaluated {batchResult.valid_records} record(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-export-batch-pdf"
                onClick={async () => {
                  setPdfExporting(true);
                  await downloadBatchPDFReport(batchResult);
                  setPdfExporting(false);
                }}
                disabled={pdfExporting}
                className="btn-primary text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <FileDown size={14} />
                {pdfExporting ? 'Generating PDF…' : 'Export PDF Report'}
              </button>
              <button onClick={resetBatch} className="btn-secondary text-xs flex items-center gap-2">
                <RefreshCw size={14} /> Evaluate New CSV
              </button>
            </div>
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === st
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
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${item.verdict === 'Pass' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
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
                <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${selectedRecord.verdict === 'Pass' ? 'bg-emerald-100 text-emerald-700' :
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
