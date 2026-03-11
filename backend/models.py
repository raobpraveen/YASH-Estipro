from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid


# ========== User Models ==========

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


# ========== Master Data Models ==========

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

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    location_name: Optional[str] = None
    city: Optional[str] = None
    industry_vertical: Optional[str] = None
    sub_industry_vertical: Optional[str] = None

class Technology(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TechnologyCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class SubTechnology(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    technology_id: str
    technology_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubTechnologyCreate(BaseModel):
    name: str
    technology_id: str
    technology_name: str

class ProjectType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectTypeCreate(BaseModel):
    name: str

class BaseLocation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    overhead_percentage: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BaseLocationCreate(BaseModel):
    name: str
    overhead_percentage: float

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


# ========== Project Models ==========

class WaveGridAllocation(BaseModel):
    id: str = ""
    skill_id: str
    skill_name: str
    proficiency_level: str
    avg_monthly_salary: float
    original_monthly_salary: float = 0
    base_location_id: str
    base_location_name: str
    overhead_percentage: float
    is_onsite: bool = False
    travel_required: bool = False
    phase_allocations: Dict[str, float] = {}
    override_hourly_rate: Optional[float] = None
    resource_group_id: str = ""
    comments: str = ""
    per_diem_daily: float = 50
    per_diem_days: int = 30
    accommodation_daily: float = 80
    accommodation_days: int = 30
    local_conveyance_daily: float = 20
    local_conveyance_days: int = 21
    flight_cost_per_trip: float = 0
    visa_insurance_per_trip: float = 0
    num_trips: int = 0

class ProjectWave(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    duration_months: float
    phase_names: List[str] = []
    logistics_defaults: Dict[str, float] = {}
    logistics_config: Dict[str, float] = {}
    nego_buffer_percentage: float = 0
    grid_allocations: List[WaveGridAllocation] = []

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_number: str = ""
    version: int = 1
    version_notes: str = ""
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
    sub_technology_ids: List[str] = []
    sub_technology_names: List[str] = []
    project_type_id: str = ""
    project_type_name: str = ""
    project_type_ids: List[str] = []
    project_type_names: List[str] = []
    crm_id: str = ""
    description: Optional[str] = ""
    profit_margin_percentage: float = 35.0
    nego_buffer_percentage: float = 0.0
    waves: List[ProjectWave] = []
    is_latest_version: bool = True
    parent_project_id: str = ""
    is_template: bool = False
    template_name: str = ""
    status: str = "draft"
    approver_email: str = ""
    approval_comments: str = ""
    submitted_at: Optional[str] = None
    approved_at: Optional[str] = None
    submitted_by: str = ""
    approved_by: str = ""
    sales_manager_id: str = ""
    sales_manager_name: str = ""
    created_by_id: str = ""
    created_by_name: str = ""
    created_by_email: str = ""
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    visibility: str = "public"
    restricted_user_ids: List[str] = []
    restricted_user_names: List[str] = []
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
    sub_technology_ids: List[str] = []
    sub_technology_names: List[str] = []
    project_type_id: str = ""
    project_type_name: str = ""
    project_type_ids: List[str] = []
    project_type_names: List[str] = []
    crm_id: str = ""
    description: Optional[str] = ""
    profit_margin_percentage: float = 35.0
    nego_buffer_percentage: float = 0.0
    waves: Optional[List[Dict]] = None
    version_notes: str = ""
    status: str = "draft"
    approver_email: str = ""
    sales_manager_id: str = ""
    sales_manager_name: str = ""
    visibility: str = "public"
    restricted_user_ids: List[str] = []
    restricted_user_names: List[str] = []

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
    sub_technology_ids: Optional[List[str]] = None
    sub_technology_names: Optional[List[str]] = None
    project_type_id: Optional[str] = None
    project_type_name: Optional[str] = None
    project_type_ids: Optional[List[str]] = None
    project_type_names: Optional[List[str]] = None
    crm_id: Optional[str] = None
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
    is_import: Optional[bool] = None
    visibility: Optional[str] = None
    restricted_user_ids: Optional[List[str]] = None
    restricted_user_names: Optional[List[str]] = None


# ========== Notification & Audit Models ==========

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_email: str
    type: str
    title: str
    message: str
    project_id: str
    project_number: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str
    user_name: str
    user_email: str
    action: str
    entity_type: str
    entity_id: str
    entity_name: str
    project_id: Optional[str] = None
    project_number: Optional[str] = None
    project_name: Optional[str] = None
    changes: Optional[List[Dict]] = None
    metadata: Optional[Dict] = None


# ========== Financial Models ==========

class PaymentMilestone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wave_name: str
    milestone_name: str
    completion_percentage: float = 0
    payment_percentage: float = 0
    payment_amount: float = 0
    description: str = ""
