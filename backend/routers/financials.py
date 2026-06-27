from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
from database import db
from auth import require_auth
import math

router = APIRouter()


@router.get("/projects/{project_id}/milestones")
async def get_milestones(project_id: str, user: dict = Depends(require_auth)):
    doc = await db.payment_milestones.find_one({"project_id": project_id}, {"_id": 0})
    if not doc:
        return {"project_id": project_id, "milestones": [], "payment_terms_days": 0}
    if "payment_terms_days" not in doc:
        doc["payment_terms_days"] = 0
    return doc


@router.put("/projects/{project_id}/milestones")
async def save_milestones(project_id: str, request: Request, user: dict = Depends(require_auth)):
    body = await request.json()
    milestones = body.get("milestones", [])
    payment_terms_days = body.get("payment_terms_days", 0)
    doc = {
        "project_id": project_id,
        "milestones": milestones,
        "payment_terms_days": payment_terms_days,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("user_id", "")
    }
    await db.payment_milestones.update_one(
        {"project_id": project_id}, {"$set": doc}, upsert=True
    )
    return {"message": "Milestones saved", "milestones": milestones, "payment_terms_days": payment_terms_days}


@router.get("/projects/{project_id}/cashflow")
async def get_cashflow(project_id: str, user: dict = Depends(require_auth)):
    """Generate a cashflow statement with payment-terms-aware Cash-In shifting"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    waves = project.get("waves", [])
    milestone_doc = await db.payment_milestones.find_one({"project_id": project_id}, {"_id": 0})
    milestones = (milestone_doc or {}).get("milestones", [])
    payment_terms_days = (milestone_doc or {}).get("payment_terms_days", 0)
    payment_offset = math.ceil(payment_terms_days / 30) if payment_terms_days > 0 else 0

    wave_data = []
    max_months = 0

    for wave in waves:
        allocs = wave.get("grid_allocations", [])
        phase_names = wave.get("phase_names", [])
        lc = wave.get("logistics_config") or {}
        n_months = len(phase_names)

        # Step 1: Calculate costs per month
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

            # Logistics
            contingency_abs = (lc.get("contingency_absolute", 0) or 0) / max(n_months, 1)
            if travel_count_month > 0:
                per_diem = travel_mm_month * (lc.get("per_diem_daily", 0) or 0) * (lc.get("per_diem_days", 0) or 0)
                accom = travel_mm_month * (lc.get("accommodation_daily", 0) or 0) * (lc.get("accommodation_days", 0) or 0)
                conv = travel_mm_month * (lc.get("local_conveyance_daily", 0) or 0) * (lc.get("local_conveyance_days", 0) or 0)
                flights_per_month = (lc.get("flight_cost_per_trip", 0) or 0) * (lc.get("num_trips", 0) or 0) * travel_count_month / max(n_months, 1)
                visa_per_month = (lc.get("visa_medical_per_trip", 0) or 0) * (lc.get("num_trips", 0) or 0) * travel_count_month / max(n_months, 1)
                logistics_month = per_diem + accom + conv + flights_per_month + visa_per_month
                contingency = logistics_month * ((lc.get("contingency_percentage", 0) or 0) / 100)
                month_cost += logistics_month + contingency
            month_cost += contingency_abs

            wave_monthly.append({
                "month": month_idx + 1,
                "phase": phase_label,
                "cost": round(month_cost, 2),
                "revenue": 0,
                "advance_revenue": 0,
            })

        # Step 1b: AMS Shared Support monthly billing + cost (no margin/buffer applied)
        engagement_type = wave.get("engagement_type", "Implementation")
        if engagement_type in ("AMS_Shared", "AMS_Mix"):
            shared_buckets = wave.get("ams_shared_buckets", []) or []
            shared_monthly_billing = sum(
                (b.get("hours_per_month", 0) or 0) * (b.get("hourly_rate", 0) or 0)
                for b in shared_buckets
            )
            shared_monthly_cost = sum(
                (b.get("hours_per_month", 0) or 0) * (b.get("cost_rate", 0) or 0)
                for b in shared_buckets
            )
            # For pure AMS_Shared waves, extend wave_monthly to cover the full contract length
            if engagement_type == "AMS_Shared":
                contract_months = int(wave.get("ams_contract_months", 12) or 12)
                while len(wave_monthly) < contract_months:
                    wave_monthly.append({
                        "month": len(wave_monthly) + 1,
                        "phase": "AMS",
                        "cost": 0,
                        "revenue": 0,
                        "advance_revenue": 0,
                    })
            # Apply level monthly billing + cost across the AMS duration
            for m in wave_monthly:
                m["revenue"] = round(m["revenue"] + shared_monthly_billing, 2)
                m["ams_shared_revenue"] = round(m.get("ams_shared_revenue", 0) + shared_monthly_billing, 2)
                m["cost"] = round(m["cost"] + shared_monthly_cost, 2)
                m["ams_shared_cost"] = round(m.get("ams_shared_cost", 0) + shared_monthly_cost, 2)

        # Step 2: Assign revenue with payment term offset
        for ms in milestones:
            if ms.get("wave_name") != wave.get("name"):
                continue
            payment_amount = ms.get("payment_amount", 0) or 0
            if payment_amount <= 0:
                continue
            target_month_str = ms.get("target_month", "M1") or "M1"
            try:
                t_idx = int(target_month_str.replace("M", "")) - 1
            except (ValueError, AttributeError):
                t_idx = 0
            # Advance payments are paid in the same month as target_month (no payment terms shift)
            cash_in_idx = t_idx if ms.get("is_advance") else t_idx + payment_offset

            # Extend wave_monthly if cash-in falls beyond project duration
            while cash_in_idx >= len(wave_monthly):
                extra_num = len(wave_monthly) + 1
                wave_monthly.append({
                    "month": extra_num,
                    "phase": "",
                    "cost": 0,
                    "revenue": 0,
                    "advance_revenue": 0,
                })

            wave_monthly[cash_in_idx]["revenue"] = round(
                wave_monthly[cash_in_idx]["revenue"] + payment_amount, 2
            )
            if ms.get("is_advance"):
                wave_monthly[cash_in_idx]["advance_revenue"] = round(
                    wave_monthly[cash_in_idx].get("advance_revenue", 0) + payment_amount, 2
                )

        if len(wave_monthly) > max_months:
            max_months = len(wave_monthly)

        wave_total_cost = sum(m["cost"] for m in wave_monthly)
        wave_total_rev = sum(m["revenue"] for m in wave_monthly)
        wave_total_advance = sum(m.get("advance_revenue", 0) for m in wave_monthly)
        wave_total_ams_shared = sum(m.get("ams_shared_revenue", 0) for m in wave_monthly)
        wave_total_ams_cost = sum(m.get("ams_shared_cost", 0) for m in wave_monthly)
        wave_data.append({
            "wave_name": wave.get("name", f"Wave {len(wave_data)+1}"),
            "engagement_type": engagement_type,
            "months": n_months,
            "extended_months": len(wave_monthly),
            "monthly_data": wave_monthly,
            "total_cost": round(wave_total_cost, 2),
            "total_revenue": round(wave_total_rev, 2),
            "total_advance": round(wave_total_advance, 2),
            "total_ams_shared": round(wave_total_ams_shared, 2),
            "total_ams_cost": round(wave_total_ams_cost, 2),
            "net": round(wave_total_rev - wave_total_cost, 2),
        })

    # Combined summary across all waves
    combined = []
    running = 0
    for m_idx in range(max_months):
        cost_sum = 0
        rev_sum = 0
        adv_sum = 0
        ams_sum = 0
        phase_label = ""
        for wd in wave_data:
            if m_idx < len(wd["monthly_data"]):
                cost_sum += wd["monthly_data"][m_idx]["cost"]
                rev_sum += wd["monthly_data"][m_idx]["revenue"]
                adv_sum += wd["monthly_data"][m_idx].get("advance_revenue", 0)
                ams_sum += wd["monthly_data"][m_idx].get("ams_shared_revenue", 0)
                if not phase_label and wd["monthly_data"][m_idx].get("phase"):
                    phase_label = wd["monthly_data"][m_idx]["phase"]
        net = rev_sum - cost_sum
        running += net
        combined.append({
            "month": m_idx + 1, "phase": phase_label,
            "cost": round(cost_sum, 2), "revenue": round(rev_sum, 2),
            "advance_revenue": round(adv_sum, 2),
            "ams_shared_revenue": round(ams_sum, 2),
            "net": round(net, 2), "cumulative": round(running, 2),
        })

    total_cost = sum(m["cost"] for m in combined)
    total_revenue = sum(m["revenue"] for m in combined)
    total_advance = sum(m.get("advance_revenue", 0) for m in combined)
    total_ams_shared = sum(wd.get("total_ams_shared", 0) for wd in wave_data)
    total_ams_cost = sum(wd.get("total_ams_cost", 0) for wd in wave_data)

    return {
        "project_id": project_id,
        "project_name": project.get("name", ""),
        "project_number": project.get("project_number", ""),
        "payment_terms_days": payment_terms_days,
        "payment_offset_months": payment_offset,
        "wave_data": wave_data,
        "combined_data": combined,
        "summary": {
            "total_cost": round(total_cost, 2),
            "total_revenue": round(total_revenue, 2),
            "total_advance": round(total_advance, 2),
            "total_ams_shared": round(total_ams_shared, 2),
            "total_ams_cost": round(total_ams_cost, 2),
            "net_cashflow": round(total_revenue - total_cost, 2),
        }
    }
