import React, { useState, useRef } from 'react';
import { statusMeta } from '../utils/scoring.js';

/**
 * AnnotatedResponse — renders the original AI response with colour-coded
 * highlights. Each highlighted span shows a tooltip on hover with status,
 * confidence, evidence, and explanation.
 *
 * @param {string}   responseText - Full original AI response
 * @param {object[]} claims       - Validated claims array
 */
export default function AnnotatedResponse({ responseText, claims }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  if (!responseText || !claims || claims.length === 0) return null;

  /**
   * Build an array of text segments, marking spans that correspond to claims.
   */
  function buildSegments() {
    const segments = [];
    let remaining = responseText;
    let lastIndex = 0;

    // Sort claims by position in text
    const sorted = [...claims].sort((a, b) => {
      const ia = responseText.indexOf(a.text);
      const ib = responseText.indexOf(b.text);
      return ia - ib;
    });

    // Build coverage map
    for (const claim of sorted) {
      const idx = responseText.indexOf(claim.text, lastIndex);
      if (idx === -1) continue;

      // Plain text before the claim
      if (idx > lastIndex) {
        segments.push({ type: 'plain', text: responseText.slice(lastIndex, idx) });
      }

      // Highlighted claim span
      segments.push({ type: 'claim', text: claim.text, claim });

      lastIndex = idx + claim.text.length;
    }

    // Remaining plain text
    if (lastIndex < responseText.length) {
      segments.push({ type: 'plain', text: responseText.slice(lastIndex) });
    }

    return segments;
  }

  const segments = buildSegments();

  return (
    <div className="glass-card p-5" ref={containerRef}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Annotated AI Response
        </h3>
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'Supported',   cls: 'bg-emerald-200 dark:bg-emerald-800' },
            { label: 'Hallucination', cls: 'bg-red-200 dark:bg-red-800' },
            { label: 'Uncertain',   cls: 'bg-amber-200 dark:bg-amber-800' },
            { label: 'Unsupported', cls: 'bg-orange-200 dark:bg-orange-800' },
          ].map(({ label, cls }) => (
            <span key={label} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              <span className={`inline-block w-3 h-3 rounded ${cls}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Response text with highlights */}
      <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed relative">
        {segments.map((seg, i) => {
          if (seg.type === 'plain') {
            return <span key={i}>{seg.text}</span>;
          }
          const meta = statusMeta(seg.claim.status);
          return (
            <span
              key={i}
              className={`${meta.highlight} px-0.5 py-0.5 relative cursor-pointer`}
              onMouseEnter={(e) => {
                const rect = e.target.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                setTooltip({
                  claim: seg.claim,
                  x: rect.left - containerRect.left,
                  y: rect.bottom - containerRect.top + 8,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {seg.text}
            </span>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-50 w-72 rounded-xl shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-xs"
            style={{ left: Math.min(tooltip.x, 300), top: tooltip.y }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={statusMeta(tooltip.claim.status).badge}>
                {statusMeta(tooltip.claim.status).label}
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300 ml-auto">
                {tooltip.claim.confidencePct}% confidence
              </span>
            </div>
            <div className="mb-2">
              <p className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Evidence</p>
              <p className="text-slate-600 dark:text-slate-300 italic">"{tooltip.claim.evidence}"</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Explanation</p>
              <p className="text-slate-600 dark:text-slate-300">{tooltip.claim.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
