/**
 * evidenceValidator.js
 * ────────────────────
 * Compares an individual claim against a reference/context text to produce
 * a semantic similarity score and to surface the most relevant evidence.
 *
 * Algorithm (pure JS, no external model needed):
 *   1. Build a TF-IDF-inspired word overlap score between claim and reference.
 *   2. Boost the score if named entities / key numbers in the claim appear in
 *      the same sentence of the reference.
 *   3. Return the reference sentence with the highest overlap as evidence.
 */

/** Stop words to exclude from overlap calculation */
const STOP_WORDS = new Set([
  'the','a','an','is','was','were','are','be','been','being',
  'have','has','had','do','does','did','will','would','shall','should',
  'may','might','must','can','could','to','of','in','on','at','for',
  'with','by','from','as','that','this','these','those','it','he','she',
  'they','we','i','you','and','but','or','not','no','so','if','then',
  'his','her','its','our','their','your','my','which','who','whom',
]);

/**
 * Tokenise a string into lowercase words, filtering stop words.
 * @param {string} text
 * @returns {string[]}
 */
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Compute Jaccard similarity between two token arrays.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number} 0–1
 */
function jaccardSimilarity(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Extract 4-digit year numbers from a string.
 * @param {string} text
 * @returns {string[]}
 */
function extractYears(text) {
  return (text.match(/\b\d{4}\b/g) || []);
}

/**
 * Split reference text into sentences for granular evidence retrieval.
 * @param {string} text
 * @returns {string[]}
 */
function splitRefSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

/**
 * Main export: validate a single claim against available reference text.
 *
 * @param {string} claimText      - The claim to validate.
 * @param {string} referenceText  - Trusted reference / context material.
 * @returns {{
 *   similarityScore: number,   // 0–1
 *   evidence: string,          // best matching reference sentence
 *   matched: boolean,          // true if score ≥ 0.35
 * }}
 */
export function validateEvidence(claimText, referenceText) {
  // No reference available → no evidence
  if (!referenceText || !referenceText.trim()) {
    return { similarityScore: 0, evidence: 'No reference context provided.', matched: false };
  }

  const claimTokens  = tokenise(claimText);
  const claimYears   = extractYears(claimText);
  const refSentences = splitRefSentences(referenceText);

  let bestScore    = 0;
  let bestEvidence = '';

  for (const sentence of refSentences) {
    const sentTokens = tokenise(sentence);
    let score = jaccardSimilarity(claimTokens, sentTokens);

    // Bonus: years present in claim also appear in this sentence
    const sentYears = extractYears(sentence);
    const yearOverlap = claimYears.filter(y => sentYears.includes(y)).length;
    score += yearOverlap * 0.12;

    // Bonus: numbers in general
    const claimNums = (claimText.match(/\b\d+\b/g) || []);
    const sentNums  = (sentence.match(/\b\d+\b/g)  || []);
    const numOverlap = claimNums.filter(n => sentNums.includes(n)).length;
    score += numOverlap * 0.06;

    if (score > bestScore) {
      bestScore    = score;
      bestEvidence = sentence;
    }
  }

  // Normalise to 0–1 (clamp)
  const normalized = Math.min(1, bestScore);

  return {
    similarityScore: normalized,
    evidence: bestEvidence || referenceText.substring(0, 200),
    matched: normalized >= 0.35,
  };
}
