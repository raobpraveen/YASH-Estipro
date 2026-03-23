from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from datetime import datetime, timezone
from database import db
from auth import require_auth
import uuid

router = APIRouter()


# ========== Phase Activity Templates (Master Data) ==========

@router.get("/activity-templates")
async def get_all_templates(user: dict = Depends(require_auth)):
    templates = await db.activity_templates.find({}, {"_id": 0}).to_list(1000)
    return templates


@router.get("/activity-templates/{project_type_id}")
async def get_templates_by_type(project_type_id: str, user: dict = Depends(require_auth)):
    templates = await db.activity_templates.find(
        {"project_type_id": project_type_id}, {"_id": 0}
    ).to_list(100)
    return templates


@router.put("/activity-templates/{project_type_id}/{phase_name}")
async def upsert_template(project_type_id: str, phase_name: str, request: Request, user: dict = Depends(require_auth)):
    body = await request.json()
    activities = body.get("activities", [])
    project_type_name = body.get("project_type_name", "")
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.activity_templates.find_one(
        {"project_type_id": project_type_id, "phase_name": phase_name}, {"_id": 0}
    )

    if existing:
        await db.activity_templates.update_one(
            {"project_type_id": project_type_id, "phase_name": phase_name},
            {"$set": {"activities": activities, "project_type_name": project_type_name, "updated_at": now}}
        )
        return {"message": "Template updated", "id": existing["id"]}
    else:
        doc = {
            "id": str(uuid.uuid4()),
            "project_type_id": project_type_id,
            "project_type_name": project_type_name,
            "phase_name": phase_name,
            "activities": activities,
            "created_at": now,
            "updated_at": now,
        }
        await db.activity_templates.insert_one(doc)
        return {"message": "Template created", "id": doc["id"]}


@router.delete("/activity-templates/{project_type_id}/{phase_name}")
async def delete_template(project_type_id: str, phase_name: str, user: dict = Depends(require_auth)):
    result = await db.activity_templates.delete_one(
        {"project_type_id": project_type_id, "phase_name": phase_name}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


# ========== Project Phase Activities (Per-Project Overrides) ==========

@router.get("/projects/{project_id}/activities")
async def get_project_activities(project_id: str, user: dict = Depends(require_auth)):
    docs = await db.project_activities.find(
        {"project_id": project_id}, {"_id": 0}
    ).to_list(500)
    return docs


@router.get("/projects/{project_id}/activities/{wave_name}/{phase_name}")
async def get_project_phase_activities(project_id: str, wave_name: str, phase_name: str, user: dict = Depends(require_auth)):
    doc = await db.project_activities.find_one(
        {"project_id": project_id, "wave_name": wave_name, "phase_name": phase_name}, {"_id": 0}
    )
    return doc or {"project_id": project_id, "wave_name": wave_name, "phase_name": phase_name, "activities": []}


@router.put("/projects/{project_id}/activities/{wave_name}/{phase_name}")
async def save_project_phase_activities(project_id: str, wave_name: str, phase_name: str, request: Request, user: dict = Depends(require_auth)):
    body = await request.json()
    activities = body.get("activities", [])
    adopted_from = body.get("adopted_from_template_id", "")
    now = datetime.now(timezone.utc).isoformat()

    await db.project_activities.update_one(
        {"project_id": project_id, "wave_name": wave_name, "phase_name": phase_name},
        {"$set": {
            "activities": activities,
            "adopted_from_template_id": adopted_from,
            "updated_at": now,
        }},
        upsert=True,
    )
    return {"message": "Activities saved"}


@router.post("/projects/{project_id}/activities/{wave_name}/{phase_name}/adopt-template")
async def adopt_template(project_id: str, wave_name: str, phase_name: str, request: Request, user: dict = Depends(require_auth)):
    body = await request.json()
    template_type_id = body.get("project_type_id", "")

    template = await db.activity_templates.find_one(
        {"project_type_id": template_type_id, "phase_name": phase_name}, {"_id": 0}
    )
    if not template:
        raise HTTPException(status_code=404, detail="No template found for this project type and phase")

    # Copy template activities with new IDs
    activities = []
    for a in template.get("activities", []):
        activities.append({**a, "id": str(uuid.uuid4())})

    now = datetime.now(timezone.utc).isoformat()
    await db.project_activities.update_one(
        {"project_id": project_id, "wave_name": wave_name, "phase_name": phase_name},
        {"$set": {
            "activities": activities,
            "adopted_from_template_id": template.get("id", ""),
            "updated_at": now,
        }},
        upsert=True,
    )
    return {"message": "Template adopted", "activities": activities}
