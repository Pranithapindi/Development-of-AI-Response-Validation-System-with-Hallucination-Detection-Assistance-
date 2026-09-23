"""
batch_evaluator.py
──────────────────
M3.4 — Batch Evaluation Module

Processes uploaded CSV files containing multiple question-answer pairs,
validates required fields, executes full validation pipeline for each pair,
handles individual row failures gracefully, and computes batch-level aggregate metrics.
"""

import io
import csv
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional

from services.validation_engine import run_validation
from models.schemas import BatchItemResult, BatchSummaryResult

logger = logging.getLogger(__name__)

# Accepted CSV column headers mapping to canonical names
HEADER_MAPPINGS = {
    "query": ["query", "question", "prompt", "user_query", "user_question"],
    "ai_response": ["ai_response", "response", "answer", "ai_answer", "generated_response"],
    "reference": ["reference", "reference_answer", "context", "evidence", "ground_truth"],
}


def _find_column(header: List[str], canonical_key: str) -> Optional[int]:
    """Find column index for canonical_key based on accepted headers."""
    aliases = HEADER_MAPPINGS.get(canonical_key, [canonical_key])
    header_lower = [h.strip().lower().replace(" ", "_") for h in header]
    for idx, col in enumerate(header_lower):
        if col in aliases:
            return idx
    return None


def parse_and_validate_csv(csv_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse CSV content, validate headers and row entries.

    Returns:
        Tuple of (valid_records, validation_errors)
    """
    errors: List[str] = []
    records: List[Dict[str, Any]] = []

    try:
        content = csv_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            content = csv_bytes.decode("latin-1")
        except Exception as e:
            return [], [f"Failed to decode CSV file: {str(e)}"]

    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    if not rows:
        return [], ["CSV file is empty."]

    header = rows[0]
    query_col = _find_column(header, "query")
    resp_col = _find_column(header, "ai_response")
    ref_col = _find_column(header, "reference")

    if query_col is None:
        errors.append("CSV header missing required 'question' or 'query' column.")
    if resp_col is None:
        errors.append("CSV header missing required 'ai_response' or 'response' column.")

    if errors:
        return [], errors

    for row_idx, row in enumerate(rows[1:], start=2):
        if not row or all(not cell.strip() for cell in row):
            continue  # Skip blank lines silently

        query_text = row[query_col].strip() if query_col < len(row) else ""
        resp_text = row[resp_col].strip() if resp_col < len(row) else ""
        ref_text = row[ref_col].strip() if ref_col is not None and ref_col < len(row) else ""

        if not query_text and not resp_text:
            errors.append(f"Row {row_idx}: Empty question and response.")
            continue
        elif not query_text:
            errors.append(f"Row {row_idx}: Question text is missing.")
            continue
        elif not resp_text:
            errors.append(f"Row {row_idx}: Response text is missing.")
            continue

        records.append({
            "row_index": row_idx,
            "query": query_text,
            "ai_response": resp_text,
            "reference": ref_text,
        })

    return records, errors


def process_batch_evaluation(csv_bytes: bytes) -> BatchSummaryResult:
    """
    Execute batch evaluation for all valid question-answer pairs in CSV.

    Args:
        csv_bytes: Raw CSV file content bytes

    Returns:
        BatchSummaryResult containing individual item results and aggregate metrics
    """
    batch_id = str(uuid.uuid4())
    records, errors = parse_and_validate_csv(csv_bytes)

    batch_items: List[BatchItemResult] = []
    pass_count = 0
    needs_improvement_count = 0
    fail_count = 0

    rel_scores: List[int] = []
    acc_scores: List[int] = []
    hall_scores: List[int] = []
    comp_scores: List[int] = []
    overall_scores: List[int] = []
    hallucinated_records_count = 0

    valid_count = 0
    failed_count = 0

    for item in records:
        row_idx = item["row_index"]
        query = item["query"]
        ai_resp = item["ai_response"]
        ref = item["reference"]
        rec_id = str(uuid.uuid4())

        try:
            report = run_validation(query, ai_resp, ref)
            verdict_eval = report.get("verdict_eval", {})
            verdict = verdict_eval.get("verdict", report.get("label", "Fail"))

            rel_s = verdict_eval.get("relevance_score", report.get("relevance_eval", {}).get("relevance_score", 0))
            acc_s = verdict_eval.get("accuracy_score", report.get("accuracy_eval", {}).get("accuracy_score", 0))
            hall_s = verdict_eval.get("hallucination_score", report.get("hallucination_eval", {}).get("hallucination_score", 0))
            comp_s = verdict_eval.get("completeness_score", report.get("completeness_eval", {}).get("completeness_score", 0))
            over_s = verdict_eval.get("weighted_overall_score", report.get("overall_score", 0))

            is_hall = report.get("hallucination_eval", {}).get("is_hallucinated", False) or hall_s > 0
            if is_hall:
                hallucinated_records_count += 1

            if verdict == "Pass":
                pass_count += 1
            elif verdict == "Needs Improvement":
                needs_improvement_count += 1
            else:
                fail_count += 1

            rel_scores.append(rel_s)
            acc_scores.append(acc_s)
            hall_scores.append(hall_s)
            comp_scores.append(comp_s)
            overall_scores.append(over_s)
            valid_count += 1

            batch_items.append(BatchItemResult(
                row_index=row_idx,
                id=rec_id,
                query=query,
                ai_response=ai_resp,
                reference=ref,
                relevance_score=rel_s,
                accuracy_score=acc_s,
                hallucination_score=hall_s,
                completeness_score=comp_s,
                overall_score=over_s,
                verdict=verdict,
                status="success",
                validation_report=report
            ))

        except Exception as e:
            logger.error("Error evaluating batch row %d: %s", row_idx, e)
            failed_count += 1
            fail_count += 1
            batch_items.append(BatchItemResult(
                row_index=row_idx,
                id=rec_id,
                query=query,
                ai_response=ai_resp,
                reference=ref,
                relevance_score=0,
                accuracy_score=0,
                hallucination_score=100,
                completeness_score=0,
                overall_score=0,
                verdict="Fail",
                status="error",
                error_message=f"Evaluation failed: {str(e)}"
            ))

    total_records = len(records)
    avg_rel = round(sum(rel_scores) / max(1, len(rel_scores)), 1)
    avg_acc = round(sum(acc_scores) / max(1, len(acc_scores)), 1)
    avg_hall = round(sum(hall_scores) / max(1, len(hall_scores)), 1)
    avg_comp = round(sum(comp_scores) / max(1, len(comp_scores)), 1)
    avg_over = round(sum(overall_scores) / max(1, len(overall_scores)), 1)
    hall_rate = round((hallucinated_records_count / max(1, valid_count)) * 100, 1)

    return BatchSummaryResult(
        batch_id=batch_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        total_records=total_records,
        valid_records=valid_count,
        failed_records=failed_count,
        pass_count=pass_count,
        needs_improvement_count=needs_improvement_count,
        fail_count=fail_count,
        avg_relevance=avg_rel,
        avg_accuracy=avg_acc,
        avg_hallucination_risk=avg_hall,
        avg_completeness=avg_comp,
        avg_overall_score=avg_over,
        hallucination_rate_pct=hall_rate,
        results=batch_items
    )


def generate_sample_csv() -> str:
    """Generate sample CSV content for download in frontend."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["question", "ai_response", "reference"])
    writer.writerow([
        "Who invented the World Wide Web and when?",
        "Tim Berners-Lee invented the World Wide Web in 1989 while working at CERN.",
        "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."
    ])
    writer.writerow([
        "Can antibiotics effectively cure influenza or the common cold?",
        "Antibiotics like amoxicillin and azithromycin kill cold viruses within 24 hours.",
        "Antibiotics are solely effective against bacterial infections and do not affect viruses like influenza or the common cold."
    ])
    writer.writerow([
        "Why did Albert Einstein receive the Nobel Prize?",
        "Albert Einstein received the 1921 Nobel Prize in Physics for developing the theory of general relativity.",
        "The Nobel Prize in Physics 1921 was awarded to Albert Einstein for his discovery of the law of the photoelectric effect, not relativity."
    ])
    writer.writerow([
        "What is the boiling point of water at sea level?",
        "At standard sea level atmospheric pressure, pure water boils at 100 degrees Celsius or 212 degrees Fahrenheit.",
        "Standard atmospheric pressure at sea level corresponds to a boiling point for pure water of 100 degrees Celsius."
    ])
    writer.writerow([
        "Explain the cause of World War I, key battles, and the Treaty of Versailles outcome.",
        "World War I started in 1914.",
        "World War I was triggered by the assassination of Archduke Franz Ferdinand in 1914. Key battles included the Somme and Verdun. The Treaty of Versailles imposed harsh penalties on Germany in 1919."
    ])
    return output.getvalue()
