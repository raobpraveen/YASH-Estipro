from fastapi import APIRouter
from typing import Optional
from database import db

router = APIRouter()


@router.get("/dashboard/analytics")
async def get_dashboard_analytics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    customer_id: Optional[str] = None,
    project_type_ids: Optional[str] = None,
    location_codes: Optional[str] = None,
    sales_manager_ids: Optional[str] = None
):
    query = {}
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = f"{date_from}T00:00:00"
        if date_to:
            date_filter["$lte"] = f"{date_to}T23:59:59"
        if date_filter:
            query["created_at"] = date_filter
    if customer_id:
        query["customer_id"] = customer_id
    if project_type_ids:
        type_list = [t.strip() for t in project_type_ids.split(",") if t.strip()]
        if type_list:
            query["project_type_ids"] = {"$elemMatch": {"$in": type_list}}
    if location_codes:
        loc_list = [l.strip() for l in location_codes.split(",") if l.strip()]
        if loc_list:
            query["project_locations"] = {"$elemMatch": {"$in": loc_list}}
    if sales_manager_ids:
        sm_list = [s.strip() for s in sales_manager_ids.split(",") if s.strip()]
        if sm_list:
            query["sales_manager_id"] = {"$in": sm_list}

    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)

    # Deduplicate by project_number, keep latest version
    project_groups = {}
    for project in projects:
        pn = project.get("project_number", "")
        if not pn:
            continue
        version = project.get("version", 1)
        if pn not in project_groups or version > project_groups[pn].get("version", 0):
            project_groups[pn] = project
    projects = list(project_groups.values())

    def calc_project_value(project):
        pv = 0
        pm = project.get("profit_margin_percentage", 35)
        for wave in project.get("waves", []):
            cfg = wave.get("logistics_config", {})
            allocs = wave.get("grid_allocations", [])
            wb = 0
            wl = 0
            tm = 0
            tc = 0
            for alloc in allocs:
                mm = sum(alloc.get("phase_allocations", {}).values())
                sc = alloc.get("avg_monthly_salary", 0) * mm
                oh = sc * (alloc.get("overhead_percentage", 0) / 100)
                wb += sc + oh
                if alloc.get("travel_required", False):
                    tm += mm
                    tc += 1
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
        return pv

    total_projects = len(projects)
    total_revenue = 0
    projects_by_status = {"draft": 0, "in_review": 0, "approved": 0, "rejected": 0}
    value_by_status = {"draft": 0, "in_review": 0, "approved": 0, "rejected": 0}
    projects_by_month = {}
    customer_revenue = {}
    technology_stats = {}
    project_type_stats = {}
    location_stats = {}
    sales_manager_stats = {}
    sm_leaderboard = {}

    from datetime import datetime

    for project in projects:
        status = project.get("status", "draft")
        projects_by_status[status] = projects_by_status.get(status, 0) + 1
        project_value = calc_project_value(project)
        total_revenue += project_value
        value_by_status[status] = value_by_status.get(status, 0) + project_value
        project_number = project.get("project_number", "")

        customer_name = project.get("customer_name", "Unknown")
        customer_revenue[customer_name] = customer_revenue.get(customer_name, 0) + project_value

        created_at = project.get("created_at")
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at)
            month_key = created_at.strftime("%Y-%m")
            if month_key not in projects_by_month:
                projects_by_month[month_key] = {"count": 0, "revenue": 0}
            projects_by_month[month_key]["count"] += 1
            projects_by_month[month_key]["revenue"] += project_value

        # Technology stats
        tech_names = sorted([t for t in project.get("technology_names", []) if t])
        tech_key = ", ".join(tech_names) if tech_names else None
        if tech_key:
            if tech_key not in technology_stats:
                technology_stats[tech_key] = {"count": 0, "value": 0, "project_numbers": set()}
            technology_stats[tech_key]["count"] += 1
            technology_stats[tech_key]["value"] += project_value
            if project_number:
                technology_stats[tech_key]["project_numbers"].add(project_number)

        # Project type stats
        type_names = sorted([t for t in project.get("project_type_names", []) if t])
        type_key = ", ".join(type_names) if type_names else None
        if type_key:
            if type_key not in project_type_stats:
                project_type_stats[type_key] = {"count": 0, "value": 0, "project_numbers": set()}
            project_type_stats[type_key]["count"] += 1
            project_type_stats[type_key]["value"] += project_value
            if project_number:
                project_type_stats[type_key]["project_numbers"].add(project_number)

        # Location stats
        locations = sorted([l for l in project.get("project_locations", []) if l])
        loc_key = ", ".join(locations) if locations else None
        if loc_key:
            if loc_key not in location_stats:
                location_stats[loc_key] = {"count": 0, "value": 0, "project_numbers": set()}
            location_stats[loc_key]["count"] += 1
            location_stats[loc_key]["value"] += project_value
            if project_number:
                location_stats[loc_key]["project_numbers"].add(project_number)

        # Sales manager stats
        sm_name = project.get("sales_manager_name", "")
        if sm_name:
            if sm_name not in sales_manager_stats:
                sales_manager_stats[sm_name] = {"count": 0, "value": 0, "project_numbers": set()}
            sales_manager_stats[sm_name]["count"] += 1
            sales_manager_stats[sm_name]["value"] += project_value
            if project_number:
                sales_manager_stats[sm_name]["project_numbers"].add(project_number)

            # Leaderboard
            if sm_name not in sm_leaderboard:
                sm_leaderboard[sm_name] = {"total": 0, "approved": 0, "rejected": 0, "in_review": 0, "draft": 0, "value": 0}
            sm_leaderboard[sm_name]["total"] += 1
            sm_leaderboard[sm_name][status] = sm_leaderboard[sm_name].get(status, 0) + 1
            sm_leaderboard[sm_name]["value"] += project_value

    monthly_data = [{"month": k, "count": v["count"], "revenue": v["revenue"]} for k, v in sorted(projects_by_month.items())]
    top_customers = sorted([{"name": k, "revenue": v} for k, v in customer_revenue.items()], key=lambda x: x["revenue"], reverse=True)[:5]

    technology_data = sorted([{"name": k, "count": v["count"], "value": v["value"], "project_numbers": sorted(v["project_numbers"])} for k, v in technology_stats.items()], key=lambda x: x["value"], reverse=True)[:10]
    project_type_data = sorted([{"name": k, "count": v["count"], "value": v["value"], "project_numbers": sorted(v["project_numbers"])} for k, v in project_type_stats.items()], key=lambda x: x["value"], reverse=True)[:10]
    location_data = sorted([{"name": k, "count": v["count"], "value": v["value"], "project_numbers": sorted(v["project_numbers"])} for k, v in location_stats.items()], key=lambda x: x["value"], reverse=True)[:10]
    sales_manager_data = sorted([{"name": k, "count": v["count"], "value": v["value"], "project_numbers": sorted(v["project_numbers"])} for k, v in sales_manager_stats.items()], key=lambda x: x["value"], reverse=True)[:10]

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


@router.get("/dashboard/compare")
async def compare_periods(
    period1_from: str, period1_to: str,
    period2_from: str, period2_to: str,
):
    async def calc_period(date_from, date_to):
        query = {"created_at": {"$gte": f"{date_from}T00:00:00", "$lte": f"{date_to}T23:59:59"}}
        all_projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
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
        approved = rejected = in_review = draft = 0
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
            "total_projects": total_projects, "total_value": total_value,
            "approved": approved, "rejected": rejected,
            "in_review": in_review, "draft": draft,
            "approval_rate": approval_rate,
        }

    p1 = await calc_period(period1_from, period1_to)
    p2 = await calc_period(period2_from, period2_to)

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
