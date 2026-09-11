"""
test_agent_consistency.py
──────────────────────────
Pytest validation suite for M2.4 — Agent Evaluation & Consistency Validation

Tests:
  - Relevance Judge Agent output format and scoring consistency
  - Accuracy Judge Agent evaluation against reference material
  - Hallucination Detection Agent statement-level flagging
  - Benchmark dataset execution consistency
"""

import pytest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.relevance_judge import evaluate_relevance
from services.accuracy_judge import evaluate_accuracy
from services.hallucination_judge import evaluate_hallucinations
from services.benchmark_runner import run_benchmark_suite


def test_relevance_judge_fully_relevant():
    query = "What is photosynthesis?"
    ai_response = "Photosynthesis is the process by which green plants and some organisms use sunlight to synthesize nutrients from carbon dioxide and water."
    res = evaluate_relevance(query, ai_response)
    assert res.relevance_score >= 70
    assert res.relevance_label in ["Fully Relevant", "Partially Relevant"]
    assert "photosynthesis" in [k.lower() for k in res.key_aspects_covered]


def test_relevance_judge_off_topic():
    query = "What is quantum computing?"
    ai_response = "The recipe for baking bread includes flour, yeast, warm water, and salt."
    res = evaluate_relevance(query, ai_response)
    assert res.relevance_score < 40
    assert res.relevance_label in ["Unrelated", "Off-topic"]


def test_accuracy_judge_correct():
    query = "When did WWII end?"
    ai_response = "World War II officially ended in September 1945."
    reference = "World War II ended in September 1945 with the formal surrender of Japan."
    res = evaluate_accuracy(query, ai_response, reference)
    assert res.accuracy_score >= 75
    assert res.accuracy_label in ["Correct", "Partially Correct"]
    assert len(res.supporting_evidence) > 0


def test_hallucination_judge_detection():
    ai_response = "Humans have 12 hearts and can breathe underwater naturally without equipment."
    reference = "Humans have one heart and breathe air using lungs."
    res = evaluate_hallucinations(ai_response, reference)
    assert res.is_hallucinated is True
    assert res.hallucination_score > 0
    assert res.flagged_claims_count > 0
    assert len(res.flagged_claims) > 0


def test_benchmark_suite_execution():
    summary = run_benchmark_suite()
    assert summary.total_tests > 0
    assert summary.overall_consistency_pct >= 50.0
    assert len(summary.test_results) == summary.total_tests
