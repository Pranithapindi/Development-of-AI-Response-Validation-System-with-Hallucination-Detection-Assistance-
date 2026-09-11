/**
 * scoring.js
 * ──────────
 * Utility helpers for scoring, formatting, and reliability classification.
 */

/**
 * Return the reliability tier label for a score.
 * @param {number} score 0–100
 * @returns {string}
 */
export function reliabilityLabel(score) {
  if (score >= 90) return 'Highly Reliable';
  if (score >= 75) return 'Mostly Reliable';
  if (score >= 50) return 'Needs Verification';
  return 'High Hallucination Risk';
}

/**
 * Return a Tailwind color class pair for a reliability score.
 * @param {number} score
 * @returns {{ text: string, bg: string, ring: string }}
 */
export function reliabilityColor(score) {
  if (score >= 90) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-400' };
  if (score >= 75) return { text: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500',   ring: 'ring-blue-400'   };
  if (score >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500',  ring: 'ring-amber-400'  };
  return              { text: 'text-red-600 dark:text-red-400',     bg: 'bg-red-500',    ring: 'ring-red-400'    };
}

/**
 * Return styling info for a claim status.
 * @param {'supported'|'unsupported'|'uncertain'|'contradictory'} status
 */
export function statusMeta(status) {
  switch (status) {
    case 'supported':
      return {
        label: 'Supported',
        badge: 'badge-supported',
        color: 'emerald',
        progressColor: 'bg-emerald-500',
        icon: 'CheckCircle',
        highlight: 'highlight-supported',
      };
    case 'contradictory':
      return {
        label: 'Potential Hallucination',
        badge: 'badge-contradictory',
        color: 'red',
        progressColor: 'bg-red-500',
        icon: 'XCircle',
        highlight: 'highlight-contradictory',
      };
    case 'uncertain':
      return {
        label: 'Uncertain',
        badge: 'badge-uncertain',
        color: 'amber',
        progressColor: 'bg-amber-500',
        icon: 'AlertCircle',
        highlight: 'highlight-uncertain',
      };
    case 'unsupported':
    default:
      return {
        label: 'Unsupported',
        badge: 'badge-unsupported',
        color: 'orange',
        progressColor: 'bg-orange-500',
        icon: 'MinusCircle',
        highlight: 'highlight-unsupported',
      };
  }
}

/**
 * Format an ISO timestamp to a human-readable date/time string.
 * @param {string} iso
 * @returns {string}
 */
export function formatTimestamp(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
