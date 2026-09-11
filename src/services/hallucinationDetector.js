/**
 * hallucinationDetector.js
 * ────────────────────────
 * Determines whether a claim contradicts the reference context by detecting
 * semantic negation and key-fact mismatches.
 *
 * Strategy:
 *   1. Look for negation patterns around claim tokens in reference sentences.
 *   2. Detect numeric / date mismatches (e.g., claim says 1905 but ref says 1921).
 *   3. Detect subject–predicate conflicts via keyword pairs.
 *   4. Combine into a contradictionScore (0–1).
 */

/**
 * Negation words that invert the meaning of nearby tokens.
 */
const NEGATIONS = [
  'not', 'no', 'never', 'neither', 'nor', 'without', 'incorrectly',
  "wasn't", "isn't", "weren't", "aren't", "didn't", "doesn't",
  "hadn't", "hasn't", "haven't", 'false', 'wrong', 'incorrect', 'mistakenly',
];

/**
 * Extract content keywords (non-stop-word tokens) from text.
 * @param {string} text
 * @returns {string[]}
 */
function keywords(text) {
  const STOP = new Set([
    'the','a','an','is','was','were','are','be','been','have','has','had',
    'do','does','did','to','of','in','on','at','for','with','by','from',
    'as','that','this','and','but','or','it','he','she','they','we','i',
    'you','his','her','its','their','our','my','which','who','also','both',
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}

/**
 * Extract 4-digit years from a string.
 * @param {string} text
 * @returns {number[]}
 */
function years(text) {
  return (text.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || []).map(Number);
}

/**
 * Detect if a reference sentence contains negation near a claim keyword,
 * which would imply a contradiction.
 * @param {string[]} claimKw  - Claim keywords
 * @param {string}   refSent  - A single reference sentence
 * @returns {number} contradiction boost 0–0.5
 */
function negationScore(claimKw, refSent) {
  const lower = refSent.toLowerCase();
  const hasClaimKw = claimKw.some(w => lower.includes(w));
  if (!hasClaimKw) return 0;
  const hasNegation = NEGATIONS.some(n => lower.includes(n));
  return hasNegation ? 0.35 : 0;
}

/**
 * Detect year/number mismatches between claim and reference.
 * Example: claim says "Nobel Prize ... 1921 for relativity"
 *          ref says "Nobel Prize ... photoelectric effect" — topic mismatch.
 * @param {string} claimText
 * @param {string} refText
 * @returns {number} 0–0.6
 */
function topicMismatchScore(claimText, refText) {
  if (!refText || !refText.trim()) return 0;

  const claimKw = new Set(keywords(claimText));
  const refKw   = new Set(keywords(refText));

  // Find claim keywords that do NOT appear in reference at all
  let missingCount = 0;
  let total = 0;

  for (const kw of claimKw) {
    // Only count meaningful/substantive words (length > 4)
    if (kw.length <= 4) continue;
    total++;
    if (!refKw.has(kw)) missingCount++;
  }

  if (total === 0) return 0;

  const missingRatio = missingCount / total;

  // Only flag if more than 60% of key terms are missing — prevents false positives
  return missingRatio > 0.6 ? missingRatio * 0.5 : 0;
}

/**
 * Main export: detect contradiction between a claim and the reference text.
 *
 * @param {string} claimText
 * @param {string} referenceText
 * @param {number} similarityScore  - from evidenceValidator (0–1)
 * @returns {{ contradictionScore: number }}  0–1
 */
export function detectContradiction(claimText, referenceText, similarityScore) {
  if (!referenceText || !referenceText.trim()) {
    return { contradictionScore: 0 };
  }

  const claimKw = keywords(claimText);

  // Split reference into sentences for fine-grained analysis
  const refSentences = referenceText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  // Sum negation signals across all reference sentences
  let negTotal = 0;
  for (const sent of refSentences) {
    negTotal += negationScore(claimKw, sent);
  }
  const negFactor = Math.min(0.5, negTotal);

  // Topic mismatch signal
  const mismatch = topicMismatchScore(claimText, referenceText);

  // If similarity is high, contradiction is unlikely (evidence supports → not contradicting)
  // If similarity is medium with negation → likely contradictory
  let score = 0;
  if (similarityScore >= 0.55) {
    // Evidence present — check for negation patterns
    score = negFactor * 0.8;
  } else if (similarityScore >= 0.2) {
    // Partial evidence — use mismatch + negation
    score = negFactor * 0.6 + mismatch * 0.4;
  } else {
    // No matching evidence — small base contradiction from mismatch
    score = mismatch * 0.3;
  }

  return { contradictionScore: Math.min(1, score) };
}
