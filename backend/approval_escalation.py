"""
Iter 85: Approval Escalation Timer.

A lightweight asyncio background loop that periodically scans projects sitting
in `status == "in_review"` and sends a reminder email + in-app notification to
the current level's approvers when they've been awaiting action for more than
`APPROVAL_ESCALATION_DAYS` days (default 2).

Design goals:
  * Zero external deps — pure asyncio (no APScheduler / Celery).
  * Idempotent — never remind the same level twice within the reminder window.
  * Cheap — one indexed query every `APPROVAL_ESCALATION_INTERVAL_HOURS`.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from database import db
from models import Notification
from email_service import send_email

logger = logging.getLogger(__name__)

ESCALATION_DAYS = int(os.environ.get("APPROVAL_ESCALATION_DAYS", "2"))
ESCALATION_INTERVAL_HOURS = int(os.environ.get("APPROVAL_ESCALATION_INTERVAL_HOURS", "6"))
# Do not fire the same reminder for the same (project, level) more often than this
REMINDER_COOLDOWN_HOURS = int(os.environ.get("APPROVAL_ESCALATION_COOLDOWN_HOURS", "24"))


def _parse_ts(v):
    if isinstance(v, datetime):
        return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v
    if isinstance(v, str):
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


async def _run_once():
    """Scan and dispatch reminders for stalled approvals — one pass."""
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(days=ESCALATION_DAYS)
    cooldown = now - timedelta(hours=REMINDER_COOLDOWN_HOURS)

    cursor = db.projects.find({"status": "in_review"})
    scanned = 0
    fired = 0
    async for p in cursor:
        scanned += 1
        matrix_levels = p.get("matrix_levels") or []
        current_level = p.get("current_approval_level") or 1
        current_entry = next((lvl for lvl in matrix_levels if lvl.get("level") == current_level), None)
        if not current_entry:
            continue
        emails = [(e or "").strip() for e in (current_entry.get("emails") or []) if e]
        if not emails:
            continue

        # Determine the "waiting since" reference: the timestamp of the most recent approval
        # history entry (i.e. when this level became active), or `submitted_at` if no history.
        history = p.get("approval_history") or []
        last_action = None
        if history:
            for h in history:
                d = _parse_ts(h.get("approved_at"))
                if d and (last_action is None or d > last_action):
                    last_action = d
        if last_action is None:
            last_action = _parse_ts(p.get("submitted_at"))
        if last_action is None:
            last_action = _parse_ts(p.get("updated_at"))
        if last_action is None or last_action > threshold:
            # Still fresh — not stalled yet.
            continue

        # Cooldown: check the last reminder timestamp for this (project, level)
        reminders = p.get("escalation_reminders") or {}
        key = f"level_{current_level}"
        last_reminder = _parse_ts(reminders.get(key))
        if last_reminder and last_reminder > cooldown:
            continue

        # Fire!
        pn = p.get("project_number", "")
        pname = p.get("name", "")
        pid = p.get("id")
        waited_days = (now - last_action).days
        subject = f"[YASH EstPro] Reminder: Approval pending {waited_days}+ days — {pn}"
        text = (
            f"Hello,\n\nProject {pn} '{pname}' has been awaiting your Level {current_level} "
            f"approval for {waited_days} day(s).\n\nPlease review and either Approve or Reject "
            "the estimation at your earliest convenience.\n\nRegards,\nYASH EstPro"
        )
        html = (f"<p>Hello,</p><p>Project <strong>{pn}</strong> '{pname}' has been awaiting your "
                f"<strong>Level {current_level}</strong> approval for <strong>{waited_days} day(s)</strong>."
                "</p><p>Please review and either Approve or Reject the estimation at your earliest convenience.</p>"
                "<p>Regards,<br/>YASH EstPro</p>")
        for recipient in set(emails):
            try:
                await send_email(recipient, subject, html, text)
            except Exception as e:
                logger.warning("Escalation email failed for %s: %s", recipient, e)
            try:
                notif = Notification(
                    user_email=recipient, type="review_request",
                    title=f"Reminder: Approval pending {waited_days}+ days",
                    message=f"Project {pn} '{pname}' has been waiting for your Level {current_level} approval.",
                    project_id=pid, project_number=pn,
                )
                doc_n = notif.model_dump()
                doc_n["created_at"] = doc_n["created_at"].isoformat()
                await db.notifications.insert_one(doc_n)
            except Exception as e:
                logger.warning("Escalation notification insert failed: %s", e)

        # Stamp the reminder time so we honour the cooldown
        reminders[key] = now.isoformat()
        await db.projects.update_one({"id": pid}, {"$set": {"escalation_reminders": reminders}})
        fired += 1

    logger.info("Approval escalation scan: scanned=%d, fired=%d, threshold_days=%d",
                scanned, fired, ESCALATION_DAYS)
    return {"scanned": scanned, "fired": fired}


async def escalation_loop():
    """Run forever — sleep, scan, repeat."""
    # Small initial delay so we don't slam the DB right at startup
    await asyncio.sleep(60)
    interval_seconds = ESCALATION_INTERVAL_HOURS * 3600
    while True:
        try:
            await _run_once()
        except Exception as e:
            logger.exception("Escalation loop iteration crashed: %s", e)
        await asyncio.sleep(interval_seconds)
