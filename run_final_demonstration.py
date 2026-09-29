"""
run_final_demonstration.py
──────────────────────────
Executes the complete final demonstration for Milestone 4:
1. Single Response Demonstration:
   - Full claim extraction & decomposition
   - Relevance, Accuracy, Hallucination, and Completeness agent scores & reasoning
   - Evidence retrieval and hallucination flags
   - Verdict synthesis and confidence calibration
2. Batch Evaluation Demonstration:
   - Evaluates dataset_system_a_grounded.csv (System A)
   - Evaluates dataset_system_b_unconstrained.csv (System B)
   - Captures aggregated metrics (Pass/Fail rates, dimension averages, hallucination rates)
3. PDF Report Generation Demonstration:
   - Compiles Evaluation_Report_System_A_Grounded.pdf
   - Compiles Evaluation_Report_System_B_Baseline.pdf
4. Prints comparative benchmark analytics across all defined dimensions.
"""

import sys
import os
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from services.validation_engine import run_validation
from services.batch_evaluator import process_batch_evaluation
from services.batch_pdf_generator import generate_batch_pdf_report

def demonstrate_single_response():
    print("=" * 80)
    print("PART 1: SINGLE-RESPONSE EVALUATION DEMONSTRATION")
    print("=" * 80)

    query = "What are the core treatments and contraindications for acute viral hepatitis A?"
    response = (
        "Hepatitis A is treated immediately with high-dose intravenous amoxicillin to eradicate the viral strain within 48 hours. "
        "Patients must undergo routine interferon-alpha therapy to prevent chronic progression to liver cirrhosis. "
        "Drinking alcohol in moderation is permissible during recovery."
    )
    reference = (
        "Hepatitis A virus (HAV) infection causes acute hepatitis. Management is entirely supportive with hydration, nutrition, and rest. "
        "Hepatotoxic substances and paracetamol excess should be avoided. No specific antiviral therapy exists; antibiotics are ineffective against viruses."
    )

    print(f"\n[INPUT PROMPT]\nQuery:     {query}")
    print(f"Response:  {response}")
    print(f"Reference: {reference}\n")

    report = run_validation(query, response, reference)

    print("[STEP 1: ATOMIC CLAIM DECOMPOSITION]")
    for i, c in enumerate(report["claims"], 1):
        conf = c.get('confidence_pct', int(c.get('confidence', 0) * 100))
        print(f"  Claim #{i}: \"{c['text']}\" (Status: {c['status'].upper()}, Confidence: {conf}%)")

    rel = report["relevance_eval"]
    acc = report["accuracy_eval"]
    hall = report["hallucination_eval"]
    comp = report["completeness_eval"]
    verd = report["verdict_eval"]

    print("\n[STEP 2: MULTI-AGENT JUDGE EVALUATIONS]")
    print(f"  • Relevance Judge:     {rel['relevance_score']}/100 ({rel['relevance_label']})")
    print(f"    Reasoning: {rel['reasoning']}")

    print(f"\n  • Accuracy Judge:      {acc['accuracy_score']}/100 ({acc['accuracy_label']})")
    print(f"    Reasoning: {acc['reasoning']}")
    print(f"    Supporting Evidence: {acc['supporting_evidence']}")

    print(f"\n  • Hallucination Judge: {hall['hallucination_score']}% Hallucination Risk ({hall['hallucination_label']})")
    print(f"    Reasoning: {hall['reasoning']}")
    print(f"    Flagged Claims: {hall['flagged_claims']}")

    print(f"\n  • Completeness Judge:  {comp['completeness_score']}/100 ({comp['completeness_label']})")
    print(f"    Addressed Aspects: {comp['addressed_aspects']}")
    print(f"    Missing Aspects:   {comp['missing_aspects']}")
    print(f"    Reasoning: {comp['reasoning']}")

    print("\n[STEP 3: FINAL VERDICT SYNTHESIS & CALIBRATION]")
    print(f"  Overall Weighted Score: {verd['weighted_overall_score']}/100")
    print(f"  Assigned Verdict:       {verd['verdict'].upper()}")
    print(f"  Major Issues Flagged:   {verd['major_issues']}")
    print(f"  Consolidated Reasoning: {verd['consolidated_reasoning']}")
    print("-" * 80)
    return report


def demonstrate_batch_evaluation():
    print("\n" + "=" * 80)
    print("PART 2 & 3: BATCH EVALUATION & PDF REPORT GENERATION")
    print("=" * 80)

    base_dir = os.path.dirname(__file__)
    file_a = os.path.join(base_dir, "dataset_system_a_grounded.csv")
    file_b = os.path.join(base_dir, "dataset_system_b_unconstrained.csv")

    with open(file_a, "rb") as f:
        bytes_a = f.read()
    with open(file_b, "rb") as f:
        bytes_b = f.read()

    print("\n--> Evaluating System A (Grounded RAG Pipeline)...")
    summary_a = process_batch_evaluation(bytes_a)
    print(f"  Processed {summary_a.total_records} records.")
    print(f"  Pass: {summary_a.pass_count}, Needs Improvement: {summary_a.needs_improvement_count}, Fail: {summary_a.fail_count}")
    print(f"  Avg Overall Score: {summary_a.avg_overall_score}%, Hallucination Rate: {summary_a.hallucination_rate_pct}%")

    print("\n--> Evaluating System B (Unconstrained Parametric LLM)...")
    summary_b = process_batch_evaluation(bytes_b)
    print(f"  Processed {summary_b.total_records} records.")
    print(f"  Pass: {summary_b.pass_count}, Needs Improvement: {summary_b.needs_improvement_count}, Fail: {summary_b.fail_count}")
    print(f"  Avg Overall Score: {summary_b.avg_overall_score}%, Hallucination Rate: {summary_b.hallucination_rate_pct}%")

    # Generate PDF reports
    print("\n--> Generating Vector PDF Reports...")
    pdf_bytes_a = generate_batch_pdf_report(summary_a.model_dump())
    pdf_path_a = os.path.join(base_dir, "Evaluation_Report_System_A_Grounded.pdf")
    with open(pdf_path_a, "wb") as f:
        f.write(pdf_bytes_a)
    print(f"  [SAVED] {pdf_path_a} ({len(pdf_bytes_a)} bytes)")

    pdf_bytes_b = generate_batch_pdf_report(summary_b.model_dump())
    pdf_path_b = os.path.join(base_dir, "Evaluation_Report_System_B_Baseline.pdf")
    with open(pdf_path_b, "wb") as f:
        f.write(pdf_bytes_b)
    print(f"  [SAVED] {pdf_path_b} ({len(pdf_bytes_b)} bytes)")

    # Save summary JSON for comparison
    comp_json_path = os.path.join(base_dir, "evaluation_comparison_summary.json")
    with open(comp_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "system_a": summary_a.model_dump(),
            "system_b": summary_b.model_dump()
        }, f, indent=2, default=str)
    print(f"  [SAVED] {comp_json_path}")

    return summary_a, summary_b


if __name__ == "__main__":
    demonstrate_single_response()
    summary_a, summary_b = demonstrate_batch_evaluation()
    print("\n" + "=" * 80)
    print("FINAL DEMONSTRATION PIPELINE COMPLETE")
    print("=" * 80)
