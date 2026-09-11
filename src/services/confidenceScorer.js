/**
 * confidenceScorer.js
 * ───────────────────
 * Computes a single confidence percentage for each validated claim.
 *
 * Formula (weighted composite):
 *
 *   confidence = (semanticSimilarity × 0.50)
 *              + (evidenceAvailability × 0.30)
 *              + (consistencyScore × 0.20)
 *
 * Where:
 *   semanticSimilarity  = similarity score from evidenceValidator (0–1)
 *   evidenceAvailability = 1 if reference context is present, 0.3 otherwise
 *   consistencyScore    = 1 − contradictionScore
 *
 * The result is clamped to [0, 1] and multiplied by 100 for display.
 */

/**
 * Calculate confidence for a single claim.
 *
 * @param {object} params
 * @param {number} params.similarityScore      - Evidence similarity (0–1)
 * @param {number} params.contradictionScore   - Contradiction signal (0–1)
 * @param {boolean} params.hasReference        - Whether reference text was provided
 * @returns {{ confidence: number, pct: number }}
 *           confidence ∈ [0,1], pct ∈ [0,100]
 */
export function scoreConfidence({ similarityScore, contradictionScore, hasReference }) {
  const semanticSimilarity   = similarityScore;
  const evidenceAvailability = hasReference ? 1.0 : 0.3;
  const consistencyScore     = 1 - contradictionScore;

  const raw =
    semanticSimilarity   * 0.50 +
    evidenceAvailability * 0.30 +
    consistencyScore     * 0.20;

  const confidence = Math.max(0, Math.min(1, raw));
  const pct = Math.round(confidence * 100);

  return { confidence, pct };
}

/**
 * Classify a claim's hallucination status based on derived scores.
 *
 * Classification rules (in priority order):
 *   1. contradictionScore > 0.50  →  'contradictory'   (Potential Hallucination)
 *   2. similarityScore > 0.60     →  'supported'
 *   3. similarityScore > 0.30     →  'uncertain'
 *   4. else                       →  'unsupported'
 *
 * @param {number} similarityScore
 * @param {number} contradictionScore
 * @param {boolean} hasReference
 * @returns {'supported'|'unsupported'|'uncertain'|'contradictory'}
 */
export function classifyStatus(similarityScore, contradictionScore, hasReference) {
  if (!hasReference) {
    // Without any reference we can only flag as unsupported
    return 'unsupported';
  }

  if (contradictionScore > 0.50) return 'contradictory';
  if (similarityScore  > 0.60)  return 'supported';
  if (similarityScore  > 0.30)  return 'uncertain';
  return 'unsupported';
}

/**
 * Generate a human-readable explanation for why a claim received its status.
 *
 * @param {string} status
 * @param {number} pct         - Confidence percentage
 * @param {boolean} hasReference
 * @returns {string}
 */
export function generateExplanation(status, pct, hasReference) {
  if (!hasReference) {
    return 'No reference context was provided. The claim cannot be verified against trusted sources. Manual verification is recommended.';
  }

  switch (status) {
    case 'supported':
      return `The reference context contains evidence that aligns with this claim (confidence ${pct}%). The key facts and entities match the trusted source material.`;
    case 'contradictory':
      return `The reference context appears to contradict this claim (confidence ${pct}%). Key assertions in the claim conflict with information found in the trusted source. This claim may represent a hallucination.`;
    case 'uncertain':
      return `The reference context is partially related but does not conclusively verify this claim (confidence ${pct}%). Additional sources should be consulted before relying on this statement.`;
    case 'unsupported':
      return `No matching evidence was found in the provided reference context (confidence ${pct}%). The claim may be accurate but cannot be verified against the available sources.`;
    default:
      return 'Classification could not be determined.';
  }
}
