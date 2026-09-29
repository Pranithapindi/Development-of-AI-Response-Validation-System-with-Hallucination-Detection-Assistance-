"""
test_milestone3.py
──────────────────
Pytest suite for Milestone 3 requirements:
  - M3.1: Completeness Judge Agent
  - M3.2: Verdict Agent & Weighted Evaluation
  - M3.4: Batch Evaluation Module
"""

import sys
import os
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.completeness_judge import evaluate_completeness, _extract_question_aspects
from services.verdict_judge import evaluate_verdict
from services.relevance_judge import evaluate_relevance
from services.accuracy_judge import evaluate_accuracy
from services.hallucination_judge import evaluate_hallucinations
from services.batch_evaluator import (
    parse_and_validate_csv,
    process_batch_evaluation,
    generate_sample_csv
)


# ── M3.1 Completeness Judge Tests ─────────────────────────────────────────────

def test_completeness_fully_complete():
    query = "Who invented the World Wide Web, when, and where was it invented?"
    ai_response = "Tim Berners-Lee invented the World Wide Web in 1989 while working at CERN in Geneva."
    reference = "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."

    res = evaluate_completeness(query, ai_response, reference)
    assert res.completeness_score >= 70
    assert res.completeness_label in ["Fully Complete", "Substantially Complete"]
    assert len(res.addressed_aspects) > 0


def test_completeness_substantially_incomplete():
    query = "Explain the cause of World War I, key battles, and the Treaty of Versailles outcome."
    ai_response = "World War I started in 1914."
    reference = "World War I was triggered by the assassination of Archduke Franz Ferdinand in 1914. Key battles included the Somme and Verdun. The Treaty of Versailles imposed harsh penalties on Germany in 1919."

    res = evaluate_completeness(query, ai_response, reference)
    assert res.completeness_score < 60
    assert res.completeness_label in ["Partially Complete", "Incomplete"]
    assert len(res.missing_aspects) > 0


def test_question_aspects_extraction():
    query = "What is gravity and how does it affect planetary motion?"
    aspects = _extract_question_aspects(query)
    assert len(aspects) >= 2


# ── M3.2 Verdict Agent Tests ──────────────────────────────────────────────────

def test_verdict_agent_pass():
    query = "Who invented the World Wide Web?"
    ai_resp = "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."
    ref = "Tim Berners-Lee invented the World Wide Web in 1989 at CERN."

    rel = evaluate_relevance(query, ai_resp)
    acc = evaluate_accuracy(query, ai_resp, ref)
    hall = evaluate_hallucinations(ai_resp, ref)
    comp = evaluate_completeness(query, ai_resp, ref)

    verdict_res = evaluate_verdict(rel, acc, hall, comp)
    assert verdict_res.verdict == "Pass"
    assert verdict_res.weighted_overall_score >= 75
    assert verdict_res.hallucination_score == 0


def test_verdict_agent_critical_fail_override():
    query = "Can antibiotics cure influenza?"
    ai_resp = "Antibiotics like amoxicillin kill influenza viruses in 24 hours."
    ref = "Antibiotics are solely effective against bacteria and do not affect viruses like influenza."

    rel = evaluate_relevance(query, ai_resp)
    acc = evaluate_accuracy(query, ai_resp, ref)
    hall = evaluate_hallucinations(ai_resp, ref)
    comp = evaluate_completeness(query, ai_resp, ref)

    verdict_res = evaluate_verdict(rel, acc, hall, comp)
    assert verdict_res.verdict == "Fail"
    assert len(verdict_res.major_issues) > 0


# ── M3.4 Batch Evaluation Module Tests ────────────────────────────────────────

def test_batch_csv_parsing_valid():
    sample_csv = generate_sample_csv().encode('utf-8')
    records, errors = parse_and_validate_csv(sample_csv)
    assert len(errors) == 0
    assert len(records) >= 3
    assert "query" in records[0]
    assert "ai_response" in records[0]


def test_batch_csv_missing_columns():
    invalid_csv = "id,name,description\n1,test,sample text".encode('utf-8')
    records, errors = parse_and_validate_csv(invalid_csv)
    assert len(records) == 0
    assert len(errors) > 0


def test_batch_evaluation_execution():
    sample_csv = generate_sample_csv().encode('utf-8')
    records, _ = parse_and_validate_csv(sample_csv)
    batch_summary = process_batch_evaluation(sample_csv)
    assert batch_summary.total_records == len(records)
    assert batch_summary.valid_records == len(records)
    assert len(batch_summary.results) == len(records)
    assert batch_summary.avg_overall_score > 0
