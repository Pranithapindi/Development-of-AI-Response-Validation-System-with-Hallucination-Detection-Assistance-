/**
 * aiService.js
 * ────────────
 * Abstraction layer for optional AI API integration.
 *
 * If VITE_AI_API_KEY is set in .env, this service will attempt to use the
 * OpenAI-compatible API for higher-quality claim extraction and validation.
 * If the key is missing or the call fails, it falls back to the local engine.
 *
 * This design allows the project to be demonstrated without any API key while
 * remaining ready for production-grade NLP integration.
 */

const API_KEY = import.meta.env.VITE_AI_API_KEY;
const API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const MODEL   = import.meta.env.VITE_AI_MODEL    || 'gpt-3.5-turbo';

/**
 * Check whether an AI API key is configured.
 * @returns {boolean}
 */
export function isAIAvailable() {
  return Boolean(API_KEY && API_KEY.trim().length > 0);
}

/**
 * Call the AI API with a prompt; returns the assistant message text.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function callAI(systemPrompt, userMessage) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * AI-powered claim extraction.
 * Falls back to returning null (caller should use local extractor).
 *
 * @param {string} aiResponse
 * @returns {Promise<string[]|null>} array of claim strings, or null on failure
 */
export async function extractClaimsWithAI(aiResponse) {
  if (!isAIAvailable()) return null;

  try {
    const system = `You are a factual claim extraction system. Extract individual, 
independently verifiable factual claims from the given text. Return ONLY a JSON 
array of strings, one claim per string. No commentary.`;

    const result = await callAI(system, aiResponse);
    return JSON.parse(result);
  } catch (err) {
    console.warn('[aiService] extractClaimsWithAI failed, using local fallback:', err.message);
    return null;
  }
}

/**
 * AI-powered claim validation against reference.
 * Falls back to null on failure.
 *
 * @param {string} claim
 * @param {string} reference
 * @returns {Promise<object|null>}
 */
export async function validateClaimWithAI(claim, reference) {
  if (!isAIAvailable()) return null;

  try {
    const system = `You are a fact-checking assistant. Given a claim and reference text,
return a JSON object with: { status: "supported"|"unsupported"|"uncertain"|"contradictory",
confidencePct: 0-100, explanation: string, evidence: string }.`;

    const user = `Claim: "${claim}"\n\nReference: "${reference}"`;
    const result = await callAI(system, user);
    return JSON.parse(result);
  } catch (err) {
    console.warn('[aiService] validateClaimWithAI failed, using local fallback:', err.message);
    return null;
  }
}

/**
 * AI-powered explanation generation.
 * @param {string} claim
 * @param {string} status
 * @param {string} evidence
 * @returns {Promise<string|null>}
 */
export async function generateExplanationWithAI(claim, status, evidence) {
  if (!isAIAvailable()) return null;

  try {
    const system = `You are a clear, concise fact-checking explainer. 
Given a claim, its validation status, and the reference evidence, write one or two 
sentences explaining why the claim received that status. Be precise and professional.`;

    const user = `Claim: "${claim}"\nStatus: ${status}\nEvidence: "${evidence}"`;
    return await callAI(system, user);
  } catch (err) {
    console.warn('[aiService] generateExplanationWithAI failed:', err.message);
    return null;
  }
}
