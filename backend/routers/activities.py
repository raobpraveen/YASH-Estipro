from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from datetime import datetime, timezone
from database import db
from auth import require_auth
import uuid

router = APIRouter()


# ========== Phase Activity Templates (Master Data) ==========
# Key: (technology_id, sub_technology_id, project_type_id, phase_name)

@router.get("/activity-templates")
async def get_all_templates(user: dict = Depends(require_auth)):
    templates = await db.activity_templates.find({}, {"_id": 0}).to_list(1000)
    return templates


@router.get("/activity-templates/by-combo")
async def get_templates_by_combo(
    technology_id: str = "", sub_technology_id: str = "", project_type_id: str = "",
    user: dict = Depends(require_auth)
):
    query = {}
    if technology_id:
        query["technology_id"] = technology_id
    if sub_technology_id:
        query["sub_technology_id"] = sub_technology_id
    if project_type_id:
        query["project_type_id"] = project_type_id
    templates = await db.activity_templates.find(query, {"_id": 0}).to_list(500)
    return templates


@router.put("/activity-templates")
async def upsert_template(request: Request, user: dict = Depends(require_auth)):
    body = await request.json()
    technology_id = body.get("technology_id", "")
    sub_technology_id = body.get("sub_technology_id", "")
    project_type_id = body.get("project_type_id", "")
    phase_name = body.get("phase_name", "")
    activities = body.get("activities", [])

    if not technology_id or not project_type_id or not phase_name:
        raise HTTPException(status_code=400, detail="technology_id, project_type_id, and phase_name are required")

    now = datetime.now(timezone.utc).isoformat()
    match_key = {
        "technology_id": technology_id,
        "sub_technology_id": sub_technology_id,
        "project_type_id": project_type_id,
        "phase_name": phase_name,
    }

    existing = await db.activity_templates.find_one(match_key, {"_id": 0})
    if existing:
        await db.activity_templates.update_one(
            match_key,
            {"$set": {
                "activities": activities,
                "technology_name": body.get("technology_name", ""),
                "sub_technology_name": body.get("sub_technology_name", ""),
                "project_type_name": body.get("project_type_name", ""),
                "updated_at": now,
            }}
        )
        return {"message": "Template updated", "id": existing["id"]}
    else:
        doc = {
            "id": str(uuid.uuid4()),
            **match_key,
            "technology_name": body.get("technology_name", ""),
            "sub_technology_name": body.get("sub_technology_name", ""),
            "project_type_name": body.get("project_type_name", ""),
            "activities": activities,
            "created_at": now,
            "updated_at": now,
        }
        await db.activity_templates.insert_one(doc)
        return {"message": "Template created", "id": doc["id"]}


@router.delete("/activity-templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(require_auth)):
    result = await db.activity_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


# ========== Seed SAP S/4HANA Private Cloud Implementation Template ==========

@router.post("/activity-templates/seed-sap")
async def seed_sap_template(user: dict = Depends(require_auth)):
    tech_id = "7517ff3c-5bb3-47d7-895e-15da5d9da5e1"
    sub_tech_id = "8345e748-d51a-4b68-b8b5-0a5417975d1d"
    proj_type_id = "e2c5a7ae-d6b3-4fb1-b312-22d41a1af717"
    now = datetime.now(timezone.utc).isoformat()

    phases = {
        "Discover": {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "Digital Discovery Assessment (DDA)", "description": "Scope and benchmark assessment for S/4HANA transformation", "is_deliverable": False, "owner": "", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "Understand Clean Core Principles", "description": "Review SAP Clean Core guidelines and extensibility model", "is_deliverable": False, "owner": "", "sort_order": 1},
                {"id": str(uuid.uuid4()), "name": "Identify Value Drivers", "description": "Map business value drivers to SAP S/4HANA capabilities", "is_deliverable": False, "owner": "", "sort_order": 2},
                {"id": str(uuid.uuid4()), "name": "Partner Selection", "description": "Evaluate and select implementation partner", "is_deliverable": False, "owner": "", "sort_order": 3},
                {"id": str(uuid.uuid4()), "name": "Clean Core Q-Gate 0", "description": "Initial quality gate for Clean Core readiness", "is_deliverable": False, "owner": "", "sort_order": 4},
                {"id": str(uuid.uuid4()), "name": "Business Case", "description": "Document business case for S/4HANA transformation", "is_deliverable": True, "owner": "", "sort_order": 5},
                {"id": str(uuid.uuid4()), "name": "High-Level Roadmap", "description": "Strategic roadmap for S/4HANA journey", "is_deliverable": True, "owner": "", "sort_order": 6},
                {"id": str(uuid.uuid4()), "name": "Discovery Assessment Report", "description": "DDA findings and recommendations", "is_deliverable": True, "owner": "", "sort_order": 7},
            ]
        },
        "Prepare": {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "Establish Project Governance", "description": "Define project governance structure, steering committee, and RACI", "is_deliverable": False, "owner": "", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "Project Kickoff", "description": "Conduct kickoff meeting with all stakeholders", "is_deliverable": False, "owner": "", "sort_order": 1},
                {"id": str(uuid.uuid4()), "name": "Define Scope & Objectives", "description": "Finalize project scope, objectives, and success criteria", "is_deliverable": False, "owner": "", "sort_order": 2},
                {"id": str(uuid.uuid4()), "name": "System Landscape Setup", "description": "Provision Development, QA, and Production environments (3-system landscape)", "is_deliverable": False, "owner": "", "sort_order": 3},
                {"id": str(uuid.uuid4()), "name": "Provision SAP Cloud ALM", "description": "Set up SAP Cloud ALM for project management and monitoring", "is_deliverable": False, "owner": "", "sort_order": 4},
                {"id": str(uuid.uuid4()), "name": "Team Onboarding & Training", "description": "Onboard project team, conduct enablement sessions", "is_deliverable": False, "owner": "", "sort_order": 5},
                {"id": str(uuid.uuid4()), "name": "OCM Strategy", "description": "Establish Organizational Change Management strategy", "is_deliverable": False, "owner": "", "sort_order": 6},
                {"id": str(uuid.uuid4()), "name": "Project Charter", "description": "Signed project charter with scope, objectives, timeline", "is_deliverable": True, "owner": "", "sort_order": 7},
                {"id": str(uuid.uuid4()), "name": "Project Plan", "description": "Detailed project plan with phases, milestones, and resource plan", "is_deliverable": True, "owner": "", "sort_order": 8},
                {"id": str(uuid.uuid4()), "name": "Team Roles & Responsibilities", "description": "RACI matrix and team structure document", "is_deliverable": True, "owner": "", "sort_order": 9},
            ]
        },
        "Explore": {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "Fit-to-Standard Workshops", "description": "Conduct workshops to review SAP Best Practices against business requirements", "is_deliverable": False, "owner": "", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "Fit-Gap Analysis", "description": "Identify gaps between standard SAP processes and business requirements", "is_deliverable": False, "owner": "", "sort_order": 1},
                {"id": str(uuid.uuid4()), "name": "Process Design", "description": "Design To-Be business processes aligned with SAP Best Practices", "is_deliverable": False, "owner": "", "sort_order": 2},
                {"id": str(uuid.uuid4()), "name": "Identify Extensions (RICEFW)", "description": "Catalog required Reports, Interfaces, Conversions, Enhancements, Forms, Workflows", "is_deliverable": False, "owner": "", "sort_order": 3},
                {"id": str(uuid.uuid4()), "name": "Data Migration Strategy", "description": "Define data migration approach, mapping, and validation rules", "is_deliverable": False, "owner": "", "sort_order": 4},
                {"id": str(uuid.uuid4()), "name": "Prepare Test Scripts", "description": "Develop test cases and scripts based on process designs", "is_deliverable": False, "owner": "", "sort_order": 5},
                {"id": str(uuid.uuid4()), "name": "Fit-Gap Analysis Document", "description": "Comprehensive fit-gap with decisions and backlog items", "is_deliverable": True, "owner": "", "sort_order": 6},
                {"id": str(uuid.uuid4()), "name": "Process Flow Diagrams", "description": "To-Be process flow diagrams for all in-scope processes", "is_deliverable": True, "owner": "", "sort_order": 7},
                {"id": str(uuid.uuid4()), "name": "RICEFW Register", "description": "Complete register of all extensions with specifications", "is_deliverable": True, "owner": "", "sort_order": 8},
                {"id": str(uuid.uuid4()), "name": "Test Scripts", "description": "Unit test and integration test scripts", "is_deliverable": True, "owner": "", "sort_order": 9},
            ]
        },
        "Realize": {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "System Configuration", "description": "Configure SAP S/4HANA based on Explore phase designs using guided configuration", "is_deliverable": False, "owner": "", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "Extension Development", "description": "Develop RICEFW objects (reports, interfaces, conversions, enhancements, forms, workflows)", "is_deliverable": False, "owner": "", "sort_order": 1},
                {"id": str(uuid.uuid4()), "name": "Data Migration Development", "description": "Build data migration programs using SAP LTMC/migration cockpit", "is_deliverable": False, "owner": "", "sort_order": 2},
                {"id": str(uuid.uuid4()), "name": "Integration Development", "description": "Build and configure integrations with third-party and legacy systems", "is_deliverable": False, "owner": "", "sort_order": 3},
                {"id": str(uuid.uuid4()), "name": "Sprint Cycles (Agile)", "description": "Iterative development sprints with demos and retrospectives", "is_deliverable": False, "owner": "", "sort_order": 4},
                {"id": str(uuid.uuid4()), "name": "Unit & Integration Testing", "description": "Execute unit tests and integration tests per sprint", "is_deliverable": False, "owner": "", "sort_order": 5},
                {"id": str(uuid.uuid4()), "name": "Security & Authorization", "description": "Configure roles, authorizations, and security policies", "is_deliverable": False, "owner": "", "sort_order": 6},
                {"id": str(uuid.uuid4()), "name": "Training Material Development", "description": "Develop end-user and power-user training materials", "is_deliverable": False, "owner": "", "sort_order": 7},
                {"id": str(uuid.uuid4()), "name": "Configured System", "description": "Fully configured SAP S/4HANA system", "is_deliverable": True, "owner": "", "sort_order": 8},
                {"id": str(uuid.uuid4()), "name": "Test Results", "description": "Unit test and integration test execution results", "is_deliverable": True, "owner": "", "sort_order": 9},
                {"id": str(uuid.uuid4()), "name": "Data Migration Results", "description": "Trial migration results with data quality report", "is_deliverable": True, "owner": "", "sort_order": 10},
                {"id": str(uuid.uuid4()), "name": "Training Materials", "description": "End-user training guides and materials", "is_deliverable": True, "owner": "", "sort_order": 11},
            ]
        },
        "Deploy": {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "User Acceptance Testing (UAT)", "description": "Execute UAT with business users using pre-delivered test scripts", "is_deliverable": False, "owner": "", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "Final Data Migration", "description": "Execute production data migration with validation", "is_deliverable": False, "owner": "", "sort_order": 1},
                {"id": str(uuid.uuid4()), "name": "End-User Training", "description": "Conduct train-the-trainer and end-user training sessions", "is_deliverable": False, "owner": "", "sort_order": 2},
                {"id": str(uuid.uuid4()), "name": "Cutover Planning & Execution", "description": "Plan and execute cutover activities for go-live", "is_deliverable": False, "owner": "", "sort_order": 3},
                {"id": str(uuid.uuid4()), "name": "Go-Live Readiness Check", "description": "Execute go-live readiness checks and obtain sign-off", "is_deliverable": False, "owner": "", "sort_order": 4},
                {"id": str(uuid.uuid4()), "name": "Go-Live", "description": "Production system go-live and monitoring", "is_deliverable": False, "owner": "", "sort_order": 5},
                {"id": str(uuid.uuid4()), "name": "Hypercare Support", "description": "Intensive post-go-live support period", "is_deliverable": False, "owner": "", "sort_order": 6},
                {"id": str(uuid.uuid4()), "name": "UAT Sign-off", "description": "Signed UAT completion and acceptance document", "is_deliverable": True, "owner": "", "sort_order": 7},
                {"id": str(uuid.uuid4()), "name": "Cutover Plan", "description": "Detailed cutover plan with checklist", "is_deliverable": True, "owner": "", "sort_order": 8},
                {"id": str(uuid.uuid4()), "name": "Go-Live Checklist", "description": "Completed go-live readiness checklist", "is_deliverable": True, "owner": "", "sort_order": 9},
                {"id": str(uuid.uuid4()), "name": "Training Completion Report", "description": "Training attendance and completion records", "is_deliverable": True, "owner": "", "sort_order": 10},
            ]
        },
        "Run": {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "Post-Go-Live Support", "description": "Ongoing support and incident resolution", "is_deliverable": False, "owner": "", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "System Monitoring", "description": "Monitor system performance via SAP Cloud ALM", "is_deliverable": False, "owner": "", "sort_order": 1},
                {"id": str(uuid.uuid4()), "name": "Incident Management", "description": "Manage and resolve production incidents", "is_deliverable": False, "owner": "", "sort_order": 2},
                {"id": str(uuid.uuid4()), "name": "Continuous Improvement", "description": "Identify and implement process improvements and optimizations", "is_deliverable": False, "owner": "", "sort_order": 3},
                {"id": str(uuid.uuid4()), "name": "Release & Upgrade Management", "description": "Plan and manage SAP quarterly release upgrades", "is_deliverable": False, "owner": "", "sort_order": 4},
                {"id": str(uuid.uuid4()), "name": "Operational Handover", "description": "Document operational procedures, support model and escalation matrix", "is_deliverable": True, "owner": "", "sort_order": 5},
                {"id": str(uuid.uuid4()), "name": "Improvement Roadmap", "description": "Continuous improvement and optimization roadmap", "is_deliverable": True, "owner": "", "sort_order": 6},
            ]
        },
    }

    created_count = 0
    for phase_name, data in phases.items():
        match_key = {
            "technology_id": tech_id,
            "sub_technology_id": sub_tech_id,
            "project_type_id": proj_type_id,
            "phase_name": phase_name,
        }
        existing = await db.activity_templates.find_one(match_key)
        if existing:
            await db.activity_templates.update_one(match_key, {"$set": {"activities": data["activities"], "updated_at": now}})
        else:
            doc = {
                "id": str(uuid.uuid4()),
                **match_key,
                "technology_name": "SAP S/4HANA",
                "sub_technology_name": "Private Cloud",
                "project_type_name": "Implementation",
                "activities": data["activities"],
                "created_at": now,
                "updated_at": now,
            }
            await db.activity_templates.insert_one(doc)
        created_count += 1

    return {"message": f"SAP S/4HANA Private Cloud Implementation template seeded ({created_count} phases)", "phases": list(phases.keys())}


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
    return doc or {"project_id": project_id, "wave_name": wave_name, "phase_name": phase_name, "activities": [], "wave_activities": []}


@router.put("/projects/{project_id}/activities/{wave_name}/{phase_name}")
async def save_project_phase_activities(project_id: str, wave_name: str, phase_name: str, request: Request, user: dict = Depends(require_auth)):
    body = await request.json()
    activities = body.get("activities", [])
    wave_activities = body.get("wave_activities", [])
    adopted_from = body.get("adopted_from_template_id", "")
    now = datetime.now(timezone.utc).isoformat()

    await db.project_activities.update_one(
        {"project_id": project_id, "wave_name": wave_name, "phase_name": phase_name},
        {"$set": {
            "activities": activities,
            "wave_activities": wave_activities,
            "adopted_from_template_id": adopted_from,
            "updated_at": now,
        }},
        upsert=True,
    )
    return {"message": "Activities saved"}


@router.post("/projects/{project_id}/activities/adopt-templates")
async def adopt_templates_bulk(project_id: str, request: Request, user: dict = Depends(require_auth)):
    """Adopt templates for multiple phases at once."""
    body = await request.json()
    technology_id = body.get("technology_id", "")
    sub_technology_id = body.get("sub_technology_id", "")
    project_type_id = body.get("project_type_id", "")
    wave_name = body.get("wave_name", "")
    phase_names = body.get("phase_names", [])

    if not technology_id or not project_type_id or not wave_name or not phase_names:
        raise HTTPException(status_code=400, detail="technology_id, project_type_id, wave_name, and phase_names are required")

    now = datetime.now(timezone.utc).isoformat()
    adopted = []

    for phase_name in phase_names:
        template = await db.activity_templates.find_one({
            "technology_id": technology_id,
            "sub_technology_id": sub_technology_id,
            "project_type_id": project_type_id,
            "phase_name": phase_name,
        }, {"_id": 0})

        if not template:
            continue

        # Copy activities with new IDs
        activities = [
            {**a, "id": str(uuid.uuid4())} for a in template.get("activities", [])
        ]

        # Preserve existing wave_activities
        existing = await db.project_activities.find_one(
            {"project_id": project_id, "wave_name": wave_name, "phase_name": phase_name}, {"_id": 0}
        )
        wave_activities = existing.get("wave_activities", []) if existing else []

        await db.project_activities.update_one(
            {"project_id": project_id, "wave_name": wave_name, "phase_name": phase_name},
            {"$set": {
                "activities": activities,
                "wave_activities": wave_activities,
                "adopted_from_template_id": template.get("id", ""),
                "updated_at": now,
            }},
            upsert=True,
        )
        adopted.append({"phase_name": phase_name, "count": len(activities)})

    return {"message": f"Templates adopted for {len(adopted)} phases", "adopted": adopted}


# ========== Activities Excel Export ==========

@router.get("/projects/{project_id}/activities/export-data")
async def get_activities_export_data(project_id: str, user: dict = Depends(require_auth)):
    """Get all project activities for Excel export."""
    docs = await db.project_activities.find(
        {"project_id": project_id}, {"_id": 0}
    ).to_list(500)
    return docs
