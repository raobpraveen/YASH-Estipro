from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import db
from auth import require_auth, get_current_user, require_admin

router = APIRouter()


# ========== Notifications ==========

@router.get("/notifications")
async def get_notifications(user_email: str = None, unread_only: bool = False):
    query = {}
    if user_email:
        query["user_email"] = user_email
    if unread_only:
        query["is_read"] = False
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for notif in notifications:
        if isinstance(notif.get('created_at'), str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
    return notifications


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    result = await db.notifications.update_one({"id": notification_id}, {"$set": {"is_read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}


@router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(user_email: str = None):
    query = {}
    if user_email:
        query["user_email"] = user_email
    await db.notifications.update_many(query, {"$set": {"is_read": True}})
    return {"message": "All notifications marked as read"}


# ========== Audit Logs ==========

async def get_user_project_ids(user_id: str) -> List[str]:
    projects = await db.projects.find({"created_by_id": user_id}, {"id": 1}).to_list(1000)
    return [p["id"] for p in projects]


@router.get("/audit-logs")
async def get_audit_logs(
    project_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    query = {}
    if project_id:
        query["project_id"] = project_id
    if entity_type:
        query["entity_type"] = entity_type
    if action:
        query["action"] = action
    if user_email:
        query["user_email"] = user_email
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = f"{date_from}T00:00:00"
        if date_to:
            date_filter["$lte"] = f"{date_to}T23:59:59"
        if date_filter:
            query["timestamp"] = date_filter
    if current_user and current_user.get("role") != "admin":
        query["$or"] = [
            {"user_id": current_user.get("id")},
            {"project_id": {"$in": await get_user_project_ids(current_user.get("id"))}}
        ]
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    return logs


@router.get("/audit-logs/project/{project_id}")
async def get_project_audit_logs(project_id: str, user: dict = Depends(get_current_user)):
    logs = await db.audit_logs.find({"project_id": project_id}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    return logs


@router.get("/audit-logs/summary")
async def get_audit_summary(user: dict = Depends(require_admin)):
    action_counts = await db.audit_logs.aggregate([
        {"$group": {"_id": "$action", "count": {"$sum": 1}}}
    ]).to_list(100)
    user_counts = await db.audit_logs.aggregate([
        {"$group": {"_id": "$user_email", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(10)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_count = await db.audit_logs.count_documents({"timestamp": {"$gte": seven_days_ago}})
    return {
        "action_counts": {item["_id"]: item["count"] for item in action_counts},
        "top_users": [{"email": item["_id"], "count": item["count"]} for item in user_counts],
        "recent_activity_count": recent_count,
        "total_logs": await db.audit_logs.count_documents({})
    }
