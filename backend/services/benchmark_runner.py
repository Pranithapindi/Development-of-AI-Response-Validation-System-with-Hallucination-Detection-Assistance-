"""
benchmark_runner.py
───────────────────
M2.4 — Agent Evaluation & Consistency Validation Runner

Executes benchmark test dataset (TruthfulQA, SQuAD, edge cases) across
Relevance, Accuracy, and Hallucination Judge Agents.

Computes:
  - Relevance consistency %
  - Accuracy consistency %
  - Hallucination detection consistency %
  - False Positives and False Negatives rates
  - Detailed comparison of expected vs actual agent outputs
"""

import json
import time
import os
import logging
from typing import Dict, List, Any

from services.relevance_judge import evaluate_relevance
from services.accuracy_judge import evaluate_accuracy
from services.hallucination_judge import evaluate_hallucinations
from models.schemas import BenchmarkTestCase, BenchmarkTestResult, BenchmarkSummary

logger = logging.getLogger(__name__)

BENCHMARK_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "benchmark_dataset.json"
)


def load_benchmark_dataset() -> List[Dict[str, Any]]:
    """Load benchmark dataset JSON."""
    if not os.path.exists(BENCHMARK_FILE_PATH):
        logger.error("Benchmark file not found at %s", BENCHMARK_FILE_PATH)
        return []
    with open(BENCHMARK_FILE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def run_benchmark_suite() -> BenchmarkSummary:
    """
    Execute the entire benchmark dataset through all 3 Judge Agents
    and summarize performance & scoring consistency.

    Returns:
        BenchmarkSummary object
    """
    dataset = load_benchmark_dataset()
    if not dataset:
        return BenchmarkSummary(
            total_tests=0,
            relevance_consistency_pct=0.0,
            accuracy_consistency_pct=0.0,
            hallucination_consistency_pct=0.0,
            overall_consistency_pct=0.0,
            false_positives_count=0,
            false_negatives_count=0,
            test_results=[]
        )

    results: List[BenchmarkTestResult] = []

    relevance_matches = 0
    accuracy_matches = 0
    hallucination_matches = 0

    false_positives = 0
    false_negatives = 0

    for item in dataset:
        start_t = time.time()

        test_id = item["id"]
        category = item.get("category", "General")
        query = item["query"]
        ai_resp = item["ai_response"]
        reference = item.get("reference", "")

        exp_rel = item["expected_relevance"]
        exp_acc = item["expected_accuracy"]
        exp_hal = item["expected_hallucination"]

        # Run agents
        rel_res = evaluate_relevance(query, ai_resp)
        acc_res = evaluate_accuracy(query, ai_resp, reference)
        hal_res = evaluate_hallucinations(ai_resp, reference)

        act_rel = rel_res.relevance_label
        act_acc = acc_res.accuracy_label
        act_hal = hal_res.hallucination_label

        rel_match = (act_rel == exp_rel)
        acc_match = (act_acc == exp_acc)
        hal_match = (act_hal == exp_hal)

        if rel_match:
            relevance_matches += 1
        if acc_match:
            accuracy_matches += 1
        if hal_match:
            hallucination_matches += 1

        # False positive / False negative tracking for hallucination detection
        is_exp_hallucinated = exp_hal != "No Hallucination"
        is_act_hallucinated = hal_res.is_hallucinated

        if is_act_hallucinated and not is_exp_hallucinated:
            false_positives += 1
        elif not is_act_hallucinated and is_exp_hallucinated:
            false_negatives += 1

        elapsed_ms = round((time.time() - start_t) * 1000)

        results.append(
            BenchmarkTestResult(
                test_id=test_id,
                category=category,
                query=query,
                expected_relevance=exp_rel,
                actual_relevance=act_rel,
                relevance_match=rel_match,
                expected_accuracy=exp_acc,
                actual_accuracy=act_acc,
                accuracy_match=acc_match,
                expected_hallucination=exp_hal,
                actual_hallucination=act_hal,
                hallucination_match=hal_match,
                relevance_score=rel_res.relevance_score,
                accuracy_score=acc_res.accuracy_score,
                hallucination_score=hal_res.hallucination_score,
                processing_time_ms=elapsed_ms
            )
        )

    total = len(dataset)
    rel_pct = round((relevance_matches / total) * 100, 1)
    acc_pct = round((accuracy_matches / total) * 100, 1)
    hal_pct = round((hallucination_matches / total) * 100, 1)
    overall_pct = round(((relevance_matches + accuracy_matches + hallucination_matches) / (total * 3)) * 100, 1)

    logger.info(
        "Benchmark suite completed: total=%d relevance_pct=%.1f%% accuracy_pct=%.1f%% hallucination_pct=%.1f%% overall=%.1f%% FP=%d FN=%d",
        total, rel_pct, acc_pct, hal_pct, overall_pct, false_positives, false_negatives
    )

    return BenchmarkSummary(
        total_tests=total,
        relevance_consistency_pct=rel_pct,
        accuracy_consistency_pct=acc_pct,
        hallucination_consistency_pct=hal_pct,
        overall_consistency_pct=overall_pct,
        false_positives_count=false_positives,
        false_negatives_count=false_negatives,
        test_results=results
    )
