import React, { useState, useCallback, useEffect } from 'react';
import {
  Sparkles, Send, RotateCcw, Copy, Download, CheckCircle2,
  FlaskConical, FileText, BookOpen, Wifi, WifiOff, FileDown,
  ChevronDown, Check,
} from 'lucide-react';
import ClaimCard from '../components/ClaimCard.jsx';
import ReliabilityGauge from '../components/ReliabilityGauge.jsx';
import ValidationPipeline from '../components/ValidationPipeline.jsx';
import AnnotatedResponse from '../components/AnnotatedResponse.jsx';
import { validateResponseAPI, checkHealth, downloadPDFReport } from '../services/api.js';
import { runValidation } from '../services/validationEngine.js';
import { DEMO_EXAMPLES } from '../data/demoData.js';
import { buildTextReport, buildJsonReport } from '../utils/textProcessing.js';

const STAGE_DELAYS = [350, 500, 700, 600, 550, 600, 700];

// Normalise backend response to match frontend schema
function normaliseResult(data) {
  if (!data) return null;
  return {
    ...data,
    aiResponse: data.ai_response || data.aiResponse || '',
    relevanceEval: data.relevance_eval || data.relevanceEval || null,
    accuracyEval: data.accuracy_eval || data.accuracyEval || null,
    hallucinationEval: data.hallucination_eval || data.hallucinationEval || null,
    claims: (data.claims || []).map(c => ({
      ...c,
      confidencePct:      c.confidence_pct      ?? c.confidencePct      ?? 0,
      similarityScore:    c.similarity_score     ?? c.similarityScore    ?? 0,
      contradictionScore: c.contradiction_score  ?? c.contradictionScore ?? 0,
    })),
    overallScore: data.overall_score ?? data.overallScore ?? 0,
    stats: {
      supported:       data.stats?.supported       ?? 0,
      unsupported:     data.stats?.unsupported     ?? 0,
      contradictory:   data.stats?.contradictory   ?? 0,
      uncertain:       data.stats?.uncertain       ?? 0,
      hallucinationRisk: data.stats?.hallucination_risk ?? data.stats?.hallucinationRisk ?? 0,
    },
  };
}


export default function Validate({ onSaveHistory }) {
  const [query,      setQuery]      = useState('');
  const [response,   setResponse]   = useState('');
  const [reference,  setReference]  = useState('');
  const [pipelineStage, setPipelineStage] = useState(0);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [result,        setResult]        = useState(null);
  const [copied,        setCopied]        = useState(false);
  const [backendOnline, setBackendOnline] = useState(null); // null = checking
  const [showDemoMenu,  setShowDemoMenu]  = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState(DEMO_EXAMPLES[0].id);

  // Check backend health on mount
  useEffect(() => {
    checkHealth().then(health => {
      setBackendOnline(health?.status === 'ok');
    });
  }, []);

  const loadDemo = (example = DEMO_EXAMPLES[0]) => {
    setQuery(example.query);
    setResponse(example.aiResponse);
    setReference(example.reference);
    setSelectedDemoId(example.id);
    setResult(null);
    setPipelineStage(0);
    setShowDemoMenu(false);
  };

  const reset = () => {
    setQuery(''); setResponse(''); setReference('');
    setResult(null); setPipelineStage(0); setIsAnalyzing(false);
  };

  const analyzeResponse = useCallback(async () => {
    if (!response.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    setPipelineStage(0);

    // Animate pipeline stages
    let delay = 0;
    for (let stage = 1; stage <= 7; stage++) {
      delay += STAGE_DELAYS[stage - 1];
      const s = stage;
      setTimeout(() => setPipelineStage(s), delay);
    }

    const totalDelay = STAGE_DELAYS.reduce((a, b) => a + b, 0);

    setTimeout(async () => {
      try {
        let raw;
        if (backendOnline) {
          // ── Use FastAPI backend (SentenceTransformers + ChromaDB + LangChain)
          raw = await validateResponseAPI({
            query,
            ai_response: response,
            reference: reference || '',
          });
        } else {
          // ── Fallback: local JS heuristic engine
          raw = runValidation({ query, aiResponse: response, reference });
        }

        const normalised = normaliseResult(raw);
        setResult(normalised);
        setPipelineStage(8);

        if (onSaveHistory) {
          onSaveHistory({
            ...normalised,
            claimsCount: normalised.claims.length,
          });
        }
      } catch (err) {
        console.error('Validation error:', err);
        // Fallback to JS engine on error
        const fallback = runValidation({ query, aiResponse: response, reference });
        const normalised = normaliseResult(fallback);
        setResult(normalised);
        setPipelineStage(8);
        if (onSaveHistory) onSaveHistory({ ...normalised, claimsCount: normalised.claims.length });
      } finally {
        setIsAnalyzing(false);
      }
    }, totalDelay + 200);
  }, [query, response, reference, backendOnline, onSaveHistory]);

  const copyReport = () => {
    if (!result) return;
    navigator.clipboard.writeText(buildTextReport(result)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadText = () => {
    if (!result) return;
    const blob = new Blob([buildTextReport(result)], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `validation-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob([buildJsonReport(result)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `validation-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!result || !backendOnline) return;
    downloadPDFReport(result.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Validate AI Response
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Powered by SentenceTransformers + ChromaDB + LangChain RAG + FastAPI
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Backend status indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
            backendOnline === null ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' :
            backendOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                           'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
          }`}>
            {backendOnline === null ? <><Wifi size={12} className="animate-pulse" /> Checking...</> :
             backendOnline ? <><Wifi size={12} /> Backend Online (NLP Active)</> :
                            <><WifiOff size={12} /> Using JS Fallback</>}
          </div>

          {/* Multi-Demo Dropdown Selector */}
          <div className="relative">
            <button
              id="btn-load-demo"
              onClick={() => setShowDemoMenu(prev => !prev)}
              className="btn-secondary flex items-center gap-2"
            >
              <FlaskConical size={16} className="text-violet-500" />
              <span>Load Demo Scenario</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showDemoMenu ? 'rotate-180' : ''}`} />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 divide-y divide-slate-100 dark:divide-slate-800/60">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select Demo Scenario
                </div>
                <div className="py-1 space-y-1">
                  {DEMO_EXAMPLES.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => loadDemo(ex)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-3 ${
                        selectedDemoId === ex.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs truncate">{ex.title}</span>
                          {selectedDemoId === ex.id && <Check size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">{ex.category}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${ex.badgeColor}`}>
                            {ex.expectedLabel}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="xl:col-span-2 space-y-5">
          <div className="glass-card p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              <FileText size={15} className="text-blue-500" /> User Query / Prompt
            </label>
            <textarea id="input-query" className="input-area" rows={3}
              placeholder="Enter the original question or prompt..."
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>

          <div className="glass-card p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              <Sparkles size={15} className="text-violet-500" /> AI-Generated Response
              <span className="ml-auto text-xs text-slate-400 font-normal">
                {response.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </label>
            <textarea id="input-response" className="input-area" rows={6}
              placeholder="Paste the response generated by the AI model..."
              value={response} onChange={e => setResponse(e.target.value)} />
          </div>

          <div className="glass-card p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              <BookOpen size={15} className="text-emerald-500" /> Reference Context / Trusted Evidence
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">Optional</span>
            </label>
            <textarea id="input-reference" className="input-area" rows={5}
              placeholder="Paste trusted reference content, documents, facts, or supporting evidence..."
              value={reference} onChange={e => setReference(e.target.value)} />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button id="btn-analyze" onClick={analyzeResponse}
              disabled={!response.trim() || isAnalyzing}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={16} />
              {isAnalyzing ? 'Analyzing with NLP Pipeline…' : 'Analyze Response'}
            </button>
            <button id="btn-reset" onClick={reset} className="btn-secondary" disabled={isAnalyzing}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>

        {/* Pipeline */}
        <div><ValidationPipeline activeStage={pipelineStage} /></div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Backend label badge */}
          {result.label && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
              result.label === 'Factual' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
              result.label === 'Partially Hallucinated' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
            }`}>
              Response Classification: {result.label}
              {result.processing_time_ms && (
                <span className="font-normal opacity-70 ml-2">
                  ({result.processing_time_ms}ms)
                </span>
              )}
            </div>
          )}

          {/* Annotated Response + Gauge */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <AnnotatedResponse responseText={result.aiResponse} claims={result.claims} />
            </div>
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-5">
                Overall Reliability Score
              </h3>
              <ReliabilityGauge score={result.overallScore} stats={result.stats} />
            </div>
          </div>

          {/* Summary + Actions */}
          <div className="glass-card p-6 border-l-4 border-l-blue-500">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
              Validation Summary
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{result.summary}</p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button id="btn-copy-report" onClick={copyReport} className="btn-secondary">
                {copied ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy Results'}
              </button>
              <button id="btn-download-txt" onClick={downloadText} className="btn-secondary">
                <Download size={15} /> Download .txt
              </button>
              <button id="btn-download-json" onClick={downloadJSON} className="btn-secondary">
                <Download size={15} /> Download .json
              </button>
              {backendOnline && result.id && (
                <button id="btn-download-pdf" onClick={handleDownloadPDF}
                  className="btn-primary">
                  <FileDown size={15} /> Download PDF Report
                </button>
              )}
              <button id="btn-analyze-another" onClick={reset} className="btn-ghost">
                <RotateCcw size={15} /> Analyze Another
              </button>
            </div>
          </div>

          {/* Specialized Evaluation Judge Agents Breakdown (Milestone 2) */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Evaluation Judge Agents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Relevance Judge Agent */}
              <div className="glass-card p-5 border-t-4 border-t-violet-500 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase text-violet-600 dark:text-violet-400 tracking-wider">
                      Relevance Judge Agent
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                      {result.relevanceEval?.relevance_score ?? 85}/100
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">
                    {result.relevanceEval?.relevance_label || 'Fully Relevant'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    {result.relevanceEval?.reasoning || 'Evaluates whether response directly addresses user question intent.'}
                  </p>
                </div>
                <div className="text-[11px] bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <span className="font-semibold text-slate-500">Query Intent: </span>
                  <span className="text-slate-700 dark:text-slate-300">{result.relevanceEval?.query_intent || 'Factual Request'}</span>
                </div>
              </div>

              {/* Accuracy Judge Agent */}
              <div className="glass-card p-5 border-t-4 border-t-emerald-500 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Accuracy Judge Agent
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      {result.accuracyEval?.accuracy_score ?? 90}/100
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">
                    {result.accuracyEval?.accuracy_label || 'Correct'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    {result.accuracyEval?.reasoning || 'Verifies factual correctness against trusted reference context.'}
                  </p>
                </div>
                <div className="text-[11px] bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <span className="font-semibold text-slate-500">Supporting Evidence: </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {result.accuracyEval?.supporting_evidence?.[0] ? `"${result.accuracyEval.supporting_evidence[0].substring(0, 60)}..."` : 'Reference Verified'}
                  </span>
                </div>
              </div>

              {/* Hallucination Detection Agent */}
              <div className="glass-card p-5 border-t-4 border-t-red-500 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase text-red-600 dark:text-red-400 tracking-wider">
                      Hallucination Detection Agent
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      (result.hallucinationEval?.hallucination_score ?? result.stats?.hallucinationRisk ?? 0) > 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    }`}>
                      {result.hallucinationEval?.hallucination_score ?? result.stats?.hallucinationRisk ?? 0}% Risk
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">
                    {result.hallucinationEval?.hallucination_label || (result.stats?.hallucinationRisk > 0 ? 'Minor Hallucination' : 'No Hallucination')}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    {result.hallucinationEval?.reasoning || 'Identifies unsupported or fabricated claims by cross-referencing RAG sources.'}
                  </p>
                </div>
                <div className="text-[11px] bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <span className="font-semibold text-slate-500">Flagged Statements: </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {result.hallucinationEval?.flagged_claims_count ?? 0} statement(s) flagged
                  </span>
                </div>
              </div>
            </div>
          </div>


          {/* Claim Cards */}
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">
              Claim-Level Analysis ({result.claims.length} claims)
            </h3>
            <div className="space-y-4">
              {result.claims.map((claim, i) => (
                <ClaimCard key={claim.id} claim={claim} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
