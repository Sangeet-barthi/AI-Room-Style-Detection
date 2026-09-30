"""ReportLab PDF generation — premium design-consultancy layout."""
from __future__ import annotations

import abc
import io
from datetime import UTC, datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

DISCLAIMER_TEXT = (
    "This report provides AI-assisted visual design analysis and is intended for "
    "inspiration and planning. Scores are visual estimates and are not professional "
    "architectural, structural, ventilation, lighting, safety, or environmental "
    "measurements."
)

INK = colors.HexColor("#1C1B19")
MUTED = colors.HexColor("#6F6A63")
LINE = colors.HexColor("#DED8CE")
CANVAS = colors.HexColor("#FAF8F4")
ACCENT = colors.HexColor("#8A6A46")
SUCCESS = colors.HexColor("#4F7A54")
WARNING = colors.HexColor("#B4823C")
DANGER = colors.HexColor("#A6543F")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm


def score_color(score: int) -> colors.Color:
    if score >= 75:
        return SUCCESS
    if score >= 55:
        return WARNING
    return DANGER


class ReportGenerator(abc.ABC):
    @abc.abstractmethod
    def build(self, context: dict[str, Any]) -> bytes: ...


class ScoreBar(Flowable):
    """Horizontal score meter with label and value."""

    def __init__(self, label: str, score: int, width: float, description: str = "") -> None:
        super().__init__()
        self.label = label
        self.score = max(0, min(100, int(score)))
        self.width = width
        self.description = description
        self._desc_style = ParagraphStyle(
            "scoreDesc", fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED
        )
        self._desc = Paragraph(self.description, self._desc_style) if description else None
        self.height = 30

    def wrap(self, avail_width: float, avail_height: float):  # type: ignore[no-untyped-def]
        self.width = min(self.width, avail_width)
        extra = 0.0
        if self._desc:
            _, h = self._desc.wrap(self.width, avail_height)
            extra = h + 4
        self.height = 26 + extra
        return self.width, self.height

    def draw(self) -> None:
        c = self.canv
        top = self.height
        c.setFont("Helvetica-Bold", 9.5)
        c.setFillColor(INK)
        c.drawString(0, top - 10, self.label.upper())

        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(score_color(self.score))
        c.drawRightString(self.width, top - 10, f"{self.score}/100")

        bar_y = top - 20
        c.setFillColor(colors.HexColor("#EDE8E0"))
        c.roundRect(0, bar_y, self.width, 6, 3, stroke=0, fill=1)
        filled = max(self.width * self.score / 100.0, 3)
        c.setFillColor(score_color(self.score))
        c.roundRect(0, bar_y, filled, 6, 3, stroke=0, fill=1)

        if self._desc:
            self._desc.drawOn(c, 0, 0)


class ScoreDial(Flowable):
    """Large circular overall-score indicator."""

    def __init__(self, score: int, size: float = 46 * mm) -> None:
        super().__init__()
        self.score = max(0, min(100, int(score)))
        self.size = size
        self.width = size
        self.height = size

    def draw(self) -> None:
        c = self.canv
        r = self.size / 2
        cx = cy = r
        c.setLineWidth(9)
        c.setStrokeColor(colors.HexColor("#EDE8E0"))
        c.circle(cx, cy, r - 6, stroke=1, fill=0)

        c.setStrokeColor(score_color(self.score))
        c.setLineCap(1)
        path = c.beginPath()
        extent = -359.9 * self.score / 100.0
        path.arc(cx - (r - 6), cy - (r - 6), cx + (r - 6), cy + (r - 6), 90, extent)
        c.drawPath(path, stroke=1, fill=0)

        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 26)
        c.drawCentredString(cx, cy - 2, str(self.score))
        c.setFont("Helvetica", 8)
        c.setFillColor(MUTED)
        c.drawCentredString(cx, cy - 16, "OUT OF 100")


class PaletteStrip(Flowable):
    def __init__(self, palette: list[dict[str, Any]], width: float) -> None:
        super().__init__()
        self.palette = palette[:6]
        self.width = width
        self.height = 34 * mm

    def wrap(self, avail_width: float, avail_height: float):  # type: ignore[no-untyped-def]
        self.width = min(self.width, avail_width)
        return self.width, self.height

    def draw(self) -> None:
        if not self.palette:
            return
        c = self.canv
        count = len(self.palette)
        gap = 6
        swatch = (self.width - gap * (count - 1)) / count
        for index, entry in enumerate(self.palette):
            x = index * (swatch + gap)
            try:
                fill = colors.HexColor(entry.get("hex", "#CCCCCC"))
            except ValueError:
                fill = colors.HexColor("#CCCCCC")
            c.setFillColor(fill)
            c.setStrokeColor(LINE)
            c.roundRect(x, self.height - 20 * mm, swatch, 20 * mm, 4, stroke=1, fill=1)
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(x, self.height - 24 * mm, str(entry.get("name", ""))[:18])
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 7)
            c.drawString(x, self.height - 28 * mm, str(entry.get("hex", "")))


class ReportLabReportGenerator(ReportGenerator):
    """Builds the full multi-page PDF report."""

    def __init__(self) -> None:
        self.styles = self._build_styles()

    # -- styles -------------------------------------------------------------
    def _build_styles(self):  # type: ignore[no-untyped-def]
        styles = getSampleStyleSheet()
        styles.add(
            ParagraphStyle(
                "CoverTitle", fontName="Helvetica-Bold", fontSize=34, leading=38,
                textColor=colors.white, spaceAfter=10,
            )
        )
        styles.add(
            ParagraphStyle(
                "CoverKicker", fontName="Helvetica-Bold", fontSize=9, leading=14,
                textColor=colors.HexColor("#C9BCA9"), spaceAfter=18,
            )
        )
        styles.add(
            ParagraphStyle(
                "CoverMeta", fontName="Helvetica", fontSize=10, leading=17,
                textColor=colors.HexColor("#E6DFD4"),
            )
        )
        styles.add(
            ParagraphStyle(
                "SectionKicker", fontName="Helvetica-Bold", fontSize=8, leading=11,
                textColor=ACCENT, spaceAfter=3,
            )
        )
        styles.add(
            ParagraphStyle(
                "SectionTitle", fontName="Helvetica-Bold", fontSize=17, leading=21,
                textColor=INK, spaceAfter=8,
            )
        )
        styles.add(
            ParagraphStyle(
                "SubTitle", fontName="Helvetica-Bold", fontSize=11, leading=15,
                textColor=INK, spaceBefore=10, spaceAfter=5,
            )
        )
        styles.add(
            ParagraphStyle(
                "Body", fontName="Helvetica", fontSize=9.7, leading=15,
                textColor=INK, alignment=TA_JUSTIFY, spaceAfter=7,
            )
        )
        styles.add(
            ParagraphStyle(
                "Small", fontName="Helvetica", fontSize=8.3, leading=12, textColor=MUTED
            )
        )
        styles.add(
            ParagraphStyle(
                "BulletLine", fontName="Helvetica", fontSize=9.4, leading=14.5,
                textColor=INK, leftIndent=11, bulletIndent=2, spaceAfter=4,
            )
        )
        styles.add(
            ParagraphStyle(
                "Disclaimer", fontName="Helvetica-Oblique", fontSize=8, leading=11.5,
                textColor=MUTED, alignment=TA_JUSTIFY,
            )
        )
        styles.add(
            ParagraphStyle(
                "CenterSmall", fontName="Helvetica", fontSize=8, leading=11,
                textColor=MUTED, alignment=TA_CENTER,
            )
        )
        return styles

    # -- page furniture -----------------------------------------------------
    def _cover_background(self, canvas, doc) -> None:  # type: ignore[no-untyped-def]
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#1C1B19"))
        canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        canvas.setFillColor(colors.HexColor("#272521"))
        canvas.rect(0, 0, PAGE_W, 70 * mm, stroke=0, fill=1)
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(2)
        canvas.line(MARGIN, PAGE_H - 34 * mm, MARGIN + 28 * mm, PAGE_H - 34 * mm)
        canvas.restoreState()

    def _content_background(self, canvas, doc) -> None:  # type: ignore[no-untyped-def]
        canvas.saveState()
        canvas.setFillColor(CANVAS)
        canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(MARGIN, PAGE_H - 14 * mm, PAGE_W - MARGIN, PAGE_H - 14 * mm)
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, PAGE_H - 12 * mm, "ROOMSTYLE AI  ·  ROOM ANALYSIS REPORT")
        canvas.drawRightString(
            PAGE_W - MARGIN, PAGE_H - 12 * mm, self._header_right
        )

        canvas.line(MARGIN, 14 * mm, PAGE_W - MARGIN, 14 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(MARGIN, 10 * mm, "AI-assisted visual assessment · not a professional survey")
        canvas.drawRightString(PAGE_W - MARGIN, 10 * mm, f"Page {doc.page - 1}")
        canvas.restoreState()

    # -- build --------------------------------------------------------------
    def build(self, context: dict[str, Any]) -> bytes:
        analysis: dict[str, Any] = context["analysis"]
        scores: dict[str, Any] = context["scores"]
        improvements: dict[str, Any] = context.get("improvements", {})
        budgets: list[dict[str, Any]] = context.get("budgets", [])
        narrative: dict[str, Any] = context.get("narrative", {})
        makeover: dict[str, Any] | None = context.get("makeover")
        user: dict[str, Any] = context["user"]
        image_bytes: bytes | None = context.get("image_bytes")
        makeover_image_bytes: bytes | None = context.get("makeover_image_bytes")

        self._header_right = (
            f"{analysis.get('room_type', 'Room')}  ·  {analysis.get('primary_style', '')}"
        ).upper()

        buffer = io.BytesIO()
        doc = BaseDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=MARGIN,
            rightMargin=MARGIN,
            topMargin=22 * mm,
            bottomMargin=20 * mm,
            title=f"RoomStyle AI Report — {analysis.get('room_type', 'Room')}",
            author="RoomStyle AI",
            subject="AI-assisted interior design analysis",
        )
        content_width = PAGE_W - 2 * MARGIN

        cover_frame = Frame(MARGIN, MARGIN, content_width, PAGE_H - 2 * MARGIN, id="cover")
        body_frame = Frame(
            MARGIN, 18 * mm, content_width, PAGE_H - 40 * mm, id="body"
        )
        doc.addPageTemplates(
            [
                PageTemplate(id="Cover", frames=[cover_frame], onPage=self._cover_background),
                PageTemplate(id="Body", frames=[body_frame], onPage=self._content_background),
            ]
        )

        story: list[Any] = []
        story += self._cover(analysis, scores, user, image_bytes, content_width)
        story.append(NextPageTemplate("Body"))
        story.append(PageBreak())

        story += self._summary_section(analysis, scores, narrative, content_width)
        story += self._style_section(analysis, narrative, content_width)
        story.append(PageBreak())
        story += self._detection_section(analysis, content_width)
        story.append(PageBreak())
        story += self._health_section(scores, narrative, content_width)
        story += self._improvement_section(improvements, content_width)
        story.append(PageBreak())
        story += self._budget_section(budgets, content_width)
        if makeover:
            story.append(PageBreak())
            story += self._makeover_section(
                makeover, image_bytes, makeover_image_bytes, content_width
            )
        story += self._disclaimer_section(content_width)

        doc.build(story)
        return buffer.getvalue()

    # -- sections -----------------------------------------------------------
    def _cover(
        self,
        analysis: dict[str, Any],
        scores: dict[str, Any],
        user: dict[str, Any],
        image_bytes: bytes | None,
        width: float,
    ) -> list[Any]:
        s = self.styles
        story: list[Any] = [Spacer(1, 16 * mm)]
        story.append(Paragraph("ROOMSTYLE AI  ·  INTERIOR ANALYSIS", s["CoverKicker"]))
        story.append(
            Paragraph(
                f"{analysis.get('room_type', 'Room')}<br/>"
                f"<font color='#C9A227'>{analysis.get('primary_style', '')}</font>",
                s["CoverTitle"],
            )
        )
        story.append(
            Paragraph(
                "A visual design assessment, room-health score and costed makeover plan "
                "generated from a single photograph.",
                ParagraphStyle(
                    "coverLead", parent=s["CoverMeta"], fontSize=11, leading=17,
                    textColor=colors.HexColor("#B9B1A5"),
                ),
            )
        )
        story.append(Spacer(1, 10 * mm))

        if image_bytes:
            story.append(self._fit_image(image_bytes, width, 92 * mm))
            story.append(Spacer(1, 8 * mm))

        confidence = int(round(float(analysis.get("style_confidence", 0)) * 100))
        meta = Table(
            [
                [
                    Paragraph("PREPARED FOR", s["CoverKicker"]),
                    Paragraph("DATE", s["CoverKicker"]),
                    Paragraph("CONFIDENCE ESTIMATE", s["CoverKicker"]),
                    Paragraph("ROOM HEALTH", s["CoverKicker"]),
                ],
                [
                    Paragraph(str(user.get("full_name", "")), s["CoverMeta"]),
                    Paragraph(
                        datetime.now(UTC).strftime("%d %B %Y"), s["CoverMeta"]
                    ),
                    Paragraph(f"{confidence}%", s["CoverMeta"]),
                    Paragraph(f"{scores['overall']['score']}/100", s["CoverMeta"]),
                ],
            ],
            colWidths=[width * 0.3, width * 0.2, width * 0.25, width * 0.25],
        )
        meta.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LINEABOVE", (0, 0), (-1, 0), 0.7, colors.HexColor("#4A453E")),
                ]
            )
        )
        story.append(meta)
        return story

    def _section_head(self, kicker: str, title: str) -> list[Any]:
        return [
            Paragraph(kicker.upper(), self.styles["SectionKicker"]),
            Paragraph(title, self.styles["SectionTitle"]),
        ]

    def _summary_section(
        self,
        analysis: dict[str, Any],
        scores: dict[str, Any],
        narrative: dict[str, Any],
        width: float,
    ) -> list[Any]:
        s = self.styles
        story = self._section_head("01", "Executive summary")
        story.append(
            Paragraph(
                narrative.get("executive_summary", scores["overall"]["summary"]), s["Body"]
            )
        )
        story.append(Spacer(1, 4 * mm))

        dial = ScoreDial(scores["overall"]["score"])
        bars = [
            ScoreBar("Lighting", scores["lighting"]["score"], width * 0.56),
            Spacer(1, 3),
            ScoreBar("Ventilation", scores["ventilation"]["score"], width * 0.56),
            Spacer(1, 3),
            ScoreBar(
                "Space utilisation", scores["space_utilization"]["score"], width * 0.56
            ),
        ]
        table = Table([[dial, bars]], colWidths=[width * 0.36, width * 0.64])
        table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 2 * mm))
        story.append(
            Paragraph(
                f"<b>Visual AI-assisted assessment.</b> {scores['overall']['formula']}.",
                s["Small"],
            )
        )
        story.append(Spacer(1, 6 * mm))
        return story

    def _style_section(
        self, analysis: dict[str, Any], narrative: dict[str, Any], width: float
    ) -> list[Any]:
        s = self.styles
        story = self._section_head("02", "Detected style")
        confidence = int(round(float(analysis.get("style_confidence", 0)) * 100))

        header = Table(
            [
                [
                    Paragraph(
                        f"<font size=20><b>{analysis.get('primary_style', '')}</b></font><br/>"
                        f"<font size=8 color='#6F6A63'>PRIMARY STYLE</font>",
                        s["Body"],
                    ),
                    Paragraph(
                        f"<font size=20><b>{confidence}%</b></font><br/>"
                        f"<font size=8 color='#6F6A63'>AI CONFIDENCE ESTIMATE</font>",
                        s["Body"],
                    ),
                    Paragraph(
                        f"<font size=20><b>{analysis.get('room_type', '')}</b></font><br/>"
                        f"<font size=8 color='#6F6A63'>ROOM TYPE</font>",
                        s["Body"],
                    ),
                ]
            ],
            colWidths=[width / 3.0] * 3,
        )
        header.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                    ("INNERGRID", (0, 0), (-1, -1), 0.7, LINE),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                    ("TOPPADDING", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(header)
        story.append(Spacer(1, 5 * mm))
        story.append(
            Paragraph(
                narrative.get("style_narrative")
                or analysis.get("style_explanation", ""),
                s["Body"],
            )
        )

        evidence = analysis.get("style_evidence") or []
        if evidence:
            story.append(Paragraph("Visual evidence", s["SubTitle"]))
            for item in evidence:
                story.append(Paragraph(item, s["BulletLine"], bulletText="—"))

        alternatives = analysis.get("alternative_styles") or []
        if alternatives:
            story.append(Paragraph("Alternative style possibilities", s["SubTitle"]))
            rows = [["Style", "AI confidence estimate", "Supporting evidence"]]
            for alt in alternatives:
                rows.append(
                    [
                        alt.get("style", ""),
                        f"{int(round(float(alt.get('confidence_estimate', 0)) * 100))}%",
                        Paragraph(
                            "; ".join(alt.get("supporting_evidence", [])) or "—", s["Small"]
                        ),
                    ]
                )
            story.append(self._table(rows, [width * 0.22, width * 0.23, width * 0.55]))
        return story

    def _detection_section(self, analysis: dict[str, Any], width: float) -> list[Any]:
        s = self.styles
        story = self._section_head("03", "What was detected")

        surfaces = Table(
            [
                [
                    Paragraph("<b>Wall colour</b>", s["Small"]),
                    Paragraph(str(analysis.get("wall_color", "—")), s["Body"]),
                ],
                [
                    Paragraph("<b>Flooring</b>", s["Small"]),
                    Paragraph(str(analysis.get("flooring", "—")), s["Body"]),
                ],
                [
                    Paragraph("<b>Colour temperature</b>", s["Small"]),
                    Paragraph(str(analysis.get("color_temperature", "—")).title(), s["Body"]),
                ],
            ],
            colWidths=[width * 0.28, width * 0.72],
        )
        surfaces.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.5, LINE),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        story.append(surfaces)
        story.append(Spacer(1, 5 * mm))

        furniture = analysis.get("furniture") or []
        if furniture:
            story.append(Paragraph("Furniture identified", s["SubTitle"]))
            rows = [["Item", "Description", "Evidence"]]
            for item in furniture:
                rows.append(
                    [
                        Paragraph(f"<b>{item.get('name', '')}</b>", s["Small"]),
                        Paragraph(item.get("description", "") or "—", s["Small"]),
                        item.get("evidence_type", "observed").title(),
                    ]
                )
            story.append(self._table(rows, [width * 0.26, width * 0.56, width * 0.18]))
            story.append(Spacer(1, 4 * mm))

        materials = analysis.get("materials") or []
        if materials:
            story.append(Paragraph("Materials identified", s["SubTitle"]))
            rows = [["Material", "Where seen", "Evidence"]]
            for item in materials:
                rows.append(
                    [
                        Paragraph(f"<b>{item.get('name', '')}</b>", s["Small"]),
                        Paragraph(item.get("where_seen", "") or "—", s["Small"]),
                        item.get("evidence_type", "observed").title(),
                    ]
                )
            story.append(self._table(rows, [width * 0.26, width * 0.56, width * 0.18]))
            story.append(Spacer(1, 4 * mm))

        palette = analysis.get("dominant_colors") or []
        if palette:
            story.append(Paragraph("Dominant colour palette", s["SubTitle"]))
            story.append(PaletteStrip(palette, width))
        return story

    def _health_section(
        self, scores: dict[str, Any], narrative: dict[str, Any], width: float
    ) -> list[Any]:
        s = self.styles
        story = self._section_head("04", "Room health assessment")
        story.append(
            Paragraph(
                narrative.get("health_narrative") or scores["overall"]["summary"], s["Body"]
            )
        )
        story.append(Spacer(1, 3 * mm))

        for key, label in (
            ("lighting", "Lighting"),
            ("ventilation", "Ventilation"),
            ("space_utilization", "Space utilisation"),
        ):
            block = scores[key]
            story.append(
                KeepTogether(
                    [
                        ScoreBar(label, block["score"], width, block["summary"]),
                        Spacer(1, 2),
                        Paragraph(
                            "Signals: " + "; ".join(block.get("factors", [])), s["Small"]
                        ),
                        Spacer(1, 5 * mm),
                    ]
                )
            )
        story.append(
            Paragraph(
                "<b>Visual AI-assisted assessment.</b> These scores describe what is "
                "visible in one photograph. They are not measured lux levels, air-change "
                "rates or surveyed floor areas.",
                s["Small"],
            )
        )
        story.append(Spacer(1, 6 * mm))
        return story

    def _improvement_section(self, improvements: dict[str, Any], width: float) -> list[Any]:
        s = self.styles
        story = self._section_head("05", "Improvement recommendations")
        if improvements.get("summary"):
            story.append(Paragraph(improvements["summary"], s["Body"]))

        items = improvements.get("improvements") or []
        if not items:
            story.append(Paragraph("No recommendations were generated.", s["Body"]))
            return story

        rows = [["Recommendation", "Why it helps", "Priority", "Est. cost"]]
        for item in items:
            cost = item.get("estimated_cost_inr")
            rows.append(
                [
                    Paragraph(
                        f"<b>{item.get('title', '')}</b><br/>"
                        f"<font size=7 color='#6F6A63'>{str(item.get('category', '')).upper()}</font>",
                        s["Small"],
                    ),
                    Paragraph(item.get("reason", ""), s["Small"]),
                    str(item.get("priority", "")).title(),
                    f"Rs {cost:,}" if cost else "—",
                ]
            )
        story.append(
            self._table(rows, [width * 0.26, width * 0.47, width * 0.14, width * 0.13])
        )
        return story

    def _budget_section(self, budgets: list[dict[str, Any]], width: float) -> list[Any]:
        s = self.styles
        story = self._section_head("06", "Budget makeover packages")
        story.append(
            Paragraph(
                "Three independent packages at different spend levels. Every cost is an "
                "estimate based on typical Indian retail pricing and should be confirmed "
                "with local suppliers before purchase.",
                s["Body"],
            )
        )

        for plan in budgets:
            budget = int(plan.get("budget", 0))
            total = int(plan.get("total_estimated_cost", 0))
            remaining = int(plan.get("remaining", budget - total))
            used_pct = int(round(total / budget * 100)) if budget else 0

            header = Table(
                [
                    [
                        Paragraph(
                            f"<font size=15><b>Rs {budget:,}</b></font><br/>"
                            f"<font size=7 color='#6F6A63'>PACKAGE BUDGET</font>",
                            s["Small"],
                        ),
                        Paragraph(
                            f"<font size=12><b>Rs {total:,}</b></font><br/>"
                            f"<font size=7 color='#6F6A63'>ESTIMATED TOTAL ({used_pct}% USED)</font>",
                            s["Small"],
                        ),
                        Paragraph(
                            f"<font size=12><b>Rs {remaining:,}</b></font><br/>"
                            f"<font size=7 color='#6F6A63'>REMAINING</font>",
                            s["Small"],
                        ),
                    ]
                ],
                colWidths=[width / 3.0] * 3,
            )
            header.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1ECE4")),
                        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ]
                )
            )

            rows = [["Item", "Why", "Priority", "Est. cost"]]
            for item in plan.get("items", []):
                rows.append(
                    [
                        Paragraph(f"<b>{item.get('name', '')}</b>", s["Small"]),
                        Paragraph(item.get("reason", ""), s["Small"]),
                        str(item.get("priority", "")).title(),
                        f"Rs {int(item.get('estimated_cost', 0)):,}",
                    ]
                )
            story.append(
                KeepTogether(
                    [
                        Spacer(1, 5 * mm),
                        header,
                        self._table(
                            rows,
                            [width * 0.27, width * 0.46, width * 0.13, width * 0.14],
                        ),
                    ]
                )
            )
        return story

    def _makeover_section(
        self,
        makeover: dict[str, Any],
        original: bytes | None,
        generated: bytes | None,
        width: float,
    ) -> list[Any]:
        s = self.styles
        label = (
            "AI Concept Visualization"
            if makeover.get("kind") == "ai_concept"
            else "Design Mockup"
        )
        story = self._section_head("07", f"Before / after — {makeover.get('target_style', '')}")
        story.append(
            Paragraph(
                f"<b>{label}.</b> This is an illustrative concept, not a photograph of the "
                "finished room. Proportions, fittings and finishes will differ in reality.",
                s["Body"],
            )
        )
        story.append(Spacer(1, 3 * mm))

        half = (width - 6 * mm) / 2
        if original and generated:
            story.append(
                self._table(
                    [
                        [
                            Paragraph("<b>BEFORE</b>", s["Small"]),
                            Paragraph(f"<b>AFTER — {label.upper()}</b>", s["Small"]),
                        ],
                        [
                            self._fit_image(original, half, 62 * mm),
                            self._fit_image(generated, half, 62 * mm),
                        ],
                    ],
                    [half, half],
                    header=False,
                )
            )
        elif original:
            story.append(Paragraph("<b>CURRENT ROOM</b>", s["Small"]))
            story.append(self._fit_image(original, width, 80 * mm))

        mockup = makeover.get("mockup") or {}
        if mockup.get("palette"):
            story.append(Paragraph("Target palette", s["SubTitle"]))
            story.append(PaletteStrip(mockup["palette"], width))

        for key, title in (
            ("furniture_changes", "Furniture changes"),
            ("lighting_changes", "Lighting changes"),
            ("material_changes", "Material changes"),
            ("decor_changes", "Decor changes"),
        ):
            values = mockup.get(key) or []
            if values:
                story.append(Paragraph(title, s["SubTitle"]))
                for value in values:
                    story.append(Paragraph(value, s["BulletLine"], bulletText="—"))
        return story

    def _disclaimer_section(self, width: float) -> list[Any]:
        s = self.styles
        box = Table([[Paragraph(DISCLAIMER_TEXT, s["Disclaimer"])]], colWidths=[width])
        box.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1ECE4")),
                    ("TOPPADDING", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        return [
            Spacer(1, 8 * mm),
            box,
            Spacer(1, 4 * mm),
            Paragraph(
                "Generated by RoomStyle AI · AI-assisted interior design analysis",
                s["CenterSmall"],
            ),
        ]

    # -- helpers ------------------------------------------------------------
    def _table(self, rows: list[list[Any]], widths: list[float], header: bool = True) -> Table:
        table = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
        style = [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
            ("BOX", (0, 0), (-1, -1), 0.7, LINE),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.3),
            ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ]
        if header:
            style += [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAE4DA")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 7.6),
                ("TEXTCOLOR", (0, 0), (-1, 0), MUTED),
            ]
        table.setStyle(TableStyle(style))
        return table

    @staticmethod
    def _fit_image(data: bytes, max_width: float, max_height: float) -> Image:
        from PIL import Image as PILImage

        with PILImage.open(io.BytesIO(data)) as probe:
            width, height = probe.size
        ratio = min(max_width / width, max_height / height)
        image = Image(io.BytesIO(data), width=width * ratio, height=height * ratio)
        image.hAlign = "LEFT"
        return image
