/**
 * completenessJudge.js
 * ────────────────────
 * Frontend JS fallback implementation of M3.1 Completeness Judge Agent.
 */

export function evaluateCompleteness(query, aiResponse, reference = '') {
  if (!query || !query.trim()) {
    return {
      completenessScore: 100,
      completenessLabel: 'Fully Complete',
      reasoning: 'No question prompt provided to evaluate completeness against.',
      addressedAspects: ['Default Aspect'],
      partiallyAddressedAspects: [],
      missingAspects: [],
    };
  }

  if (!aiResponse || !aiResponse.trim()) {
    return {
      completenessScore: 0,
      completenessLabel: 'Incomplete',
      reasoning: 'AI response is empty.',
      addressedAspects: [],
      partiallyAddressedAspects: [],
      missingAspects: ['Entire Question'],
    };
  }

  const cleanQuery = query.strip ? query.strip() : query.trim();
  const cleanResp  = aiResponse.toLowerCase();

  // Extract sub-questions or requirements
  const parts = cleanQuery.split(/\?|\;|\.\s+|\s+and\s+|\s+as well as\s+/i).filter(p => p.trim().length > 6);
  const aspects = parts.length > 0 ? parts : [cleanQuery];

  const addressed = [];
  const missing = [];

  for (const aspect of aspects) {
    const words = aspect.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const matches = words.filter(w => cleanResp.includes(w));
    const matchRatio = words.length > 0 ? matches.length / words.length : 1.0;

    if (matchRatio >= 0.5) {
      addressed.push(aspect.trim());
    } else {
      missing.push(aspect.trim());
    }
  }

  const score = Math.round((addressed.length / Math.max(1, aspects.length)) * 100);

  let label = 'Incomplete';
  let reasoning = '';

  if (score >= 90) {
    label = 'Fully Complete';
    reasoning = `The response thoroughly addresses all ${aspects.length} sub-questions and key requirements in the question prompt.`;
  } else if (score >= 70) {
    label = 'Substantially Complete';
    reasoning = `The response addresses core aspects (${addressed.length}/${aspects.length}), with minor details omitted.`;
  } else if (score >= 40) {
    label = 'Partially Complete';
    reasoning = `The response only partially answers the query. Omitted aspects include: ${missing.slice(0, 2).join(', ')}.`;
  } else {
    label = 'Incomplete';
    reasoning = `The response fails to address the majority of requirements contained in the submitted question.`;
  }

  return {
    completenessScore: score,
    completenessLabel: label,
    reasoning,
    addressedAspects: addressed,
    partiallyAddressedAspects: [],
    missingAspects: missing,
  };
}
