from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# SMTP Email Settings
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', '')
SMTP_FROM_NAME = os.environ.get('SMTP_FROM_NAME', 'YASH EstiPro')

security = HTTPBearer(auto_error=False)

app = FastAPI()
api_router = APIRouter(prefix="/api")
_temp_downloads = {}  # Temporary in-memory storage for file downloads


# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    name: str
    role: str = "user"  # user, approver, admin
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool = True

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "user"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# User Settings Model
class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    theme: str = "light"
    custom_theme_image: str = ""
    date_format: str = "MM/DD/YYYY"
    number_format: str = "en-US"
    currency: str = "USD"
    compact_numbers: bool = True
    show_grid_lines: bool = True
    default_profit_margin: float = 35
    default_contingency: float = 5


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    payload = verify_jwt_token(credentials.credentials)
    if not payload:
        return None
    return payload

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = verify_jwt_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return payload

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Require admin role for access"""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = verify_jwt_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    
    # Check if user is admin
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return payload


# Auth Endpoints
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(data: UserRegister):
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        name=data.name
    )
    await db.users.insert_one(user.model_dump())
    
    token = create_jwt_token(user.id, user.email)
    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role)
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: UserLogin):
    user_doc = await db.users.find_one({"email": data.email.lower()})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user_doc["password_hash"] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_jwt_token(user_doc["id"], user_doc["email"])
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            name=user_doc["name"],
            role=user_doc.get("role", "user"),
            is_active=user_doc.get("is_active", True)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    user_doc = await db.users.find_one({"id": user["user_id"]})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        name=user_doc["name"],
        role=user_doc.get("role", "user"),
        is_active=user_doc.get("is_active", True)
    )


# User Management Endpoints (Admin only)
@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users(user: dict = Depends(require_auth)):
    """Get all users - Admin only"""
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(
        id=u["id"],
        email=u["email"],
        name=u["name"],
        role=u.get("role", "user"),
        is_active=u.get("is_active", True)
    ) for u in users]

@api_router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, user: dict = Depends(require_auth)):
    """Create a new user - Admin only"""
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if email already exists
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
    
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
        is_active=new_user.is_active
    )

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate, user: dict = Depends(require_auth)):
    """Update a user - Admin only"""
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
        # Check if email already taken by another user
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
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        role=updated_user.get("role", "user"),
        is_active=updated_user.get("is_active", True)
    )

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_auth)):
    """Delete a user - Admin only"""
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@api_router.get("/users/approvers/list")
async def get_approvers(user: dict = Depends(get_current_user)):
    """Get list of users who can approve projects (approvers and admins)"""
    approvers = await db.users.find(
        {
            "role": {"$in": ["approver", "admin"]},
            "is_active": {"$ne": False}
        },
        {"_id": 0, "id": 1, "email": 1, "name": 1, "role": 1}
    ).to_list(100)
    return approvers


@api_router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str, new_password: str, user: dict = Depends(require_auth)):
    """Reset a user's password - Admin only"""
    current_user = await db.users.find_one({"id": user["user_id"]})
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    
    return {"message": "Password reset successfully"}


# User Settings Endpoints
@api_router.get("/user/settings")
async def get_user_settings(user: dict = Depends(require_auth)):
    """Get current user's settings"""
    settings = await db.user_settings.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not settings:
        # Return default settings
        return {
            "theme": "light",
            "customThemeImage": "",
            "dateFormat": "MM/DD/YYYY",
            "numberFormat": "en-US",
            "currency": "USD",
            "compactNumbers": True,
            "showGridLines": True,
            "defaultProfitMargin": 35,
            "defaultContingency": 5
        }
    # Convert snake_case to camelCase for frontend
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


@api_router.put("/user/settings")
async def update_user_settings(settings: dict, user: dict = Depends(require_auth)):
    """Update current user's settings"""
    # Convert camelCase to snake_case for storage
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
    
    await db.user_settings.update_one(
        {"user_id": user["user_id"]},
        {"$set": settings_to_save},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}


# Models for Customers
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str  # ISO country code
    location_name: str
    city: str = ""
    industry_vertical: str = ""
    sub_industry_vertical: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    location: str
    location_name: str
    city: str = ""
    industry_vertical: str = ""
    sub_industry_vertical: str = ""


# Models for Technologies
class Technology(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TechnologyCreate(BaseModel):
    name: str
    description: Optional[str] = ""


# Models for Project Types
class ProjectType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectTypeCreate(BaseModel):
    name: str


# Models for Base Locations
class BaseLocation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    overhead_percentage: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BaseLocationCreate(BaseModel):
    name: str
    overhead_percentage: float


# Models for Skills
class Skill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    technology_id: str
    technology_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SkillCreate(BaseModel):
    name: str
    technology_id: str
    technology_name: str


# Models for Proficiency Rates
class ProficiencyRate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    skill_id: str
    skill_name: str
    technology_id: str
    technology_name: str
    base_location_id: str
    base_location_name: str
    proficiency_level: str
    avg_monthly_salary: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProficiencyRateCreate(BaseModel):
    skill_id: str
    skill_name: str
    technology_id: str
    technology_name: str
    base_location_id: str
    base_location_name: str
    proficiency_level: str
    avg_monthly_salary: float


# Models for Wave Grid Allocation
class WaveGridAllocation(BaseModel):
    id: str = ""
    skill_id: str
    skill_name: str
    proficiency_level: str
    avg_monthly_salary: float  # Can be overridden per estimation
    original_monthly_salary: float = 0  # Original rate from master
    base_location_id: str
    base_location_name: str
    overhead_percentage: float
    is_onsite: bool = False
    travel_required: bool = False  # Indicates if travel logistics apply
    phase_allocations: Dict[str, float] = {}
    override_hourly_rate: Optional[float] = None  # Override selling price hourly rate
    resource_group_id: str = ""  # Resource grouping identifier
    comments: str = ""  # Row-level comments
    # Logistics costs - editable per resource (legacy fields, now calculated at wave level)
    per_diem_daily: float = 50
    per_diem_days: int = 30
    accommodation_daily: float = 80
    accommodation_days: int = 30
    local_conveyance_daily: float = 20
    local_conveyance_days: int = 21
    flight_cost_per_trip: float = 0
    visa_insurance_per_trip: float = 0
    num_trips: int = 0


# Models for Project Waves
class ProjectWave(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    duration_months: float
    phase_names: List[str] = []  # User-defined phase names per month/column
    logistics_defaults: Dict[str, float] = {}  # Legacy - keeping for backwards compatibility
    logistics_config: Dict[str, float] = {}  # Logistics configuration for wave
    nego_buffer_percentage: float = 0  # Negotiation buffer percentage
    grid_allocations: List[WaveGridAllocation] = []


# Models for Projects
class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_number: str = ""  # Unique project number like PRJ-0001
    version: int = 1  # Version number for tracking changes
    version_notes: str = ""  # Notes for this version
    name: str
    customer_id: str = ""
    customer_name: str = ""
    project_location: str = ""  # ISO country code (legacy single location)
    project_location_name: str = ""
    project_locations: List[str] = []  # Multiple ISO country codes
    project_location_names: List[str] = []  # Multiple location names
    technology_id: str = ""
    technology_name: str = ""
    technology_ids: List[str] = []  # Multiple technologies
    technology_names: List[str] = []
    project_type_id: str = ""
    project_type_name: str = ""
    project_type_ids: List[str] = []  # Multiple project types
    project_type_names: List[str] = []
    description: Optional[str] = ""
    profit_margin_percentage: float = 35.0
    nego_buffer_percentage: float = 0.0
    waves: List[ProjectWave] = []
    is_latest_version: bool = True  # Flag to identify latest version
    parent_project_id: str = ""  # For version tracking - links to original project
    is_template: bool = False  # Flag to mark as template
    template_name: str = ""  # Name for the template
    # Approval workflow fields
    status: str = "draft"  # draft, in_review, approved, rejected, superseded, suspended, obsolete
    approver_email: str = ""
    approval_comments: str = ""
    submitted_at: Optional[str] = None
    approved_at: Optional[str] = None
    submitted_by: str = ""
    approved_by: str = ""
    # Sales Manager
    sales_manager_id: str = ""
    sales_manager_name: str = ""
    # Audit fields
    created_by_id: str = ""  # User ID who created the project
    created_by_name: str = ""  # User name who created the project
    created_by_email: str = ""  # User email who created the project
    is_archived: bool = False  # Whether the project is archived
    archived_at: Optional[datetime] = None  # When the project was archived
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    customer_id: str = ""
    customer_name: str = ""
    project_location: str = ""
    project_location_name: str = ""
    project_locations: List[str] = []
    project_location_names: List[str] = []
    technology_id: str = ""
    technology_name: str = ""
    technology_ids: List[str] = []
    technology_names: List[str] = []
    project_type_id: str = ""
    project_type_name: str = ""
    project_type_ids: List[str] = []
    project_type_names: List[str] = []
    description: Optional[str] = ""
    profit_margin_percentage: float = 35.0
    nego_buffer_percentage: float = 0.0
    waves: Optional[List[Dict]] = None
    version_notes: str = ""
    status: str = "draft"
    approver_email: str = ""
    sales_manager_id: str = ""
    sales_manager_name: str = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    project_location: Optional[str] = None
    project_location_name: Optional[str] = None
    project_locations: Optional[List[str]] = None
    project_location_names: Optional[List[str]] = None
    technology_id: Optional[str] = None
    technology_name: Optional[str] = None
    technology_ids: Optional[List[str]] = None
    technology_names: Optional[List[str]] = None
    project_type_id: Optional[str] = None
    project_type_name: Optional[str] = None
    project_type_ids: Optional[List[str]] = None
    project_type_names: Optional[List[str]] = None
    description: Optional[str] = None
    profit_margin_percentage: Optional[float] = None
    nego_buffer_percentage: Optional[float] = None
    waves: Optional[List[Dict]] = None
    version_notes: Optional[str] = None
    status: Optional[str] = None
    approver_email: Optional[str] = None
    approval_comments: Optional[str] = None
    sales_manager_id: Optional[str] = None
    sales_manager_name: Optional[str] = None
    is_import: Optional[bool] = None  # Flag for smart import version creation

# Notification model
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_email: str  # Who receives the notification
    type: str  # review_request, approved, rejected, revision_needed
    title: str
    message: str
    project_id: str
    project_number: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Audit Log Model
class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str
    user_name: str
    user_email: str
    action: str  # created, updated, deleted, cloned, archived, unarchived, status_change, version_created
    entity_type: str  # project, wave, resource
    entity_id: str
    entity_name: str
    project_id: Optional[str] = None
    project_number: Optional[str] = None
    project_name: Optional[str] = None
    changes: Optional[List[Dict]] = None  # [{field: "", old_value: "", new_value: ""}]
    metadata: Optional[Dict] = None  # Additional context


# Helper function to create audit log
async def create_audit_log(
    user: dict,
    action: str,
    entity_type: str,
    entity_id: str,
    entity_name: str,
    project_id: str = None,
    project_number: str = None,
    project_name: str = None,
    changes: List[Dict] = None,
    metadata: Dict = None
):
    audit_log = AuditLog(
        user_id=user.get("id", ""),
        user_name=user.get("name", ""),
        user_email=user.get("email", ""),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        project_id=project_id,
        project_number=project_number,
        project_name=project_name,
        changes=changes,
        metadata=metadata
    )
    doc = audit_log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.audit_logs.insert_one(doc)
    return audit_log


# Helper to detect field changes between old and new data
def detect_changes(old_data: dict, new_data: dict, fields_to_track: List[str]) -> List[Dict]:
    changes = []
    for field in fields_to_track:
        old_val = old_data.get(field)
        new_val = new_data.get(field)
        if old_val != new_val:
            changes.append({
                "field": field,
                "old_value": str(old_val) if old_val is not None else None,
                "new_value": str(new_val) if new_val is not None else None
            })
    return changes


def compute_detailed_diff(old_project: dict, new_project: dict) -> dict:
    """Compute comprehensive field-level diff between two project versions."""
    header_diff = []
    header_fields = [
        ("name", "Project Name"), ("customer_name", "Customer"), ("description", "Description"),
        ("profit_margin_percentage", "Profit Margin %"), ("nego_buffer_percentage", "Nego Buffer %"),
        ("sales_manager_name", "Sales Manager"), ("approver_email", "Approver Email"),
        ("status", "Status"),
    ]
    list_fields = [
        ("technology_names", "Technologies"), ("project_type_names", "Project Types"),
        ("project_location_names", "Locations"),
    ]
    for key, label in header_fields:
        ov, nv = old_project.get(key, ""), new_project.get(key, "")
        if str(ov) != str(nv):
            header_diff.append({"field": label, "key": key, "old_value": str(ov) if ov else "", "new_value": str(nv) if nv else ""})
    for key, label in list_fields:
        ov = sorted(old_project.get(key) or [])
        nv = sorted(new_project.get(key) or [])
        if ov != nv:
            header_diff.append({"field": label, "key": key, "old_value": ", ".join(ov), "new_value": ", ".join(nv)})

    old_waves = old_project.get("waves") or []
    new_waves = new_project.get("waves") or []

    # Match waves by name
    old_wave_map = {w.get("name", f"Wave {i}"): w for i, w in enumerate(old_waves)}
    new_wave_map = {w.get("name", f"Wave {i}"): w for i, w in enumerate(new_waves)}
    all_wave_names = list(dict.fromkeys(list(old_wave_map.keys()) + list(new_wave_map.keys())))

    wave_diffs = []
    total_res_added = total_res_removed = total_res_modified = total_alloc_changes = total_logistics_changes = 0

    for wname in all_wave_names:
        ow = old_wave_map.get(wname)
        nw = new_wave_map.get(wname)
        if not ow:
            nr = len((nw or {}).get("grid_allocations", []))
            total_res_added += nr
            wave_diffs.append({"wave_name": wname, "status": "added", "new_resources": nr, "resources": [], "config_diff": [], "logistics_diff": [], "phases_added": (nw or {}).get("phase_names", []), "phases_removed": []})
            continue
        if not nw:
            nr = len(ow.get("grid_allocations", []))
            total_res_removed += nr
            wave_diffs.append({"wave_name": wname, "status": "removed", "old_resources": nr, "resources": [], "config_diff": [], "logistics_diff": [], "phases_added": [], "phases_removed": ow.get("phase_names", [])})
            continue

        # Wave config diff
        config_diff = []
        for ck, cl in [("duration_months", "Duration (months)"), ("nego_buffer_percentage", "Nego Buffer %")]:
            ocv, ncv = ow.get(ck, 0), nw.get(ck, 0)
            if ocv != ncv:
                config_diff.append({"field": cl, "old_value": str(ocv), "new_value": str(ncv)})

        # Phase names diff
        old_phases = ow.get("phase_names", [])
        new_phases = nw.get("phase_names", [])
        phases_added = [p for p in new_phases if p not in old_phases]
        phases_removed = [p for p in old_phases if p not in new_phases]

        # Logistics diff
        logistics_diff = []
        olc = ow.get("logistics_config") or {}
        nlc = nw.get("logistics_config") or {}
        for lk, ll in [("per_diem_daily", "Per Diem ($/day)"), ("per_diem_days", "Per Diem Days"),
                        ("accommodation_daily", "Accommodation ($/day)"), ("accommodation_days", "Accommodation Days"),
                        ("local_conveyance_daily", "Conveyance ($/day)"), ("local_conveyance_days", "Conveyance Days"),
                        ("flight_cost_per_trip", "Flight Cost/Trip"), ("visa_medical_per_trip", "Visa & Medical/Trip"),
                        ("num_trips", "Number of Trips"), ("contingency_percentage", "Contingency %")]:
            olv, nlv = olc.get(lk, 0), nlc.get(lk, 0)
            if olv != nlv:
                logistics_diff.append({"field": ll, "old_value": str(olv), "new_value": str(nlv)})
                total_logistics_changes += 1

        # Resource matching: by (skill_name, proficiency_level, base_location_name)
        old_allocs = ow.get("grid_allocations") or []
        new_allocs = nw.get("grid_allocations") or []

        def make_key(a):
            return f"{a.get('skill_name','')}|{a.get('proficiency_level','')}|{a.get('base_location_name','')}"

        old_by_key = {}
        for a in old_allocs:
            k = make_key(a)
            old_by_key.setdefault(k, []).append(a)
        new_by_key = {}
        for a in new_allocs:
            k = make_key(a)
            new_by_key.setdefault(k, []).append(a)

        resources = []
        matched_new = set()

        for ok, old_list in old_by_key.items():
            new_list = new_by_key.get(ok, [])
            for idx, oa in enumerate(old_list):
                if idx < len(new_list):
                    na = new_list[idx]
                    matched_new.add(id(na))
                    field_changes = []
                    for fk, fl in [("skill_name", "Skill"), ("proficiency_level", "Level"), ("base_location_name", "Location"),
                                    ("avg_monthly_salary", "$/Month"), ("overhead_percentage", "Overhead %"),
                                    ("is_onsite", "Onsite"), ("travel_required", "Travel Required"),
                                    ("override_hourly_rate", "Override $/Hr"), ("resource_group_id", "Group ID"), ("comments", "Comments")]:
                        ofv = oa.get(fk, "")
                        nfv = na.get(fk, "")
                        if str(ofv) != str(nfv):
                            field_changes.append({"field": fl, "old_value": str(ofv) if ofv is not None else "", "new_value": str(nfv) if nfv is not None else ""})
                    # Phase allocation diff
                    old_pa = oa.get("phase_allocations") or {}
                    new_pa = na.get("phase_allocations") or {}
                    all_phases_keys = sorted(set(list(old_pa.keys()) + list(new_pa.keys())))
                    for pk in all_phases_keys:
                        opv = old_pa.get(pk, 0)
                        npv = new_pa.get(pk, 0)
                        if opv != npv:
                            # Use phase name if available
                            phase_label = pk
                            try:
                                pi = int(pk)
                                if pi < len(old_phases):
                                    phase_label = old_phases[pi]
                                elif pi < len(new_phases):
                                    phase_label = new_phases[pi]
                            except (ValueError, IndexError):
                                pass
                            field_changes.append({"field": f"Phase: {phase_label}", "old_value": str(opv), "new_value": str(npv)})
                            total_alloc_changes += 1
                    if field_changes:
                        total_res_modified += 1
                        resources.append({"status": "modified", "skill_name": oa.get("skill_name", ""), "level": oa.get("proficiency_level", ""), "location": oa.get("base_location_name", ""), "field_changes": field_changes})
                    else:
                        resources.append({"status": "unchanged", "skill_name": oa.get("skill_name", ""), "level": oa.get("proficiency_level", ""), "location": oa.get("base_location_name", ""), "field_changes": []})
                else:
                    total_res_removed += 1
                    resources.append({"status": "removed", "skill_name": oa.get("skill_name", ""), "level": oa.get("proficiency_level", ""), "location": oa.get("base_location_name", ""), "field_changes": []})

        for nk, new_list in new_by_key.items():
            for na in new_list:
                if id(na) not in matched_new:
                    total_res_added += 1
                    resources.append({"status": "added", "skill_name": na.get("skill_name", ""), "level": na.get("proficiency_level", ""), "location": na.get("base_location_name", ""), "field_changes": []})

        wave_status = "unchanged"
        if config_diff or logistics_diff or phases_added or phases_removed or any(r["status"] != "unchanged" for r in resources):
            wave_status = "modified"
        wave_diffs.append({
            "wave_name": wname, "status": wave_status, "config_diff": config_diff,
            "logistics_diff": logistics_diff, "phases_added": phases_added,
            "phases_removed": phases_removed, "resources": resources,
        })

    total_changes = len(header_diff) + total_res_added + total_res_removed + total_res_modified + total_alloc_changes + total_logistics_changes
    return {
        "summary": {
            "total_changes": total_changes, "header_changes": len(header_diff),
            "resources_added": total_res_added, "resources_removed": total_res_removed,
            "resources_modified": total_res_modified, "allocation_changes": total_alloc_changes,
            "logistics_changes": total_logistics_changes,
        },
        "header_diff": header_diff,
        "wave_diffs": wave_diffs,
    }


# Email Helper Function
async def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    """Send email via SMTP with inline YASH logo"""
    if not SMTP_HOST or not SMTP_USER:
        logging.warning("SMTP not configured, skipping email notification")
        return False
    
    try:
        from email.mime.image import MIMEImage
        
        # Use 'related' as outer type to support inline images
        msg = MIMEMultipart('related')
        msg['Subject'] = subject
        msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg['To'] = to_email
        
        # Create alternative part for text/html
        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)
        
        if text_body:
            msg_alternative.attach(MIMEText(text_body, 'plain'))
        msg_alternative.attach(MIMEText(html_body, 'html'))
        
        # Attach the YASH logo as inline image
        if os.path.exists(YASH_LOGO_PATH):
            with open(YASH_LOGO_PATH, 'rb') as img_file:
                logo = MIMEImage(img_file.read(), _subtype='png')
                logo.add_header('Content-ID', '<yash_logo>')
                logo.add_header('Content-Disposition', 'inline', filename='yash_logo.png')
                msg.attach(logo)
        
        # Connect and send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        
        logging.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


# Email templates - YASH Technologies branded (Dark Theme)
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
  <!-- Header with Logo -->
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
  <!-- Body -->
  <tr>
    <td style="background-color:{YASH_CARD_BG};padding:36px 32px;">
      {content_html}
    </td>
  </tr>
  <!-- Footer -->
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


def get_review_request_email(project_number: str, project_name: str, submitter_name: str, submitter_email: str, project_id: str = ""):
    subject = f"[YASH EstiPro] Review Request: {project_number} - {project_name}"
    project_url = f"{APP_BASE_URL}/projects/{project_id}" if project_id else APP_BASE_URL
    content = f"""
      <h2 style="margin:0 0 8px 0;color:{YASH_BRAND_RED};font-size:20px;font-weight:700;">Review Request</h2>
      <p style="margin:0 0 24px 0;color:{YASH_TEXT_SECONDARY};font-size:14px;">A project estimation has been submitted for your approval.</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#222222;border-radius:8px;border-left:4px solid {YASH_BRAND_BLUE};margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:110px;">Project No.</td>
              <td style="padding:6px 0;color:{YASH_BRAND_BLUE};font-size:15px;font-weight:600;">{project_number}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Project Name</td>
              <td style="padding:6px 0;color:{YASH_TEXT_PRIMARY};font-size:15px;">{project_name}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Submitted By</td>
              <td style="padding:6px 0;color:{YASH_TEXT_PRIMARY};font-size:15px;">{submitter_name} <span style="color:{YASH_TEXT_MUTED};">({submitter_email})</span></td>
            </tr>
          </table>
        </td></tr>
      </table>

      <p style="margin:0 0 24px 0;color:{YASH_TEXT_SECONDARY};font-size:14px;line-height:1.7;">
        Please review the estimation details and provide your approval or feedback.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:{YASH_BRAND_RED};border-radius:6px;">
            <a href="{project_url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">Review Project</a>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:{YASH_TEXT_MUTED};font-size:12px;line-height:1.6;">
        Or copy and paste this link in your browser:<br/>
        <a href="{project_url}" style="color:{YASH_BRAND_BLUE};text-decoration:underline;word-break:break-all;">{project_url}</a>
      </p>
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
    project_url = f"{APP_BASE_URL}/projects/{project_id}" if project_id else APP_BASE_URL
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
      <p style="margin:0 0 28px 0;color:{YASH_TEXT_SECONDARY};font-size:14px;text-align:center;">
        Your estimation has been <strong style="color:{status_color};">{status_text.lower()}</strong> by the reviewer.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#222222;border-radius:8px;border-left:4px solid {status_color};margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:110px;">Project No.</td>
              <td style="padding:6px 0;color:{YASH_BRAND_BLUE};font-size:15px;font-weight:600;">{project_number}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Project Name</td>
              <td style="padding:6px 0;color:{YASH_TEXT_PRIMARY};font-size:15px;">{project_name}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:{YASH_TEXT_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Reviewed By</td>
              <td style="padding:6px 0;color:{YASH_TEXT_PRIMARY};font-size:15px;">{approver_name}</td>
            </tr>
          </table>
        </td></tr>
      </table>

      {comments_html}

      <p style="margin:0 0 24px 0;color:{YASH_TEXT_SECONDARY};font-size:14px;line-height:1.7;">
        {"You can now proceed with the project execution." if is_approved else "Please review the feedback and make necessary changes before resubmitting."}
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:{YASH_BRAND_RED};border-radius:6px;">
            <a href="{project_url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">View Project</a>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:{YASH_TEXT_MUTED};font-size:12px;line-height:1.6;">
        Or copy and paste this link in your browser:<br/>
        <a href="{project_url}" style="color:{YASH_BRAND_BLUE};text-decoration:underline;word-break:break-all;">{project_url}</a>
      </p>
    """
    html_body = _email_wrapper(content, f"Project {project_number} has been {status_text.lower()}")
    text_body = f"Project {status_text}\n\nProject: {project_number}\nName: {project_name}\nReviewed by: {approver_name}\n{f'Comments: {comments}' if comments else ''}\n\nView project at: {project_url}"
    return subject, html_body, text_body


# Sales Manager Model
class SalesManager(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str = ""
    phone: str = ""
    department: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SalesManagerCreate(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    department: str = ""
    is_active: bool = True


class SalesManagerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


# Customers Routes
@api_router.post("/customers", response_model=Customer)
async def create_customer(input: CustomerCreate):
    customer_obj = Customer(**input.model_dump())
    doc = customer_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.customers.insert_one(doc)
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers():
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for customer in customers:
        if isinstance(customer['created_at'], str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    return customers

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    location_name: Optional[str] = None
    city: Optional[str] = None
    industry_vertical: Optional[str] = None
    sub_industry_vertical: Optional[str] = None


@api_router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, update: CustomerUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated


# Technologies Routes
@api_router.post("/technologies", response_model=Technology)
async def create_technology(input: TechnologyCreate):
    tech_obj = Technology(**input.model_dump())
    doc = tech_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.technologies.insert_one(doc)
    return tech_obj

@api_router.get("/technologies", response_model=List[Technology])
async def get_technologies():
    technologies = await db.technologies.find({}, {"_id": 0}).to_list(1000)
    for tech in technologies:
        if isinstance(tech['created_at'], str):
            tech['created_at'] = datetime.fromisoformat(tech['created_at'])
    return technologies

@api_router.delete("/technologies/{tech_id}")
async def delete_technology(tech_id: str):
    result = await db.technologies.delete_one({"id": tech_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Technology not found")
    return {"message": "Technology deleted successfully"}


# Project Types Routes
@api_router.post("/project-types", response_model=ProjectType)
async def create_project_type(input: ProjectTypeCreate):
    type_obj = ProjectType(**input.model_dump())
    doc = type_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.project_types.insert_one(doc)
    return type_obj

@api_router.get("/project-types", response_model=List[ProjectType])
async def get_project_types():
    types = await db.project_types.find({}, {"_id": 0}).to_list(1000)
    for ptype in types:
        if isinstance(ptype['created_at'], str):
            ptype['created_at'] = datetime.fromisoformat(ptype['created_at'])
    return types

@api_router.delete("/project-types/{type_id}")
async def delete_project_type(type_id: str):
    result = await db.project_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project type not found")
    return {"message": "Project type deleted successfully"}


# Base Locations Routes
@api_router.post("/base-locations", response_model=BaseLocation)
async def create_base_location(input: BaseLocationCreate):
    location_obj = BaseLocation(**input.model_dump())
    doc = location_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.base_locations.insert_one(doc)
    return location_obj

@api_router.get("/base-locations", response_model=List[BaseLocation])
async def get_base_locations():
    locations = await db.base_locations.find({}, {"_id": 0}).to_list(1000)
    for location in locations:
        if isinstance(location['created_at'], str):
            location['created_at'] = datetime.fromisoformat(location['created_at'])
    return locations

@api_router.delete("/base-locations/{location_id}")
async def delete_base_location(location_id: str):
    result = await db.base_locations.delete_one({"id": location_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Base location not found")
    return {"message": "Base location deleted successfully"}


# Skills Routes
@api_router.post("/skills", response_model=Skill)
async def create_skill(input: SkillCreate):
    # Check for duplicate: same skill name + technology combination
    existing = await db.skills.find_one({
        "name": input.name,
        "technology_id": input.technology_id
    }, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Skill '{input.name}' already exists for this technology"
        )
    
    skill_obj = Skill(**input.model_dump())
    doc = skill_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.skills.insert_one(doc)
    return skill_obj

@api_router.get("/skills", response_model=List[Skill])
async def get_skills():
    skills = await db.skills.find({}, {"_id": 0}).to_list(1000)
    for skill in skills:
        if isinstance(skill['created_at'], str):
            skill['created_at'] = datetime.fromisoformat(skill['created_at'])
    return skills

@api_router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str):
    result = await db.skills.delete_one({"id": skill_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.proficiency_rates.delete_many({"skill_id": skill_id})
    return {"message": "Skill deleted successfully"}


# Proficiency Rates Routes
@api_router.post("/proficiency-rates", response_model=ProficiencyRate)
async def create_proficiency_rate(input: ProficiencyRateCreate):
    # Check for duplicate: Technology + Skill + Base Location + Proficiency Level
    existing = await db.proficiency_rates.find_one({
        "skill_id": input.skill_id,
        "base_location_id": input.base_location_id,
        "proficiency_level": input.proficiency_level
    }, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Rate already exists for this Skill, Location, and Proficiency Level combination"
        )
    
    rate_obj = ProficiencyRate(**input.model_dump())
    doc = rate_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.proficiency_rates.insert_one(doc)
    return rate_obj

@api_router.get("/proficiency-rates", response_model=List[ProficiencyRate])
async def get_proficiency_rates():
    rates = await db.proficiency_rates.find({}, {"_id": 0}).to_list(1000)
    for rate in rates:
        if isinstance(rate['created_at'], str):
            rate['created_at'] = datetime.fromisoformat(rate['created_at'])
    return rates

@api_router.delete("/proficiency-rates/{rate_id}")
async def delete_proficiency_rate(rate_id: str):
    result = await db.proficiency_rates.delete_one({"id": rate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proficiency rate not found")
    return {"message": "Proficiency rate deleted successfully"}

@api_router.put("/proficiency-rates/{rate_id}")
async def update_proficiency_rate(rate_id: str, avg_monthly_salary: float):
    """Update only the salary of a proficiency rate"""
    if avg_monthly_salary <= 0:
        raise HTTPException(status_code=400, detail="Salary must be positive")
    
    result = await db.proficiency_rates.update_one(
        {"id": rate_id},
        {"$set": {"avg_monthly_salary": avg_monthly_salary}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proficiency rate not found")
    
    updated = await db.proficiency_rates.find_one({"id": rate_id}, {"_id": 0})
    return updated


# Sales Manager Routes
@api_router.post("/sales-managers", response_model=SalesManager)
async def create_sales_manager(input: SalesManagerCreate):
    manager_obj = SalesManager(**input.model_dump())
    doc = manager_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sales_managers.insert_one(doc)
    return manager_obj


@api_router.get("/sales-managers", response_model=List[SalesManager])
async def get_sales_managers(active_only: bool = False):
    query = {"is_active": True} if active_only else {}
    managers = await db.sales_managers.find(query, {"_id": 0}).to_list(1000)
    for manager in managers:
        if isinstance(manager.get('created_at'), str):
            manager['created_at'] = datetime.fromisoformat(manager['created_at'])
    return managers


@api_router.get("/sales-managers/{manager_id}", response_model=SalesManager)
async def get_sales_manager(manager_id: str):
    manager = await db.sales_managers.find_one({"id": manager_id}, {"_id": 0})
    if not manager:
        raise HTTPException(status_code=404, detail="Sales Manager not found")
    if isinstance(manager.get('created_at'), str):
        manager['created_at'] = datetime.fromisoformat(manager['created_at'])
    return manager


@api_router.put("/sales-managers/{manager_id}", response_model=SalesManager)
async def update_sales_manager(manager_id: str, input: SalesManagerUpdate):
    existing = await db.sales_managers.find_one({"id": manager_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Sales Manager not found")
    
    update_data = input.model_dump(exclude_unset=True)
    if update_data:
        await db.sales_managers.update_one({"id": manager_id}, {"$set": update_data})
    
    updated = await db.sales_managers.find_one({"id": manager_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated


@api_router.delete("/sales-managers/{manager_id}")
async def delete_sales_manager(manager_id: str):
    result = await db.sales_managers.delete_one({"id": manager_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sales Manager not found")
    return {"message": "Sales Manager deleted successfully"}


# Projects Routes
async def generate_project_number():
    """Generate a unique project number like PRJ-0001"""
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

@api_router.post("/projects", response_model=Project)
@api_router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate, user: dict = Depends(require_auth)):
    project_number = await generate_project_number()
    project_data = input.model_dump()
    project_data["project_number"] = project_number
    project_data["version"] = 1
    project_data["is_latest_version"] = True
    # Ensure waves is a list (can be None from input)
    if project_data.get("waves") is None:
        project_data["waves"] = []
    # Add audit fields
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
    
    # Create audit log for project creation
    if current_user:
        await create_audit_log(
            user=current_user,
            action="created",
            entity_type="project",
            entity_id=project_obj.id,
            entity_name=project_obj.name,
            project_id=project_obj.id,
            project_number=project_obj.project_number,
            project_name=project_obj.name,
            metadata={"version": project_obj.version}
        )
    
    return project_obj

@api_router.get("/projects", response_model=List[Project])
async def get_projects(latest_only: bool = True):
    # Handle legacy data: show projects where is_latest_version is True OR not set
    # Exclude archived projects
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
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if isinstance(project.get('updated_at'), str):
            project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    return projects


@api_router.get("/projects/archived")
async def get_archived_projects():
    """Get all archived projects"""
    projects = await db.projects.find(
        {"is_archived": True, "is_latest_version": True},
        {"_id": 0}
    ).sort("archived_at", -1).to_list(500)
    
    for p in projects:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
    return projects


@api_router.get("/projects/compare-detail")
async def compare_projects_detail(v1: str, v2: str):
    """Compute detailed field-level diff between two project versions."""
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

@api_router.get("/change-logs/{project_number}")
async def get_change_logs(project_number: str):
    """Get change history for a project."""
    logs = await db.change_logs.find({"project_number": project_number}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return logs



@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if isinstance(project.get('updated_at'), str):
        project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    return project

@api_router.get("/projects/{project_id}/versions", response_model=List[Project])
async def get_project_versions(project_id: str):
    """Get all versions of a project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Find the root project number
    project_number = project.get("project_number", "")
    if not project_number:
        return [project]
    
    # Get all versions with same project number
    versions = await db.projects.find(
        {"project_number": project_number},
        {"_id": 0}
    ).sort("version", -1).to_list(100)
    
    for v in versions:
        if isinstance(v.get('created_at'), str):
            v['created_at'] = datetime.fromisoformat(v['created_at'])
        if isinstance(v.get('updated_at'), str):
            v['updated_at'] = datetime.fromisoformat(v['updated_at'])
    return versions

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, input: ProjectUpdate, user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = input.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Compute detailed change log before update
    detailed_diff = compute_detailed_diff(existing, {**existing, **update_data})
    
    # Detect changes for audit log
    fields_to_track = ["name", "description", "status", "profit_margin_percentage", "customer_id", "customer_name", "version_notes"]
    changes = detect_changes(existing, update_data, fields_to_track)
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    # Record detailed change log if there are changes
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
    
    # Create audit log for update
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user and changes:
        await create_audit_log(
            user=current_user,
            action="updated",
            entity_type="project",
            entity_id=project_id,
            entity_name=existing.get("name", ""),
            project_id=project_id,
            project_number=existing.get("project_number", ""),
            project_name=existing.get("name", ""),
            changes=changes
        )
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return updated


@api_router.post("/projects/{project_id}/archive")
async def archive_project(project_id: str, user: dict = Depends(get_current_user)):
    """Archive a project"""
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "is_archived": True,
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create audit log
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user,
            action="archived",
            entity_type="project",
            entity_id=project_id,
            entity_name=existing.get("name", ""),
            project_id=project_id,
            project_number=existing.get("project_number", ""),
            project_name=existing.get("name", "")
        )
    
    return {"message": "Project archived successfully"}


@api_router.post("/projects/{project_id}/unarchive")
async def unarchive_project(project_id: str, user: dict = Depends(get_current_user)):
    """Unarchive a project"""
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "is_archived": False,
            "archived_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create audit log
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user,
            action="unarchived",
            entity_type="project",
            entity_id=project_id,
            entity_name=existing.get("name", ""),
            project_id=project_id,
            project_number=existing.get("project_number", ""),
            project_name=existing.get("name", "")
        )
    
    return {"message": "Project unarchived successfully"}


@api_router.post("/projects/{project_id}/new-version", response_model=Project)
async def create_new_version(project_id: str, input: ProjectUpdate, user: dict = Depends(get_current_user)):
    """Create a new version of an existing project"""
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if this is an import-triggered version (suspend old) or normal version (supersede old)
    update_data = input.model_dump(exclude_unset=True)
    is_import = update_data.pop("is_import", False) if "is_import" in update_data else False
    old_status = "suspended" if is_import else "superseded"
    
    # Mark current as not latest
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"is_latest_version": False, "status": old_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get current max version for this project number
    project_number = existing.get("project_number", "")
    max_version = await db.projects.find_one(
        {"project_number": project_number},
        {"version": 1},
        sort=[("version", -1)]
    )
    new_version = (max_version.get("version", 1) if max_version else 1) + 1
    
    # Create new version
    new_project_data = {**existing}
    new_project_data["id"] = str(uuid.uuid4())
    new_project_data["version"] = new_version
    new_project_data["is_latest_version"] = True
    new_project_data["parent_project_id"] = project_id
    new_project_data["created_at"] = datetime.now(timezone.utc)
    new_project_data["updated_at"] = datetime.now(timezone.utc)
    
    # Reset status and approval fields for new version
    new_project_data["status"] = "draft"
    new_project_data["approver_email"] = ""
    new_project_data["approval_comments"] = ""
    new_project_data["submitted_at"] = None
    new_project_data["approved_at"] = None
    
    # Apply updates (but don't allow status to be overwritten)
    update_data = input.model_dump(exclude_unset=True)
    # Remove status from update_data to prevent overwriting draft status
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
    
    # Create audit log for new version
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user,
            action="version_created",
            entity_type="project",
            entity_id=project_obj.id,
            entity_name=project_obj.name,
            project_id=project_obj.id,
            project_number=project_obj.project_number,
            project_name=project_obj.name,
            metadata={
                "new_version": new_version,
                "previous_version": existing.get("version", 1),
                "version_notes": update_data.get("version_notes", "")
            }
        )
    
    return project_obj

@api_router.post("/projects/{project_id}/clone", response_model=Project)
async def clone_project(project_id: str, user: dict = Depends(require_auth)):
    """Clone a project as a new project with new project number"""
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate new project number
    new_project_number = await generate_project_number()
    
    # Get current user info
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    
    # Create cloned project
    cloned_data = {**existing}
    cloned_data["id"] = str(uuid.uuid4())
    cloned_data["project_number"] = new_project_number
    cloned_data["version"] = 1
    cloned_data["is_latest_version"] = True
    cloned_data["parent_project_id"] = ""
    cloned_data["name"] = f"{existing.get('name', 'Project')} (Copy)"
    cloned_data["status"] = "draft"  # Reset status to draft when cloning
    cloned_data["approver_email"] = ""  # Clear approval fields
    cloned_data["approval_comments"] = ""
    cloned_data["submitted_at"] = None
    cloned_data["approved_at"] = None
    cloned_data["created_at"] = datetime.now(timezone.utc)
    cloned_data["updated_at"] = datetime.now(timezone.utc)
    # Set audit fields to current user (cloner becomes owner)
    if current_user:
        cloned_data["created_by_id"] = current_user.get("id", "")
        cloned_data["created_by_name"] = current_user.get("name", "")
        cloned_data["created_by_email"] = current_user.get("email", "")
    
    project_obj = Project(**cloned_data)
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    
    # Create audit log for clone
    if current_user:
        await create_audit_log(
            user=current_user,
            action="cloned",
            entity_type="project",
            entity_id=project_obj.id,
            entity_name=project_obj.name,
            project_id=project_obj.id,
            project_number=project_obj.project_number,
            project_name=project_obj.name,
            metadata={
                "cloned_from_id": project_id,
                "cloned_from_number": existing.get("project_number", ""),
                "cloned_from_name": existing.get("name", "")
            }
        )
    
    return project_obj

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create audit log for delete
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user,
            action="deleted",
            entity_type="project",
            entity_id=project_id,
            entity_name=existing.get("name", ""),
            project_id=project_id,
            project_number=existing.get("project_number", ""),
            project_name=existing.get("name", "")
        )
    
    return {"message": "Project deleted successfully"}


# Template endpoints
@api_router.get("/templates")
async def get_templates():
    """Get all project templates"""
    templates = await db.projects.find(
        {"is_template": True},
        {"_id": 0}
    ).sort("template_name", 1).to_list(100)
    return templates

@api_router.post("/projects/{project_id}/save-as-template")
async def save_as_template(project_id: str, template_name: str):
    """Mark a project as a template"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not template_name:
        raise HTTPException(status_code=400, detail="Template name is required")
    
    # Check if template name already exists
    existing = await db.projects.find_one({"is_template": True, "template_name": template_name})
    if existing:
        raise HTTPException(status_code=400, detail="Template with this name already exists")
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"is_template": True, "template_name": template_name}}
    )
    
    return {"message": f"Project saved as template: {template_name}"}

@api_router.post("/projects/{project_id}/remove-template")
async def remove_template(project_id: str):
    """Remove template flag from a project"""
    result = await db.projects.update_one(
        {"id": project_id},
        {"$set": {"is_template": False, "template_name": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Template removed"}

@api_router.post("/projects/create-from-template/{template_id}")
async def create_from_template(template_id: str, user: dict = Depends(require_auth)):
    """Create a new project from a template"""
    template = await db.projects.find_one({"id": template_id, "is_template": True}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get current user info
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    
    # Get next project number
    last_project = await db.projects.find_one(
        {"project_number": {"$regex": "^PRJ-"}},
        sort=[("project_number", -1)]
    )
    if last_project and last_project.get("project_number"):
        last_num = int(last_project["project_number"].split("-")[1])
        new_project_number = f"PRJ-{str(last_num + 1).zfill(4)}"
    else:
        new_project_number = "PRJ-0001"
    
    # Create new project from template
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
    # Set audit fields
    if current_user:
        new_project_data["created_by_id"] = current_user.get("id", "")
        new_project_data["created_by_name"] = current_user.get("name", "")
        new_project_data["created_by_email"] = current_user.get("email", "")
    
    # Generate new IDs for waves and allocations
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


# Submit project for review
@api_router.post("/projects/{project_id}/submit-for-review")
async def submit_for_review(project_id: str, approver_email: str, user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not approver_email:
        raise HTTPException(status_code=400, detail="Approver email is required")
    
    old_status = project.get("status", "draft")
    update_data = {
        "status": "in_review",
        "approver_email": approver_email,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    # Create audit log for status change
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user,
            action="status_change",
            entity_type="project",
            entity_id=project_id,
            entity_name=project.get("name", ""),
            project_id=project_id,
            project_number=project.get("project_number", ""),
            project_name=project.get("name", ""),
            changes=[{"field": "status", "old_value": old_status, "new_value": "in_review"}],
            metadata={"approver_email": approver_email}
        )
    
    # Create notification for approver
    notification = Notification(
        user_email=approver_email,
        type="review_request",
        title="New Project Review Request",
        message=f"Project {project.get('project_number', '')} '{project.get('name', '')}' has been submitted for your review.",
        project_id=project_id,
        project_number=project.get("project_number", "")
    )
    notif_doc = notification.model_dump()
    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
    await db.notifications.insert_one(notif_doc)
    
    # Send email notification to approver
    if current_user:
        subject, html_body, text_body = get_review_request_email(
            project.get("project_number", ""),
            project.get("name", ""),
            current_user.get("name", ""),
            current_user.get("email", ""),
            project_id
        )
        await send_email(approver_email, subject, html_body, text_body)
    
    return {"message": "Project submitted for review", "status": "in_review"}


# Approve project
@api_router.post("/projects/{project_id}/approve")
async def approve_project(project_id: str, comments: str = "", user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    old_status = project.get("status", "in_review")
    update_data = {
        "status": "approved",
        "approval_comments": comments,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    # Auto-obsolete other Draft versions of the same project number
    project_number = project.get("project_number", "")
    if project_number:
        await db.projects.update_many(
            {"project_number": project_number, "status": "draft", "id": {"$ne": project_id}},
            {"$set": {"status": "obsolete", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Create audit log for approval
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user,
            action="status_change",
            entity_type="project",
            entity_id=project_id,
            entity_name=project.get("name", ""),
            project_id=project_id,
            project_number=project.get("project_number", ""),
            project_name=project.get("name", ""),
            changes=[{"field": "status", "old_value": old_status, "new_value": "approved"}],
            metadata={"comments": comments}
        )
    
    # Create notification for submitter (using customer name as placeholder)
    notification = Notification(
        user_email=project.get("approver_email", ""),
        type="approved",
        title="Project Approved",
        message=f"Project {project.get('project_number', '')} '{project.get('name', '')}' has been approved.",
        project_id=project_id,
        project_number=project.get("project_number", "")
    )
    notif_doc = notification.model_dump()
    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
    await db.notifications.insert_one(notif_doc)
    
    # Send email notification to project creator
    creator_email = project.get("created_by_email", "")
    if creator_email and current_user:
        subject, html_body, text_body = get_approval_email(
            project.get("project_number", ""),
            project.get("name", ""),
            "approved",
            current_user.get("name", ""),
            comments,
            project_id
        )
        await send_email(creator_email, subject, html_body, text_body)
    
    return {"message": "Project approved", "status": "approved"}


@api_router.put("/projects/{project_id}/obsolete")
async def mark_project_obsolete(project_id: str, user: dict = Depends(require_auth)):
    """Mark a project as obsolete - only the creator can do this"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Only the creator can mark as obsolete
    if project.get("created_by_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the project creator can mark it as obsolete")
    
    old_status = project.get("status", "draft")
    if old_status in ("approved", "obsolete"):
        raise HTTPException(status_code=400, detail=f"Cannot mark {old_status} project as obsolete")
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"status": "obsolete", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user,
            action="status_change",
            entity_type="project",
            entity_id=project_id,
            entity_name=project.get("name", ""),
            project_id=project_id,
            project_number=project.get("project_number", ""),
            project_name=project.get("name", ""),
            changes=[{"field": "status", "old_value": old_status, "new_value": "obsolete"}],
        )
    
    return {"message": "Project marked as obsolete", "status": "obsolete"}


# Reject project
@api_router.post("/projects/{project_id}/reject")
async def reject_project(project_id: str, comments: str = "", user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    old_status = project.get("status", "in_review")
    update_data = {
        "status": "rejected",
        "approval_comments": comments,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    # Create audit log for rejection
    current_user = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if current_user:
        await create_audit_log(
            user=current_user,
            action="status_change",
            entity_type="project",
            entity_id=project_id,
            entity_name=project.get("name", ""),
            project_id=project_id,
            project_number=project.get("project_number", ""),
            project_name=project.get("name", ""),
            changes=[{"field": "status", "old_value": old_status, "new_value": "rejected"}],
            metadata={"comments": comments}
        )
    
    # Create notification
    notification = Notification(
        user_email=project.get("approver_email", ""),
        type="rejected",
        title="Project Rejected",
        message=f"Project {project.get('project_number', '')} '{project.get('name', '')}' has been rejected. Comments: {comments}",
        project_id=project_id,
        project_number=project.get("project_number", "")
    )
    notif_doc = notification.model_dump()
    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
    await db.notifications.insert_one(notif_doc)
    
    # Send email notification to project creator
    creator_email = project.get("created_by_email", "")
    if creator_email and current_user:
        subject, html_body, text_body = get_approval_email(
            project.get("project_number", ""),
            project.get("name", ""),
            "rejected",
            current_user.get("name", ""),
            comments,
            project_id
        )
        await send_email(creator_email, subject, html_body, text_body)
    
    return {"message": "Project rejected", "status": "rejected"}


# Notifications endpoints
@api_router.get("/notifications")
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


@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}


@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(user_email: str = None):
    query = {}
    if user_email:
        query["user_email"] = user_email
    await db.notifications.update_many(query, {"$set": {"is_read": True}})
    return {"message": "All notifications marked as read"}


# Audit Log endpoints
@api_router.get("/audit-logs")
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
    """Get audit logs with optional filters - admin only for all logs"""
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
    
    # Date range filter
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = f"{date_from}T00:00:00"
        if date_to:
            date_filter["$lte"] = f"{date_to}T23:59:59"
        if date_filter:
            query["timestamp"] = date_filter
    
    # Non-admins can only see their own logs or logs for projects they own
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


async def get_user_project_ids(user_id: str) -> List[str]:
    """Helper to get project IDs owned by a user"""
    projects = await db.projects.find({"created_by_id": user_id}, {"id": 1}).to_list(1000)
    return [p["id"] for p in projects]


@api_router.get("/audit-logs/project/{project_id}")
async def get_project_audit_logs(project_id: str, user: dict = Depends(get_current_user)):
    """Get all audit logs for a specific project"""
    logs = await db.audit_logs.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(500)
    
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    return logs


@api_router.get("/audit-logs/summary")
async def get_audit_summary(user: dict = Depends(require_admin)):
    """Get audit log summary statistics - admin only"""
    # Count by action type
    action_counts = await db.audit_logs.aggregate([
        {"$group": {"_id": "$action", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    # Count by user
    user_counts = await db.audit_logs.aggregate([
        {"$group": {"_id": "$user_email", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    # Recent activity (last 7 days)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_count = await db.audit_logs.count_documents({"timestamp": {"$gte": seven_days_ago}})
    
    return {
        "action_counts": {item["_id"]: item["count"] for item in action_counts},
        "top_users": [{"email": item["_id"], "count": item["count"]} for item in user_counts],
        "recent_activity_count": recent_count,
        "total_logs": await db.audit_logs.count_documents({})
    }


# Dashboard analytics endpoint
@api_router.get("/dashboard/analytics")
async def get_dashboard_analytics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    customer_id: Optional[str] = None,
    project_type_ids: Optional[str] = None,
    location_codes: Optional[str] = None,
    sales_manager_ids: Optional[str] = None
):
    # Build query based on filters
    query = {}
    
    # Date range filter - stored dates are ISO strings, so compare as strings
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = f"{date_from}T00:00:00"
        if date_to:
            date_filter["$lte"] = f"{date_to}T23:59:59"
        if date_filter:
            query["created_at"] = date_filter
    
    # Customer filter
    if customer_id:
        query["customer_id"] = customer_id
    
    # Project Type filter (comma-separated IDs)
    if project_type_ids:
        type_list = [t.strip() for t in project_type_ids.split(",") if t.strip()]
        if type_list:
            query["project_type_ids"] = {"$elemMatch": {"$in": type_list}}
    
    # Location filter (comma-separated codes)
    if location_codes:
        loc_list = [l.strip() for l in location_codes.split(",") if l.strip()]
        if loc_list:
            query["project_locations"] = {"$elemMatch": {"$in": loc_list}}
    
    # Sales Manager filter (comma-separated IDs)
    if sales_manager_ids:
        sm_list = [s.strip() for s in sales_manager_ids.split(",") if s.strip()]
        if sm_list:
            query["sales_manager_id"] = {"$in": sm_list}
    
    # Get filtered projects
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    
    # Deduplicate: Group by project_number and keep only the latest version
    project_groups = {}
    for project in projects:
        pn = project.get("project_number", "")
        if not pn:
            continue
        version = project.get("version", 1)
        if pn not in project_groups or version > project_groups[pn].get("version", 0):
            project_groups[pn] = project
    
    # Use only latest version projects for all metrics
    projects = list(project_groups.values())
    
    # Calculate metrics
    total_projects = len(projects)
    total_revenue = 0
    projects_by_status = {"draft": 0, "in_review": 0, "approved": 0, "rejected": 0}
    value_by_status = {"draft": 0, "in_review": 0, "approved": 0, "rejected": 0}
    projects_by_month = {}
    customer_revenue = {}
    
    for project in projects:
        status = project.get("status", "draft")
        projects_by_status[status] = projects_by_status.get(status, 0) + 1
        
        # Calculate project value
        project_value = 0
        waves = project.get("waves", [])
        profit_margin = project.get("profit_margin_percentage", 35)
        
        for wave in waves:
            config = wave.get("logistics_config", {})
            allocations = wave.get("grid_allocations", [])
            
            wave_base_cost = 0
            wave_logistics = 0
            traveling_mm = 0
            traveling_count = 0
            
            for alloc in allocations:
                mm = sum(alloc.get("phase_allocations", {}).values())
                salary_cost = alloc.get("avg_monthly_salary", 0) * mm
                overhead = salary_cost * (alloc.get("overhead_percentage", 0) / 100)
                wave_base_cost += salary_cost + overhead
                
                if alloc.get("travel_required", False):
                    traveling_mm += mm
                    traveling_count += 1
            
            # Calculate wave logistics for traveling resources
            if traveling_count > 0:
                per_diem = traveling_mm * config.get("per_diem_daily", 50) * config.get("per_diem_days", 30)
                accommodation = traveling_mm * config.get("accommodation_daily", 80) * config.get("accommodation_days", 30)
                conveyance = traveling_mm * config.get("local_conveyance_daily", 15) * config.get("local_conveyance_days", 21)
                flights = traveling_count * config.get("flight_cost_per_trip", 450) * config.get("num_trips", 6)
                visa = traveling_count * config.get("visa_medical_per_trip", 400) * config.get("num_trips", 6)
                subtotal = per_diem + accommodation + conveyance + flights + visa
                contingency = subtotal * (config.get("contingency_percentage", 5) / 100)
                wave_logistics = subtotal + contingency
            
            project_value += wave_base_cost + wave_logistics
        
        # Apply profit margin
        if profit_margin < 100:
            project_value = project_value / (1 - profit_margin / 100)
        
        total_revenue += project_value
        
        # Track value by status
        value_by_status[status] = value_by_status.get(status, 0) + project_value
        
        # Group by customer
        customer_name = project.get("customer_name", "Unknown")
        customer_revenue[customer_name] = customer_revenue.get(customer_name, 0) + project_value
        
        # Group by month
        created_at = project.get("created_at")
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at)
            month_key = created_at.strftime("%Y-%m")
            if month_key not in projects_by_month:
                projects_by_month[month_key] = {"count": 0, "revenue": 0}
            projects_by_month[month_key]["count"] += 1
            projects_by_month[month_key]["revenue"] += project_value
    
    # Convert to sorted list for charts
    monthly_data = [
        {"month": k, "count": v["count"], "revenue": v["revenue"]}
        for k, v in sorted(projects_by_month.items())
    ]
    
    # Top 5 customers by revenue
    top_customers = sorted(
        [{"name": k, "revenue": v} for k, v in customer_revenue.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:5]
    
    # NEW KPIs: Group by exact combination (not individual values) + include project numbers
    technology_stats = {}
    project_type_stats = {}
    location_stats = {}
    sales_manager_stats = {}
    
    for project in projects:
        project_value = 0
        waves = project.get("waves", [])
        profit_margin = project.get("profit_margin_percentage", 35)
        project_number = project.get("project_number", "")
        
        # Recalculate project value for KPIs
        for wave in waves:
            config = wave.get("logistics_config", {})
            allocations = wave.get("grid_allocations", [])
            wave_base_cost = 0
            wave_logistics = 0
            traveling_mm = 0
            traveling_count = 0
            
            for alloc in allocations:
                mm = sum(alloc.get("phase_allocations", {}).values())
                salary_cost = alloc.get("avg_monthly_salary", 0) * mm
                overhead = salary_cost * (alloc.get("overhead_percentage", 0) / 100)
                wave_base_cost += salary_cost + overhead
                if alloc.get("travel_required", False):
                    traveling_mm += mm
                    traveling_count += 1
            
            if traveling_count > 0:
                per_diem = traveling_mm * config.get("per_diem_daily", 50) * config.get("per_diem_days", 30)
                accommodation = traveling_mm * config.get("accommodation_daily", 80) * config.get("accommodation_days", 30)
                conveyance = traveling_mm * config.get("local_conveyance_daily", 15) * config.get("local_conveyance_days", 21)
                flights = traveling_count * config.get("flight_cost_per_trip", 450) * config.get("num_trips", 6)
                visa = traveling_count * config.get("visa_medical_per_trip", 400) * config.get("num_trips", 6)
                subtotal = per_diem + accommodation + conveyance + flights + visa
                contingency = subtotal * (config.get("contingency_percentage", 5) / 100)
                wave_logistics = subtotal + contingency
            
            project_value += wave_base_cost + wave_logistics
        
        if profit_margin < 100:
            project_value = project_value / (1 - profit_margin / 100)
        
        # Technology: group by sorted combination
        tech_names = sorted([t for t in project.get("technology_names", []) if t])
        tech_key = ", ".join(tech_names) if tech_names else None
        if tech_key:
            if tech_key not in technology_stats:
                technology_stats[tech_key] = {"count": 0, "value": 0, "project_numbers": set()}
            technology_stats[tech_key]["count"] += 1
            technology_stats[tech_key]["value"] += project_value
            if project_number:
                technology_stats[tech_key]["project_numbers"].add(project_number)
        
        # Project Type: group by sorted combination
        type_names = sorted([t for t in project.get("project_type_names", []) if t])
        type_key = ", ".join(type_names) if type_names else None
        if type_key:
            if type_key not in project_type_stats:
                project_type_stats[type_key] = {"count": 0, "value": 0, "project_numbers": set()}
            project_type_stats[type_key]["count"] += 1
            project_type_stats[type_key]["value"] += project_value
            if project_number:
                project_type_stats[type_key]["project_numbers"].add(project_number)
        
        # Location: group by sorted combination
        locations = sorted([l for l in project.get("project_locations", []) if l])
        loc_key = ", ".join(locations) if locations else None
        if loc_key:
            if loc_key not in location_stats:
                location_stats[loc_key] = {"count": 0, "value": 0, "project_numbers": set()}
            location_stats[loc_key]["count"] += 1
            location_stats[loc_key]["value"] += project_value
            if project_number:
                location_stats[loc_key]["project_numbers"].add(project_number)
        
        # Sales Manager breakdown
        sm_name = project.get("sales_manager_name", "")
        if sm_name:
            if sm_name not in sales_manager_stats:
                sales_manager_stats[sm_name] = {"count": 0, "value": 0, "project_numbers": set()}
            sales_manager_stats[sm_name]["count"] += 1
            sales_manager_stats[sm_name]["value"] += project_value
            if project_number:
                sales_manager_stats[sm_name]["project_numbers"].add(project_number)
    
    # Convert to sorted lists
    technology_data = sorted(
        [{"name": k, "count": v["count"], "value": v["value"], "project_numbers": sorted(v["project_numbers"])} for k, v in technology_stats.items()],
        key=lambda x: x["value"], reverse=True
    )[:10]
    
    project_type_data = sorted(
        [{"name": k, "count": v["count"], "value": v["value"], "project_numbers": sorted(v["project_numbers"])} for k, v in project_type_stats.items()],
        key=lambda x: x["value"], reverse=True
    )[:10]
    
    location_data = sorted(
        [{"name": k, "count": v["count"], "value": v["value"], "project_numbers": sorted(v["project_numbers"])} for k, v in location_stats.items()],
        key=lambda x: x["value"], reverse=True
    )[:10]
    
    sales_manager_data = sorted(
        [{"name": k, "count": v["count"], "value": v["value"], "project_numbers": sorted(v["project_numbers"])} for k, v in sales_manager_stats.items()],
        key=lambda x: x["value"], reverse=True
    )[:10]
    
    # Sales Manager Leaderboard - with approval rates
    sm_leaderboard = {}
    for project in projects:
        sm_name = project.get("sales_manager_name", "")
        if not sm_name:
            continue
        if sm_name not in sm_leaderboard:
            sm_leaderboard[sm_name] = {"total": 0, "approved": 0, "rejected": 0, "in_review": 0, "draft": 0, "value": 0}
        sm_leaderboard[sm_name]["total"] += 1
        status = project.get("status", "draft")
        sm_leaderboard[sm_name][status] = sm_leaderboard[sm_name].get(status, 0) + 1
        # Recalculate value for this project
        p_value = 0
        p_waves = project.get("waves", [])
        p_margin = project.get("profit_margin_percentage", 35)
        for wave in p_waves:
            cfg = wave.get("logistics_config", {})
            allocs = wave.get("grid_allocations", [])
            w_base = 0
            w_log = 0
            t_mm = 0
            t_cnt = 0
            for alloc in allocs:
                mm = sum(alloc.get("phase_allocations", {}).values())
                sc = alloc.get("avg_monthly_salary", 0) * mm
                oh = sc * (alloc.get("overhead_percentage", 0) / 100)
                w_base += sc + oh
                if alloc.get("travel_required", False):
                    t_mm += mm
                    t_cnt += 1
            if t_cnt > 0:
                pd = t_mm * cfg.get("per_diem_daily", 50) * cfg.get("per_diem_days", 30)
                ac = t_mm * cfg.get("accommodation_daily", 80) * cfg.get("accommodation_days", 30)
                cv = t_mm * cfg.get("local_conveyance_daily", 15) * cfg.get("local_conveyance_days", 21)
                fl = t_cnt * cfg.get("flight_cost_per_trip", 450) * cfg.get("num_trips", 6)
                vi = t_cnt * cfg.get("visa_medical_per_trip", 400) * cfg.get("num_trips", 6)
                sub = pd + ac + cv + fl + vi
                w_log = sub + sub * (cfg.get("contingency_percentage", 5) / 100)
            p_value += w_base + w_log
        if p_margin < 100:
            p_value = p_value / (1 - p_margin / 100)
        sm_leaderboard[sm_name]["value"] += p_value
    
    leaderboard_data = sorted(
        [{"name": k, "total_projects": v["total"], "approved": v["approved"], "rejected": v["rejected"],
          "in_review": v["in_review"], "draft": v["draft"], "total_value": v["value"],
          "approval_rate": round((v["approved"] / v["total"]) * 100, 1) if v["total"] > 0 else 0}
         for k, v in sm_leaderboard.items()],
        key=lambda x: x["total_value"], reverse=True
    )[:10]
    
    return {
        "total_projects": total_projects,
        "total_revenue": total_revenue,
        "projects_by_status": projects_by_status,
        "value_by_status": value_by_status,
        "monthly_data": monthly_data,
        "top_customers": top_customers,
        "technology_data": technology_data,
        "project_type_data": project_type_data,
        "location_data": location_data,
        "sales_manager_data": sales_manager_data,
        "sales_manager_leaderboard": leaderboard_data
    }


@api_router.get("/dashboard/compare")
async def compare_periods(
    period1_from: str,
    period1_to: str,
    period2_from: str,
    period2_to: str,
):
    """Compare two date periods for quarterly performance reviews."""
    async def calc_period(date_from, date_to):
        query = {"created_at": {"$gte": f"{date_from}T00:00:00", "$lte": f"{date_to}T23:59:59"}}
        all_projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
        
        # Deduplicate: Group by project_number and keep only the latest version
        project_groups = {}
        for project in all_projects:
            pn = project.get("project_number", "")
            if not pn:
                continue
            version = project.get("version", 1)
            if pn not in project_groups or version > project_groups[pn].get("version", 0):
                project_groups[pn] = project
        projects = list(project_groups.values())
        
        total_projects = len(projects)
        total_value = 0
        approved = 0
        rejected = 0
        in_review = 0
        draft = 0
        for project in projects:
            status = project.get("status", "draft")
            if status == "approved": approved += 1
            elif status == "rejected": rejected += 1
            elif status == "in_review": in_review += 1
            else: draft += 1
            pv = 0
            pm = project.get("profit_margin_percentage", 35)
            for wave in project.get("waves", []):
                cfg = wave.get("logistics_config", {})
                wb = 0; wl = 0; tm = 0; tc = 0
                for alloc in wave.get("grid_allocations", []):
                    mm = sum(alloc.get("phase_allocations", {}).values())
                    sc = alloc.get("avg_monthly_salary", 0) * mm
                    oh = sc * (alloc.get("overhead_percentage", 0) / 100)
                    wb += sc + oh
                    if alloc.get("travel_required", False):
                        tm += mm; tc += 1
                if tc > 0:
                    pd = tm * cfg.get("per_diem_daily", 50) * cfg.get("per_diem_days", 30)
                    ac = tm * cfg.get("accommodation_daily", 80) * cfg.get("accommodation_days", 30)
                    cv = tm * cfg.get("local_conveyance_daily", 15) * cfg.get("local_conveyance_days", 21)
                    fl = tc * cfg.get("flight_cost_per_trip", 450) * cfg.get("num_trips", 6)
                    vi = tc * cfg.get("visa_medical_per_trip", 400) * cfg.get("num_trips", 6)
                    sub = pd + ac + cv + fl + vi
                    wl = sub + sub * (cfg.get("contingency_percentage", 5) / 100)
                pv += wb + wl
            if pm < 100:
                pv = pv / (1 - pm / 100)
            total_value += pv
        approval_rate = round((approved / total_projects) * 100, 1) if total_projects > 0 else 0
        return {
            "total_projects": total_projects,
            "total_value": total_value,
            "approved": approved,
            "rejected": rejected,
            "in_review": in_review,
            "draft": draft,
            "approval_rate": approval_rate,
        }
    
    p1 = await calc_period(period1_from, period1_to)
    p2 = await calc_period(period2_from, period2_to)
    
    # Calculate deltas (percentage change)
    def delta(new, old):
        if old == 0: return 100.0 if new > 0 else 0.0
        return round(((new - old) / old) * 100, 1)
    
    return {
        "period1": {"from": period1_from, "to": period1_to, **p1},
        "period2": {"from": period2_from, "to": period2_to, **p2},
        "deltas": {
            "total_projects": delta(p2["total_projects"], p1["total_projects"]),
            "total_value": delta(p2["total_value"], p1["total_value"]),
            "approved": delta(p2["approved"], p1["approved"]),
            "approval_rate": round(p2["approval_rate"] - p1["approval_rate"], 1),
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@api_router.post("/download-file")
async def download_file(request: Request):
    """Store file temporarily and return download ID"""
    body = await request.body()
    filename = request.headers.get("X-Filename", "download.xlsx")
    content_type = request.headers.get("X-Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    download_id = str(uuid.uuid4())
    # Store in memory with TTL (simple dict, cleaned periodically)
    _temp_downloads[download_id] = {
        "data": body,
        "filename": filename,
        "content_type": content_type,
        "created": datetime.now(timezone.utc)
    }
    return {"download_id": download_id}

@api_router.get("/download-file/{download_id}")
async def get_download_file(download_id: str):
    """Serve the stored file as a proper HTTP download"""
    entry = _temp_downloads.pop(download_id, None)
    if not entry:
        raise HTTPException(status_code=404, detail="Download expired or not found")
    return Response(
        content=entry["data"],
        media_type=entry["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{entry["filename"]}"'}
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()