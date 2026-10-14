/**
 * validationEngine.js
 * ───────────────────
 * Orchestrates the full hallucination-detection pipeline:
 *
 *   Input → Claim Extraction → Evidence Validation → Contradiction Detection
 *         → Confidence Scoring → Hallucination Classification → Final Report
 *
 * This module is the single entry point consumed by the UI.
 */

import { extractClaims }        from './claimExtractor.js';
import { validateEvidence }     from './evidenceValidator.js';
import { detectContradiction }  from './hallucinationDetector.js';
import { scoreConfidence, classifyStatus, generateExplanation } from './confidenceScorer.js';
import { evaluateCompleteness } from './completenessJudge.js';
import { evaluateVerdict }      from './verdictJudge.js';

/**
 * Process a single claim through the full pipeline.
 *
 * @param {{ id: number, text: string, type: string }} claim
 * @param {string} referenceText
 * @returns {object} enriched claim result
 */
function processClaim(claim, referenceText) {
  const hasReference = Boolean(referenceText && referenceText.trim());

  // Step 1 — Evidence retrieval & semantic similarity
  const { similarityScore, evidence, matched } =
    validateEvidence(claim.text, referenceText);

  // Step 2 — Contradiction detection
  const { contradictionScore } =
    detectContradiction(claim.text, referenceText, similarityScore);

  // Step 3 — Confidence scoring
  const { confidence, pct } =
    scoreConfidence({ similarityScore, contradictionScore, hasReference });

  // Step 4 — Status classification
  const status = classifyStatus(similarityScore, contradictionScore, hasReference);

  // Step 5 — Human-readable explanation
  const explanation = generateExplanation(status, pct, hasReference);

  return {
    ...claim,
    status,
    confidence,
    confidencePct: pct,
    similarityScore: Math.round(similarityScore * 100) / 100,
    contradictionScore: Math.round(contradictionScore * 100) / 100,
    evidence,
    matched,
    explanation,
  };
}

/**
 * Compute the overall reliability score for the full response (0–100).
 *
 * Weights:
 *   Supported     → contributes full confidence value
 *   Uncertain     → contributes 50% of confidence value
 *   Unsupported   → contributes 25% of confidence value
 *   Contradictory → contributes 0 (penalizes the score)
 *
 * @param {object[]} results - Array of processed claims
 * @returns {number} 0–100
 */
function computeOverallScore(results) {
  if (results.length === 0) return 0;

  let weightedSum = 0;
  for (const r of results) {
    switch (r.status) {
      case 'supported':     weightedSum += r.confidencePct * 1.00; break;
      case 'uncertain':     weightedSum += r.confidencePct * 0.50; break;
      case 'unsupported':   weightedSum += r.confidencePct * 0.25; break;
      case 'contradictory': weightedSum += 0;                      break;
    }
  }

  return Math.round(weightedSum / results.length);
}

/**
 * Generate a human-readable validation summary paragraph.
 * @param {object[]} results
 * @param {number} score
 * @returns {string}
 */
function generateSummary(results, score) {
  const total        = results.length;
  const supported    = results.filter(r => r.status === 'supported').length;
  const unsupported  = results.filter(r => r.status === 'unsupported').length;
  const contradictory= results.filter(r => r.status === 'contradictory').length;
  const uncertain    = results.filter(r => r.status === 'uncertain').length;

  let reliability = 'needs verification';
  if (score >= 90)      reliability = 'highly reliable';
  else if (score >= 75) reliability = 'mostly reliable';
  else if (score < 50)  reliability = 'high hallucination risk';

  const parts = [`The AI response contains ${total} factual claim${total !== 1 ? 's' : ''}.`];

  if (supported > 0)
    parts.push(`${supported} claim${supported !== 1 ? 's are' : ' is'} supported by the available evidence.`);
  if (unsupported > 0)
    parts.push(`${unsupported} claim${unsupported !== 1 ? 's lack' : ' lacks'} sufficient evidence for verification.`);
  if (contradictory > 0)
    parts.push(`${contradictory} claim${contradictory !== 1 ? 's appear' : ' appears'} to contradict the trusted reference information and may represent hallucinations.`);
  if (uncertain > 0)
    parts.push(`${uncertain} claim${uncertain !== 1 ? 's are' : ' is'} flagged as uncertain due to ambiguous evidence.`);

  parts.push(`The overall reliability score is ${score}/100 (${reliability}).`);

  if (contradictory > 0 || unsupported > 0) {
    parts.push('Manual verification is recommended before relying on this response.');
  }

  return parts.join(' ');
}

/**
 * Main export: run the complete validation pipeline.
 *
 * @param {object} input
 * @param {string} input.query          - User's original question
 * @param {string} input.aiResponse     - AI-generated response to validate
 * @param {string} [input.reference=''] - Optional trusted reference context
 * @returns {{
 *   claims: object[],
 *   overallScore: number,
 *   summary: string,
 *   stats: { supported, unsupported, contradictory, uncertain, hallucinationRisk },
 *   timestamp: string,
 * }}
 */
export function runValidation({ query, aiResponse, reference = '' }) {
  // Extract individual factual claims
  const rawClaims = extractClaims(aiResponse);

  // Process each claim through the pipeline
  const results = rawClaims.map(claim => processClaim(claim, reference));

  // Compute overall score
  const overallScore = computeOverallScore(results);

  // Build stats
  const supported    = results.filter(r => r.status === 'supported').length;
  const unsupported  = results.filter(r => r.status === 'unsupported').length;
  const contradictory= results.filter(r => r.status === 'contradictory').length;
  const uncertain    = results.filter(r => r.status === 'uncertain').length;
  const hallucinationRisk = Math.round((contradictory / Math.max(1, results.length)) * 100);

  const summary = generateSummary(results, overallScore);

  // Compute dynamic query-to-response relevance for JS engine
  const cleanQ = (query || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const qTokens = cleanQ.split(/\s+/).filter(w => w.length > 2 && !['the','what','who','when','where','why','how','which','and','for','with','are','was','were','can','does','did'].includes(w));
  const respLower = (aiResponse || '').toLowerCase();
  const coveredAspects = qTokens.filter(t => respLower.includes(t));
  const missingAspects = qTokens.filter(t => !respLower.includes(t));
  const coverageRatio = qTokens.length > 0 ? (coveredAspects.length / qTokens.length) : 0.9;
  
  const isRefusal = ['cannot answer', 'as an ai', 'i do not know', 'no information available'].some(p => respLower.includes(p));
  const relScore = isRefusal ? 15 : Math.round(Math.min(100, Math.max(35, (coverageRatio * 60) + (overallScore >= 50 ? 35 : 15))));
  const relLabel = isRefusal ? 'Off-topic' : relScore >= 80 ? 'Fully Relevant' : relScore >= 50 ? 'Partially Relevant' : 'Unrelated';

  const relevanceEval = {
    relevanceScore: relScore,
    relevanceLabel: relLabel,
    reasoning: isRefusal 
      ? 'Response appears to be a generic refusal.' 
      : `Response covers ${coveredAspects.length}/${Math.max(1, qTokens.length)} key prompt terms (${relLabel}).`,
    keyAspectsCovered: coveredAspects.slice(0, 5),
    missingAspects: missingAspects.slice(0, 5),
    queryIntent: query ? 'Information Request' : 'Unspecified',
  };

  const accuracyEval = {
    accuracyScore: overallScore,
    accuracyLabel: overallScore >= 80 ? 'Correct' : overallScore >= 50 ? 'Partially Correct' : 'Incorrect',
    reasoning: summary,
    correctClaimsCount: supported,
    partiallyCorrectClaimsCount: uncertain,
    incorrectClaimsCount: unsupported,
    contradictoryClaimsCount: contradictory,
    supportingEvidence: [],
  };

  const hallucinationEval = {
    isHallucinated: contradictory > 0 || hallucinationRisk > 0,
    hallucinationScore: hallucinationRisk,
    hallucinationLabel: hallucinationRisk > 40 ? 'Severe Hallucination' : hallucinationRisk > 0 ? 'Minor Hallucination' : 'No Hallucination',
    totalClaimsAnalyzed: results.length,
    flaggedClaimsCount: contradictory + unsupported,
    flaggedClaims: [],
    supportingEvidence: [],
    reasoning: `Hallucination risk evaluated at ${hallucinationRisk}%.`,
  };

  const completenessEval = evaluateCompleteness(query, aiResponse, reference);
  const verdictEval = evaluateVerdict({ relevanceEval, accuracyEval, hallucinationEval, completenessEval });

  return {
    query,
    aiResponse,
    reference,
    claims: results,
    overallScore: verdictEval.weightedOverallScore,
    label: verdictEval.verdict,
    summary: verdictEval.consolidatedReasoning,
    stats: { supported, unsupported, contradictory, uncertain, hallucinationRisk },
    timestamp: new Date().toISOString(),
    relevanceEval,
    accuracyEval,
    hallucinationEval,
    completenessEval,
    verdictEval,
  };
}
