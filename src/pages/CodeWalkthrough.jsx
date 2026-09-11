import React, { useState } from 'react';
import { ChevronRight, Code2, CheckCircle } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    title: 'Step 1 — Input Processing',
    subtitle: 'Collecting user query, AI response, and reference evidence',
    icon: '📥',
    color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    activeColor: 'bg-blue-600',
    content: `The application collects three inputs:

1. **User Query** — the original question posed to the AI system.
2. **AI-Generated Response** — the text produced by the AI model to be validated.
3. **Reference Context** — trusted evidence or source material (optional, but recommended).

All inputs are stored in React state and passed to the validation engine. If no reference is provided, the system will still extract and classify claims, but all results will be marked as "Unsupported" since no evidence baseline exists.`,
    codeSnippet: `// Validate.jsx — input state
const [query,     setQuery]     = useState('');
const [response,  setResponse]  = useState('');
const [reference, setReference] = useState('');

// Passed into the validation engine
runValidation({ query, aiResponse: response, reference });`,
  },
  {
    id: 2,
    title: 'Step 2 — Claim Extraction',
    subtitle: 'Splitting the AI response into individual verifiable statements',
    icon: '🔍',
    color: 'border-violet-400 bg-violet-50 dark:bg-violet-900/20',
    activeColor: 'bg-violet-600',
    content: `The **Claim Extractor** splits the AI response into independent, verifiable factual sentences.

**Algorithm:**
- Protect abbreviations (Dr., U.S., etc.) to prevent false sentence splits
- Apply regex sentence boundary detection on punctuation
- Filter sentences by **factual signal patterns**: years (\\b\\d{4}\\b), assertive verbs (was, invented, received), superlatives (first, only, largest)
- Exclude opinion markers ("I think", "maybe", "allegedly")

Each claim is assigned a unique ID and returned for downstream processing.`,
    codeSnippet: `// claimExtractor.js
export function extractClaims(response) {
  const sentences = splitIntoSentences(response);
  return sentences
    .filter(isFactualClaim)
    .map((text, i) => ({ id: i + 1, text, type: 'factual' }));
}

// Returns:
// [
//   { id: 1, text: "Einstein received the Nobel Prize in 1921.", type: "factual" },
//   { id: 2, text: "He developed the theory of relativity.", type: "factual" }
// ]`,
  },
  {
    id: 3,
    title: 'Step 3 — Evidence Matching',
    subtitle: 'Computing semantic similarity between claim and reference',
    icon: '📚',
    color: 'border-teal-400 bg-teal-50 dark:bg-teal-900/20',
    activeColor: 'bg-teal-600',
    content: `The **Evidence Validator** computes a semantic similarity score between each claim and the reference context.

**Algorithm:**
1. Tokenise both claim and reference — remove stop words, punctuation
2. Compute **Jaccard Similarity**: |Intersection| / |Union| of token sets
3. Apply **bonus signals**:
   - Year overlap: +0.12 per matching 4-digit year
   - Number overlap: +0.06 per matching numeral
4. Select the reference sentence with the highest score as the **supporting evidence**

The result is a similarity score in [0, 1] that feeds into the confidence formula.`,
    codeSnippet: `// evidenceValidator.js
export function validateEvidence(claimText, referenceText) {
  const claimTokens = tokenise(claimText);
  const refSentences = splitRefSentences(referenceText);

  let bestScore = 0, bestEvidence = '';
  for (const sentence of refSentences) {
    const sentTokens = tokenise(sentence);
    let score = jaccardSimilarity(claimTokens, sentTokens);
    score += extractYears(claimText)
      .filter(y => sentence.includes(y)).length * 0.12;

    if (score > bestScore) { bestScore = score; bestEvidence = sentence; }
  }
  return { similarityScore: Math.min(1, bestScore), evidence: bestEvidence };
}`,
  },
  {
    id: 4,
    title: 'Step 4 — Contradiction Detection',
    subtitle: 'Identifying claims that conflict with the reference',
    icon: '⚠️',
    color: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
    activeColor: 'bg-orange-600',
    content: `The **Hallucination Detector** determines whether the reference contradicts the claim by detecting:

1. **Negation Patterns** — words like "not", "never", "incorrect", "false" near claim keywords in the reference
2. **Topic Mismatch** — percentage of meaningful claim terms missing from the reference (>60% missing → contradiction signal)

The contradiction score is amplified when similarity is medium-high (partial evidence present but negated) and suppressed when similarity is very low (simply unsupported, not contradicted).

This is the core hallucination detection signal.`,
    codeSnippet: `// hallucinationDetector.js
export function detectContradiction(claimText, referenceText, similarityScore) {
  const claimKw = keywords(claimText);
  const negFactor = Math.min(0.5,
    refSentences.reduce((sum, sent) => sum + negationScore(claimKw, sent), 0)
  );
  const mismatch = topicMismatchScore(claimText, referenceText);

  // Contradiction amplified by presence of partial evidence + negation
  const score = similarityScore >= 0.55
    ? negFactor * 0.8
    : negFactor * 0.6 + mismatch * 0.4;

  return { contradictionScore: Math.min(1, score) };
}`,
  },
  {
    id: 5,
    title: 'Step 5 — Confidence Calculation',
    subtitle: 'Weighted composite score for each claim',
    icon: '📊',
    color: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
    activeColor: 'bg-amber-600',
    content: `The **Confidence Scorer** computes a single confidence percentage per claim using a **weighted composite formula**:

\`\`\`
Confidence = semanticSimilarity   × 0.50
           + evidenceAvailability × 0.30
           + consistencyScore     × 0.20
\`\`\`

Where:
- **semanticSimilarity** = Jaccard score from evidenceValidator [0–1]
- **evidenceAvailability** = 1.0 if reference provided, 0.3 if not
- **consistencyScore** = 1 − contradictionScore

The result is clamped to [0, 1] and multiplied by 100 for display.`,
    codeSnippet: `// confidenceScorer.js
export function scoreConfidence({ similarityScore, contradictionScore, hasReference }) {
  const semanticSimilarity   = similarityScore;
  const evidenceAvailability = hasReference ? 1.0 : 0.3;
  const consistencyScore     = 1 - contradictionScore;

  const raw =
    semanticSimilarity   * 0.50 +
    evidenceAvailability * 0.30 +
    consistencyScore     * 0.20;

  const pct = Math.round(Math.max(0, Math.min(1, raw)) * 100);
  return { pct };
}`,
  },
  {
    id: 6,
    title: 'Step 6 — Final Classification',
    subtitle: 'Categorising each claim into a hallucination status',
    icon: '🏷️',
    color: 'border-red-400 bg-red-50 dark:bg-red-900/20',
    activeColor: 'bg-red-600',
    content: `Each claim is assigned one of four status labels based on the computed scores:

| Status | Condition | Meaning |
|--------|-----------|---------|
| **Supported** | similarity > 0.60 | Evidence confirms the claim |
| **Contradictory** | contradiction > 0.50 | Evidence conflicts with claim — likely hallucination |
| **Uncertain** | similarity > 0.30 | Partial evidence, inconclusive |
| **Unsupported** | similarity ≤ 0.30 | No matching evidence found |

The classification is intentionally **modular**: thresholds can be tuned, and an NLP model (e.g., an embedding-based semantic similarity model) can replace Jaccard without changing the interface.`,
    codeSnippet: `// confidenceScorer.js — Classification rules
export function classifyStatus(similarityScore, contradictionScore, hasReference) {
  if (!hasReference)           return 'unsupported';
  if (contradictionScore > 0.50) return 'contradictory';
  if (similarityScore  > 0.60)  return 'supported';
  if (similarityScore  > 0.30)  return 'uncertain';
  return 'unsupported';
}`,
  },
  {
    id: 7,
    title: 'Step 7 — Validation Report',
    subtitle: 'Aggregating individual results into an overall reliability score',
    icon: '📋',
    color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    activeColor: 'bg-emerald-600',
    content: `The **Validation Engine** aggregates individual claim results into a final reliability score and report.

**Overall Score Formula** (weighted average):
- Supported claims: contribute **100%** of their confidence value
- Uncertain claims: contribute **50%** of their confidence value
- Unsupported claims: contribute **25%** of their confidence value
- Contradictory claims: contribute **0%** (penalise the score)

**Reliability Tiers:**
- 90–100: Highly Reliable ✅
- 75–89: Mostly Reliable 🔵
- 50–74: Needs Verification ⚠️
- Below 50: High Hallucination Risk 🔴

The final report includes the annotated response, per-claim details, overall score, and a natural-language summary.`,
    codeSnippet: `// validationEngine.js
export function runValidation({ query, aiResponse, reference }) {
  const rawClaims = extractClaims(aiResponse);
  const results   = rawClaims.map(claim => processClaim(claim, reference));
  const overallScore = computeOverallScore(results);
  const summary      = generateSummary(results, overallScore);

  return { claims: results, overallScore, summary, stats, timestamp };
}

function computeOverallScore(results) {
  const weights = { supported:1.0, uncertain:0.5, unsupported:0.25, contradictory:0 };
  const sum = results.reduce((s, r) => s + r.confidencePct * weights[r.status], 0);
  return Math.round(sum / results.length);
}`,
  },
];

export default function CodeWalkthrough() {
  const [activeStep, setActiveStep] = useState(1);
  const step = STEPS.find(s => s.id === activeStep);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
          Code Walkthrough
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Step-by-step explanation of the validation pipeline — optimised for project demos and viva presentations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step selector */}
        <div className="space-y-2">
          {STEPS.map(s => (
            <button
              key={s.id}
              id={`walkthrough-step-${s.id}`}
              onClick={() => setActiveStep(s.id)}
              className={`
                w-full text-left p-3 rounded-xl border-2 transition-all duration-200
                ${activeStep === s.id
                  ? `${s.color} border-current shadow-md`
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    Step {s.id}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight truncate">
                    {s.title.replace(`Step ${s.id} — `, '')}
                  </p>
                </div>
                {activeStep === s.id && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
              </div>
            </button>
          ))}
        </div>

        {/* Content panel */}
        {step && (
          <div className="lg:col-span-3 space-y-5">
            {/* Header */}
            <div className={`rounded-2xl border-2 p-6 ${step.color}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{step.icon}</span>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{step.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="glass-card p-6">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-500" />
                Explanation
              </h4>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2 whitespace-pre-line">
                {step.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-bold text-slate-700 dark:text-slate-300">{line.replace(/\*\*/g,'')}</p>;
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
                  }
                  if (line.startsWith('|')) return null; // handled separately
                  return <p key={i}>{line}</p>;
                })}
              </div>

              {/* Table for step 6 */}
              {step.id === 6 && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        {['Status','Condition','Meaning'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {[
                        ['Supported',     'similarity > 0.60',      'Evidence confirms the claim'],
                        ['Contradictory', 'contradiction > 0.50',   'Conflicts with evidence — likely hallucination'],
                        ['Uncertain',     'similarity > 0.30',      'Partial evidence, inconclusive'],
                        ['Unsupported',   'similarity ≤ 0.30',      'No matching evidence found'],
                      ].map(([status, cond, meaning]) => (
                        <tr key={status} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-2.5">
                            <span className={`font-bold text-xs ${
                              status === 'Supported'     ? 'text-emerald-600' :
                              status === 'Contradictory' ? 'text-red-600'     :
                              status === 'Uncertain'     ? 'text-amber-600'   :
                                                          'text-orange-600'
                            }`}>{status}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">{cond}</td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">{meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Code snippet */}
            <div className="glass-card p-6">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Code2 size={15} className="text-blue-500" />
                Source Code
              </h4>
              <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 p-5 overflow-x-auto">
                <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre">
                  {step.codeSnippet}
                </pre>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setActiveStep(s => Math.max(1, s - 1))}
                disabled={activeStep === 1}
                className="btn-secondary disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                onClick={() => setActiveStep(s => Math.min(7, s + 1))}
                disabled={activeStep === 7}
                className="btn-primary disabled:opacity-40"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
