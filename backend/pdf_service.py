"""PDF generation service for project estimates using ReportLab."""
import io
import os
import base64
import math
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, HRFlowable
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF


YASH_BLUE = colors.HexColor("#0F172A")
YASH_CYAN = colors.HexColor("#0EA5E9")
YASH_GREEN = colors.HexColor("#10B981")
YASH_AMBER = colors.HexColor("#F59E0B")
YASH_PURPLE = colors.HexColor("#8B5CF6")
LIGHT_GRAY = colors.HexColor("#F1F5F9")
MED_GRAY = colors.HexColor("#94A3B8")
BORDER_GRAY = colors.HexColor("#CBD5E1")


def _calc_wave_summary(wave, profit_margin_pct, nego_buffer_pct):
    total_mm = onsite_mm = offshore_mm = 0
    onsite_sp = offshore_sp = 0
    onsite_salary = offshore_salary = 0
    total_rows_sp = total_base_salary = total_overhead = 0

    for alloc in wave.get("grid_allocations", []):
        mm = sum((alloc.get("phase_allocations") or {}).values())
        salary_cost = alloc.get("avg_monthly_salary", 0) * mm
        overhead = salary_cost * (alloc.get("overhead_percentage", 0) / 100)
        total_cost = salary_cost + overhead
        row_sp = total_cost / (1 - profit_margin_pct / 100) if profit_margin_pct < 100 else total_cost
        override = alloc.get("override_hourly_rate", 0) or 0
        eff_sp = (override * 176 * mm) if override > 0 else row_sp

        total_mm += mm
        total_base_salary += salary_cost
        total_overhead += overhead
        total_rows_sp += eff_sp

        if alloc.get("is_onsite"):
            onsite_mm += mm; onsite_sp += eff_sp; onsite_salary += salary_cost
        else:
            offshore_mm += mm; offshore_sp += eff_sp; offshore_salary += salary_cost

    logistics_cost = _calc_wave_logistics(wave)
    wave_sp = total_rows_sp + logistics_cost
    ctc = total_base_salary + total_overhead
    nego = wave_sp * (nego_buffer_pct / 100)
    final = wave_sp + nego

    return {
        "total_mm": total_mm, "onsite_mm": onsite_mm, "offshore_mm": offshore_mm,
        "onsite_sp": onsite_sp, "offshore_sp": offshore_sp,
        "onsite_salary": onsite_salary, "offshore_salary": offshore_salary,
        "total_rows_sp": total_rows_sp, "logistics_cost": logistics_cost,
        "selling_price": wave_sp, "ctc": ctc, "nego_buffer": nego, "final_price": final,
    }


def _calc_wave_logistics(wave):
    raw = wave.get("logistics_config") or wave.get("logistics_defaults") or {}
    c = {
        "per_diem_daily": raw.get("per_diem_daily", 50),
        "per_diem_days": raw.get("per_diem_days", 30),
        "accommodation_daily": raw.get("accommodation_daily", 80),
        "accommodation_days": raw.get("accommodation_days", 30),
        "local_conveyance_daily": raw.get("local_conveyance_daily", 15),
        "local_conveyance_days": raw.get("local_conveyance_days", 21),
        "flight_cost_per_trip": raw.get("flight_cost_per_trip", 450),
        "visa_medical_per_trip": raw.get("visa_medical_per_trip", raw.get("visa_insurance_per_trip", 400)),
        "num_trips": raw.get("num_trips", 6),
        "contingency_percentage": raw.get("contingency_percentage", 5),
        "contingency_absolute": raw.get("contingency_absolute", 0),
    }
    traveling_mm = 0; traveling_count = 0
    for alloc in wave.get("grid_allocations", []):
        mm = sum((alloc.get("phase_allocations") or {}).values())
        if alloc.get("travel_required"):
            traveling_mm += mm; traveling_count += 1

    sub = (traveling_mm * c["per_diem_daily"] * c["per_diem_days"]
           + traveling_mm * c["accommodation_daily"] * c["accommodation_days"]
           + traveling_mm * c["local_conveyance_daily"] * c["local_conveyance_days"]
           + traveling_count * c["flight_cost_per_trip"] * c["num_trips"]
           + traveling_count * c["visa_medical_per_trip"] * c["num_trips"])
    return sub + sub * (c["contingency_percentage"] / 100) + c["contingency_absolute"]


def _fmt(val):
    return f"${val:,.0f}"


def _build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CoverTitle", fontSize=28, textColor=YASH_BLUE,
                              alignment=TA_CENTER, spaceAfter=12, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle(name="CoverSub", fontSize=14, textColor=MED_GRAY,
                              alignment=TA_CENTER, spaceAfter=6))
    styles.add(ParagraphStyle(name="SectionTitle", fontSize=16, textColor=YASH_BLUE,
                              spaceBefore=18, spaceAfter=10, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle(name="SubTitle", fontSize=12, textColor=YASH_CYAN,
                              spaceBefore=12, spaceAfter=6, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle(name="CellText", fontSize=8, leading=10))
    styles.add(ParagraphStyle(name="CellRight", fontSize=8, leading=10, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="KPILabel", fontSize=9, textColor=MED_GRAY, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name="KPIValue", fontSize=16, textColor=YASH_BLUE,
                              alignment=TA_CENTER, fontName="Helvetica-Bold"))
    return styles


def _make_pie_chart(onsite_mm, offshore_mm, width=280, height=200):
    d = Drawing(width, height)
    if onsite_mm + offshore_mm == 0:
        return d
    pie = Pie()
    pie.x = 60; pie.y = 20; pie.width = 120; pie.height = 120
    pie.data = [onsite_mm, offshore_mm]
    pie.labels = [f"Onsite\n{onsite_mm:.1f} MM", f"Offshore\n{offshore_mm:.1f} MM"]
    pie.slices[0].fillColor = YASH_AMBER
    pie.slices[1].fillColor = YASH_CYAN
    pie.slices.strokeWidth = 0.5
    pie.slices.strokeColor = colors.white
    d.add(pie)
    d.add(String(width / 2, height - 10, "Onsite vs Offshore Split",
                 fontSize=10, fillColor=YASH_BLUE, textAnchor="middle", fontName="Helvetica-Bold"))
    return d


def _make_bar_chart(wave_data, width=400, height=200):
    d = Drawing(width, height)
    if not wave_data:
        return d
    chart = VerticalBarChart()
    chart.x = 60; chart.y = 30
    chart.width = width - 100; chart.height = height - 60
    chart.data = [[w["selling_price"] for w in wave_data]]
    chart.categoryAxis.categoryNames = [w["name"][:12] for w in wave_data]
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.angle = 30
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    chart.bars[0].fillColor = YASH_CYAN
    chart.bars[0].strokeWidth = 0
    d.add(chart)
    d.add(String(width / 2, height - 10, "Wave Selling Prices",
                 fontSize=10, fillColor=YASH_BLUE, textAnchor="middle", fontName="Helvetica-Bold"))
    return d


def generate_project_pdf(project: dict, logo_path: str = None) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=0.6 * inch, bottomMargin=0.6 * inch,
                            leftMargin=0.6 * inch, rightMargin=0.6 * inch)
    styles = _build_styles()
    story = []
    pmp = project.get("profit_margin_percentage", 35)
    nbp = project.get("nego_buffer_percentage", 0)

    # ── Cover Page ──
    story.append(Spacer(1, 1.5 * inch))
    if logo_path and os.path.exists(logo_path):
        story.append(Image(logo_path, width=2.2 * inch, height=0.7 * inch, hAlign="CENTER"))
        story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Project Estimate", styles["CoverTitle"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(HRFlowable(width="60%", thickness=2, color=YASH_CYAN, hAlign="CENTER"))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(f"<b>{project.get('project_number', '')}</b> — v{project.get('version', 1)}", styles["CoverSub"]))
    story.append(Paragraph(project.get("name", "Untitled Project"), styles["CoverTitle"]))
    story.append(Spacer(1, 0.2 * inch))
    cover_data = [
        ["Customer", project.get("customer_name", "—")],
        ["Technology", ", ".join(project.get("technology_names") or []) or "—"],
        ["Project Type", ", ".join(project.get("project_type_names") or []) or "—"],
        ["Sales Manager", project.get("sales_manager_name", "—")],
        ["Created By", project.get("created_by_name", "—")],
        ["Date", datetime.now().strftime("%B %d, %Y")],
    ]
    cover_table = Table(cover_data, colWidths=[1.8 * inch, 3.5 * inch], hAlign="CENTER")
    cover_table.setStyle(TableStyle([
        ("TEXTCOLOR", (0, 0), (0, -1), MED_GRAY),
        ("TEXTCOLOR", (1, 0), (1, -1), YASH_BLUE),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER_GRAY),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 0.8 * inch))
    status = (project.get("status") or "draft").replace("_", " ").title()
    story.append(Paragraph(f"Status: <b>{status}</b>", styles["CoverSub"]))
    story.append(PageBreak())

    # ── Compute summaries ──
    waves = project.get("waves") or []
    wave_summaries = []
    for w in waves:
        s = _calc_wave_summary(w, pmp, nbp)
        s["name"] = w.get("name", "Wave")
        s["duration"] = w.get("duration_months", 0)
        s["resources"] = len(w.get("grid_allocations", []))
        wave_summaries.append(s)

    overall_mm = sum(s["total_mm"] for s in wave_summaries)
    overall_onsite = sum(s["onsite_mm"] for s in wave_summaries)
    overall_offshore = sum(s["offshore_mm"] for s in wave_summaries)
    overall_sp = sum(s["selling_price"] for s in wave_summaries)
    overall_logistics = sum(s["logistics_cost"] for s in wave_summaries)
    overall_nego = sum(s["nego_buffer"] for s in wave_summaries)
    overall_final = sum(s["final_price"] for s in wave_summaries)
    overall_ctc = sum(s["ctc"] for s in wave_summaries)

    # ── Executive Summary ──
    story.append(Paragraph("Executive Summary", styles["SectionTitle"]))
    kpi_data = [
        ["Total Man-Months", "Onsite MM", "Offshore MM", "Total Logistics", "Final Price"],
        [f"{overall_mm:.1f}", f"{overall_onsite:.1f}", f"{overall_offshore:.1f}",
         _fmt(overall_logistics), _fmt(overall_final)],
    ]
    kpi_table = Table(kpi_data, colWidths=[1.3 * inch] * 5, hAlign="LEFT")
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
        ("TEXTCOLOR", (0, 0), (-1, 0), MED_GRAY),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 14),
        ("TEXTCOLOR", (4, 1), (4, 1), YASH_GREEN),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_GRAY),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 0.15 * inch))

    price_data = [
        ["Selling Price", "Nego Buffer", "Cost to Company", "Profit Margin"],
        [_fmt(overall_sp), _fmt(overall_nego), _fmt(overall_ctc), f"{pmp}%"],
    ]
    price_table = Table(price_data, colWidths=[1.6 * inch] * 4, hAlign="LEFT")
    price_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
        ("TEXTCOLOR", (0, 0), (-1, 0), MED_GRAY),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 12),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_GRAY),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
    ]))
    story.append(price_table)

    # ── Charts ──
    story.append(Spacer(1, 0.3 * inch))
    chart_row = []
    if overall_onsite + overall_offshore > 0:
        chart_row.append(_make_pie_chart(overall_onsite, overall_offshore))
    if len(wave_summaries) > 1:
        chart_row.append(_make_bar_chart(wave_summaries))
    if chart_row:
        ct = Table([chart_row], hAlign="LEFT")
        ct.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        story.append(ct)
    story.append(PageBreak())

    # ── Wave Breakdowns ──
    for i, ws in enumerate(wave_summaries):
        wave = waves[i]
        story.append(Paragraph(f"Wave: {ws['name']}", styles["SectionTitle"]))
        story.append(Paragraph(f"{ws['duration']} months • {ws['resources']} resources • Profit Margin: {pmp}%", styles["CoverSub"]))
        story.append(Spacer(1, 0.1 * inch))

        # Wave KPIs
        w_kpi = [
            ["Total MM", "Onsite MM", "Offshore MM", "Logistics", "Selling Price", "Final Price"],
            [f"{ws['total_mm']:.1f}", f"{ws['onsite_mm']:.1f}", f"{ws['offshore_mm']:.1f}",
             _fmt(ws['logistics_cost']), _fmt(ws['selling_price']), _fmt(ws['final_price'])],
        ]
        w_table = Table(w_kpi, colWidths=[1.05 * inch] * 6, hAlign="LEFT")
        w_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E0F2FE")),
            ("FONTSIZE", (0, 0), (-1, 0), 7), ("FONTSIZE", (0, 1), (-1, 1), 10),
            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("BOX", (0, 0), (-1, -1), 1, YASH_CYAN),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ]))
        story.append(w_table)
        story.append(Spacer(1, 0.15 * inch))

        # Resource table
        allocs = wave.get("grid_allocations", [])
        if allocs:
            story.append(Paragraph("Resource Allocations", styles["SubTitle"]))
            header = ["#", "Skill", "Level", "Location", "Type", "MM", "Salary/Mo", "Selling Price"]
            rows = [header]
            for j, a in enumerate(allocs):
                mm = sum((a.get("phase_allocations") or {}).values())
                salary = a.get("avg_monthly_salary", 0)
                overhead = salary * mm * (a.get("overhead_percentage", 0) / 100)
                base = salary * mm
                tc = base + overhead
                sp = tc / (1 - pmp / 100) if pmp < 100 else tc
                override = a.get("override_hourly_rate", 0) or 0
                eff_sp = (override * 176 * mm) if override > 0 else sp
                rows.append([
                    str(j + 1),
                    a.get("skill_name", "—")[:20],
                    (a.get("proficiency_level") or "—")[:8],
                    (a.get("base_location_name") or "—")[:12],
                    "ON" if a.get("is_onsite") else "OFF",
                    f"{mm:.1f}",
                    f"${salary:,.0f}",
                    _fmt(eff_sp),
                ])
            col_w = [0.35 * inch, 1.4 * inch, 0.7 * inch, 0.95 * inch, 0.45 * inch, 0.5 * inch, 0.8 * inch, 1.0 * inch]
            r_table = Table(rows, colWidths=col_w, repeatRows=1, hAlign="LEFT")
            r_style = [
                ("BACKGROUND", (0, 0), (-1, 0), YASH_BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, 0), 7),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 1), (-1, -1), 7),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (4, 0), (-1, -1), "CENTER"),
                ("ALIGN", (-1, 1), (-1, -1), "RIGHT"),
                ("ALIGN", (-2, 1), (-2, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
                ("LINEBELOW", (0, 0), (-1, 0), 1, YASH_BLUE),
            ]
            for r in range(1, len(rows)):
                if r % 2 == 0:
                    r_style.append(("BACKGROUND", (0, r), (-1, r), LIGHT_GRAY))
            r_table.setStyle(TableStyle(r_style))
            story.append(r_table)

        if i < len(wave_summaries) - 1:
            story.append(PageBreak())

    # ── Grand Total ──
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", thickness=2, color=YASH_GREEN))
    story.append(Spacer(1, 0.15 * inch))
    grand_data = [
        ["", "GRAND TOTAL", ""],
        ["Total Selling Price", _fmt(overall_sp), ""],
        ["Nego Buffer", _fmt(overall_nego), f"({nbp}%)"],
        ["FINAL PRICE", _fmt(overall_final), ""],
    ]
    grand_table = Table(grand_data, colWidths=[2.5 * inch, 2 * inch, 1 * inch], hAlign="CENTER")
    grand_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 14), ("TEXTCOLOR", (1, 0), (1, 0), YASH_BLUE),
        ("FONTSIZE", (0, 1), (-1, 2), 10),
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"), ("FONTSIZE", (0, 3), (-1, 3), 14),
        ("TEXTCOLOR", (1, 3), (1, 3), YASH_GREEN),
        ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#ECFDF5")),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"), ("ALIGN", (2, 0), (2, -1), "LEFT"),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 2), (-1, 2), 1, YASH_GREEN),
        ("BOX", (0, 0), (-1, -1), 1, YASH_GREEN),
    ]))
    story.append(grand_table)

    # ── Gantt Chart ──
    gantt = project.get("gantt_chart")
    if gantt and gantt.get("data"):
        story.append(PageBreak())
        story.append(Paragraph("Timeline / Gantt Chart", styles["SectionTitle"]))
        try:
            img_data = base64.b64decode(gantt["data"])
            img_buf = io.BytesIO(img_data)
            img = Image(img_buf, width=6.5 * inch, height=4 * inch, kind="proportional")
            story.append(img)
            story.append(Spacer(1, 0.1 * inch))
            story.append(Paragraph(f"<i>{gantt.get('filename', 'gantt-chart')}</i>",
                                   ParagraphStyle("GanttCaption", fontSize=8, textColor=MED_GRAY, alignment=TA_CENTER)))
        except Exception:
            pass

    # ── Footer ──
    story.append(Spacer(1, 0.5 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY))
    story.append(Paragraph(
        f"Generated by YASH EstPro on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        ParagraphStyle("Footer", fontSize=7, textColor=MED_GRAY, alignment=TA_CENTER, spaceBefore=6)
    ))

    doc.build(story)
    return buf.getvalue()


def generate_client_pdf(project: dict, logo_path: str = None) -> bytes:
    """Generate a sanitized PDF for client sharing — no CTC, salary, overhead, profit margin."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=0.6 * inch, bottomMargin=0.6 * inch,
                            leftMargin=0.6 * inch, rightMargin=0.6 * inch)
    styles = _build_styles()
    story = []
    pmp = project.get("profit_margin_percentage", 35)
    nbp = project.get("nego_buffer_percentage", 0)

    # Cover
    story.append(Spacer(1, 1.5 * inch))
    if logo_path and os.path.exists(logo_path):
        story.append(Image(logo_path, width=2.2 * inch, height=0.7 * inch, hAlign="CENTER"))
        story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Project Estimate", styles["CoverTitle"]))
    story.append(HRFlowable(width="60%", thickness=2, color=YASH_CYAN, hAlign="CENTER"))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(f"<b>{project.get('project_number', '')}</b> — v{project.get('version', 1)}", styles["CoverSub"]))
    story.append(Paragraph(project.get("name", "Untitled Project"), styles["CoverTitle"]))
    story.append(Spacer(1, 0.2 * inch))
    cover_data = [
        ["Customer", project.get("customer_name", "—")],
        ["Technology", ", ".join(project.get("technology_names") or []) or "—"],
        ["Date", datetime.now().strftime("%B %d, %Y")],
    ]
    cover_table = Table(cover_data, colWidths=[1.8 * inch, 3.5 * inch], hAlign="CENTER")
    cover_table.setStyle(TableStyle([
        ("TEXTCOLOR", (0, 0), (0, -1), MED_GRAY),
        ("TEXTCOLOR", (1, 0), (1, -1), YASH_BLUE),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER_GRAY),
    ]))
    story.append(cover_table)
    story.append(PageBreak())

    # Compute
    waves = project.get("waves") or []
    wave_summaries = []
    for w in waves:
        s = _calc_wave_summary(w, pmp, nbp)
        s["name"] = w.get("name", "Wave")
        s["duration"] = w.get("duration_months", 0)
        s["resources"] = len(w.get("grid_allocations", []))
        wave_summaries.append(s)

    overall_sp = sum(s["selling_price"] for s in wave_summaries)
    overall_final = sum(s["final_price"] for s in wave_summaries)
    overall_mm = sum(s["total_mm"] for s in wave_summaries)
    overall_onsite = sum(s["onsite_mm"] for s in wave_summaries)
    overall_offshore = sum(s["offshore_mm"] for s in wave_summaries)

    # Summary
    story.append(Paragraph("Estimate Summary", styles["SectionTitle"]))
    kpi_data = [
        ["Total Man-Months", "Onsite MM", "Offshore MM", "Quoted Price"],
        [f"{overall_mm:.1f}", f"{overall_onsite:.1f}", f"{overall_offshore:.1f}", _fmt(overall_final)],
    ]
    kpi_table = Table(kpi_data, colWidths=[1.5 * inch] * 4, hAlign="LEFT")
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
        ("TEXTCOLOR", (0, 0), (-1, 0), MED_GRAY),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 14),
        ("TEXTCOLOR", (3, 1), (3, 1), YASH_GREEN),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_GRAY),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
    ]))
    story.append(kpi_table)

    # Wave details (sanitized: skill, level, type, MM, selling price only)
    for i, ws in enumerate(wave_summaries):
        wave = waves[i]
        story.append(Paragraph(f"Wave: {ws['name']}", styles["SectionTitle"]))
        story.append(Paragraph(f"{ws['duration']} months • {ws['resources']} resources", styles["CoverSub"]))

        w_kpi = [
            ["Total MM", "Onsite MM", "Offshore MM", "Wave Price"],
            [f"{ws['total_mm']:.1f}", f"{ws['onsite_mm']:.1f}", f"{ws['offshore_mm']:.1f}", _fmt(ws['final_price'])],
        ]
        w_table = Table(w_kpi, colWidths=[1.5 * inch] * 4, hAlign="LEFT")
        w_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E0F2FE")),
            ("FONTSIZE", (0, 0), (-1, 0), 7), ("FONTSIZE", (0, 1), (-1, 1), 10),
            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("BOX", (0, 0), (-1, -1), 1, YASH_CYAN),
        ]))
        story.append(w_table)
        story.append(Spacer(1, 0.1 * inch))

        allocs = wave.get("grid_allocations", [])
        if allocs:
            header = ["#", "Role / Skill", "Level", "Type", "Man-Months", "Price"]
            rows = [header]
            for j, a in enumerate(allocs):
                mm = sum((a.get("phase_allocations") or {}).values())
                salary = a.get("avg_monthly_salary", 0)
                overhead = salary * mm * (a.get("overhead_percentage", 0) / 100)
                tc = salary * mm + overhead
                sp = tc / (1 - pmp / 100) if pmp < 100 else tc
                override = a.get("override_hourly_rate", 0) or 0
                eff_sp = (override * 176 * mm) if override > 0 else sp
                rows.append([
                    str(j + 1), a.get("skill_name", "—")[:25],
                    (a.get("proficiency_level") or "—")[:10],
                    "Onsite" if a.get("is_onsite") else "Offshore",
                    f"{mm:.1f}", _fmt(eff_sp),
                ])
            col_w = [0.35 * inch, 2 * inch, 0.8 * inch, 0.7 * inch, 0.8 * inch, 1.0 * inch]
            r_table = Table(rows, colWidths=col_w, repeatRows=1, hAlign="LEFT")
            r_style = [
                ("BACKGROUND", (0, 0), (-1, 0), YASH_BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (3, 0), (-1, -1), "CENTER"),
                ("ALIGN", (-1, 1), (-1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ]
            for r in range(1, len(rows)):
                if r % 2 == 0:
                    r_style.append(("BACKGROUND", (0, r), (-1, r), LIGHT_GRAY))
            r_table.setStyle(TableStyle(r_style))
            story.append(r_table)

    # Grand Total
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", thickness=2, color=YASH_GREEN))
    grand_data = [
        ["", "QUOTED PRICE", ""],
        ["Total Price", _fmt(overall_final), ""],
    ]
    grand_table = Table(grand_data, colWidths=[2 * inch, 2 * inch, 1 * inch], hAlign="CENTER")
    grand_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 14), ("TEXTCOLOR", (1, 0), (1, 0), YASH_BLUE),
        ("FONTSIZE", (0, 1), (-1, 1), 16), ("TEXTCOLOR", (1, 1), (1, 1), YASH_GREEN),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#ECFDF5")),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 1, YASH_GREEN),
    ]))
    story.append(grand_table)

    story.append(Spacer(1, 0.5 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY))
    story.append(Paragraph(
        f"Generated by YASH EstPro on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        ParagraphStyle("Footer", fontSize=7, textColor=MED_GRAY, alignment=TA_CENTER, spaceBefore=6)
    ))

    doc.build(story)
    return buf.getvalue()
