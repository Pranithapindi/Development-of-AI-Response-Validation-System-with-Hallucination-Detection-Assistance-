import React from 'react';
import { ArrowDown, ChevronRight, ExternalLink } from 'lucide-react';

const NODES = [
  {
    id: 'user',
    label: 'User (Browser / Client)',
    desc: 'Enters query + AI response → Submits for validation',
    color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700',
  },
  {
    id: 'frontend',
    label: 'Frontend (React.js)',
    desc: 'Home · Validation Result · Dashboard · Analytics · Reports',
    color: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700',
    tag: 'Axios REST API ↓',
  },
  {
    id: 'backend',
    label: 'Backend (FastAPI / Python)',
    desc: 'Step 1: Receive query + AI response\nStep 2: Retrieve facts from Knowledge Base (ChromaDB)\nStep 3: Run NLP Hallucination Detector (SentenceTransformers)\nStep 4: Calculate Hallucination Score (0–100%)\nStep 5: Return result + highlighted sentences',
    color: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700',
    tag: 'Save results ↓',
  },
  {
    id: 'database',
    label: 'Database & Knowledge Base',
    desc: 'MongoDB — stores queries, responses, validation results, history\nSQLite fallback — auto-used if MongoDB is unavailable\nChromaDB — Vector DB storing reference embeddings for RAG',
    color: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700',
    tag: 'AI Models ↓',
  },
  {
    id: 'models',
    label: 'AI / ML Models',
    desc: 'SentenceTransformers (all-MiniLM-L6-v2) → Semantic similarity scoring\nLangChain → Orchestrate RAG retrieval pipeline\nChromaDB / FAISS → Vector search for evidence retrieval\nNLTK → Sentence tokenization for claim extraction\nReportLab → PDF report generation',
    color: 'bg-slate-700', bg: 'bg-slate-100 dark:bg-slate-800/60', border: 'border-slate-300 dark:border-slate-600',
  },
];

const MODULES = [
  {
    title: 'Claim Extraction Module', file: 'backend/services/claim_extractor.py', color: 'border-l-blue-500',
    items: [
      'NLTK Punkt sentence tokenizer — accurate boundary detection',
      'Factual pattern matching: dates, assertive verbs, named entities',
      'Opinion marker filtering — removes subjective statements',
    ],
  },
  {
    title: 'RAG Retrieval Pipeline', file: 'backend/services/rag_pipeline.py', color: 'border-l-violet-500',
    items: [
      'LangChain RecursiveCharacterTextSplitter — chunks reference text',
      'ChromaDB EphemeralClient — per-session vector store',
      'Top-3 chunk retrieval → best evidence selection',
    ],
  },
  {
    title: 'Semantic Similarity Engine', file: 'backend/services/nlp_validator.py', color: 'border-l-teal-500',
    items: [
      'SentenceTransformers all-MiniLM-L6-v2 — 384-dim dense embeddings',
      'Cosine similarity (numpy) between claim and evidence vectors',
      'Batched encoding for efficiency across multiple claims',
    ],
  },
  {
    title: 'Hallucination Detector', file: 'backend/services/hallucination_detector.py', color: 'border-l-orange-500',
    items: [
      'Negation word detection near claim keywords in reference',
      'Topic mismatch scoring (>60% of claim terms absent = contradiction)',
      'Weighted contradiction score combining both signals',
    ],
  },
  {
    title: 'Confidence Scoring Engine', file: 'backend/services/confidence_scorer.py', color: 'border-l-amber-500',
    items: [
      'Confidence = similarity×0.5 + evidence×0.3 + consistency×0.2',
      'Label: Factual (≥80) / Partially Hallucinated (≥50) / Hallucinated (<50)',
      'Per-claim status: supported / contradictory / uncertain / unsupported',
    ],
  },
  {
    title: 'PDF Report Generator', file: 'backend/services/pdf_generator.py', color: 'border-l-red-500',
    items: [
      'ReportLab — professional A4 PDF with colour-coded claim tables',
      'Full claim-level analysis, evidence quotes, explanations',
      'Served via GET /api/validate/pdf/{id} endpoint',
    ],
  },
  {
    title: 'Database Layer', file: 'backend/database/db.py', color: 'border-l-purple-500',
    items: [
      'MongoDB (primary) via pymongo — stores full validation documents',
      'SQLite fallback — auto-activated if MongoDB is not running',
      'Full CRUD: save / list / get / delete validation records',
    ],
  },
];

export default function Architecture() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">System Architecture</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Full-stack pipeline: React.js → FastAPI → SentenceTransformers + ChromaDB + LangChain + MongoDB
        </p>
      </div>

      {/* API docs link */}
      <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
        <ExternalLink size={14} /> View FastAPI Interactive Docs (Swagger UI)
      </a>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Pipeline diagram */}
        <div className="lg:col-span-1 flex flex-col items-center gap-1">
          {NODES.map((node, i) => (
            <React.Fragment key={node.id}>
              <div className={`w-full rounded-2xl border-2 p-4 transition-all hover:scale-[1.02] hover:shadow-lg cursor-default ${node.bg} ${node.border}`}>
                <div className={`w-3 h-3 rounded-full ${node.color} mx-auto mb-2`} />
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm text-center">{node.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug whitespace-pre-line text-center">{node.desc}</p>
              </div>
              {i < NODES.length - 1 && (
                <div className="flex flex-col items-center py-0.5">
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
                  <ArrowDown size={14} className="text-slate-400" />
                  {node.tag && (
                    <span className="text-xs text-slate-400 italic mt-0.5">{node.tag}</span>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Module details */}
        <div className="lg:col-span-2 space-y-4">
          {MODULES.map(({ title, file, color, items }) => (
            <div key={title} className={`glass-card p-5 border-l-4 ${color}`}>
              <div className="flex items-center gap-2 mb-1">
                <ChevronRight size={14} className="text-slate-400" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200">{title}</h4>
              </div>
              <code className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded mb-3 inline-block">
                {file}
              </code>
              <ul className="space-y-1.5">
                {items.map((line, i) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* API Endpoints */}
          <div className="glass-card p-5 border-l-4 border-l-emerald-500">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">REST API Endpoints</h4>
            <div className="space-y-2">
              {[
                { method:'POST', path:'/api/validate', desc:'Run full validation pipeline' },
                { method:'GET',  path:'/api/validate/pdf/{id}', desc:'Download PDF report' },
                { method:'GET',  path:'/api/history', desc:'List all validation records' },
                { method:'DELETE', path:'/api/history/{id}', desc:'Delete a record' },
                { method:'GET',  path:'/api/analytics', desc:'Aggregated analytics data' },
                { method:'GET',  path:'/api/health', desc:'Backend health check' },
              ].map(({ method, path, desc }) => (
                <div key={path} className="flex items-center gap-3 text-sm">
                  <span className={`font-bold text-xs px-2 py-0.5 rounded font-mono ${
                    method==='POST'?'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400':
                    method==='DELETE'?'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400':
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  }`}>{method}</span>
                  <code className="text-slate-700 dark:text-slate-300 font-mono text-xs">{path}</code>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">— {desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
