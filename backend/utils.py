from typing import List, Dict
from datetime import datetime, timezone
from database import db
from models import AuditLog


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
        ("status", "Status"), ("crm_id", "CRM ID"),
    ]
    list_fields = [
        ("technology_names", "Technologies"), ("sub_technology_names", "Sub Technologies"),
        ("project_type_names", "Project Types"), ("project_location_names", "Locations"),
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

        config_diff = []
        for ck, cl in [("duration_months", "Duration (months)"), ("nego_buffer_percentage", "Nego Buffer %")]:
            ocv, ncv = ow.get(ck, 0), nw.get(ck, 0)
            if ocv != ncv:
                config_diff.append({"field": cl, "old_value": str(ocv), "new_value": str(ncv)})

        old_phases = ow.get("phase_names", [])
        new_phases = nw.get("phase_names", [])
        phases_added = [p for p in new_phases if p not in old_phases]
        phases_removed = [p for p in old_phases if p not in new_phases]

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
                    old_pa = oa.get("phase_allocations") or {}
                    new_pa = na.get("phase_allocations") or {}
                    all_phases_keys = sorted(set(list(old_pa.keys()) + list(new_pa.keys())))
                    for pk in all_phases_keys:
                        opv = old_pa.get(pk, 0)
                        npv = new_pa.get(pk, 0)
                        if opv != npv:
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

    def calculate_metrics(project, include_wave_metrics=False):
        waves = project.get("waves") or []
        total_resources = 0
        total_mm = 0.0
        onsite_mm = 0.0
        offshore_mm = 0.0
        onsite_cost = 0.0
        offshore_cost = 0.0
        onsite_selling = 0.0
        offshore_selling = 0.0
        total_logistics = 0.0
        profit_margin = project.get("profit_margin_percentage", 0)

        wave_metrics = []

        for wave in waves:
            wave_name = wave.get("name", "Wave")
            wave_resources = 0
            wave_mm = 0.0
            wave_onsite_mm = 0.0
            wave_offshore_mm = 0.0
            wave_onsite_cost = 0.0
            wave_offshore_cost = 0.0
            wave_onsite_selling = 0.0
            wave_offshore_selling = 0.0
            wave_logistics = 0.0

            allocs = wave.get("grid_allocations") or []
            wave_resources = len(allocs)
            total_resources += wave_resources

            for alloc in allocs:
                phase_allocs = alloc.get("phase_allocations") or {}
                mm = sum(float(v) for v in phase_allocs.values() if v)
                wave_mm += mm
                total_mm += mm
                is_onsite = alloc.get("is_onsite", False)

                salary = alloc.get("avg_monthly_salary", 0) or 0
                overhead_pct = alloc.get("overhead_percentage", 0) or 0
                base_cost = salary * mm
                overhead_cost = base_cost * (overhead_pct / 100)
                resource_cost = base_cost + overhead_cost
                margin = profit_margin / 100 if profit_margin else 0
                resource_selling = resource_cost * (1 + margin)

                if is_onsite:
                    onsite_mm += mm
                    onsite_cost += resource_cost
                    onsite_selling += resource_selling
                    wave_onsite_mm += mm
                    wave_onsite_cost += resource_cost
                    wave_onsite_selling += resource_selling
                else:
                    offshore_mm += mm
                    offshore_cost += resource_cost
                    offshore_selling += resource_selling
                    wave_offshore_mm += mm
                    wave_offshore_cost += resource_cost
                    wave_offshore_selling += resource_selling

            lc = wave.get("logistics_config") or {}
            duration = wave.get("duration_months", 0) or 0
            travel_resources = sum(1 for a in allocs if a.get("travel_required"))
            if travel_resources > 0 and duration > 0:
                per_diem = (lc.get("per_diem_daily", 0) or 0) * (lc.get("per_diem_days", 0) or 0) * duration * travel_resources
                accommodation = (lc.get("accommodation_daily", 0) or 0) * (lc.get("accommodation_days", 0) or 0) * duration * travel_resources
                conveyance = (lc.get("local_conveyance_daily", 0) or 0) * (lc.get("local_conveyance_days", 0) or 0) * duration * travel_resources
                flights = (lc.get("flight_cost_per_trip", 0) or 0) * (lc.get("num_trips", 0) or 0) * travel_resources
                visa = (lc.get("visa_medical_per_trip", 0) or 0) * (lc.get("num_trips", 0) or 0) * travel_resources
                wave_logistics = per_diem + accommodation + conveyance + flights + visa
                contingency = wave_logistics * ((lc.get("contingency_percentage", 0) or 0) / 100)
                contingency_absolute = lc.get("contingency_absolute", 0) or 0
                wave_logistics += contingency + contingency_absolute

            total_logistics += wave_logistics

            if include_wave_metrics:
                wave_metrics.append({
                    "wave_name": wave_name,
                    "resources": wave_resources,
                    "total_mm": round(wave_mm, 2),
                    "onsite_mm": round(wave_onsite_mm, 2),
                    "offshore_mm": round(wave_offshore_mm, 2),
                    "avg_onsite_cost_per_mm": round(wave_onsite_cost / wave_onsite_mm, 0) if wave_onsite_mm > 0 else 0,
                    "avg_offshore_cost_per_mm": round(wave_offshore_cost / wave_offshore_mm, 0) if wave_offshore_mm > 0 else 0,
                    "avg_onsite_selling_per_mm": round(wave_onsite_selling / wave_onsite_mm, 0) if wave_onsite_mm > 0 else 0,
                    "avg_offshore_selling_per_mm": round(wave_offshore_selling / wave_offshore_mm, 0) if wave_offshore_mm > 0 else 0,
                    "logistics": round(wave_logistics, 0),
                })

        result = {
            "total_resources": total_resources,
            "total_mm": round(total_mm, 2),
            "onsite_mm": round(onsite_mm, 2),
            "offshore_mm": round(offshore_mm, 2),
            "avg_onsite_cost_per_mm": round(onsite_cost / onsite_mm, 0) if onsite_mm > 0 else 0,
            "avg_offshore_cost_per_mm": round(offshore_cost / offshore_mm, 0) if offshore_mm > 0 else 0,
            "avg_onsite_selling_per_mm": round(onsite_selling / onsite_mm, 0) if onsite_mm > 0 else 0,
            "avg_offshore_selling_per_mm": round(offshore_selling / offshore_mm, 0) if offshore_mm > 0 else 0,
            "total_cost": round(onsite_cost + offshore_cost, 0),
            "selling_price": round(onsite_selling + offshore_selling, 0),
            "logistics": round(total_logistics, 0),
            "profit_margin": profit_margin,
        }
        if include_wave_metrics:
            result["wave_metrics"] = wave_metrics
        return result

    old_metrics = calculate_metrics(old_project, include_wave_metrics=True)
    new_metrics = calculate_metrics(new_project, include_wave_metrics=True)

    return {
        "summary": {
            "total_changes": total_changes, "header_changes": len(header_diff),
            "resources_added": total_res_added, "resources_removed": total_res_removed,
            "resources_modified": total_res_modified, "allocation_changes": total_alloc_changes,
            "logistics_changes": total_logistics_changes,
        },
        "metrics": {
            "old": old_metrics,
            "new": new_metrics,
        },
        "header_diff": header_diff,
        "wave_diffs": wave_diffs,
    }
