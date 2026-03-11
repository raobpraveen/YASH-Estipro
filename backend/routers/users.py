from fastapi import APIRouter, HTTPException, Depends
from typing import List
from database import db
from models import User, UserResponse, UserCreate, UserUpdate
from auth import hash_password, require_auth, get_current_user

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(user: dict = Depends(require_auth)):
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(
        id=u["id"], email=u["email"], name=u["name"],
        role=u.get("role", "user"), is_active=u.get("is_active", True)
    ) for u in users]


@router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, user: dict = Depends(require_auth)):
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if data.role not in ["user", "approver", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be: user, approver, or admin")
    new_user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        name=data.name,
        role=data.role
    )
    await db.users.insert_one(new_user.model_dump())
    return UserResponse(id=new_user.id, email=new_user.email, name=new_user.name, role=new_user.role, is_active=new_user.is_active)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate, user: dict = Depends(require_auth)):
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.email is not None:
        existing = await db.users.find_one({"email": data.email.lower(), "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = data.email.lower()
    if data.role is not None:
        if data.role not in ["user", "approver", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        update_data["role"] = data.role
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user_id})
    return UserResponse(
        id=updated_user["id"], email=updated_user["email"], name=updated_user["name"],
        role=updated_user.get("role", "user"), is_active=updated_user.get("is_active", True)
    )


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_auth)):
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


@router.get("/users/approvers/list")
async def get_approvers(user: dict = Depends(get_current_user)):
    approvers = await db.users.find(
        {"role": {"$in": ["approver", "admin"]}, "is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "role": 1}
    ).to_list(100)
    return approvers


@router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str, new_password: str, user: dict = Depends(require_auth)):
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": hash_password(new_password)}})
    return {"message": "Password reset successfully"}


@router.get("/user/settings")
async def get_user_settings(user: dict = Depends(require_auth)):
    settings = await db.user_settings.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not settings:
        return {
            "theme": "light", "customThemeImage": "", "dateFormat": "MM/DD/YYYY",
            "numberFormat": "en-US", "currency": "USD", "compactNumbers": True,
            "showGridLines": True, "defaultProfitMargin": 35, "defaultContingency": 5
        }
    return {
        "theme": settings.get("theme", "light"),
        "customThemeImage": settings.get("custom_theme_image", ""),
        "dateFormat": settings.get("date_format", "MM/DD/YYYY"),
        "numberFormat": settings.get("number_format", "en-US"),
        "currency": settings.get("currency", "USD"),
        "compactNumbers": settings.get("compact_numbers", True),
        "showGridLines": settings.get("show_grid_lines", True),
        "defaultProfitMargin": settings.get("default_profit_margin", 35),
        "defaultContingency": settings.get("default_contingency", 5)
    }


@router.put("/user/settings")
async def update_user_settings(settings: dict, user: dict = Depends(require_auth)):
    settings_to_save = {
        "user_id": user["user_id"],
        "theme": settings.get("theme", "light"),
        "custom_theme_image": settings.get("customThemeImage", ""),
        "date_format": settings.get("dateFormat", "MM/DD/YYYY"),
        "number_format": settings.get("numberFormat", "en-US"),
        "currency": settings.get("currency", "USD"),
        "compact_numbers": settings.get("compactNumbers", True),
        "show_grid_lines": settings.get("showGridLines", True),
        "default_profit_margin": settings.get("defaultProfitMargin", 35),
        "default_contingency": settings.get("defaultContingency", 5)
    }
    await db.user_settings.update_one({"user_id": user["user_id"]}, {"$set": settings_to_save}, upsert=True)
    return {"message": "Settings updated successfully"}
