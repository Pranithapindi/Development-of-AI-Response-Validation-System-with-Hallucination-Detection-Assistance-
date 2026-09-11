import React from 'react';
import { ShieldCheck, Brain, BarChart2, Eye, Users, Lock } from 'lucide-react';

const OBJECTIVES = [
  { icon: Brain,      label: 'Detect Potential Hallucinations',   desc: 'Identify AI-generated claims that contradict trusted reference information.' },
  { icon: ShieldCheck,label: 'Validate Factual Claims',           desc: 'Verify each claim against available evidence using semantic similarity.' },
  { icon: BarChart2,  label: 'Estimate Confidence',              desc: 'Compute weighted confidence scores for each individual claim.' },
  { icon: Eye,        label: 'Improve Transparency',             desc: 'Provide explainable, per-claim reasoning for every validation decision.' },
  { icon: Users,      label: 'Assist Human Verification',        desc: 'Flag uncertain responses and guide reviewers to prioritise their checking.' },
  { icon: Lock,       label: 'Increase AI Trustworthiness',      desc: 'Build user confidence in AI systems through systematic response validation.' },
];

export default function About() {
  return (
    <div className="space-y-10 max-w-4xl">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-700 p-10 text-white shadow-2xl">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold mb-3">
              AI Response Validation System
            </h2>
            <p className="text-blue-100 leading-relaxed text-sm max-w-2xl">
              AI systems can generate fluent, confident responses that contain incorrect or unsupported
              information — a phenomenon known as <strong className="text-white">hallucination</strong>.
              This project introduces an AI Response Validation System that analyses individual claims,
              compares them against available evidence, estimates confidence, and assists users in
              identifying possible hallucinations before trusting AI-generated information.
            </p>
          </div>
        </div>
      </div>

      {/* Research-oriented terminology */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-4">Research Context</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
          This system applies concepts from <strong>Natural Language Processing</strong>,{' '}
          <strong>Explainable AI</strong>, and <strong>Trustworthy AI</strong> research to address the
          growing concern about hallucination in generative language models. The pipeline implements:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'AI Hallucination Detection',
            'Claim-Level Verification',
            'Evidence Grounding',
            'Semantic Similarity',
            'Contradiction Detection',
            'Confidence Estimation',
            'Response Reliability',
            'Explainable AI',
            'Trustworthy AI',
          ].map(term => (
            <div key={term} className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-3 py-2">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">{term}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Objectives */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-5">Project Objectives</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {OBJECTIVES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="glass-card p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-4">Technology Stack</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'React 18', desc: 'Frontend framework' },
            { name: 'Vite', desc: 'Build tool & dev server' },
            { name: 'Tailwind CSS', desc: 'Utility-first styling' },
            { name: 'Recharts', desc: 'Data visualisation' },
            { name: 'Lucide React', desc: 'Icon system' },
            { name: 'localStorage', desc: 'History persistence' },
            { name: 'Jaccard Similarity', desc: 'Semantic matching' },
            { name: 'NLP Heuristics', desc: 'Claim extraction' },
          ].map(({ name, desc }) => (
            <div key={name} className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-center">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
