"""
schemas.py
──────────
Pydantic models for all API request and response bodies.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Request Models ────────────────────────────────────────────────────────────

class ValidationRequest(BaseModel):
    query: str = Field(..., description="The original user question or prompt")
    ai_response: str = Field(..., description="The AI-generated response to validate")
    reference: Optional[str] = Field(
        default="",
        description="Optional trusted reference context / evidence"
    )


# ── Claim Models ──────────────────────────────────────────────────────────────

class ClaimResult(BaseModel):
    id: int
    text: str
    type: str = "factual"
    status: str          # supported | unsupported | uncertain | contradictory
    confidence_pct: int
    similarity_score: float
    contradiction_score: float
    evidence: str
    explanation: str


# ── Judge Agent Evaluation Schemas ───────────────────────────────────────────

class RelevanceEvaluationResult(BaseModel):
    relevance_score: int = Field(..., ge=0, le=100, description="Relevance score 0-100")
    relevance_label: str = Field(..., description="Fully Relevant | Partially Relevant | Unrelated | Off-topic")
    reasoning: str = Field(..., description="Detailed explanation of the relevance assessment")
    key_aspects_covered: List[str] = Field(default_factory=list, description="Question aspects directly covered in response")
    missing_aspects: List[str] = Field(default_factory=list, description="Question aspects missed in response")
    query_intent: str = Field(default="", description="Identified core intent of the question")


class AccuracyEvaluationResult(BaseModel):
    accuracy_score: int = Field(..., ge=0, le=100, description="Accuracy score 0-100")
    accuracy_label: str = Field(..., description="Correct | Partially Correct | Incorrect | Contradictory")
    reasoning: str = Field(..., description="Detailed explanation of factual correctness")
    correct_claims_count: int = 0
    partially_correct_claims_count: int = 0
    incorrect_claims_count: int = 0
    contradictory_claims_count: int = 0
    supporting_evidence: List[str] = Field(default_factory=list, description="Citations from reference answer or RAG chunks")


class HallucinatedClaim(BaseModel):
    claim_id: int
    claim_text: str
    issue_type: str = Field(..., description="unsupported | contradictory | fabricated")
    explanation: str = Field(..., description="Why this specific statement is flagged")
    conflicting_evidence: Optional[str] = None


class HallucinationEvaluationResult(BaseModel):
    is_hallucinated: bool = Field(..., description="True if response contains unsupported or contradictory claims")
    hallucination_score: int = Field(..., ge=0, le=100, description="Hallucination risk percentage 0-100")
    hallucination_label: str = Field(..., description="No Hallucination | Minor Hallucination | Severe Hallucination")
    total_claims_analyzed: int = 0
    flagged_claims_count: int = 0
    flagged_claims: List[HallucinatedClaim] = Field(default_factory=list, description="Specific statements flagged as hallucinated")
    supporting_evidence: List[str] = Field(default_factory=list, description="Source context used to verify claims")
    reasoning: str = Field(..., description="Overall summary reasoning for hallucination detection")


# ── Benchmark Evaluation Schemas ─────────────────────────────────────────────

class BenchmarkTestCase(BaseModel):
    id: str
    category: str
    query: str
    ai_response: str
    reference: Optional[str] = ""
    expected_relevance: str
    expected_accuracy: str
    expected_hallucination: str


class BenchmarkTestResult(BaseModel):
    test_id: str
    category: str
    query: str
    expected_relevance: str
    actual_relevance: str
    relevance_match: bool
    expected_accuracy: str
    actual_accuracy: str
    accuracy_match: bool
    expected_hallucination: str
    actual_hallucination: str
    hallucination_match: bool
    relevance_score: int
    accuracy_score: int
    hallucination_score: int
    processing_time_ms: int


class BenchmarkSummary(BaseModel):
    total_tests: int
    relevance_consistency_pct: float
    accuracy_consistency_pct: float
    hallucination_consistency_pct: float
    overall_consistency_pct: float
    false_positives_count: int
    false_negatives_count: int
    test_results: List[BenchmarkTestResult]


# ── Stats Model ───────────────────────────────────────────────────────────────

class ValidationStats(BaseModel):
    supported: int
    unsupported: int
    contradictory: int
    uncertain: int
    hallucination_risk: int  # percentage


# ── Response Models ───────────────────────────────────────────────────────────

class ValidationResponse(BaseModel):
    id: str
    query: str
    ai_response: str
    reference: str
    claims: List[ClaimResult]
    overall_score: int
    summary: str
    stats: ValidationStats
    label: str          # Factual | Partially Hallucinated | Hallucinated
    timestamp: str
    processing_time_ms: int
    relevance_eval: Optional[RelevanceEvaluationResult] = None
    accuracy_eval: Optional[AccuracyEvaluationResult] = None
    hallucination_eval: Optional[HallucinationEvaluationResult] = None


class HistoryRecord(BaseModel):
    id: str
    timestamp: str
    query: str
    claims_count: int
    overall_score: int
    label: str
    stats: ValidationStats
    summary: str


class AnalyticsResponse(BaseModel):
    total_analyses: int
    total_claims: int
    total_hallucinations: int
    avg_reliability: float
    reliability_distribution: dict
    claim_distribution: dict
    recent_trend: List[dict]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    database: str
    version: str = "2.0.0"

