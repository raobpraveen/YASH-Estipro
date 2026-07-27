from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
import os
import logging

from database import db, client
from auth import hash_password, require_auth, require_admin

# Import all routers
from routers.auth_routes import router as auth_router
from routers.users import router as users_router
from routers.masters import router as masters_router
from routers.projects import router as projects_router
from routers.financials import router as financials_router
from routers.dashboard import router as dashboard_router
from routers.notifications import router as notifications_router
from routers.files import router as files_router
from routers.activities import router as activities_router

app = FastAPI(title="YASH EstPro API")

# Main API router with /api prefix
api_router = APIRouter(prefix="/api")

# Include all sub-routers
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(masters_router)
api_router.include_router(projects_router)
api_router.include_router(financials_router)
api_router.include_router(dashboard_router)
api_router.include_router(notifications_router)
api_router.include_router(files_router)
api_router.include_router(activities_router)

app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.on_event("startup")
async def create_default_admin():
    existing = await db.users.find_one({"email": "admin@yash.com"})
    if not existing:
        from models import User
        admin = User(
            email="admin@yash.com",
            password_hash=hash_password("password"),
            name="Admin User",
            role="admin"
        )
        await db.users.insert_one(admin.model_dump())
        logger.info("Default admin user created: admin@yash.com")


@app.on_event("startup")
async def start_escalation_loop():
    # Iter 85: launch approval-escalation background loop as a fire-and-forget task.
    import asyncio
    from approval_escalation import escalation_loop
    asyncio.create_task(escalation_loop())
    logger.info("Approval escalation loop started")


@app.post("/api/admin/run-escalation-scan")
async def trigger_escalation_scan():
    """Manual trigger — useful for testing the escalation logic without waiting for the loop."""
    from approval_escalation import _run_once
    result = await _run_once()
    return {"ok": True, **result}


@app.get("/api/admin/approver-load")
async def approver_load(user: dict = Depends(require_admin)):
    """Iter 86: Per-approver load — count of `in_review` projects awaiting each approver
    at the CURRENT level and the single longest-waiting project per approver."""
    from datetime import datetime, timezone
    from approval_escalation import _parse_ts
    # 1. Seed the map with all approver/admin users so people with zero load still appear
    per_user = {}
    async for u in db.users.find({"role": {"$in": ["approver", "admin"]}}):
        em = (u.get("email") or "").lower()
        if em:
            per_user[em] = {"email": u.get("email"), "name": u.get("name") or u.get("email"),
                            "role": u.get("role"), "count": 0, "longest": None}
    # 2. Walk in_review projects and tally the CURRENT-level approvers
    now = datetime.now(timezone.utc)
    async for p in db.projects.find({"status": "in_review"}):
        matrix = p.get("matrix_levels") or []
        current = p.get("current_approval_level") or 1
        entry = next((lvl for lvl in matrix if lvl.get("level") == current), None)
        if not entry:
            continue
        # Determine when this level became active
        history = p.get("approval_history") or []
        wait_ts = None
        if history:
            for h in history:
                d = _parse_ts(h.get("approved_at"))
                if d and (wait_ts is None or d > wait_ts):
                    wait_ts = d
        if wait_ts is None:
            wait_ts = _parse_ts(p.get("submitted_at"))
        waited_days = int((now - wait_ts).total_seconds() // 86400) if wait_ts else 0
        for em in (entry.get("emails") or []):
            k = (em or "").lower()
            if k not in per_user:
                per_user[k] = {"email": em, "name": em, "role": "approver", "count": 0, "longest": None}
            per_user[k]["count"] += 1
            longest = per_user[k]["longest"]
            if longest is None or waited_days > longest["waited_days"]:
                per_user[k]["longest"] = {
                    "project_id": p.get("id"),
                    "project_number": p.get("project_number"),
                    "project_name": p.get("name"),
                    "level": current,
                    "waited_days": waited_days,
                    "waiting_since": wait_ts.isoformat() if wait_ts else None,
                }
    result = sorted(per_user.values(), key=lambda x: (-x["count"], x["name"]))
    return {"total_active": sum(u["count"] for u in result), "approvers": result}


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
