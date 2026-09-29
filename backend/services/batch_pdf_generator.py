"""
batch_pdf_generator.py  —  M4.2
────────────────────────────────
Generates a structured, professional PDF report for batch evaluation results.

Report structure:
  1. Cover / metadata page
  2. Overall batch statistics (pass/fail/NI counts, average dimension scores)
  3. Per-dimension score breakdown
  4. Hallucination summary (flagged responses, rate)
  5. Completeness summary (missing-aspect frequency)
  6. Individual response evaluations (per-item reasoning, evidence, verdicts)
  7. Improvement recommendations (derived from recurring weaknesses)
  8. Footer

Used by POST /api/batch/report  after a batch evaluation completes.
"""

import io
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ── Status colour helpers ───────────────────────────────────────────────────────
VERDICT_COLORS = {
    "Pass":             (0.04, 0.72, 0.47),   # emerald
    "Needs Improvement":(0.96, 0.62, 0.04),   # amber
    "Fail":             (0.94, 0.20, 0.20),   # red
}


def _verdict_color(verdict: str):
    """Return an RGB tuple for the given verdict string."""
    return VERDICT_COLORS.get(verdict, (0.5, 0.5, 0.5))


# ── Main entry ─────────────────────────────────────────────────────────────────

def generate_batch_pdf_report(batch_summary: dict) -> bytes:
    """
    Generate a comprehensive batch evaluation PDF report.

    Args:
        batch_summary: BatchSummaryResult dict (as returned by batch_evaluator)

    Returns:
        Raw PDF bytes
    """
    try:
        from reportlab.lib.pagesizes  import A4
        from reportlab.lib.styles     import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units      import cm
        from reportlab.lib            import colors
        from reportlab.platypus       import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, KeepTogether, PageBreak,
        )
        from reportlab.lib.enums      import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
    except ImportError as exc:
        logger.error("ReportLab not installed: %s", exc)
        raise

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm,   bottomMargin=2*cm,
        title="Batch Evaluation Report — AI Response Validation System",
        author="AI Response Validation System v2.0",
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle", parent=styles["Title"],
        fontSize=22, textColor=colors.HexColor("#1e3a8a"), spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=11, textColor=colors.HexColor("#475569"), spaceAfter=3,
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"],
        fontSize=14, textColor=colors.HexColor("#1e40af"),
        spaceBefore=14, spaceAfter=6,
    )
    subsection_style = ParagraphStyle(
        "SubSection", parent=styles["Heading3"],
        fontSize=11, textColor=colors.HexColor("#334155"),
        spaceBefore=10, spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=10, leading=15, alignment=TA_JUSTIFY, spaceAfter=5,
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#64748b"), spaceAfter=2,
    )
    small_style = ParagraphStyle(
        "Small", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor("#94a3b8"),
    )
    centered_style = ParagraphStyle(
        "Centered", parent=styles["Normal"],
        fontSize=10, alignment=TA_CENTER,
    )
    rec_style = ParagraphStyle(
        "Rec", parent=styles["Normal"],
        fontSize=10, leading=15, leftIndent=12, spaceAfter=4,
        textColor=colors.HexColor("#1e293b"),
    )

    def hr(thick=1, col="#3b82f6"):
        return HRFlowable(width="100%", thickness=thick, color=colors.HexColor(col))

    def spacer(h=0.3):
        return Spacer(1, h*cm)

    story = []

    # ── 1. COVER ───────────────────────────────────────────────────────────────
    story.append(spacer(0.5))
    story.append(Paragraph("Batch Evaluation Report", title_style))
    story.append(Paragraph("AI Response Validation System — v2.0", subtitle_style))
    story.append(Paragraph(
        f"Generated: {datetime.now(timezone.utc).strftime('%d %B %Y at %H:%M UTC')}",
        subtitle_style,
    ))
    batch_id = batch_summary.get("batch_id", "—")
    ts       = batch_summary.get("timestamp", "")
    story.append(Paragraph(f"Batch ID: <b>{batch_id}</b>  |  Timestamp: {ts}", subtitle_style))
    story.append(hr(2, "#3b82f6"))
    story.append(spacer(0.4))

    # ── 2. BATCH OVERVIEW STATISTICS ──────────────────────────────────────────
    story.append(Paragraph("1. Batch Overview Statistics", section_style))

    total   = batch_summary.get("total_records", 0)
    valid   = batch_summary.get("valid_records",  0)
    failed  = batch_summary.get("failed_records", 0)
    passes  = batch_summary.get("pass_count",     0)
    ni_cnt  = batch_summary.get("needs_improvement_count", 0)
    fail_c  = batch_summary.get("fail_count",     0)
    hall_rt = batch_summary.get("hallucination_rate_pct", 0.0)
    avg_ov  = batch_summary.get("avg_overall_score", 0.0)
    avg_rel = batch_summary.get("avg_relevance",  0.0)
    avg_acc = batch_summary.get("avg_accuracy",   0.0)
    avg_hll = batch_summary.get("avg_hallucination_risk", 0.0)
    avg_cmp = batch_summary.get("avg_completeness", 0.0)

    overview_data = [
        ["Metric", "Value"],
        ["Total Records Submitted",      str(total)],
        ["Valid Records Evaluated",       str(valid)],
        ["Failed / Skipped Records",      str(failed)],
        ["Pass Verdicts",                 f"{passes} ({round(passes/max(1,valid)*100)}%)"],
        ["Needs Improvement Verdicts",    f"{ni_cnt} ({round(ni_cnt/max(1,valid)*100)}%)"],
        ["Fail Verdicts",                 f"{fail_c} ({round(fail_c/max(1,valid)*100)}%)"],
        ["Hallucination Rate",            f"{hall_rt}% of evaluated records"],
        ["Average Weighted Overall Score",f"{avg_ov}/100"],
    ]

    ov_table = Table(overview_data, colWidths=[9*cm, 7*cm])
    ov_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 10),
        ("FONTNAME",   (0, 1), (0, -1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",(0, 0), (-1, -1), 8),
    ]))
    story.append(ov_table)
    story.append(spacer())

    # ── 3. DIMENSION SCORE BREAKDOWN ─────────────────────────────────────────
    story.append(Paragraph("2. Per-Dimension Score Breakdown", section_style))
    story.append(Paragraph(
        "The following table presents the average score across each evaluation dimension, "
        "computed from all successfully evaluated records in this batch.",
        body_style,
    ))

    dim_data = [
        ["Dimension",           "Average Score",  "Weight", "Notes"],
        ["Relevance",           f"{avg_rel}/100",  "25%",   "Measures how directly the response addresses the question"],
        ["Accuracy",            f"{avg_acc}/100",  "35%",   "Factual correctness against reference evidence"],
        ["Hallucination Risk",  f"{avg_hll}%",     "25%",   "Percentage of responses containing unsupported claims"],
        ["Completeness",        f"{avg_cmp}/100",  "15%",   "Coverage of all sub-aspects in the question"],
        ["Weighted Overall",    f"{avg_ov}/100",   "100%",  "Weighted combination of all four dimensions"],
    ]

    dim_table = Table(dim_data, colWidths=[4*cm, 3*cm, 2*cm, 8.5*cm])
    dim_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dbeafe")),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",   (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",(0, 0), (-1, -1), 7),
    ]))
    story.append(dim_table)
    story.append(spacer())

    # ── 4. HALLUCINATION SUMMARY ───────────────────────────────────────────────
    story.append(Paragraph("3. Hallucination Detection Summary", section_style))

    results = batch_summary.get("results", [])
    hall_items = [r for r in results if (r.get("hallucination_score", 0) or 0) > 0]

    story.append(Paragraph(
        f"{len(hall_items)} of {valid} evaluated responses ({hall_rt}%) contain one or more "
        f"unsupported, contradictory, or fabricated claims as detected by the Hallucination "
        f"Judge Agent.",
        body_style,
    ))

    if hall_items:
        hall_data = [["Row", "Query (truncated)", "Hall. Score", "Verdict", "Flagged Claims Count"]]
        for r in hall_items[:20]:  # cap at 20 rows for readability
            query_short = (r.get("query", "") or "")[:60] + ("…" if len(r.get("query",""))>60 else "")
            report = r.get("validation_report") or {}
            hall_eval = report.get("hallucination_eval") or {}
            flagged = len(hall_eval.get("flagged_claims", []))
            hall_data.append([
                str(r.get("row_index", "?")),
                query_short,
                f"{r.get('hallucination_score', 0)}%",
                r.get("verdict", "—"),
                str(flagged),
            ])

        h_table = Table(hall_data, colWidths=[1.2*cm, 7.5*cm, 2*cm, 3*cm, 3.5*cm])
        h_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fee2e2")),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#fff7f7"), colors.white]),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#fecaca")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",(0, 0), (-1, -1), 6),
            ("FONTNAME",   (2, 1), (2, -1), "Helvetica-Bold"),
            ("TEXTCOLOR",  (2, 1), (2, -1), colors.HexColor("#dc2626")),
        ]))
        story.append(h_table)

        if len(hall_items) > 20:
            story.append(Paragraph(
                f"(Showing first 20 of {len(hall_items)} hallucinated records.)",
                small_style,
            ))
    else:
        story.append(Paragraph(
            "✓ No hallucinated responses were detected in this batch.", body_style
        ))

    story.append(spacer())

    # ── 5. COMPLETENESS SUMMARY ────────────────────────────────────────────────
    story.append(Paragraph("4. Completeness Assessment Summary", section_style))

    incomplete = [r for r in results if (r.get("completeness_score", 100) or 100) < 70]
    story.append(Paragraph(
        f"{len(incomplete)} of {valid} responses scored below 70 on Completeness, indicating "
        f"that significant aspects of the question were not adequately addressed.",
        body_style,
    ))

    if incomplete:
        comp_data = [["Row", "Query (truncated)", "Comp. Score", "Missing Aspects"]]
        for r in incomplete[:15]:
            query_short = (r.get("query", "") or "")[:50] + ("…" if len(r.get("query",""))>50 else "")
            report = r.get("validation_report") or {}
            comp_eval = report.get("completeness_eval") or {}
            missing   = comp_eval.get("missing_aspects", [])
            missing_str = "; ".join(missing[:3]) + ("…" if len(missing)>3 else "") if missing else "—"
            comp_data.append([
                str(r.get("row_index","?")),
                query_short,
                f"{r.get('completeness_score',0)}/100",
                missing_str,
            ])
        c_table = Table(comp_data, colWidths=[1.2*cm, 6*cm, 2.5*cm, 7.5*cm])
        c_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.HexColor("#fffbeb"), colors.white]),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#fde68a")),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        story.append(c_table)
    story.append(spacer())

    # ── 6. INDIVIDUAL RESPONSE EVALUATIONS ────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("5. Individual Response Evaluation Results", section_style))
    story.append(Paragraph(
        "Detailed evaluation results for each record in the batch, including dimension scores, "
        "verdict reasoning, hallucinated claim details, and missing aspect analysis.",
        body_style,
    ))
    story.append(spacer(0.2))

    for idx, r in enumerate(results):
        verdict  = r.get("verdict", "—")
        v_color  = _verdict_color(verdict)
        v_color_rl = colors.Color(*v_color)

        # Header row
        row_block = []
        header_data = [[
            Paragraph(
                f"Record #{r.get('row_index','?')}  —  Row ID: {r.get('id','')[:8]}",
                ParagraphStyle("RH", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold"),
            ),
            Paragraph(
                verdict,
                ParagraphStyle("RV", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold",
                               textColor=colors.white),
            ),
            Paragraph(
                f"Overall: {r.get('overall_score',0)}/100",
                ParagraphStyle("RS", parent=styles["Normal"], fontSize=10,
                               textColor=colors.HexColor("#1e40af")),
            ),
        ]]
        h_tab = Table(header_data, colWidths=[8*cm, 4*cm, 5.5*cm])
        h_tab.setStyle(TableStyle([
            ("BACKGROUND",  (1, 0), (1, 0), v_color_rl),
            ("BACKGROUND",  (0, 0), (0, 0), colors.HexColor("#f1f5f9")),
            ("BACKGROUND",  (2, 0), (2, 0), colors.HexColor("#eff6ff")),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING",  (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",(0,0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ]))
        row_block.append(h_tab)

        # Dimension scores row
        dim_row_data = [[
            f"Relevance: {r.get('relevance_score',0)}/100",
            f"Accuracy: {r.get('accuracy_score',0)}/100",
            f"Hallucination: {r.get('hallucination_score',0)}%",
            f"Completeness: {r.get('completeness_score',0)}/100",
        ]]
        dim_row_tab = Table(dim_row_data, colWidths=[4.3*cm, 4.3*cm, 4.3*cm, 4.3*cm])
        dim_row_tab.setStyle(TableStyle([
            ("FONTSIZE",   (0,0),(-1,-1), 9),
            ("FONTNAME",   (0,0),(-1,-1), "Helvetica"),
            ("BACKGROUND", (0,0),(0,0),  colors.HexColor("#f5f3ff")),
            ("BACKGROUND", (1,0),(1,0),  colors.HexColor("#ecfdf5")),
            ("BACKGROUND", (2,0),(2,0),  colors.HexColor("#fff1f2")),
            ("BACKGROUND", (3,0),(3,0),  colors.HexColor("#f0fdf4")),
            ("GRID",       (0,0),(-1,-1),0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0,0),(-1,-1), 4),
            ("BOTTOMPADDING",(0,0),(-1,-1), 4),
            ("LEFTPADDING",(0,0),(-1,-1), 6),
        ]))
        row_block.append(dim_row_tab)

        # Query
        query_text = r.get("query", "")
        row_block.append(Paragraph("<b>Question:</b>", label_style))
        row_block.append(Paragraph(query_text, ParagraphStyle("Q", parent=styles["Normal"],
            fontSize=9, leading=13, textColor=colors.HexColor("#1e293b"), leftIndent=8, spaceAfter=3)))

        # AI Response (truncated to 300 chars)
        resp_text = r.get("ai_response", "")
        if len(resp_text) > 300:
            resp_text = resp_text[:300] + "…"
        row_block.append(Paragraph("<b>AI Response (excerpt):</b>", label_style))
        row_block.append(Paragraph(resp_text, ParagraphStyle("Resp", parent=styles["Normal"],
            fontSize=9, leading=13, textColor=colors.HexColor("#334155"), leftIndent=8, spaceAfter=3)))

        # Summary reasoning
        report = r.get("validation_report") or {}
        summary = report.get("summary") or report.get("consolidated_reasoning") or ""
        if summary:
            row_block.append(Paragraph("<b>Evaluation Reasoning:</b>", label_style))
            row_block.append(Paragraph(
                summary[:400] + ("…" if len(summary) > 400 else ""),
                ParagraphStyle("Sum", parent=styles["Normal"],
                    fontSize=9, leading=13, textColor=colors.HexColor("#475569"), leftIndent=8, spaceAfter=3),
            ))

        # Hallucinated claims
        hall_eval = report.get("hallucination_eval") or {}
        flagged   = hall_eval.get("flagged_claims", [])
        if flagged:
            row_block.append(Paragraph("<b>Hallucinated / Unsupported Claims:</b>", label_style))
            for fc in flagged[:5]:
                ct = fc.get("claim_text") or fc.get("text") or "—"
                row_block.append(Paragraph(
                    f"• [{fc.get('issue_type','unsupported').upper()}] {ct[:200]}",
                    ParagraphStyle("FC", parent=styles["Normal"], fontSize=8, leading=12,
                                   textColor=colors.HexColor("#dc2626"), leftIndent=14, spaceAfter=2),
                ))

        # Missing aspects
        comp_eval = report.get("completeness_eval") or {}
        missing   = comp_eval.get("missing_aspects", [])
        if missing:
            row_block.append(Paragraph("<b>Missing / Incomplete Aspects:</b>", label_style))
            for ma in missing[:4]:
                row_block.append(Paragraph(
                    f"◦ {ma}",
                    ParagraphStyle("MA", parent=styles["Normal"], fontSize=8, leading=12,
                                   textColor=colors.HexColor("#d97706"), leftIndent=14, spaceAfter=2),
                ))

        row_block.append(hr(0.5, "#e2e8f0"))
        row_block.append(spacer(0.15))

        story.append(KeepTogether(row_block))

        # Page break every 5 records to avoid overly long pages
        if (idx + 1) % 5 == 0 and idx < len(results) - 1:
            story.append(PageBreak())
            story.append(Paragraph("5. Individual Response Evaluation Results (continued)", section_style))

    story.append(spacer())

    # ── 7. IMPROVEMENT RECOMMENDATIONS ────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("6. Improvement Recommendations", section_style))
    story.append(Paragraph(
        "The following recommendations are derived from recurring weaknesses identified "
        "across this batch evaluation. They are ranked by frequency of occurrence.",
        body_style,
    ))
    story.append(spacer(0.2))

    # Compute recommendation priorities
    recs = []
    low_rel   = sum(1 for r in results if (r.get("relevance_score",  0) or 0) < 60)
    low_acc   = sum(1 for r in results if (r.get("accuracy_score",   0) or 0) < 60)
    high_hall = sum(1 for r in results if (r.get("hallucination_score",0) or 0) > 30)
    low_comp  = sum(1 for r in results if (r.get("completeness_score",0) or 0) < 60)
    fail_cnt  = sum(1 for r in results if r.get("verdict") == "Fail")

    if high_hall > 0:
        recs.append((high_hall,
            f"[{high_hall} responses] Hallucination Reduction: Responses should be grounded "
            "in verifiable source material. Avoid speculative or fabricated claims. "
            "Consider implementing retrieval-augmented generation (RAG) to anchor responses."))
    if low_acc > 0:
        recs.append((low_acc,
            f"[{low_acc} responses] Accuracy Improvement: Factual claims frequently diverge from "
            "reference content. AI systems should be fine-tuned or constrained to rely only on "
            "verified knowledge sources."))
    if low_comp > 0:
        recs.append((low_comp,
            f"[{low_comp} responses] Completeness Enhancement: Responses omit key sub-questions "
            "or required aspects. Prompting strategies should be revised to ensure comprehensive "
            "coverage of multi-part questions."))
    if low_rel > 0:
        recs.append((low_rel,
            f"[{low_rel} responses] Relevance Alignment: Responses frequently diverge from the "
            "question topic. Instruct the AI system to re-read the question intent before "
            "generating a response."))
    if fail_cnt > 0:
        recs.append((fail_cnt,
            f"[{fail_cnt} Fail verdicts] Critical Failures: A significant portion of responses "
            "failed evaluation. Consider re-evaluating the AI system's training data and "
            "performing targeted fine-tuning on the failing categories."))

    if not recs:
        story.append(Paragraph(
            "✓ No critical recurring weaknesses detected. Overall batch quality is good.",
            body_style,
        ))
    else:
        recs_sorted = sorted(recs, key=lambda x: x[0], reverse=True)
        for i, (_, text) in enumerate(recs_sorted, 1):
            story.append(Paragraph(
                f"<b>Recommendation {i}:</b>",
                ParagraphStyle("RecHead", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold",
                               textColor=colors.HexColor("#1e40af"), spaceAfter=2),
            ))
            story.append(Paragraph(text, rec_style))
            story.append(spacer(0.15))

    story.append(spacer(0.5))

    # ── 8. FOOTER ─────────────────────────────────────────────────────────────
    story.append(hr(1, "#94a3b8"))
    story.append(Paragraph(
        "Generated by AI Response Validation System v2.0 — "
        "Powered by SentenceTransformers + ChromaDB + LangChain + FastAPI | "
        f"Batch ID: {batch_id}",
        ParagraphStyle("Footer", parent=styles["Normal"],
                       fontSize=8, textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER),
    ))

    doc.build(story)
    return buffer.getvalue()
