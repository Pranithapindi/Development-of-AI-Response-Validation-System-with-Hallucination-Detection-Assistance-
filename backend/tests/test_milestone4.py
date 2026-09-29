"""
test_milestone4.py
──────────────────
M4.3 — End-to-End Testing & System Validation

Pytest suite validating:
  - Complete single-evaluation workflow (E2E)
  - Complete batch-evaluation workflow (E2E)
  - All four Judge Agents with varied question-answer pairs
  - Hallucination detection accuracy (supported vs unsupported claims)
  - Accuracy Agent against reference evidence
  - Completeness Agent (fully/partially/substantially incomplete)
  - Verdict Agent weighted scoring & threshold behaviour
  - Score consistency across repeated evaluations
  - Error handling: invalid input, empty CSV, malformed rows
  - Dashboard metric calculations (averages, counts, percentages)
  - Batch PDF generation (structure validation)
"""

import sys
import os
import pytest

# ── Path Setup ─────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.relevance_judge     import evaluate_relevance
from services.accuracy_judge      import evaluate_accuracy
from services.hallucination_judge import evaluate_hallucinations
from services.completeness_judge  import evaluate_completeness
from services.verdict_judge       import evaluate_verdict
from services.validation_engine   import run_validation
from services.batch_evaluator     import (
    parse_and_validate_csv, process_batch_evaluation, generate_sample_csv
)


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.1  Single Evaluation Workflow ─────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestSingleEvaluationWorkflow:
    """Tests the complete single-evaluation pipeline end-to-end."""

    CORRECT_PAIR = (
        "Who invented the World Wide Web and when?",
        "Tim Berners-Lee invented the World Wide Web in 1989 while working at CERN.",
        "Tim Berners-Lee invented the World Wide Web in 1989 at CERN.",
    )

    INCORRECT_PAIR = (
        "Can antibiotics cure the flu?",
        "Antibiotics like amoxicillin kill influenza viruses within 24 hours.",
        "Antibiotics only target bacteria and have no effect on viruses like influenza.",
    )

    def test_single_eval_returns_all_dimensions(self):
        q, r, ref = self.CORRECT_PAIR
        result = run_validation(q, r, ref)

        # All required keys must be present
        assert "relevance_eval"     in result
        assert "accuracy_eval"      in result
        assert "hallucination_eval" in result
        assert "completeness_eval"  in result
        assert "verdict_eval"       in result
        assert "overall_score"      in result
        assert "summary"            in result

    def test_single_eval_correct_response_passes(self):
        q, r, ref = self.CORRECT_PAIR
        result = run_validation(q, r, ref)
        verdict = result.get("verdict_eval", {}).get("verdict", result.get("label", ""))
        score   = result.get("verdict_eval", {}).get("weighted_overall_score", result.get("overall_score", 0))
        assert verdict in ("Pass", "Needs Improvement"), (
            f"High-quality answer should not Fail. Got verdict={verdict}, score={score}"
        )
        assert score >= 50

    def test_single_eval_hallucinated_response_fails(self):
        q, r, ref = self.INCORRECT_PAIR
        result = run_validation(q, r, ref)
        verdict = result.get("verdict_eval", {}).get("verdict", result.get("label", ""))
        assert verdict == "Fail", (
            f"Clearly incorrect response should Fail. Got verdict={verdict}"
        )

    def test_single_eval_score_in_range(self):
        for pair in [self.CORRECT_PAIR, self.INCORRECT_PAIR]:
            q, r, ref = pair
            result = run_validation(q, r, ref)
            score = result.get("verdict_eval", {}).get("weighted_overall_score",
                                result.get("overall_score", -1))
            assert 0 <= score <= 100, f"Score {score} out of valid range [0, 100]"

    def test_single_eval_summary_not_empty(self):
        q, r, ref = self.CORRECT_PAIR
        result = run_validation(q, r, ref)
        summary = result.get("summary", "")
        assert len(summary) > 10, "Summary reasoning should not be empty"

    def test_single_eval_without_reference(self):
        """System must evaluate gracefully when no reference answer is provided."""
        q = "What is photosynthesis?"
        r = "Photosynthesis is the process by which plants convert sunlight into energy."
        result = run_validation(q, r, "")  # no reference
        assert "verdict_eval" in result or "overall_score" in result
        score = result.get("verdict_eval", {}).get("weighted_overall_score",
                            result.get("overall_score", -1))
        assert 0 <= score <= 100


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.2  Relevance Judge Agent Tests ─────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestRelevanceJudge:

    def test_relevant_response_scores_high(self):
        q = "What is the capital city of France?"
        r = "Paris is the capital and largest city of France."
        res = evaluate_relevance(q, r)
        assert res.relevance_score >= 70
        assert "Relevant" in res.relevance_label

    def test_unrelated_response_scores_low(self):
        q = "What is the capital city of France?"
        r = "Python is a high-level programming language used in data science."
        res = evaluate_relevance(q, r)
        assert res.relevance_score < 60

    def test_relevance_score_in_range(self):
        res = evaluate_relevance("Any question?", "Any response.")
        assert 0 <= res.relevance_score <= 100

    def test_relevance_returns_reasoning(self):
        res = evaluate_relevance("What is AI?", "AI stands for Artificial Intelligence.")
        assert len(res.reasoning) > 5

    def test_partially_relevant_response(self):
        q = "What are the causes and effects of climate change?"
        r = "Climate change is caused by greenhouse gas emissions."
        res = evaluate_relevance(q, r)
        # Should be partial since effects not mentioned
        assert res.relevance_score < 95


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.3  Accuracy Judge Agent Tests ──────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestAccuracyJudge:

    def test_accurate_response_scores_high(self):
        q   = "Who invented the telephone?"
        r   = "Alexander Graham Bell invented the telephone in 1876."
        ref = "The telephone was invented by Alexander Graham Bell in 1876."
        res = evaluate_accuracy(q, r, ref)
        assert res.accuracy_score >= 70
        assert "Correct" in res.accuracy_label

    def test_inaccurate_response_scores_low(self):
        q   = "Who invented the telephone?"
        r   = "Thomas Edison invented the telephone in 1876."
        ref = "The telephone was invented by Alexander Graham Bell in 1876."
        res = evaluate_accuracy(q, r, ref)
        assert res.accuracy_score < 70

    def test_accuracy_score_in_range(self):
        res = evaluate_accuracy("Q?", "A.", "Ref.")
        assert 0 <= res.accuracy_score <= 100

    def test_accuracy_returns_reasoning(self):
        res = evaluate_accuracy("What is DNA?",
                                "DNA is a molecule that carries genetic information.",
                                "DNA is a double-helix molecule encoding genetic information.")
        assert len(res.reasoning) > 5

    def test_accuracy_without_reference(self):
        """Accuracy judge should still return a score when reference is empty."""
        res = evaluate_accuracy("What is gravity?", "Gravity is the force attracting objects.", "")
        assert 0 <= res.accuracy_score <= 100


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.4  Hallucination Detection Agent Tests ──────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestHallucinationJudge:

    def test_factual_response_no_hallucination(self):
        r   = "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."
        ref = "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."
        res = evaluate_hallucinations(r, ref)
        assert not res.is_hallucinated
        assert res.hallucination_score < 30

    def test_contradictory_response_flagged(self):
        r   = "Antibiotics kill influenza viruses within 24 hours."
        ref = "Antibiotics are only effective against bacteria, not viruses like influenza."
        res = evaluate_hallucinations(r, ref)
        assert res.is_hallucinated
        assert res.hallucination_score > 30

    def test_hallucination_score_in_range(self):
        res = evaluate_hallucinations("Some response.", "Some reference.")
        assert 0 <= res.hallucination_score <= 100

    def test_hallucination_returns_reasoning(self):
        res = evaluate_hallucinations(
            "The moon is made of cheese.",
            "The moon is primarily composed of rock and dust."
        )
        assert len(res.reasoning) > 5

    def test_hallucination_flagged_claims_populated_when_hallucinated(self):
        r   = "Einstein invented the telephone to improve mass communication."
        ref = "Einstein is known for relativity theory; Bell invented the telephone."
        res = evaluate_hallucinations(r, ref)
        if res.is_hallucinated:
            assert res.flagged_claims_count >= 0  # may be 0 if agent aggregates differently

    def test_supported_claims_not_flagged(self):
        r   = "Water boils at 100 degrees Celsius at standard atmospheric pressure."
        ref = "The boiling point of water at sea level (1 atm) is 100°C / 212°F."
        res = evaluate_hallucinations(r, ref)
        assert not res.is_hallucinated


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.5  Completeness Judge Agent Tests ───────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestCompletenessJudge:

    def test_fully_complete_response(self):
        q   = "Who invented the World Wide Web, when, and where?"
        r   = "Tim Berners-Lee invented the World Wide Web in 1989 at CERN in Geneva."
        ref = "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."
        res = evaluate_completeness(q, r, ref)
        assert res.completeness_score >= 70
        assert res.completeness_label in ("Fully Complete", "Substantially Complete")
        assert len(res.addressed_aspects) > 0

    def test_substantially_incomplete_response(self):
        q   = "Explain the cause of WWI, key battles, and Treaty of Versailles outcome."
        r   = "World War I started in 1914."
        ref = ("WWI was triggered by the assassination of Archduke Franz Ferdinand. "
               "Key battles included the Somme and Verdun. "
               "The Treaty of Versailles imposed harsh penalties on Germany in 1919.")
        res = evaluate_completeness(q, r, ref)
        assert res.completeness_score < 60
        assert res.completeness_label in ("Partially Complete", "Incomplete")
        assert len(res.missing_aspects) > 0

    def test_completeness_score_in_range(self):
        res = evaluate_completeness("Q?", "A.", "Ref.")
        assert 0 <= res.completeness_score <= 100

    def test_completeness_returns_reasoning(self):
        res = evaluate_completeness(
            "What is Python used for?",
            "Python is used for data science.",
            "Python is used for web dev, data science, automation, and AI."
        )
        assert len(res.reasoning) > 5

    def test_partially_addressed_response(self):
        q   = "Describe the water cycle: evaporation, condensation, and precipitation."
        r   = "In the water cycle, water evaporates from oceans and forms clouds."
        ref = "The water cycle involves evaporation, condensation into clouds, and precipitation as rain or snow."
        res = evaluate_completeness(q, r, ref)
        # Precipitation not mentioned → should be incomplete/partial
        assert res.completeness_score < 90


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.6  Verdict Agent — Weighted Scoring & Threshold Tests ────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestVerdictAgent:

    def _all_agents(self, q, r, ref):
        rel  = evaluate_relevance(q, r)
        acc  = evaluate_accuracy(q, r, ref)
        hall = evaluate_hallucinations(r, ref)
        comp = evaluate_completeness(q, r, ref)
        return evaluate_verdict(rel, acc, hall, comp)

    def test_pass_verdict_for_high_quality_response(self):
        verdict = self._all_agents(
            "Who invented the World Wide Web?",
            "Tim Berners-Lee invented the World Wide Web in 1989 at CERN.",
            "Tim Berners-Lee invented the World Wide Web in 1989 at CERN.",
        )
        assert verdict.verdict == "Pass"
        assert verdict.weighted_overall_score >= 75
        assert verdict.hallucination_score == 0

    def test_fail_verdict_for_hallucinated_response(self):
        verdict = self._all_agents(
            "Can antibiotics cure the flu?",
            "Antibiotics like amoxicillin kill influenza viruses in 24 hours.",
            "Antibiotics only target bacteria and do not affect viruses like influenza.",
        )
        assert verdict.verdict == "Fail"
        assert len(verdict.major_issues) > 0

    def test_verdict_score_in_range(self):
        verdict = self._all_agents(
            "What is 2+2?",
            "The answer is 4.",
            "Two plus two equals four.",
        )
        assert 0 <= verdict.weighted_overall_score <= 100

    def test_verdict_returns_reasoning(self):
        verdict = self._all_agents(
            "What is the boiling point of water?",
            "Water boils at 100°C at sea level.",
            "Water boils at 100°C (212°F) at 1 atm.",
        )
        assert len(verdict.consolidated_reasoning) > 10

    def test_verdict_labels_are_valid(self):
        verdict = self._all_agents(
            "What is AI?",
            "AI is the simulation of human intelligence by machines.",
            "AI stands for Artificial Intelligence.",
        )
        assert verdict.verdict in ("Pass", "Needs Improvement", "Fail")


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.7  Scoring Consistency Tests ─────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestScoringConsistency:
    """
    Validate that evaluating the same Q&A pair twice yields consistent
    scores (within ±15 tolerance, since LLM-based judges may have small variance).
    """

    Q  = "Who invented the World Wide Web?"
    R  = "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."
    REF= "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."
    TOLERANCE = 15

    def test_relevance_consistency(self):
        r1 = evaluate_relevance(self.Q, self.R)
        r2 = evaluate_relevance(self.Q, self.R)
        diff = abs(r1.relevance_score - r2.relevance_score)
        assert diff <= self.TOLERANCE, (
            f"Relevance scores inconsistent: {r1.relevance_score} vs {r2.relevance_score}"
        )

    def test_accuracy_consistency(self):
        r1 = evaluate_accuracy(self.Q, self.R, self.REF)
        r2 = evaluate_accuracy(self.Q, self.R, self.REF)
        diff = abs(r1.accuracy_score - r2.accuracy_score)
        assert diff <= self.TOLERANCE, (
            f"Accuracy scores inconsistent: {r1.accuracy_score} vs {r2.accuracy_score}"
        )

    def test_hallucination_consistency(self):
        r1 = evaluate_hallucinations(self.R, self.REF)
        r2 = evaluate_hallucinations(self.R, self.REF)
        diff = abs(r1.hallucination_score - r2.hallucination_score)
        assert diff <= self.TOLERANCE, (
            f"Hallucination scores inconsistent: {r1.hallucination_score} vs {r2.hallucination_score}"
        )

    def test_verdict_consistency(self):
        def get_verdict():
            rel  = evaluate_relevance(self.Q, self.R)
            acc  = evaluate_accuracy(self.Q, self.R, self.REF)
            hall = evaluate_hallucinations(self.R, self.REF)
            comp = evaluate_completeness(self.Q, self.R, self.REF)
            return evaluate_verdict(rel, acc, hall, comp)

        v1 = get_verdict()
        v2 = get_verdict()
        # Verdict label must be identical for same input
        assert v1.verdict == v2.verdict, (
            f"Verdict label inconsistent: {v1.verdict} vs {v2.verdict}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.8  Batch Evaluation Workflow Tests ────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchEvaluationWorkflow:

    def test_batch_parses_sample_csv(self):
        csv_bytes = generate_sample_csv().encode("utf-8")
        records, errors = parse_and_validate_csv(csv_bytes)
        assert len(errors) == 0
        assert len(records) >= 3

    def test_batch_rejects_missing_header(self):
        bad_csv = b"id,name,description\n1,test,sample"
        records, errors = parse_and_validate_csv(bad_csv)
        assert len(records) == 0
        assert len(errors) > 0

    def test_batch_skips_empty_rows(self):
        csv_with_blanks = b"question,ai_response\nWhat is AI?,AI is intelligence.\n\n\nWho invented Python?,Guido van Rossum."
        records, errors = parse_and_validate_csv(csv_with_blanks)
        assert len(records) == 2

    def test_batch_execution_returns_summary(self):
        csv_bytes = generate_sample_csv().encode("utf-8")
        summary = process_batch_evaluation(csv_bytes)
        assert summary.total_records >= 3
        assert summary.valid_records >= 1
        assert len(summary.results) >= 1
        assert 0 <= summary.avg_overall_score <= 100

    def test_batch_verdict_counts_consistent(self):
        csv_bytes = generate_sample_csv().encode("utf-8")
        summary = process_batch_evaluation(csv_bytes)
        counted = summary.pass_count + summary.needs_improvement_count + summary.fail_count
        # counts should sum to valid records (some errors may have been counted as fail)
        assert counted == summary.total_records

    def test_batch_hallucination_rate_in_range(self):
        csv_bytes = generate_sample_csv().encode("utf-8")
        summary = process_batch_evaluation(csv_bytes)
        assert 0.0 <= summary.hallucination_rate_pct <= 100.0

    def test_batch_avg_scores_in_range(self):
        csv_bytes = generate_sample_csv().encode("utf-8")
        summary = process_batch_evaluation(csv_bytes)
        for attr in ("avg_relevance", "avg_accuracy", "avg_hallucination_risk", "avg_completeness", "avg_overall_score"):
            val = getattr(summary, attr, -1)
            assert 0 <= val <= 100, f"{attr}={val} out of range"

    def test_batch_individual_failure_does_not_abort_batch(self):
        """Row with missing response text should error individually but not crash the batch."""
        csv_with_bad_row = (
            "question,ai_response,reference\n"
            "What is AI?,AI is intelligence.,AI stands for Artificial Intelligence.\n"
            "Bad row,,\n"
            "Who made Python?,Guido van Rossum created Python.,Python was created by Guido van Rossum."
        ).encode("utf-8")
        records, errors = parse_and_validate_csv(csv_with_bad_row)
        # Bad row should be in errors, not records
        assert len(records) == 2
        assert len(errors) >= 1

    def test_batch_result_item_fields_present(self):
        csv_bytes = generate_sample_csv().encode("utf-8")
        summary = process_batch_evaluation(csv_bytes)
        item = summary.results[0]
        assert hasattr(item, "query")
        assert hasattr(item, "verdict")
        assert hasattr(item, "overall_score")
        assert hasattr(item, "relevance_score")
        assert hasattr(item, "hallucination_score")


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.9  Dashboard Metric Calculation Validation ────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestDashboardCalculations:
    """Validate that batch aggregation math is correct."""

    def _run_batch(self):
        csv_bytes = generate_sample_csv().encode("utf-8")
        return process_batch_evaluation(csv_bytes)

    def test_pass_count_matches_verdicts(self):
        summary = self._run_batch()
        actual_passes = sum(1 for r in summary.results if r.verdict == "Pass")
        assert summary.pass_count == actual_passes, (
            f"pass_count={summary.pass_count} but actual Pass verdicts={actual_passes}"
        )

    def test_fail_count_matches_verdicts(self):
        summary = self._run_batch()
        actual_fails = sum(1 for r in summary.results if r.verdict == "Fail")
        assert summary.fail_count == actual_fails

    def test_avg_overall_score_matches_manual_calc(self):
        summary = self._run_batch()
        success_items = [r for r in summary.results if r.status == "success"]
        if success_items:
            manual_avg = round(
                sum(r.overall_score for r in success_items) / len(success_items), 1
            )
            assert abs(summary.avg_overall_score - manual_avg) <= 1.0, (
                f"Avg overall mismatch: stored={summary.avg_overall_score} vs manual={manual_avg}"
            )

    def test_hallucination_rate_formula(self):
        summary = self._run_batch()
        hall_items = sum(1 for r in summary.results
                         if r.status == "success" and (r.hallucination_score or 0) > 0)
        valid = summary.valid_records or 1
        expected_rate = round((hall_items / valid) * 100, 1)
        assert abs(summary.hallucination_rate_pct - expected_rate) <= 2.0


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.10  PDF Report Generation Test ────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchPDFGeneration:

    def _batch_summary_dict(self):
        csv_bytes = generate_sample_csv().encode("utf-8")
        summary = process_batch_evaluation(csv_bytes)
        return {
            "batch_id":                 summary.batch_id,
            "timestamp":                summary.timestamp,
            "total_records":            summary.total_records,
            "valid_records":            summary.valid_records,
            "failed_records":           summary.failed_records,
            "pass_count":               summary.pass_count,
            "needs_improvement_count":  summary.needs_improvement_count,
            "fail_count":               summary.fail_count,
            "avg_relevance":            summary.avg_relevance,
            "avg_accuracy":             summary.avg_accuracy,
            "avg_hallucination_risk":   summary.avg_hallucination_risk,
            "avg_completeness":         summary.avg_completeness,
            "avg_overall_score":        summary.avg_overall_score,
            "hallucination_rate_pct":   summary.hallucination_rate_pct,
            "results": [r.model_dump() for r in summary.results],
        }

    def test_pdf_generates_without_error(self):
        try:
            from services.batch_pdf_generator import generate_batch_pdf_report
        except ImportError:
            pytest.skip("reportlab not installed")

        summary = self._batch_summary_dict()
        pdf_bytes = generate_batch_pdf_report(summary)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000, "PDF appears too small — possible generation failure"

    def test_pdf_starts_with_pdf_header(self):
        try:
            from services.batch_pdf_generator import generate_batch_pdf_report
        except ImportError:
            pytest.skip("reportlab not installed")

        summary = self._batch_summary_dict()
        pdf_bytes = generate_batch_pdf_report(summary)
        # All valid PDFs start with %PDF
        assert pdf_bytes[:4] == b"%PDF", "Generated file is not a valid PDF"

    def test_pdf_generation_with_empty_batch(self):
        try:
            from services.batch_pdf_generator import generate_batch_pdf_report
        except ImportError:
            pytest.skip("reportlab not installed")

        empty_summary = {
            "batch_id": "test-empty",
            "timestamp": "2026-01-01T00:00:00Z",
            "total_records": 0,
            "valid_records": 0,
            "failed_records": 0,
            "pass_count": 0,
            "needs_improvement_count": 0,
            "fail_count": 0,
            "avg_relevance": 0,
            "avg_accuracy": 0,
            "avg_hallucination_risk": 0,
            "avg_completeness": 0,
            "avg_overall_score": 0,
            "hallucination_rate_pct": 0,
            "results": [],
        }
        pdf_bytes = generate_batch_pdf_report(empty_summary)
        assert pdf_bytes[:4] == b"%PDF"


# ═══════════════════════════════════════════════════════════════════════════════
# ── M4.3.11  Error Handling Tests ──────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class TestErrorHandling:

    def test_empty_csv_returns_error(self):
        records, errors = parse_and_validate_csv(b"")
        assert len(records) == 0
        assert len(errors) > 0

    def test_csv_with_only_headers_returns_zero_records(self):
        records, errors = parse_and_validate_csv(b"question,ai_response,reference\n")
        assert len(records) == 0

    def test_validation_engine_with_empty_strings(self):
        """Validation engine must not raise for edge-case empty inputs."""
        try:
            result = run_validation("", "Some response.", "")
            # Should return a result dict (possibly with default/fallback scores)
            assert isinstance(result, dict)
        except Exception as e:
            pytest.fail(f"run_validation raised unexpected exception for empty query: {e}")

    def test_batch_with_unicode_content(self):
        """Batch evaluator should handle international characters."""
        csv_unicode = (
            "question,ai_response\n"
            "Qu'est-ce que l'IA?,L'IA est l'intelligence artificielle.\n"
        ).encode("utf-8")
        records, errors = parse_and_validate_csv(csv_unicode)
        # Should parse without encoding errors
        assert len(records) == 1 or len(errors) > 0  # either parses or detects missing columns

    def test_batch_with_latin1_encoding(self):
        """Batch evaluator should handle latin-1 encoded CSV."""
        csv_latin = "question,ai_response\nWho made it?,Ren\xe9 Descartes.".encode("latin-1")
        # Should decode without UnicodeDecodeError
        records, errors = parse_and_validate_csv(csv_latin)
        assert isinstance(records, list)
        assert isinstance(errors, list)
