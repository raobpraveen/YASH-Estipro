from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from database import db
from models import (
    Customer, CustomerCreate, CustomerUpdate,
    Technology, TechnologyCreate,
    SubTechnology, SubTechnologyCreate,
    ProjectType, ProjectTypeCreate,
    BaseLocation, BaseLocationCreate,
    Skill, SkillCreate,
    ProficiencyRate, ProficiencyRateCreate,
    SalesManager, SalesManagerCreate, SalesManagerUpdate,
    Competency, CompetencyCreate,
    BillingEntity, BillingEntityCreate,
    ApprovalMatrix, ApprovalMatrixUpsert,
)

router = APIRouter()


# ========== Customers ==========

@router.post("/customers", response_model=Customer)
async def create_customer(input: CustomerCreate):
    customer_obj = Customer(**input.model_dump())
    doc = customer_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.customers.insert_one(doc)
    return customer_obj

@router.get("/customers", response_model=List[Customer])
async def get_customers():
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for customer in customers:
        if isinstance(customer['created_at'], str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    return customers

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}

@router.put("/customers/{customer_id}")
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


# ========== Technologies ==========

@router.post("/technologies", response_model=Technology)
async def create_technology(input: TechnologyCreate):
    tech_obj = Technology(**input.model_dump())
    doc = tech_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.technologies.insert_one(doc)
    return tech_obj

@router.get("/technologies", response_model=List[Technology])
async def get_technologies():
    technologies = await db.technologies.find({}, {"_id": 0}).to_list(1000)
    for tech in technologies:
        if isinstance(tech['created_at'], str):
            tech['created_at'] = datetime.fromisoformat(tech['created_at'])
    return technologies

@router.delete("/technologies/{tech_id}")
async def delete_technology(tech_id: str):
    result = await db.technologies.delete_one({"id": tech_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Technology not found")
    return {"message": "Technology deleted successfully"}


# ========== Sub-Technologies ==========

@router.post("/sub-technologies", response_model=SubTechnology)
async def create_sub_technology(input: SubTechnologyCreate):
    sub_tech = SubTechnology(**input.model_dump())
    doc = sub_tech.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sub_technologies.insert_one(doc)
    return sub_tech

@router.get("/sub-technologies", response_model=List[SubTechnology])
async def get_sub_technologies():
    items = await db.sub_technologies.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@router.delete("/sub-technologies/{sub_tech_id}")
async def delete_sub_technology(sub_tech_id: str):
    result = await db.sub_technologies.delete_one({"id": sub_tech_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sub-technology not found")
    return {"message": "Sub-technology deleted successfully"}

@router.put("/sub-technologies/{sub_tech_id}")
async def update_sub_technology(sub_tech_id: str, input: dict):
    name = input.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    result = await db.sub_technologies.update_one(
        {"id": sub_tech_id},
        {"$set": {"name": name}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sub-technology not found")
    return {"message": "Sub-technology updated successfully"}


# ========== Project Types ==========

@router.post("/project-types", response_model=ProjectType)
async def create_project_type(input: ProjectTypeCreate):
    type_obj = ProjectType(**input.model_dump())
    doc = type_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.project_types.insert_one(doc)
    return type_obj

@router.get("/project-types", response_model=List[ProjectType])
async def get_project_types():
    types = await db.project_types.find({}, {"_id": 0}).to_list(1000)
    for ptype in types:
        if isinstance(ptype['created_at'], str):
            ptype['created_at'] = datetime.fromisoformat(ptype['created_at'])
    return types

@router.delete("/project-types/{type_id}")
async def delete_project_type(type_id: str):
    result = await db.project_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project type not found")
    return {"message": "Project type deleted successfully"}


# ========== Base Locations ==========

@router.post("/base-locations", response_model=BaseLocation)
async def create_base_location(input: BaseLocationCreate):
    location_obj = BaseLocation(**input.model_dump())
    doc = location_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.base_locations.insert_one(doc)
    return location_obj

@router.get("/base-locations", response_model=List[BaseLocation])
async def get_base_locations():
    locations = await db.base_locations.find({}, {"_id": 0}).to_list(1000)
    for location in locations:
        if isinstance(location['created_at'], str):
            location['created_at'] = datetime.fromisoformat(location['created_at'])
    return locations

@router.delete("/base-locations/{location_id}")
async def delete_base_location(location_id: str):
    result = await db.base_locations.delete_one({"id": location_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Base location not found")
    return {"message": "Base location deleted successfully"}

@router.put("/base-locations/{location_id}")
async def update_base_location(location_id: str, input: dict):
    overhead = input.get("overhead_percentage")
    if overhead is None:
        raise HTTPException(status_code=400, detail="Overhead percentage is required")
    result = await db.base_locations.update_one(
        {"id": location_id},
        {"$set": {"overhead_percentage": float(overhead)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Base location not found")
    return {"message": "Base location updated successfully"}


# ========== Skills ==========

@router.post("/skills", response_model=Skill)
async def create_skill(input: SkillCreate):
    existing = await db.skills.find_one({"name": input.name, "technology_id": input.technology_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail=f"Skill '{input.name}' already exists for this technology")
    skill_obj = Skill(**input.model_dump())
    doc = skill_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.skills.insert_one(doc)
    return skill_obj

@router.get("/skills", response_model=List[Skill])
async def get_skills():
    skills = await db.skills.find({}, {"_id": 0}).to_list(1000)
    for skill in skills:
        if isinstance(skill['created_at'], str):
            skill['created_at'] = datetime.fromisoformat(skill['created_at'])
    return skills

@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str):
    result = await db.skills.delete_one({"id": skill_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.proficiency_rates.delete_many({"skill_id": skill_id})
    return {"message": "Skill deleted successfully"}


# ========== Proficiency Rates ==========

@router.post("/proficiency-rates", response_model=ProficiencyRate)
async def create_proficiency_rate(input: ProficiencyRateCreate):
    existing = await db.proficiency_rates.find_one({
        "skill_id": input.skill_id, "base_location_id": input.base_location_id,
        "proficiency_level": input.proficiency_level
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Rate already exists for this Skill, Location, and Proficiency Level combination")
    rate_obj = ProficiencyRate(**input.model_dump())
    doc = rate_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.proficiency_rates.insert_one(doc)
    return rate_obj

@router.get("/proficiency-rates", response_model=List[ProficiencyRate])
async def get_proficiency_rates():
    rates = await db.proficiency_rates.find({}, {"_id": 0}).to_list(1000)
    for rate in rates:
        if isinstance(rate['created_at'], str):
            rate['created_at'] = datetime.fromisoformat(rate['created_at'])
    return rates

@router.delete("/proficiency-rates/{rate_id}")
async def delete_proficiency_rate(rate_id: str):
    result = await db.proficiency_rates.delete_one({"id": rate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proficiency rate not found")
    return {"message": "Proficiency rate deleted successfully"}

@router.put("/proficiency-rates/{rate_id}")
async def update_proficiency_rate(rate_id: str, avg_monthly_salary: float):
    if avg_monthly_salary <= 0:
        raise HTTPException(status_code=400, detail="Salary must be positive")
    result = await db.proficiency_rates.update_one({"id": rate_id}, {"$set": {"avg_monthly_salary": avg_monthly_salary}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proficiency rate not found")
    updated = await db.proficiency_rates.find_one({"id": rate_id}, {"_id": 0})
    return updated


# ========== Sales Managers ==========

@router.post("/sales-managers", response_model=SalesManager)
async def create_sales_manager(input: SalesManagerCreate):
    manager_obj = SalesManager(**input.model_dump())
    doc = manager_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sales_managers.insert_one(doc)
    return manager_obj

@router.get("/sales-managers", response_model=List[SalesManager])
async def get_sales_managers(active_only: bool = False):
    query = {"is_active": True} if active_only else {}
    managers = await db.sales_managers.find(query, {"_id": 0}).to_list(1000)
    for manager in managers:
        if isinstance(manager.get('created_at'), str):
            manager['created_at'] = datetime.fromisoformat(manager['created_at'])
    return managers

@router.get("/sales-managers/{manager_id}", response_model=SalesManager)
async def get_sales_manager(manager_id: str):
    manager = await db.sales_managers.find_one({"id": manager_id}, {"_id": 0})
    if not manager:
        raise HTTPException(status_code=404, detail="Sales Manager not found")
    if isinstance(manager.get('created_at'), str):
        manager['created_at'] = datetime.fromisoformat(manager['created_at'])
    return manager

@router.put("/sales-managers/{manager_id}", response_model=SalesManager)
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

@router.delete("/sales-managers/{manager_id}")
async def delete_sales_manager(manager_id: str):
    result = await db.sales_managers.delete_one({"id": manager_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sales Manager not found")
    return {"message": "Sales Manager deleted successfully"}


# ========== Competencies ==========

@router.post("/competencies", response_model=Competency)
async def create_competency(input: CompetencyCreate):
    competency = Competency(**input.model_dump())
    await db.competencies.insert_one(competency.model_dump())
    return competency

@router.get("/competencies", response_model=List[Competency])
async def get_competencies():
    items = await db.competencies.find({}, {"_id": 0}).to_list(1000)
    return items

@router.put("/competencies/{comp_id}")
async def update_competency(comp_id: str, input: dict):
    name = input.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    update_data = {"name": name}
    if "description" in input:
        update_data["description"] = input["description"]
    result = await db.competencies.update_one({"id": comp_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Competency not found")
    return {"message": "Competency updated successfully"}

@router.delete("/competencies/{comp_id}")
async def delete_competency(comp_id: str):
    result = await db.competencies.delete_one({"id": comp_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Competency not found")
    return {"message": "Competency deleted successfully"}


# ========== Billing Entities ==========

@router.post("/billing-entities", response_model=BillingEntity)
async def create_billing_entity(input: BillingEntityCreate):
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    entity = BillingEntity(**input.model_dump())
    await db.billing_entities.insert_one(entity.model_dump())
    return entity

@router.get("/billing-entities", response_model=List[BillingEntity])
async def get_billing_entities():
    items = await db.billing_entities.find({}, {"_id": 0}).to_list(1000)
    return items

@router.put("/billing-entities/{entity_id}")
async def update_billing_entity(entity_id: str, input: dict):
    name = input.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    update_data = {"name": name}
    for key in ("code", "country", "description"):
        if key in input:
            update_data[key] = input[key]
    result = await db.billing_entities.update_one({"id": entity_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Billing entity not found")
    return {"message": "Billing entity updated successfully"}

@router.delete("/billing-entities/{entity_id}")
async def delete_billing_entity(entity_id: str):
    result = await db.billing_entities.delete_one({"id": entity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Billing entity not found")
    return {"message": "Billing entity deleted successfully"}


# ========== Approval Matrix (per Billing Entity, multi-level) ==========

@router.get("/approval-matrices", response_model=List[ApprovalMatrix])
async def list_approval_matrices():
    items = await db.approval_matrices.find({}, {"_id": 0}).to_list(500)
    return items

@router.get("/approval-matrices/{billing_entity_id}", response_model=ApprovalMatrix)
async def get_approval_matrix(billing_entity_id: str):
    m = await db.approval_matrices.find_one({"billing_entity_id": billing_entity_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="No approval matrix for this billing entity")
    return m

@router.put("/approval-matrices")
async def upsert_approval_matrix(input: ApprovalMatrixUpsert):
    # Enforce max 5 levels; drop empty levels; sort by level ascending
    levels = [lvl.model_dump() for lvl in input.levels if lvl.approver_emails]
    levels.sort(key=lambda x: x.get("level", 99))
    if len(levels) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 approval levels allowed")
    entity = await db.billing_entities.find_one({"id": input.billing_entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail="Billing entity not found")
    doc = {
        "billing_entity_id": input.billing_entity_id,
        "billing_entity_name": entity.get("name", ""),
        "levels": levels,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    existing = await db.approval_matrices.find_one({"billing_entity_id": input.billing_entity_id}, {"_id": 0})
    if existing:
        await db.approval_matrices.update_one({"billing_entity_id": input.billing_entity_id}, {"$set": doc})
        doc["id"] = existing.get("id")
    else:
        doc["id"] = str(uuid.uuid4())
        await db.approval_matrices.insert_one(doc)
    return {"message": "Approval matrix saved", "matrix": doc}

@router.delete("/approval-matrices/{billing_entity_id}")
async def delete_approval_matrix(billing_entity_id: str):
    result = await db.approval_matrices.delete_one({"billing_entity_id": billing_entity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Approval matrix not found")
    return {"message": "Approval matrix deleted"}
