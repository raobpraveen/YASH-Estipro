import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', '')
SMTP_FROM_NAME = os.environ.get('SMTP_FROM_NAME', 'YASH EstiPro')

APP_BASE_URL = os.environ.get('APP_BASE_URL', 'http://192.168.3.42')
YASH_LOGO_PATH = os.path.join(os.path.dirname(__file__), "yash_logo.png")
YASH_BRAND_RED = "#E31E24"
YASH_BRAND_BLUE = "#1A73C7"
YASH_BRAND_GOLD = "#C5A646"
YASH_DARK_BG = "#0A0A0A"
YASH_CARD_BG = "#1A1A1A"
YASH_BORDER = "#2A2A2A"
YASH_TEXT_PRIMARY = "#FFFFFF"
YASH_TEXT_SECONDARY = "#A0A0A0"
YASH_TEXT_MUTED = "#6B6B6B"


async def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    """Send email via SMTP with inline YASH logo"""
    if not SMTP_HOST or not SMTP_USER:
        logging.warning("SMTP not configured, skipping email notification")
        return False

    try:
        from email.mime.image import MIMEImage

        msg = MIMEMultipart('related')
        msg['Subject'] = subject
        msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg['To'] = to_email

        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        if text_body:
            msg_alternative.attach(MIMEText(text_body, 'plain'))
        msg_alternative.attach(MIMEText(html_body, 'html'))

        if os.path.exists(YASH_LOGO_PATH):
            with open(YASH_LOGO_PATH, 'rb') as img_file:
                logo = MIMEImage(img_file.read(), _subtype='png')
                logo.add_header('Content-ID', '<yash_logo>')
                logo.add_header('Content-Disposition', 'inline', filename='yash_logo.png')
                msg.attach(logo)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())

        logging.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def _email_wrapper(content_html: str, preheader: str = "") -> str:
    """Wrap email content in YASH dark-themed branded template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>YASH EstiPro</title>
</head>
<body style="margin:0;padding:0;background-color:{YASH_DARK_BG};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<span style="display:none!important;max-height:0;overflow:hidden;mso-hide:all;">{preheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{YASH_DARK_BG};">
<tr><td align="center" style="padding:30px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
  <tr>
    <td style="background-color:{YASH_CARD_BG};padding:24px 32px;border-radius:12px 12px 0 0;border-bottom:2px solid {YASH_BRAND_RED};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="width:60px;">
            <img src="cid:yash_logo" alt="YASH Technologies" width="50" height="50" style="display:block;" />
          </td>
          <td style="padding-left:12px;">
            <span style="color:{YASH_TEXT_PRIMARY};font-size:22px;font-weight:700;letter-spacing:0.5px;">YASH EstiPro</span><br/>
            <span style="color:{YASH_TEXT_MUTED};font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Project Estimation Platform</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background-color:{YASH_CARD_BG};padding:36px 32px;">
      {content_html}
    </td>
  </tr>
  <tr>
    <td style="background-color:#111111;padding:24px 32px;border-radius:0 0 12px 12px;border-top:1px solid {YASH_BORDER};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="color:{YASH_TEXT_MUTED};font-size:11px;line-height:1.6;">
            <p style="margin:0 0 4px 0;"><strong style="color:{YASH_TEXT_SECONDARY};">YASH Technologies</strong></p>
            <p style="margin:0 0 4px 0;color:{YASH_BRAND_GOLD};font-style:italic;">More than what you think.</p>
            <p style="margin:12px 0 0 0;color:{YASH_TEXT_MUTED};">This is an automated notification from YASH EstiPro. Please do not reply to this email.</p>
          </td>
          <td align="right" valign="top">
            <a href="https://www.yash.com" style="color:{YASH_BRAND_BLUE};font-size:11px;text-decoration:none;">www.yash.com</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>"""


def get_review_request_email(project_number: str, project_name: str, submitter_name: str, submitter_email: str, project_id: str = "", project_data: dict = None):
    subject = f"[YASH EstiPro] Review Request: {project_number} - {project_name}"
    project_url = f"{APP_BASE_URL}/estimator?edit={project_id}" if project_id else APP_BASE_URL

    details_html = ""
    if project_data:
        desc = project_data.get("description", "\u2014") or "\u2014"
        proj_type = project_data.get("project_type_names", [])
        proj_type_str = ", ".join(proj_type) if isinstance(proj_type, list) and proj_type else "\u2014"
        locations = project_data.get("project_locations", [])
        locations_str = ", ".join(locations) if isinstance(locations, list) and locations else "\u2014"
        tech = project_data.get("technology_names", [])
        tech_str = ", ".join(tech) if isinstance(tech, list) and tech else "\u2014"
        sales_mgr = project_data.get("sales_manager_name", "\u2014") or "\u2014"
        customer = project_data.get("customer_name", "\u2014") or "\u2014"
        pm_pct = project_data.get("profit_margin_percentage", 35)
        waves_list = project_data.get("waves", [])
        total_cost = 0
        total_sp = 0
        total_mm = 0
        total_resources = 0
        for w in waves_list:
            allocs = w.get("grid_allocations", [])
            total_resources += len(allocs)
            for a in allocs:
                salary = a.get("avg_monthly_salary", 0) or 0
                oh_pct = a.get("overhead_percentage", 0) or 0
                mm = sum((a.get("phase_allocations") or {}).values()) if isinstance(a.get("phase_allocations"), dict) else sum(a.get("phase_allocations", []))
                total_mm += mm
                base = salary * mm
                oh = base * (oh_pct / 100)
                tc = base + oh
                sp = tc / (1 - pm_pct / 100) if pm_pct < 100 else tc
                total_cost += tc
                total_sp += sp

        details_html = f"""
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#222222;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:16px 24px;">
          <p style="margin:0 0 12px 0;color:{YASH_BRAND_GOLD};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Project Snapshot</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;width:140px;">Customer</td><td style="padding:4px 0;color:{YASH_TEXT_PRIMARY};font-size:13px;">{customer}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Description</td><td style="padding:4px 0;color:{YASH_TEXT_SECONDARY};font-size:13px;">{desc[:200]}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Type</td><td style="padding:4px 0;color:{YASH_TEXT_PRIMARY};font-size:13px;">{proj_type_str}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Locations</td><td style="padding:4px 0;color:{YASH_TEXT_PRIMARY};font-size:13px;">{locations_str}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Technology</td><td style="padding:4px 0;color:{YASH_TEXT_PRIMARY};font-size:13px;">{tech_str}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Sales Manager</td><td style="padding:4px 0;color:{YASH_TEXT_PRIMARY};font-size:13px;">{sales_mgr}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #333;margin:12px 0;" />
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;width:140px;">Total Resources</td><td style="padding:4px 0;color:{YASH_BRAND_BLUE};font-size:14px;font-weight:600;">{total_resources}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Total Man-Months</td><td style="padding:4px 0;color:{YASH_BRAND_BLUE};font-size:14px;font-weight:600;">{total_mm:.1f}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Total Cost (CTC)</td><td style="padding:4px 0;color:{YASH_TEXT_PRIMARY};font-size:14px;font-weight:600;">${total_cost:,.0f}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Selling Price</td><td style="padding:4px 0;color:#10B981;font-size:14px;font-weight:600;">${total_sp:,.0f}</td></tr>
            <tr><td style="padding:4px 0;color:{YASH_TEXT_MUTED};font-size:12px;">Profit Margin</td><td style="padding:4px 0;color:{YASH_BRAND_GOLD};font-size:14px;font-weight:600;">{pm_pct}%</td></tr>
          </table>
        </td></tr>
      </table>
"""

    content = f"""
      <h2 style="margin:0 0 8px 0;color:{YASH_BRAND_RED};font-size:20px;font-weight:700;">Review Request</h2>
      <p style="margin:0 0 24px 0;color:{YASH_TEXT_SECONDARY};font-size:14px;">A project estimation has been submitted for your approval.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#222222;border-radius:8px;border-left:4px solid {YASH_BRAND_BLUE};margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:110px;">Project No.</td><td style="padding:6px 0;color:{YASH_BRAND_BLUE};font-size:15px;font-weight:600;">{project_number}</td></tr>
            <tr><td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Project Name</td><td style="padding:6px 0;color:{YASH_TEXT_PRIMARY};font-size:15px;">{project_name}</td></tr>
            <tr><td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Submitted By</td><td style="padding:6px 0;color:{YASH_TEXT_PRIMARY};font-size:15px;">{submitter_name} <span style="color:{YASH_TEXT_MUTED};">({submitter_email})</span></td></tr>
          </table>
        </td></tr>
      </table>
      {details_html}
      <p style="margin:0 0 24px 0;color:{YASH_TEXT_SECONDARY};font-size:14px;line-height:1.7;">Please review the estimation details and provide your approval or feedback.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
        <tr><td style="background:{YASH_BRAND_RED};border-radius:6px;"><a href="{project_url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">Review Project</a></td></tr>
      </table>
      <p style="margin:0;color:{YASH_TEXT_MUTED};font-size:12px;line-height:1.6;">Or copy and paste this link in your browser:<br/><a href="{project_url}" style="color:{YASH_BRAND_BLUE};text-decoration:underline;word-break:break-all;">{project_url}</a></p>
    """
    html_body = _email_wrapper(content, f"Review requested for {project_number} - {project_name}")
    text_body = f"Review Request\n\nProject: {project_number}\nName: {project_name}\nSubmitted by: {submitter_name} ({submitter_email})\n\nPlease review the estimation at: {project_url}"
    return subject, html_body, text_body


def get_approval_email(project_number: str, project_name: str, status: str, approver_name: str, comments: str = "", project_id: str = ""):
    is_approved = status == "approved"
    status_text = "Approved" if is_approved else "Rejected"
    status_color = "#10B981" if is_approved else "#EF4444"
    status_bg = "#1A3A2A" if is_approved else "#3A1A1A"
    status_icon = "&#10003;" if is_approved else "&#10007;"
    project_url = f"{APP_BASE_URL}/estimator?edit={project_id}" if project_id else APP_BASE_URL
    subject = f"[YASH EstiPro] Project {status_text}: {project_number} - {project_name}"

    comments_html = ""
    if comments:
        comments_html = f"""
      <div style="background:#222222;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px 0;color:{YASH_TEXT_MUTED};font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Reviewer Comments</p>
        <p style="margin:0;color:{YASH_TEXT_SECONDARY};font-size:14px;line-height:1.6;font-style:italic;">"{comments}"</p>
      </div>"""

    content = f"""
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:50%;background:{status_bg};text-align:center;font-size:28px;color:{status_color};">{status_icon}</div>
      </div>
      <h2 style="margin:0 0 8px 0;color:{status_color};font-size:20px;font-weight:700;text-align:center;">Project {status_text}</h2>
      <p style="margin:0 0 28px 0;color:{YASH_TEXT_SECONDARY};font-size:14px;text-align:center;">Your estimation has been <strong style="color:{status_color};">{status_text.lower()}</strong> by the reviewer.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#222222;border-radius:8px;border-left:4px solid {status_color};margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:110px;">Project No.</td><td style="padding:6px 0;color:{YASH_BRAND_BLUE};font-size:15px;font-weight:600;">{project_number}</td></tr>
            <tr><td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Project Name</td><td style="padding:6px 0;color:{YASH_TEXT_PRIMARY};font-size:15px;">{project_name}</td></tr>
            <tr><td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Reviewed By</td><td style="padding:6px 0;color:{YASH_TEXT_PRIMARY};font-size:15px;">{approver_name}</td></tr>
          </table>
        </td></tr>
      </table>
      {comments_html}
      <p style="margin:0 0 24px 0;color:{YASH_TEXT_SECONDARY};font-size:14px;line-height:1.7;">{"You can now proceed with the project execution." if is_approved else "Please review the feedback and make necessary changes before resubmitting."}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
        <tr><td style="background:{YASH_BRAND_RED};border-radius:6px;"><a href="{project_url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">View Project</a></td></tr>
      </table>
      <p style="margin:0;color:{YASH_TEXT_MUTED};font-size:12px;line-height:1.6;">Or copy and paste this link in your browser:<br/><a href="{project_url}" style="color:{YASH_BRAND_BLUE};text-decoration:underline;word-break:break-all;">{project_url}</a></p>
    """
    html_body = _email_wrapper(content, f"Project {project_number} has been {status_text.lower()}")
    text_body = f"Project {status_text}\n\nProject: {project_number}\nName: {project_name}\nReviewed by: {approver_name}\n{f'Comments: {comments}' if comments else ''}\n\nView project at: {project_url}"
    return subject, html_body, text_body
