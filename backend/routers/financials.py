from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
from database import db
from auth import require_auth

router = APIRouter()


@router.get("/projects/{project_id}/milestones")
async def get_milestones(project_id: str, user: dict = Depends(require_auth)):
    doc = await db.payment_milestones.find_one({"project_id": project_id}, {"_id": 0})
    if not doc:
        return {"project_id": project_id, "milestones": []}
    return doc


@router.put("/projects/{project_id}/milestones")
async def save_milestones(project_id: str, request: Request, user: dict = Depends(require_auth)):
    body = await request.json()
    milestones = body.get("milestones", [])
    doc = {
        "project_id": project_id,
        "milestones": milestones,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("user_id", "")
    }
    await db.payment_milestones.update_one(
        {"project_id": project_id}, {"$set": doc}, upsert=True
    )
    return {"message": "Milestones saved", "milestones": milestones}


@router.get("/projects/{project_id}/cashflow")
async def get_cashflow(project_id: str, user: dict = Depends(require_auth)):
    """Generate a cashflow statement for the project with per-wave breakdown"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    profit_margin = project.get("profit_margin_percentage", 35)
    waves = project.get("waves", [])
    milestone_doc = await db.payment_milestones.find_one({"project_id": project_id}, {"_id": 0})
    milestones = (milestone_doc or {}).get("milestones", [])

    wave_data = []
    max_months = 0

    for wave in waves:
        allocs = wave.get("grid_allocations", [])
        phase_names = wave.get("phase_names", [])
        lc = wave.get("logistics_config") or {}
        n_months = len(phase_names)
        if n_months > max_months:
            max_months = n_months

        wave_monthly = []
        for month_idx in range(n_months):
            phase_label = phase_names[month_idx] if month_idx < len(phase_names) else ""
            month_cost = 0
            travel_mm_month = 0
            travel_count_month = 0
            for alloc in allocs:
                pa = alloc.get("phase_allocations", {})
                mm = 0
                if isinstance(pa, dict):
                    mm = pa.get(str(month_idx), 0)
                elif isinstance(pa, list) and month_idx < len(pa):
                    mm = pa[month_idx]
                salary = alloc.get("avg_monthly_salary", 0) or 0
                oh_pct = alloc.get("overhead_percentage", 0) or 0
                base = salary * mm
                overhead = base * (oh_pct / 100)
                month_cost += base + overhead
                if alloc.get("travel_required") and mm > 0:
                    travel_mm_month += mm
                    travel_count_month += 1

            if travel_count_month > 0:
                per_diem = travel_mm_month * (lc.get("per_diem_daily", 0) or 0) * (lc.get("per_diem_days", 0) or 0)
                accom = travel_mm_month * (lc.get("accommodation_daily", 0) or 0) * (lc.get("accommodation_days", 0) or 0)
                conv = travel_mm_month * (lc.get("local_conveyance_daily", 0) or 0) * (lc.get("local_conveyance_days", 0) or 0)
                flights_per_month = (lc.get("flight_cost_per_trip", 0) or 0) * (lc.get("num_trips", 0) or 0) * travel_count_month / max(n_months, 1)
                visa_per_month = (lc.get("visa_medical_per_trip", 0) or 0) * (lc.get("num_trips", 0) or 0) * travel_count_month / max(n_months, 1)
                logistics_month = per_diem + accom + conv + flights_per_month + visa_per_month
                contingency = logistics_month * ((lc.get("contingency_percentage", 0) or 0) / 100)
                contingency_abs = (lc.get("contingency_absolute", 0) or 0) / max(n_months, 1)
                month_cost += logistics_month + contingency + contingency_abs

            month_revenue = 0
            for ms in milestones:
                if ms.get("wave_name") != wave.get("name"):
                    continue
                payment_amount = ms.get("payment_amount", 0) or 0
                target_month_str = ms.get("target_month", "M1") or "M1"
                try:
                    t_idx = int(target_month_str.replace("M", "")) - 1
                except (ValueError, AttributeError):
                    t_idx = 0
                if t_idx == month_idx and payment_amount > 0:
                    month_revenue += payment_amount

            wave_monthly.append({
                "month": month_idx + 1,
                "phase": phase_label,
                "cost": round(month_cost, 2),
                "revenue": round(month_revenue, 2),
            })

        wave_total_cost = sum(m["cost"] for m in wave_monthly)
        wave_total_rev = sum(m["revenue"] for m in wave_monthly)
        wave_data.append({
            "wave_name": wave.get("name", f"Wave {len(wave_data)+1}"),
            "months": n_months,
            "monthly_data": wave_monthly,
            "total_cost": round(wave_total_cost, 2),
            "total_revenue": round(wave_total_rev, 2),
            "net": round(wave_total_rev - wave_total_cost, 2),
        })

    combined = []
    running = 0
    for m_idx in range(max_months):
        cost_sum = 0
        rev_sum = 0
        phase_label = ""
        for wd in wave_data:
            if m_idx < len(wd["monthly_data"]):
                cost_sum += wd["monthly_data"][m_idx]["cost"]
                rev_sum += wd["monthly_data"][m_idx]["revenue"]
                if not phase_label and wd["monthly_data"][m_idx].get("phase"):
                    phase_label = wd["monthly_data"][m_idx]["phase"]
        net = rev_sum - cost_sum
        running += net
        combined.append({
            "month": m_idx + 1, "phase": phase_label,
            "cost": round(cost_sum, 2), "revenue": round(rev_sum, 2),
            "net": round(net, 2), "cumulative": round(running, 2),
        })

    total_cost = sum(m["cost"] for m in combined)
    total_revenue = sum(m["revenue"] for m in combined)

    return {
        "project_id": project_id,
        "project_name": project.get("name", ""),
        "project_number": project.get("project_number", ""),
        "wave_data": wave_data,
        "combined_data": combined,
        "summary": {
            "total_cost": round(total_cost, 2),
            "total_revenue": round(total_revenue, 2),
            "net_cashflow": round(total_revenue - total_cost, 2),
        }
    }
