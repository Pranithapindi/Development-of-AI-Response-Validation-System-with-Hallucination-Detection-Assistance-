"""
pdf_generator.py
────────────────
Generates a professionally formatted PDF validation report
using ReportLab.

Matches the "Reports Export" feature in the architecture flowchart.
"""

import io
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Status colour map (RGB tuples)
STATUS_COLORS = {
    "supported":     (0.04, 0.72, 0.47),   # emerald
    "contradictory": (0.93, 0.17, 0.17),   # red
    "uncertain":     (0.95, 0.62, 0.07),   # amber
    "unsupported":   (0.98, 0.45, 0.09),   # orange
}

STATUS_LABELS = {
    "supported":     "SUPPORTED",
    "contradictory": "POTENTIAL HALLUCINATION",
    "uncertain":     "UNCERTAIN",
    "unsupported":   "UNSUPPORTED",
}


def generate_pdf_report(result: dict) -> bytes:
    """
    Generate a complete PDF validation report.

    Args:
        result: Full validation result dict from validation_engine

    Returns:
        PDF file content as bytes
    """
    try:
        from reportlab.lib.pagesizes  import A4
        from reportlab.lib.styles     import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units      import cm
        from reportlab.lib            import colors
        from reportlab.platypus       import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, KeepTogether,
        )
        from reportlab.lib.enums      import TA_CENTER, TA_LEFT, TA_JUSTIFY
    except ImportError as e:
        logger.error("ReportLab not installed: %s", e)
        raise

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="AI Response Validation Report",
        author="AI Validation System v2.0",
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontSize=20, spaceAfter=6, textColor=colors.HexColor("#1e3a8a"),
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=11, textColor=colors.HexColor("#475569"), spaceAfter=4,
    )
    heading_style = ParagraphStyle(
        "Heading", parent=styles["Heading2"],
        fontSize=13, textColor=colors.HexColor("#1e40af"), spaceBefore=14, spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=10, leading=15, alignment=TA_JUSTIFY, spaceAfter=6,
    )
    code_style = ParagraphStyle(
        "Code", parent=styles["Code"],
        fontSize=9, leading=13, backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#64748b"), spaceAfter=2,
    )

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("AI Response Validation Report", title_style))
    story.append(Paragraph("AI Hallucination Detection System — v2.0", subtitle_style))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%d %B %Y at %I:%M %p')}",
        subtitle_style,
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#3b82f6")))
    story.append(Spacer(1, 0.4*cm))

    # ── Query ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("User Query", heading_style))
    story.append(Paragraph(result.get("query", "—"), body_style))

    # ── Overall Result ─────────────────────────────────────────────────────────
    story.append(Paragraph("Overall Validation Result", heading_style))

    score = result.get("overall_score", 0)
    label = result.get("label", "Unknown")
    stats = result.get("stats", {})

    score_color = (
        colors.HexColor("#10b981") if score >= 80 else
        colors.HexColor("#f59e0b") if score >= 50 else
        colors.HexColor("#ef4444")
    )

    summary_data = [
        ["Reliability Score", f"{score}/100"],
        ["Classification Label", label],
        ["Supported Claims", str(stats.get("supported", 0))],
        ["Unsupported Claims", str(stats.get("unsupported", 0))],
        ["Contradictory Claims", str(stats.get("contradictory", 0))],
        ["Uncertain Claims", str(stats.get("uncertain", 0))],
        ["Hallucination Risk", f"{stats.get('hallucination_risk', 0)}%"],
        ["Processing Time", f"{result.get('processing_time_ms', 0)} ms"],
    ]

    summary_table = Table(summary_data, colWidths=[7*cm, 9*cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), colors.HexColor("#dbeafe")),
        ("FONTNAME",     (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,0), (-1,-1), 10),
        ("FONTNAME",     (0,0), (0,-1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [
            colors.HexColor("#f8fafc"), colors.white
        ]),
        ("GRID",         (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ("TEXTCOLOR",    (1,0), (1,0), score_color),
        ("FONTNAME",     (1,0), (1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (1,0), (1,0), 14),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.3*cm))

    # ── Summary ───────────────────────────────────────────────────────────────
    story.append(Paragraph("Validation Summary", heading_style))
    story.append(Paragraph(result.get("summary", ""), body_style))

    # ── Claim Analysis ─────────────────────────────────────────────────────────
    story.append(Paragraph("Claim-Level Analysis", heading_style))

    for claim in result.get("claims", []):
        status      = claim.get("status", "unsupported")
        status_rgb  = STATUS_COLORS.get(status, (0.5,0.5,0.5))
        status_color = colors.Color(*status_rgb)
        status_label = STATUS_LABELS.get(status, status.upper())
        conf_pct    = claim.get("confidence_pct", 0)

        claim_block = []

        # Claim header
        header_data = [[
            Paragraph(f"Claim #{claim.get('id')}", ParagraphStyle(
                "ClaimH", parent=styles["Normal"],
                fontSize=10, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e293b"),
            )),
            Paragraph(status_label, ParagraphStyle(
                "StatusLabel", parent=styles["Normal"],
                fontSize=9, fontName="Helvetica-Bold",
                textColor=colors.white,
            )),
            Paragraph(f"{conf_pct}% confidence", ParagraphStyle(
                "ConfLabel", parent=styles["Normal"],
                fontSize=9, textColor=colors.HexColor("#475569"),
            )),
        ]]
        header_table = Table(header_data, colWidths=[4*cm, 7*cm, 5*cm])
        header_table.setStyle(TableStyle([
            ("BACKGROUND", (1,0), (1,0), status_color),
            ("BACKGROUND", (0,0), (0,0), colors.HexColor("#f1f5f9")),
            ("BACKGROUND", (2,0), (2,0), colors.HexColor("#f1f5f9")),
            ("GRID",       (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING",(0,0),(-1,-1),6),
            ("LEFTPADDING",(0,0),(-1,-1), 8),
        ]))
        claim_block.append(header_table)

        # Claim text
        claim_block.append(Paragraph(claim.get("text",""), body_style))

        # Evidence
        evidence = claim.get("evidence","")
        if evidence and evidence != "No reference context provided.":
            claim_block.append(Paragraph("Evidence:", label_style))
            claim_block.append(Paragraph(
                f'"{evidence}"',
                ParagraphStyle("Ev", parent=styles["Normal"],
                    fontSize=9, leading=13, textColor=colors.HexColor("#1e40af"),
                    leftIndent=12, spaceAfter=4),
            ))

        # Explanation
        claim_block.append(Paragraph("Reasoning:", label_style))
        claim_block.append(Paragraph(claim.get("explanation",""), ParagraphStyle(
            "Exp", parent=styles["Normal"],
            fontSize=9, leading=13, textColor=colors.HexColor("#475569"),
            leftIndent=12, spaceAfter=8,
        )))

        story.append(KeepTogether(claim_block))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 0.2*cm))

    # ── Footer ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#94a3b8")))
    story.append(Paragraph(
        "Generated by AI Response Validation System v2.0 — "
        "Powered by SentenceTransformers + ChromaDB + LangChain + FastAPI",
        ParagraphStyle("Footer", parent=styles["Normal"],
            fontSize=8, textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER),
    ))

    doc.build(story)
    return buffer.getvalue()
