"""
Iteration 58 — AMS roll-up: combined_data[].ams_shared_revenue and milestones-screen-supporting data.

Tests:
 - GET /api/projects/{id}/cashflow returns combined_data[].ams_shared_revenue (number)
 - For an AMS_Shared wave, all combined_data[] entries reflect AMS billing
 - For Implementation projects, combined_data[].ams_shared_revenue is 0 (not missing)
 - Project persistence still preserves engagement_type / ams_shared_buckets / ams_contract_months
   so the Excel export & milestones page have data to render.
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@yash.com", "password": "password"}, timeout=30)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _make_ams_wave(months=12, hpm=200, rate=20, name="L1"):
    return {
        "name": "AMS Wave",
        "duration_months": months,
        "phase_names": [f"M{i+1}" for i in range(months)],
        "month_phases": [],
        "phase_ranges": [],
        "wave_start_month": 1,
        "logistics_defaults": {},
        "logistics_config": {},
        "nego_buffer_percentage": 0,
        "grid_allocations": [],
        "engagement_type": "AMS_Shared",
        "ams_shared_buckets": [{"name": name, "hours_per_month": hpm, "hourly_rate": rate, "notes": "Tier1"}],
        "ams_contract_months": months,
    }


@pytest.fixture
def ams_project(headers):
    payload = {
        "name": "TEST_AMS_RollUp_Iter58",
        "profit_margin_percentage": 35,
        "nego_buffer_percentage": 0,
        "waves": [_make_ams_wave(12, 200, 20, "L1")],
        "status": "draft",
    }
    r = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=headers, timeout=30)
    assert r.status_code in (200, 201), r.text
    proj = r.json()
    yield proj
    requests.delete(f"{BASE_URL}/api/projects/{proj['id']}", headers=headers, timeout=15)


def test_combined_data_has_ams_shared_revenue(headers, ams_project):
    pid = ams_project["id"]
    r = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    combined = data.get("combined_data", [])
    assert len(combined) == 12, f"expected 12 combined rows, got {len(combined)}"
    for i, c in enumerate(combined):
        assert "ams_shared_revenue" in c, f"row {i} missing ams_shared_revenue"
        assert isinstance(c["ams_shared_revenue"], (int, float)), \
            f"row {i} ams_shared_revenue type={type(c['ams_shared_revenue']).__name__}"
        assert c["ams_shared_revenue"] == 4000, f"row {i} got {c['ams_shared_revenue']}"


def test_combined_data_ams_sums_to_summary(headers, ams_project):
    pid = ams_project["id"]
    data = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=30).json()
    s_combined = sum(c["ams_shared_revenue"] for c in data["combined_data"])
    assert s_combined == data["summary"]["total_ams_shared"] == 48000


def test_wave_monthly_data_has_ams_shared_revenue(headers, ams_project):
    pid = ams_project["id"]
    data = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=30).json()
    wave = data["wave_data"][0]
    for m in wave["monthly_data"]:
        assert m.get("ams_shared_revenue") == 4000


def test_implementation_project_zero_ams_in_combined(headers):
    """Non-AMS project must still have ams_shared_revenue key = 0 in combined_data rows."""
    wave = {
        "name": "Impl",
        "duration_months": 3,
        "phase_names": ["P", "E", "R"],
        "month_phases": [],
        "phase_ranges": [],
        "wave_start_month": 1,
        "logistics_defaults": {},
        "logistics_config": {},
        "nego_buffer_percentage": 0,
        "grid_allocations": [],
        "engagement_type": "Implementation",
        "ams_shared_buckets": [],
        "ams_contract_months": 12,
    }
    payload = {"name": "TEST_Impl_Iter58", "waves": [wave], "status": "draft"}
    r = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=headers, timeout=30)
    pid = r.json()["id"]
    try:
        data = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=20).json()
        for c in data["combined_data"]:
            assert c.get("ams_shared_revenue") == 0
        assert data["summary"]["total_ams_shared"] == 0
    finally:
        requests.delete(f"{BASE_URL}/api/projects/{pid}", headers=headers, timeout=15)


def test_ams_persistence_for_export_import(headers, ams_project):
    """Confirm fields needed by Excel export & milestones screen survive a round-trip."""
    pid = ams_project["id"]
    g = requests.get(f"{BASE_URL}/api/projects/{pid}", headers=headers, timeout=15).json()
    w = g["waves"][0]
    assert w["engagement_type"] == "AMS_Shared"
    assert w["ams_contract_months"] == 12
    buckets = w["ams_shared_buckets"]
    assert len(buckets) == 1
    assert buckets[0]["name"] == "L1"
    assert buckets[0]["hours_per_month"] == 200
    assert buckets[0]["hourly_rate"] == 20
    # Note field round-tripped
    assert buckets[0].get("notes") == "Tier1"
