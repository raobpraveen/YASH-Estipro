from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid
from database import db
from models import Project, ProjectCreate, ProjectUpdate, Notification
from auth import require_auth, get_current_user
from utils import create_audit_log, detect_changes, compute_detailed_diff
from email_service import send_email, get_review_request_email, get_approval_email

router = APIRouter()


def _strip_gantt_data(project: dict):
    """Remove heavy base64 data from gantt_chart, keep only metadata."""
    gc = project.get("gantt_chart")
    if gc and isinstance(gc, dict) and "data" in gc:
        project["gantt_chart"] = {k: v for k, v in gc.items() if k != "data"}
    return project


async def generate_project_number():
    last_project = await db.projects.find_one(
        {"project_number": {"$regex": "^PRJ-"}},
        {"project_number": 1},
        sort=[("project_number", -1)]
    )
    if last_project and last_project.get("project_number"):
        try:
            last_num = int(last_project["project_number"].split("-")[1])
            return f"PRJ-{str(last_num + 1).zfill(4)}"
        except (ValueError, IndexError):
            pass
    return "PRJ-0001"


@router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate, user: dict = Depends(require_auth)):
    project_number = await generate_project_number()
    project_data = input.model_dump()
    project_data["project_number"] = project_number
    project_data["version"] = 1
    project_data["is_latest_version"] = True
    if project_data.get("waves") is None:
        project_data["waves"] = []
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        project_data["created_by_id"] = current_user.get("id", "")
        project_data["created_by_name"] = current_user.get("name", "")
        project_data["created_by_email"] = current_user.get("email", "")
    project_obj = Project(**project_data)
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    if current_user:
        await create_audit_log(
            user=current_user, action="created", entity_type="project",
            entity_id=project_obj.id, entity_name=project_obj.name,
            project_id=project_obj.id, project_number=project_obj.project_number,
            project_name=project_obj.name, metadata={"version": project_obj.version}
        )
    return project_obj


@router.get("/projects", response_model=List[Project])
async def get_projects(latest_only: bool = True, user: dict = Depends(require_auth)):
    if latest_only:
        query = {
            "$and": [
                {"$or": [{"is_latest_version": True}, {"is_latest_version": {"$exists": False}}]},
                {"$or": [{"is_archived": False}, {"is_archived": {"$exists": False}}]}
            ]
        }
    else:
        query = {"$or": [{"is_archived": False}, {"is_archived": {"$exists": False}}]}
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    user_id = user["user_id"]
    user_email = current_user.get("email", "") if current_user else ""
    user_role = current_user.get("role", "user") if current_user else "user"
    filtered_projects = []
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project.get('updated_at'), str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'])
        _strip_gantt_data(project)
        visibility = project.get("visibility", "public")
        if visibility == "public":
            filtered_projects.append(project)
        else:
            has_access = (
                user_role == "admin" or
                project.get("created_by_id") == user_id or
                user_id in project.get("restricted_user_ids", []) or
                (project.get("status") == "in_review" and project.get("approver_email") == user_email)
            )
            if has_access:
                filtered_projects.append(project)
    return filtered_projects


@router.get("/projects/archived")
async def get_archived_projects(user: dict = Depends(require_auth)):
    projects = await db.projects.find(
        {"is_archived": True, "is_latest_version": True}, {"_id": 0}
    ).sort("archived_at", -1).to_list(500)
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    user_id = user["user_id"]
    user_email = current_user.get("email", "") if current_user else ""
    user_role = current_user.get("role", "user") if current_user else "user"
    filtered_projects = []
    for p in projects:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
        visibility = p.get("visibility", "public")
        if visibility == "public":
            filtered_projects.append(p)
        else:
            has_access = (
                user_role == "admin" or p.get("created_by_id") == user_id or
                user_id in p.get("restricted_user_ids", []) or
                (p.get("status") == "in_review" and p.get("approver_email") == user_email)
            )
            if has_access:
                filtered_projects.append(p)
    return filtered_projects


@router.get("/projects/compare-detail")
async def compare_projects_detail(v1: str, v2: str):
    left = await db.projects.find_one({"id": v1}, {"_id": 0})
    right = await db.projects.find_one({"id": v2}, {"_id": 0})
    if not left or not right:
        raise HTTPException(status_code=404, detail="One or both versions not found")
    diff = compute_detailed_diff(left, right)
    diff["left_version"] = left.get("version", 1)
    diff["right_version"] = right.get("version", 1)
    diff["left_id"] = v1
    diff["right_id"] = v2
    diff["project_number"] = left.get("project_number", "")
    return diff


@router.get("/change-logs/{project_number}")
async def get_change_logs(project_number: str):
    logs = await db.change_logs.find({"project_number": project_number}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return logs


@router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if isinstance(project.get('updated_at'), str):
        project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    _strip_gantt_data(project)
    visibility = project.get("visibility", "public")
    if visibility == "restricted":
        current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
        user_id = user["user_id"]
        user_email = current_user.get("email", "") if current_user else ""
        user_role = current_user.get("role", "user") if current_user else "user"
        has_access = (
            user_role == "admin" or project.get("created_by_id") == user_id or
            user_id in project.get("restricted_user_ids", []) or
            (project.get("status") == "in_review" and project.get("approver_email") == user_email)
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="You don't have access to this project")
    return project



@router.get("/projects/{project_id}/versions", response_model=List[Project])
async def get_project_versions(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project_number = project.get("project_number", "")
    if not project_number:
        return [project]
    versions = await db.projects.find(
        {"project_number": project_number}, {"_id": 0}
    ).sort("version", -1).to_list(100)
    for v in versions:
        if isinstance(v.get('created_at'), str):
            v['created_at'] = datetime.fromisoformat(v['created_at'])
        if isinstance(v.get('updated_at'), str):
            v['updated_at'] = datetime.fromisoformat(v['updated_at'])
    return versions


@router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, input: ProjectUpdate, user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    visibility = existing.get("visibility", "public")
    if visibility == "restricted":
        current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
        user_id = user["user_id"]
        user_email = current_user.get("email", "") if current_user else ""
        user_role = current_user.get("role", "user") if current_user else "user"
        has_access = (
            user_role == "admin" or existing.get("created_by_id") == user_id or
            user_id in existing.get("restricted_user_ids", []) or
            (existing.get("status") == "in_review" and existing.get("approver_email") == user_email)
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="You don't have access to edit this project")
    update_data = input.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    detailed_diff = compute_detailed_diff(existing, {**existing, **update_data})
    fields_to_track = ["name", "description", "status", "profit_margin_percentage", "customer_id", "customer_name", "version_notes"]
    changes = detect_changes(existing, update_data, fields_to_track)
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if detailed_diff["summary"]["total_changes"] > 0 and current_user:
        change_log_entry = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "project_number": existing.get("project_number", ""),
            "version": existing.get("version", 1),
            "user_name": current_user.get("name", ""),
            "user_email": current_user.get("email", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": detailed_diff["summary"],
            "header_diff": detailed_diff["header_diff"],
            "wave_diffs": detailed_diff["wave_diffs"],
        }
        await db.change_logs.insert_one(change_log_entry)
    if current_user and changes:
        await create_audit_log(
            user=current_user, action="updated", entity_type="project",
            entity_id=project_id, entity_name=existing.get("name", ""),
            project_id=project_id, project_number=existing.get("project_number", ""),
            project_name=existing.get("name", ""), changes=changes
        )
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    _strip_gantt_data(updated)
    return updated


@router.post("/projects/{project_id}/archive")
async def archive_project(project_id: str, user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.projects.update_one({"id": project_id}, {"$set": {
        "is_archived": True, "archived_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user, action="archived", entity_type="project",
            entity_id=project_id, entity_name=existing.get("name", ""),
            project_id=project_id, project_number=existing.get("project_number", ""),
            project_name=existing.get("name", "")
        )
    return {"message": "Project archived successfully"}


@router.post("/projects/{project_id}/unarchive")
async def unarchive_project(project_id: str, user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.projects.update_one({"id": project_id}, {"$set": {
        "is_archived": False, "archived_at": None, "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user, action="unarchived", entity_type="project",
            entity_id=project_id, entity_name=existing.get("name", ""),
            project_id=project_id, project_number=existing.get("project_number", ""),
            project_name=existing.get("name", "")
        )
    return {"message": "Project unarchived successfully"}


@router.post("/projects/{project_id}/new-version", response_model=Project)
async def create_new_version(project_id: str, input: ProjectUpdate, user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    update_data = input.model_dump(exclude_unset=True)
    is_import = update_data.pop("is_import", False) if "is_import" in update_data else False
    old_status = "suspended" if is_import else "superseded"
    # Preserve the previous status for display purposes (e.g., "Suspended (was Approved)")
    previous_status = existing.get("status", "draft")
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "is_latest_version": False,
            "status": old_status,
            "previous_status": previous_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    project_number = existing.get("project_number", "")
    max_version = await db.projects.find_one(
        {"project_number": project_number}, {"version": 1}, sort=[("version", -1)]
    )
    new_version = (max_version.get("version", 1) if max_version else 1) + 1
    new_project_data = {**existing}
    new_project_data["id"] = str(uuid.uuid4())
    new_project_data["version"] = new_version
    new_project_data["is_latest_version"] = True
    new_project_data["parent_project_id"] = project_id
    new_project_data["created_at"] = datetime.now(timezone.utc)
    new_project_data["updated_at"] = datetime.now(timezone.utc)
    new_project_data["status"] = "draft"
    new_project_data["approver_email"] = ""
    new_project_data["approval_comments"] = ""
    new_project_data["submitted_at"] = None
    new_project_data["approved_at"] = None
    update_data = input.model_dump(exclude_unset=True)
    update_data.pop("status", None)
    update_data.pop("approver_email", None)
    update_data.pop("approval_comments", None)
    update_data.pop("submitted_at", None)
    update_data.pop("approved_at", None)
    for key, value in update_data.items():
        if value is not None:
            new_project_data[key] = value
    project_obj = Project(**new_project_data)
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user, action="version_created", entity_type="project",
            entity_id=project_obj.id, entity_name=project_obj.name,
            project_id=project_obj.id, project_number=project_obj.project_number,
            project_name=project_obj.name,
            metadata={"new_version": new_version, "previous_version": existing.get("version", 1), "version_notes": update_data.get("version_notes", "")}
        )
    return project_obj


@router.post("/projects/{project_id}/clone", response_model=Project)
async def clone_project(project_id: str, user: dict = Depends(require_auth)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    new_project_number = await generate_project_number()
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    cloned_data = {**existing}
    cloned_data["id"] = str(uuid.uuid4())
    cloned_data["project_number"] = new_project_number
    cloned_data["version"] = 1
    cloned_data["is_latest_version"] = True
    cloned_data["parent_project_id"] = ""
    cloned_data["name"] = f"{existing.get('name', 'Project')} (Copy)"
    cloned_data["status"] = "draft"
    cloned_data["approver_email"] = ""
    cloned_data["approval_comments"] = ""
    cloned_data["submitted_at"] = None
    cloned_data["approved_at"] = None
    cloned_data["created_at"] = datetime.now(timezone.utc)
    cloned_data["updated_at"] = datetime.now(timezone.utc)
    if current_user:
        cloned_data["created_by_id"] = current_user.get("id", "")
        cloned_data["created_by_name"] = current_user.get("name", "")
        cloned_data["created_by_email"] = current_user.get("email", "")
    project_obj = Project(**cloned_data)
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    if current_user:
        await create_audit_log(
            user=current_user, action="cloned", entity_type="project",
            entity_id=project_obj.id, entity_name=project_obj.name,
            project_id=project_obj.id, project_number=project_obj.project_number,
            project_name=project_obj.name,
            metadata={"cloned_from_id": project_id, "cloned_from_number": existing.get("project_number", ""), "cloned_from_name": existing.get("name", "")}
        )
    return project_obj


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    project_number = existing.get("project_number")
    was_latest = existing.get("is_latest_version", True)
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    # Cascade delete: clean up dependent data
    await db.payment_milestones.delete_many({"project_id": project_id})
    await db.project_activities.delete_many({"project_id": project_id})
    if was_latest and project_number:
        next_latest = await db.projects.find_one({"project_number": project_number}, {"_id": 0}, sort=[("version", -1)])
        if next_latest:
            await db.projects.update_one({"id": next_latest["id"]}, {"$set": {"is_latest_version": True}})
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user, action="deleted", entity_type="project",
            entity_id=project_id, entity_name=existing.get("name", ""),
            project_id=project_id, project_number=existing.get("project_number", ""),
            project_name=existing.get("name", "")
        )
    return {"message": "Project deleted successfully"}


# ========== Templates ==========

@router.get("/templates")
async def get_templates():
    templates = await db.projects.find({"is_template": True}, {"_id": 0}).sort("template_name", 1).to_list(100)
    return templates

@router.post("/projects/{project_id}/save-as-template")
async def save_as_template(project_id: str, template_name: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not template_name:
        raise HTTPException(status_code=400, detail="Template name is required")
    existing = await db.projects.find_one({"is_template": True, "template_name": template_name})
    if existing:
        raise HTTPException(status_code=400, detail="Template with this name already exists")
    await db.projects.update_one({"id": project_id}, {"$set": {"is_template": True, "template_name": template_name}})
    return {"message": f"Project saved as template: {template_name}"}

@router.post("/projects/{project_id}/remove-template")
async def remove_template(project_id: str):
    result = await db.projects.update_one({"id": project_id}, {"$set": {"is_template": False, "template_name": ""}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Template removed"}

@router.post("/projects/create-from-template/{template_id}")
async def create_from_template(template_id: str, user: dict = Depends(require_auth)):
    template = await db.projects.find_one({"id": template_id, "is_template": True}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    last_project = await db.projects.find_one({"project_number": {"$regex": "^PRJ-"}}, sort=[("project_number", -1)])
    if last_project and last_project.get("project_number"):
        last_num = int(last_project["project_number"].split("-")[1])
        new_project_number = f"PRJ-{str(last_num + 1).zfill(4)}"
    else:
        new_project_number = "PRJ-0001"
    new_project_data = {**template}
    new_project_data["id"] = str(uuid.uuid4())
    new_project_data["project_number"] = new_project_number
    new_project_data["version"] = 1
    new_project_data["version_notes"] = f"Created from template: {template.get('template_name', 'Unknown')}"
    new_project_data["name"] = f"{template.get('name', 'Project')} (from template)"
    new_project_data["is_template"] = False
    new_project_data["template_name"] = ""
    new_project_data["is_latest_version"] = True
    new_project_data["parent_project_id"] = ""
    new_project_data["status"] = "draft"
    new_project_data["approver_email"] = ""
    new_project_data["approval_comments"] = ""
    new_project_data["submitted_at"] = None
    new_project_data["approved_at"] = None
    new_project_data["customer_id"] = ""
    new_project_data["customer_name"] = ""
    new_project_data["created_at"] = datetime.now(timezone.utc)
    new_project_data["updated_at"] = datetime.now(timezone.utc)
    if current_user:
        new_project_data["created_by_id"] = current_user.get("id", "")
        new_project_data["created_by_name"] = current_user.get("name", "")
        new_project_data["created_by_email"] = current_user.get("email", "")
    for wave in new_project_data.get("waves", []):
        wave["id"] = str(uuid.uuid4())
        for alloc in wave.get("grid_allocations", []):
            alloc["id"] = str(uuid.uuid4())
    project_obj = Project(**new_project_data)
    doc = project_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"]
    doc["updated_at"] = doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"]
    await db.projects.insert_one(doc)
    return project_obj


# ========== Approval Workflow ==========

@router.post("/projects/{project_id}/submit-for-review")
async def submit_for_review(project_id: str, approver_email: str, user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Iter 81: If project has a Billing Entity with a configured Approval Matrix,
    # auto-fan-out to every approver at every level (dedup by email). The `approver_email`
    # param still selects the primary approver whose "approved" click closes the workflow;
    # remaining approvers get informational review-request emails so the whole matrix is aware.
    matrix_approvers = []  # list of {level, email, name}
    billing_entity_id = project.get("billing_entity_id", "")
    if billing_entity_id:
        matrix = await db.approval_matrices.find_one({"billing_entity_id": billing_entity_id}, {"_id": 0})
        if matrix:
            seen = set()
            for lvl in matrix.get("levels", []):
                emails = lvl.get("approver_emails", []) or []
                names = lvl.get("approver_names", []) or []
                for i, e in enumerate(emails):
                    e_clean = (e or "").strip().lower()
                    if e_clean and e_clean not in seen:
                        seen.add(e_clean)
                        matrix_approvers.append({
                            "level": lvl.get("level", 0),
                            "email": e_clean,
                            "name": names[i] if i < len(names) else "",
                        })

    # If no explicit approver_email supplied, use level-1 approver from matrix
    if not approver_email and matrix_approvers:
        # pick lowest-level approver
        primary = sorted(matrix_approvers, key=lambda x: x["level"])[0]
        approver_email = primary["email"]

    if not approver_email:
        raise HTTPException(status_code=400, detail="Approver email is required (either supply one or configure an Approval Matrix for the billing entity)")

    old_status = project.get("status", "draft")
    # Iter 82: Sequential level-gating — only Level 1 approvers get emailed initially.
    # As each level approves, `approve_project` advances to next level and emails those approvers.
    matrix_levels = []  # ordered list of {level, emails[]}
    if matrix_approvers:
        # Group approvers by level from the matrix doc (already sorted)
        level_map = {}
        for a in matrix_approvers:
            level_map.setdefault(a["level"], []).append(a["email"])
        matrix_levels = [{"level": lv, "emails": emails} for lv, emails in sorted(level_map.items())]

    initial_level = matrix_levels[0]["level"] if matrix_levels else 1
    update_data = {
        "status": "in_review", "approver_email": approver_email,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "matrix_approvers": [a["email"] for a in matrix_approvers],
        "matrix_levels": matrix_levels,
        "current_approval_level": initial_level,
        "approval_history": [],
    }
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user, action="status_change", entity_type="project",
            entity_id=project_id, entity_name=project.get("name", ""),
            project_id=project_id, project_number=project.get("project_number", ""),
            project_name=project.get("name", ""),
            changes=[{"field": "status", "old_value": old_status, "new_value": "in_review"}],
            metadata={"approver_email": approver_email, "matrix_approvers": [a["email"] for a in matrix_approvers], "current_level": initial_level}
        )
    # Sequential gating: only recipients at the current level (level 1) get emailed now.
    # If no matrix, fall back to the single `approver_email`.
    if matrix_levels:
        recipients = set(matrix_levels[0]["emails"])
    else:
        recipients = {approver_email.lower()}
    for recipient in recipients:
        notification = Notification(
            user_email=recipient, type="review_request", title="New Project Review Request",
            message=f"Project {project.get('project_number', '')} '{project.get('name', '')}' has been submitted for your review (Level {initial_level}).",
            project_id=project_id, project_number=project.get("project_number", "")
        )
        notif_doc = notification.model_dump()
        notif_doc['created_at'] = notif_doc['created_at'].isoformat()
        await db.notifications.insert_one(notif_doc)
        if current_user:
            subject, html_body, text_body = get_review_request_email(
                project.get("project_number", ""), project.get("name", ""),
                current_user.get("name", ""), current_user.get("email", ""),
                project_id, project_data=project
            )
            await send_email(recipient, subject, html_body, text_body)
    return {"message": "Project submitted for review", "status": "in_review", "current_level": initial_level, "recipients": list(recipients)}


@router.post("/projects/{project_id}/approve")
async def approve_project(project_id: str, comments: str = "", user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    old_status = project.get("status", "in_review")
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})

    # Iter 82: Sequential level-gating — check whether more approval levels remain.
    matrix_levels = project.get("matrix_levels", []) or []
    current_level = project.get("current_approval_level", 1)
    approval_history = list(project.get("approval_history", []))

    # Append this approval to history
    approval_history.append({
        "level": current_level,
        "approver_email": (current_user or {}).get("email", ""),
        "approver_name": (current_user or {}).get("name", ""),
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "comments": comments,
    })

    # Find next level in sequence
    next_level_entry = None
    if matrix_levels:
        for lvl in matrix_levels:
            if lvl.get("level", 0) > current_level:
                next_level_entry = lvl
                break

    if next_level_entry:
        # Advance to next level — project stays in_review, email next level's approvers
        next_level = next_level_entry["level"]
        next_recipients = list(set(next_level_entry.get("emails", [])))
        await db.projects.update_one({"id": project_id}, {"$set": {
            "current_approval_level": next_level,
            "approval_history": approval_history,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }})
        for recipient in next_recipients:
            notification = Notification(
                user_email=recipient, type="review_request",
                title=f"Approval Needed - Level {next_level}",
                message=f"Project {project.get('project_number', '')} '{project.get('name', '')}' has been approved at Level {current_level} and now needs your Level {next_level} approval.",
                project_id=project_id, project_number=project.get("project_number", "")
            )
            notif_doc = notification.model_dump()
            notif_doc['created_at'] = notif_doc['created_at'].isoformat()
            await db.notifications.insert_one(notif_doc)
            if current_user:
                subject, html_body, text_body = get_review_request_email(
                    project.get("project_number", ""), project.get("name", ""),
                    current_user.get("name", ""), current_user.get("email", ""),
                    project_id, project_data=project
                )
                await send_email(recipient, subject, html_body, text_body)
        if current_user:
            await create_audit_log(
                user=current_user, action="approval_progress", entity_type="project",
                entity_id=project_id, entity_name=project.get("name", ""),
                project_id=project_id, project_number=project.get("project_number", ""),
                project_name=project.get("name", ""),
                changes=[{"field": "approval_level", "old_value": current_level, "new_value": next_level}],
                metadata={"comments": comments, "approver_email": current_user.get("email", "")}
            )
        return {"message": f"Level {current_level} approved; advanced to Level {next_level}", "status": "in_review", "current_level": next_level}

    # Final approval — no more levels remaining
    update_data = {
        "status": "approved", "approval_comments": comments,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approval_history": approval_history,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    project_number = project.get("project_number", "")
    if project_number:
        await db.projects.update_many(
            {"project_number": project_number, "status": "draft", "id": {"$ne": project_id}},
            {"$set": {"status": "obsolete", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    if current_user:
        await create_audit_log(
            user=current_user, action="status_change", entity_type="project",
            entity_id=project_id, entity_name=project.get("name", ""),
            project_id=project_id, project_number=project.get("project_number", ""),
            project_name=project.get("name", ""),
            changes=[{"field": "status", "old_value": old_status, "new_value": "approved"}],
            metadata={"comments": comments}
        )
    notification = Notification(
        user_email=project.get("approver_email", ""), type="approved", title="Project Approved",
        message=f"Project {project.get('project_number', '')} '{project.get('name', '')}' has been approved.",
        project_id=project_id, project_number=project.get("project_number", "")
    )
    notif_doc = notification.model_dump()
    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
    await db.notifications.insert_one(notif_doc)
    creator_email = project.get("created_by_email", "")
    if creator_email and current_user:
        subject, html_body, text_body = get_approval_email(
            project.get("project_number", ""), project.get("name", ""),
            "approved", current_user.get("name", ""), comments, project_id
        )
        await send_email(creator_email, subject, html_body, text_body)
    return {"message": "Project approved", "status": "approved"}


@router.put("/projects/{project_id}/obsolete")
async def mark_project_obsolete(project_id: str, user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("created_by_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the project creator can mark it as obsolete")
    old_status = project.get("status", "draft")
    if old_status in ("approved", "obsolete"):
        raise HTTPException(status_code=400, detail=f"Cannot mark {old_status} project as obsolete")
    await db.projects.update_one({"id": project_id}, {"$set": {"status": "obsolete", "updated_at": datetime.now(timezone.utc).isoformat()}})
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user, action="status_change", entity_type="project",
            entity_id=project_id, entity_name=project.get("name", ""),
            project_id=project_id, project_number=project.get("project_number", ""),
            project_name=project.get("name", ""),
            changes=[{"field": "status", "old_value": old_status, "new_value": "obsolete"}],
        )
    return {"message": "Project marked as obsolete", "status": "obsolete"}


@router.post("/projects/{project_id}/reject")
async def reject_project(project_id: str, comments: str = "", user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    old_status = project.get("status", "in_review")
    update_data = {
        "status": "rejected", "approval_comments": comments,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user, action="status_change", entity_type="project",
            entity_id=project_id, entity_name=project.get("name", ""),
            project_id=project_id, project_number=project.get("project_number", ""),
            project_name=project.get("name", ""),
            changes=[{"field": "status", "old_value": old_status, "new_value": "rejected"}],
            metadata={"comments": comments}
        )
    notification = Notification(
        user_email=project.get("approver_email", ""), type="rejected", title="Project Rejected",
        message=f"Project {project.get('project_number', '')} '{project.get('name', '')}' has been rejected. Comments: {comments}",
        project_id=project_id, project_number=project.get("project_number", "")
    )
    notif_doc = notification.model_dump()
    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
    await db.notifications.insert_one(notif_doc)
    creator_email = project.get("created_by_email", "")
    if creator_email and current_user:
        subject, html_body, text_body = get_approval_email(
            project.get("project_number", ""), project.get("name", ""),
            "rejected", current_user.get("name", ""), comments, project_id
        )
        await send_email(creator_email, subject, html_body, text_body)
    return {"message": "Project rejected", "status": "rejected"}
