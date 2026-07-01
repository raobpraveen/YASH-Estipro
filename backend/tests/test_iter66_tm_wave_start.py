"""Iter 66 — verify T&M waves honor wave_start_month for both cost and milestone revenue placement."""
import os
import requests

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"


def _login():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@yash.com", "password": "password"})
    r.raise_for_status()
    return r.json()["token"]


def _cleanup(token, pid):
    requests.delete(f"{API}/projects/{pid}", headers={"Authorization": f"Bearer {token}"})


def test_tm_wave_start_month_shifts_cost_and_milestone_revenue():
    """T&M wave, 3 months, wave_start_month=6, 1 resource $3000/mo × 3 phase_allocations of 1.0.
       Cost per month: $3000 × 1 + 30% overhead = $3900.
       Cost must land at project M6, M7, M8 (not M1, M2, M3).
       One milestone at target_month="M2" (wave-local) with $10000, 60-day terms, NOT advance.
       Expected cash-in: M2_local shifts to project M7 → +60d (2 months) → project M9."""
    token = _login()
    headers = {"Authorization": f"Bearer {token}"}
    body = {
        "name": "T&M Wave-Start Iter66",
        "description": "",
        "waves": [{
            "name": "W1",
            "duration_months": 3,
            "phase_names": ["Prep", "Build", "Deploy"],
            "logistics_config": {},
            "nego_buffer_percentage": 0,
            "wave_start_month": 6,
            "engagement_type": "Implementation",
            "grid_allocations": [{
                "id": "a1",
                "skill_id": "test-skill",
                "skill_name": "Dev",
                "proficiency_level": "Mid",
                "base_location_id": "test-loc",
                "base_location_name": "India",
                "avg_monthly_salary": 3000,
                "overhead_percentage": 30,
                "travel_required": False,
                "phase_allocations": {"0": 1.0, "1": 1.0, "2": 1.0},
            }],
        }],
    }
    r = requests.post(f"{API}/projects", json=body, headers=headers)
    r.raise_for_status()
    pid = r.json()["id"]
    try:
        # Add milestone + 60-day terms
        ms_payload = {
            "milestones": [{
                "wave_name": "W1",
                "description": "Explore",
                "target_month": "M2",
                "payment_amount": 10000,
                "is_advance": False,
            }],
            "payment_terms_days": 60,
        }
        requests.put(f"{API}/projects/{pid}/milestones", json=ms_payload, headers=headers).raise_for_status()

        r = requests.get(f"{API}/projects/{pid}/cashflow", headers=headers)
        r.raise_for_status()
        cf = r.json()
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        # M1..M5 zero
        for i in range(5):
            assert months[i]["cost"] == 0, f"M{i+1} cost={months[i]['cost']} (must be 0)"
            assert months[i]["revenue"] == 0
        # M6, M7, M8: cost 3900 each
        for i, absm in [(5, 6), (6, 7), (7, 8)]:
            assert months[i]["cost"] == 3900.0, f"M{absm} cost={months[i]['cost']} (want 3900)"
        # Milestone M2 wave-local = project M7. +60d = project M9. Row index 8.
        m9 = next((m for m in months if m["month"] == 9), None)
        assert m9 is not None, "M9 must exist"
        assert m9["revenue"] == 10000.0, f"M9 revenue={m9['revenue']} (want 10000 for M2+60d)"
        assert m9["advance_revenue"] == 0
        print("PASS: T&M wave_start_month=6 shifts cost to M6-M8 and milestone M2 to cash-in M9")
    finally:
        _cleanup(token, pid)


def test_tm_wave_start_month_1_baseline():
    """T&M wave with wave_start_month=1: behavior identical to pre-Iter66 (M1..Mn cost + milestone-relative)."""
    token = _login()
    headers = {"Authorization": f"Bearer {token}"}
    body = {
        "name": "T&M Baseline Iter66",
        "description": "",
        "waves": [{
            "name": "W1",
            "duration_months": 2,
            "phase_names": ["A", "B"],
            "logistics_config": {},
            "nego_buffer_percentage": 0,
            "wave_start_month": 1,
            "engagement_type": "Implementation",
            "grid_allocations": [{
                "id": "a1",
                "skill_id": "test-skill",
                "skill_name": "Dev",
                "proficiency_level": "Mid",
                "base_location_id": "test-loc",
                "base_location_name": "India",
                "avg_monthly_salary": 2000,
                "overhead_percentage": 20,
                "travel_required": False,
                "phase_allocations": {"0": 1.0, "1": 1.0},
            }],
        }],
    }
    r = requests.post(f"{API}/projects", json=body, headers=headers)
    r.raise_for_status()
    pid = r.json()["id"]
    try:
        r = requests.get(f"{API}/projects/{pid}/cashflow", headers=headers)
        cf = r.json()
        months = cf["wave_data"][0]["monthly_data"]
        # M1, M2 cost = 2000*1 + 400 = 2400
        assert months[0]["cost"] == 2400.0
        assert months[1]["cost"] == 2400.0
        print("PASS: T&M wave_start_month=1 baseline unchanged")
    finally:
        _cleanup(token, pid)


def test_tm_advance_milestone_with_offset():
    """T&M milestone with is_advance=True must NOT apply payment_offset, but MUST still shift by wave_offset."""
    token = _login()
    headers = {"Authorization": f"Bearer {token}"}
    body = {
        "name": "T&M Advance Milestone",
        "description": "",
        "waves": [{
            "name": "W1",
            "duration_months": 3,
            "phase_names": ["A", "B", "C"],
            "logistics_config": {},
            "nego_buffer_percentage": 0,
            "wave_start_month": 4,
            "engagement_type": "Implementation",
            "grid_allocations": [],
        }],
    }
    r = requests.post(f"{API}/projects", json=body, headers=headers).json()
    pid = r["id"]
    try:
        requests.put(f"{API}/projects/{pid}/milestones", json={
            "milestones": [{
                "wave_name": "W1", "description": "Advance",
                "target_month": "M1", "payment_amount": 5000, "is_advance": True,
            }],
            "payment_terms_days": 90,
        }, headers=headers).raise_for_status()
        cf = requests.get(f"{API}/projects/{pid}/cashflow", headers=headers).json()
        months = cf["wave_data"][0]["monthly_data"]
        # Advance milestone M1 (wave-local) + wave_offset 3 = project M4, no payment shift.
        assert months[3]["revenue"] == 5000.0, f"M4 revenue={months[3]['revenue']}"
        assert months[3]["advance_revenue"] == 5000.0
        print("PASS: T&M advance milestone honors wave_start_month, ignores payment terms")
    finally:
        _cleanup(token, pid)


if __name__ == "__main__":
    test_tm_wave_start_month_shifts_cost_and_milestone_revenue()
    test_tm_wave_start_month_1_baseline()
    test_tm_advance_milestone_with_offset()
    print("\nAll T&M wave_start_month tests PASSED ✓")
