/**
 * verdictJudge.js
 * ───────────────
 * Frontend JS fallback implementation of M3.2 Verdict Agent.
 */

export function evaluateVerdict({ relevanceEval, accuracyEval, hallucinationEval, completenessEval }) {
  const relScore   = relevanceEval?.relevanceScore   ?? relevanceEval?.relevance_score   ?? 85;
  const accScore   = accuracyEval?.accuracyScore     ?? accuracyEval?.accuracy_score     ?? 85;
  const hallRisk   = hallucinationEval?.hallucinationScore ?? hallucinationEval?.hallucination_score ?? 0;
  const hallSafety = Math.max(0, 100 - hallRisk);
  const compScore  = completenessEval?.completenessScore  ?? completenessEval?.completeness_score  ?? 85;

  // Weighted formula: Relevance 20%, Accuracy 30%, Hallucination Safety 30%, Completeness 20%
  const weighted = Math.round((0.20 * relScore) + (0.30 * accScore) + (0.30 * hallSafety) + (0.20 * compScore));

  const majorIssues = [];

  if (hallRisk >= 50) {
    majorIssues.push('Severe hallucination risk detected.');
  } else if (hallRisk > 0) {
    majorIssues.push('Minor unsupported claims identified.');
  }

  if (compScore < 60) {
    majorIssues.push('Significant question requirements omitted.');
  }

  if (relScore < 50) {
    majorIssues.push('Low relevance to user prompt intent.');
  }

  let verdict = 'Fail';
  let badgeColor = 'bg-red-500 text-white';

  const isCritical = hallRisk >= 50 || accScore < 30 || relScore < 30;

  if (isCritical) {
    verdict = 'Fail';
    badgeColor = 'bg-red-500 text-white';
  } else if (weighted >= 75 && hallRisk === 0 && compScore >= 60 && relScore >= 60) {
    verdict = 'Pass';
    badgeColor = 'bg-emerald-500 text-white';
  } else if (weighted >= 50) {
    verdict = 'Needs Improvement';
    badgeColor = 'bg-amber-500 text-white';
  } else {
    verdict = 'Fail';
    badgeColor = 'bg-red-500 text-white';
  }

  const reasoning = `Overall quality verdict is '${verdict}' (Weighted Score: ${weighted}/100). Relevance: ${relScore}/100, Accuracy: ${accScore}/100, Hallucination Risk: ${hallRisk}%, Completeness: ${compScore}/100.` +
    (majorIssues.length > 0 ? ` Issues: ${majorIssues.join(' ')}` : ' All evaluation dimensions pass quality criteria.');

  return {
    relevanceScore: relScore,
    accuracyScore: accScore,
    hallucinationScore: hallRisk,
    hallucinationSafetyScore: hallSafety,
    completenessScore: compScore,
    weightedOverallScore: weighted,
    verdict,
    verdictBadgeColor: badgeColor,
    majorIssues,
    consolidatedReasoning: reasoning,
  };
}
