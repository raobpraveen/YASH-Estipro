from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from datetime import datetime, timezone, timedelta
import uuid
from database import db
from auth import require_auth
from pdf_service import generate_client_pdf

router = APIRouter()

LOGO_PATH = "/app/frontend/public/yash-logo-new.png"


@router.post("/projects/{project_id}/share")
async def create_share_link(project_id: str, expiry_days: int = 14, user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    token = str(uuid.uuid4()).replace("-", "")[:24]
    expires_at = datetime.now(timezone.utc) + timedelta(days=expiry_days)

    share_doc = {
        "id": str(uuid.uuid4()),
        "token": token,
        "project_id": project_id,
        "project_number": project.get("project_number", ""),
        "project_name": project.get("name", ""),
        "project_version": project.get("version", 1),
        "expires_at": expires_at.isoformat(),
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
    }
    await db.shared_links.insert_one(share_doc)
    share_doc.pop("_id", None)

    return {
        "token": token,
        "expires_at": expires_at.isoformat(),
        "expiry_days": expiry_days,
    }


@router.get("/projects/{project_id}/shares")
async def list_share_links(project_id: str, user: dict = Depends(require_auth)):
    links = await db.shared_links.find(
        {"project_id": project_id, "is_active": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return links


@router.delete("/shared/{token}")
async def revoke_share_link(token: str, user: dict = Depends(require_auth)):
    result = await db.shared_links.update_one(
        {"token": token}, {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Share link not found")
    return {"message": "Share link revoked"}


@router.get("/shared/{token}")
async def get_shared_project(token: str):
    """Public endpoint — no auth required. Returns sanitized project data."""
    link = await db.shared_links.find_one({"token": token, "is_active": True}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    expires_at = datetime.fromisoformat(link["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=410, detail="Share link has expired")

    project = await db.projects.find_one({"id": link["project_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pmp = project.get("profit_margin_percentage", 35)
    nbp = project.get("nego_buffer_percentage", 0)

    sanitized_waves = []
    for wave in project.get("waves", []):
        resources = []
        for alloc in wave.get("grid_allocations", []):
            mm = sum((alloc.get("phase_allocations") or {}).values())
            salary = alloc.get("avg_monthly_salary", 0)
            overhead = salary * mm * (alloc.get("overhead_percentage", 0) / 100)
            tc = salary * mm + overhead
            sp = tc / (1 - pmp / 100) if pmp < 100 else tc
            override = alloc.get("override_hourly_rate", 0) or 0
            eff_sp = (override * 176 * mm) if override > 0 else sp
            resources.append({
                "skill_name": alloc.get("skill_name", "—"),
                "proficiency_level": alloc.get("proficiency_level", "—"),
                "is_onsite": alloc.get("is_onsite", False),
                "man_months": round(mm, 1),
                "selling_price": round(eff_sp, 0),
            })

        total_mm = sum(r["man_months"] for r in resources)
        onsite_mm = sum(r["man_months"] for r in resources if r["is_onsite"])
        offshore_mm = total_mm - onsite_mm
        total_sp = sum(r["selling_price"] for r in resources)

        from pdf_service import _calc_wave_logistics
        logistics = _calc_wave_logistics(wave)
        wave_sp = total_sp + logistics
        nego = wave_sp * (nbp / 100)

        sanitized_waves.append({
            "name": wave.get("name", "Wave"),
            "duration_months": wave.get("duration_months", 0),
            "total_mm": round(total_mm, 1),
            "onsite_mm": round(onsite_mm, 1),
            "offshore_mm": round(offshore_mm, 1),
            "selling_price": round(wave_sp, 0),
            "nego_buffer": round(nego, 0),
            "final_price": round(wave_sp + nego, 0),
            "resources": resources,
        })

    overall_mm = sum(w["total_mm"] for w in sanitized_waves)
    overall_onsite = sum(w["onsite_mm"] for w in sanitized_waves)
    overall_offshore = sum(w["offshore_mm"] for w in sanitized_waves)
    overall_sp = sum(w["selling_price"] for w in sanitized_waves)
    overall_final = sum(w["final_price"] for w in sanitized_waves)

    return {
        "project_number": project.get("project_number", ""),
        "name": project.get("name", ""),
        "version": project.get("version", 1),
        "customer_name": project.get("customer_name", "—"),
        "technology_names": project.get("technology_names", []),
        "project_type_names": project.get("project_type_names", []),
        "description": project.get("description", ""),
        "location_names": project.get("project_location_names", []),
        "waves": sanitized_waves,
        "overall": {
            "total_mm": round(overall_mm, 1),
            "onsite_mm": round(overall_onsite, 1),
            "offshore_mm": round(overall_offshore, 1),
            "selling_price": round(overall_sp, 0),
            "final_price": round(overall_final, 0),
        },
        "expires_at": link["expires_at"],
    }


@router.get("/shared/{token}/pdf")
async def download_shared_pdf(token: str):
    """Public endpoint — download sanitized PDF."""
    link = await db.shared_links.find_one({"token": token, "is_active": True}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    expires_at = datetime.fromisoformat(link["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=410, detail="Share link has expired")

    project = await db.projects.find_one({"id": link["project_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pdf_bytes = generate_client_pdf(project, logo_path=LOGO_PATH)
    filename = f"{project.get('project_number', 'estimate')}_v{project.get('version', 1)}_client.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
