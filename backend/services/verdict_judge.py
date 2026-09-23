"""
verdict_judge.py
────────────────
M3.2 — Verdict Agent & Weighted Evaluation

Aggregates individual evaluation dimension outputs from:
  1. Relevance Judge Agent      (Weight: 20%)
  2. Accuracy Judge Agent       (Weight: 30%)
  3. Hallucination Detect Agent (Weight: 30% - inverted from risk percentage)
  4. Completeness Judge Agent   (Weight: 20%)

Calculates weighted overall score, applies critical failure override rules,
and determines final quality verdict:
  - Pass               (Green)
  - Needs Improvement  (Amber)
  - Fail               (Red)
"""

import logging
from typing import List, Dict, Any, Optional

from models.schemas import (
    RelevanceEvaluationResult, AccuracyEvaluationResult,
    HallucinationEvaluationResult, CompletenessEvaluationResult,
    VerdictEvaluationResult
)

logger = logging.getLogger(__name__)


def evaluate_verdict(
    relevance_eval: RelevanceEvaluationResult,
    accuracy_eval: AccuracyEvaluationResult,
    hallucination_eval: HallucinationEvaluationResult,
    completeness_eval: CompletenessEvaluationResult
) -> VerdictEvaluationResult:
    """
    Aggregate evaluation results across all 4 dimensions into a final quality verdict.

    Args:
        relevance_eval: Relevance Judge Agent result
        accuracy_eval: Accuracy Judge Agent result
        hallucination_eval: Hallucination Detection Agent result
        completeness_eval: Completeness Judge Agent result

    Returns:
        VerdictEvaluationResult object
    """
    rel_score  = relevance_eval.relevance_score
    acc_score  = accuracy_eval.accuracy_score
    hall_risk  = hallucination_eval.hallucination_score
    hall_safety= max(0, 100 - hall_risk)
    comp_score = completeness_eval.completeness_score

    # Step 1: Calculate Weighted Overall Evaluation Score (0-100)
    # Weights: Accuracy (30%), Hallucination Safety (30%), Relevance (20%), Completeness (20%)
    weighted_raw = (0.20 * rel_score) + (0.30 * acc_score) + (0.30 * hall_safety) + (0.20 * comp_score)
    weighted_score = int(max(0, min(100, round(weighted_raw))))

    # Step 2: Compile Major Issues across all dimensions
    major_issues: List[str] = []

    # Hallucination issues
    if hallucination_eval.is_hallucinated:
        if hallucination_eval.hallucination_label == "Severe Hallucination":
            major_issues.append("CRITICAL: Severe hallucination or unsupported claims detected.")
        else:
            major_issues.append("WARNING: Minor unsupported claims identified in response.")

    if accuracy_eval.contradictory_claims_count > 0:
        major_issues.append(f"CRITICAL: {accuracy_eval.contradictory_claims_count} claim(s) directly contradict trusted reference context.")

    # Relevance issues
    if rel_score < 50:
        major_issues.append(f"RELEVANCE: Response fails to address user prompt intent ({rel_score}/100).")

    # Completeness issues
    if completeness_eval.missing_aspects:
        missing_count = len(completeness_eval.missing_aspects)
        major_issues.append(f"COMPLETENESS: {missing_count} question requirement(s)/sub-question(s) omitted.")

    # Accuracy issues
    if acc_score < 50:
        major_issues.append(f"ACCURACY: High proportion of inaccurate or unverified statements ({acc_score}/100).")

    # Step 3: Threshold Rules & Critical Failure Override Rules
    # Rule 1: Severe hallucination, direct contradiction, or severe irrelevance forces 'Fail'
    has_critical_failure = (
        hall_risk >= 50 or
        accuracy_eval.contradictory_claims_count > 0 or
        acc_score < 30 or
        rel_score < 30
    )

    if has_critical_failure:
        verdict = "Fail"
        verdict_color = "bg-red-500 text-white dark:bg-red-600"
    elif weighted_score >= 75 and not hallucination_eval.is_hallucinated and comp_score >= 60 and rel_score >= 60:
        verdict = "Pass"
        verdict_color = "bg-emerald-500 text-white dark:bg-emerald-600"
    elif weighted_score >= 50:
        verdict = "Needs Improvement"
        verdict_color = "bg-amber-500 text-white dark:bg-amber-600"
    else:
        verdict = "Fail"
        verdict_color = "bg-red-500 text-white dark:bg-red-600"

    # Step 4: Synthesize Consolidated Reasoning
    reasoning_parts = [
        f"Overall evaluation verdict is '{verdict}' with a weighted reliability score of {weighted_score}/100.",
        f"Dimension Scores — Relevance: {rel_score}/100 ({relevance_eval.relevance_label}), "
        f"Accuracy: {acc_score}/100 ({accuracy_eval.accuracy_label}), "
        f"Hallucination Risk: {hall_risk}% ({hallucination_eval.hallucination_label}), "
        f"Completeness: {comp_score}/100 ({completeness_eval.completeness_label})."
    ]

    if major_issues:
        reasoning_parts.append(f"Major issues identified: {'; '.join(major_issues)}")
    else:
        reasoning_parts.append("Response demonstrates strong factual grounding, high relevance, and comprehensive question coverage.")

    consolidated_reasoning = " ".join(reasoning_parts)

    logger.info("Verdict evaluation complete: verdict=%s weighted_score=%d issues=%d", verdict, weighted_score, len(major_issues))

    return VerdictEvaluationResult(
        relevance_score=rel_score,
        accuracy_score=acc_score,
        hallucination_score=hall_risk,
        hallucination_safety_score=hall_safety,
        completeness_score=comp_score,
        weighted_overall_score=weighted_score,
        verdict=verdict,
        verdict_badge_color=verdict_color,
        major_issues=major_issues,
        consolidated_reasoning=consolidated_reasoning
    )
