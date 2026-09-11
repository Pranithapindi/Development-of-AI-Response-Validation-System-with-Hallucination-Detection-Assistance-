import React from 'react';
import { CheckCircle, Loader2, Circle } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 1, label: 'Parsing AI Response',       desc: 'Tokenising and normalising input text' },
  { id: 2, label: 'Extracting Factual Claims',  desc: 'Sentence segmentation + heuristic filtering' },
  { id: 3, label: 'Searching Evidence',         desc: 'Scanning reference context for matching passages' },
  { id: 4, label: 'Semantic Consistency Check', desc: 'Computing TF-IDF Jaccard similarity scores' },
  { id: 5, label: 'Calculating Confidence',     desc: 'Weighted composite confidence formula' },
  { id: 6, label: 'Detecting Hallucinations',   desc: 'Negation & topic-mismatch contradiction detection' },
  { id: 7, label: 'Generating Validation Report', desc: 'Aggregating results into final reliability score' },
];

/**
 * ValidationPipeline — animated step-by-step pipeline visualization.
 * @param {number} activeStage  1–7 (current), 0 = idle, 8+ = done
 */
export default function ValidationPipeline({ activeStage }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-5">
        Validation Pipeline
      </h3>
      <div className="space-y-3">
        {PIPELINE_STAGES.map((stage) => {
          const isDone   = activeStage > stage.id;
          const isActive = activeStage === stage.id;
          const isIdle   = activeStage < stage.id;

          return (
            <div
              key={stage.id}
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all duration-500
                ${isDone   ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : ''}
                ${isActive ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : ''}
                ${isIdle   ? 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 opacity-60' : ''}
              `}
            >
              {/* Icon */}
              <div className="shrink-0">
                {isDone && <CheckCircle size={18} className="text-emerald-500" />}
                {isActive && <Loader2 size={18} className="text-blue-500 animate-spin" />}
                {isIdle && <Circle size={18} className="text-slate-300 dark:text-slate-600" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${
                  isDone   ? 'text-emerald-700 dark:text-emerald-400' :
                  isActive ? 'text-blue-700 dark:text-blue-300' :
                             'text-slate-500 dark:text-slate-500'
                }`}>
                  {stage.label}
                </p>
                {isActive && (
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 animate-pulse">
                    {stage.desc}
                  </p>
                )}
                {isDone && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                    Complete
                  </p>
                )}
              </div>

              {/* Stage number */}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isDone   ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                isActive ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                           'bg-slate-100 dark:bg-slate-700 text-slate-400'
              }`}>
                {stage.id}/7
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
