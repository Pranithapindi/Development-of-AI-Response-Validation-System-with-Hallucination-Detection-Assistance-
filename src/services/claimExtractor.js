/**
 * claimExtractor.js
 * ─────────────────
 * Splits an AI-generated response into individual, independently verifiable
 * factual claims using sentence segmentation and heuristic filtering.
 *
 * In a production system this would call an NLP model or an LLM prompt to
 * extract atomic claims; here we use robust JavaScript heuristics so the
 * application is fully functional without any API key.
 */

/**
 * Split text into sentences using common punctuation patterns.
 * Handles abbreviations (e.g., "Dr.", "U.S.") to avoid false splits.
 * @param {string} text
 * @returns {string[]}
 */
function splitIntoSentences(text) {
  // Protect common abbreviations from being split
  const abbrevProtected = text
    .replace(/\bDr\./g,  'Dr⟨DOT⟩')
    .replace(/\bMr\./g,  'Mr⟨DOT⟩')
    .replace(/\bMs\./g,  'Ms⟨DOT⟩')
    .replace(/\bProf\./g,'Prof⟨DOT⟩')
    .replace(/\bSt\./g,  'St⟨DOT⟩')
    .replace(/\bU\.S\./g,'U⟨DOT⟩S⟨DOT⟩')
    .replace(/\betc\./g, 'etc⟨DOT⟩')
    .replace(/\bvs\./g,  'vs⟨DOT⟩');

  // Split on sentence-ending punctuation followed by whitespace + uppercase
  const rawSentences = abbrevProtected
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map(s => s.replace(/⟨DOT⟩/g, '.').trim())
    .filter(s => s.length > 0);

  return rawSentences;
}

/**
 * Determine whether a sentence contains a verifiable factual claim.
 * Filters out opinions, meta-commentary, and purely subjective statements.
 * @param {string} sentence
 * @returns {boolean}
 */
function isFactualClaim(sentence) {
  const s = sentence.toLowerCase();

  // Exclude very short fragments
  if (sentence.split(' ').length < 4) return false;

  // Exclude questions
  if (sentence.trim().endsWith('?')) return false;

  // Exclude clearly opinion/uncertainty markers
  const opinionMarkers = [
    'i think', 'i believe', 'in my opinion', 'it seems', 'perhaps', 'maybe',
    'possibly', 'some people say', 'it is said', 'allegedly',
  ];
  if (opinionMarkers.some(m => s.includes(m))) return false;

  // Factual signal: contains dates, numbers, named entities, or assertive verbs
  const factualPatterns = [
    /\b\d{4}\b/,                          // years
    /\b\d+\s*(million|billion|thousand)\b/i,
    /\b(is|was|were|are|has|have|had|did|does|do|received|won|invented|discovered|founded|created|developed|published|born|died)\b/i,
    /\b(first|second|third|last|only|largest|smallest|fastest|oldest|newest)\b/i,
  ];
  return factualPatterns.some(p => p.test(sentence));
}

/**
 * Main export: extract factual claims from an AI-generated response.
 * @param {string} response - The full AI-generated text.
 * @returns {{ id: number, text: string, type: string }[]}
 */
export function extractClaims(response) {
  if (!response || !response.trim()) return [];

  const sentences = splitIntoSentences(response);
  const claims = [];
  let id = 1;

  for (const sentence of sentences) {
    const cleaned = sentence.trim();
    if (isFactualClaim(cleaned)) {
      claims.push({
        id: id++,
        text: cleaned,
        type: 'factual',
      });
    }
  }

  // Fallback: if nothing extracted, return all sentences as potential claims
  if (claims.length === 0) {
    return sentences
      .filter(s => s.split(' ').length >= 4)
      .map((s, i) => ({ id: i + 1, text: s.trim(), type: 'potential' }));
  }

  return claims;
}
