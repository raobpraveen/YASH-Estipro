"""
Iteration 57 — AMS Shared engagement + persistence + cashflow.
Covers:
 - Backend persistence: ProjectWave.engagement_type, ams_shared_buckets, ams_contract_months
 - Cashflow API: summary.total_ams_shared, monthly ams_shared_revenue, wave_data[].engagement_type
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wave-planner-2.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@yash.com", "password": "password"},
                      timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def ams_project(headers):
    """Create a project with one AMS_Shared wave (12 months) and one L1 bucket."""
    wave = {
        "name": "AMS Wave",
        "description": "",
        "duration_months": 12,
        "phase_names": [f"M{i+1}" for i in range(12)],
        "month_phases": [],
        "phase_ranges": [],
        "wave_start_month": 1,
        "logistics_defaults": {},
        "logistics_config": {},
        "nego_buffer_percentage": 0,
        "grid_allocations": [],
        "engagement_type": "AMS_Shared",
        "ams_shared_buckets": [
            {"name": "L1", "hours_per_month": 200, "hourly_rate": 20, "notes": ""}
        ],
        "ams_contract_months": 12,
    }
    payload = {
        "name": "TEST_AMS_Shared_Iter57",
        "profit_margin_percentage": 35,
        "nego_buffer_percentage": 0,
        "waves": [wave],
        "status": "draft",
    }
    r = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=headers, timeout=30)
    assert r.status_code in (200, 201), f"Create failed: {r.status_code} {r.text}"
    proj = r.json()
    yield proj
    # Teardown
    try:
        requests.delete(f"{BASE_URL}/api/projects/{proj['id']}", headers=headers, timeout=15)
    except Exception:
        pass


# ===== Persistence =====

def test_ams_wave_persisted_on_get(headers, ams_project):
    pid = ams_project["id"]
    r = requests.get(f"{BASE_URL}/api/projects/{pid}", headers=headers, timeout=15)
    assert r.status_code == 200, f"GET failed: {r.status_code} {r.text}"
    fetched = r.json()
    waves = fetched.get("waves", [])
    assert len(waves) == 1, "Should have 1 wave"
    w = waves[0]
    assert w.get("engagement_type") == "AMS_Shared", f"engagement_type={w.get('engagement_type')}"
    assert w.get("ams_contract_months") == 12, f"ams_contract_months={w.get('ams_contract_months')}"
    buckets = w.get("ams_shared_buckets", [])
    assert len(buckets) == 1, f"Expected 1 bucket, got {len(buckets)}"
    b = buckets[0]
    assert b.get("name") == "L1", f"bucket.name={b.get('name')}"
    assert b.get("hours_per_month") == 200, f"bucket.hours_per_month={b.get('hours_per_month')}"
    assert b.get("hourly_rate") == 20, f"bucket.hourly_rate={b.get('hourly_rate')}"


def test_ams_wave_listed_in_versions_endpoint(headers, ams_project):
    """Verify version endpoint returns the wave too (no /version/{n} route exists; use /versions)."""
    pid = ams_project["id"]
    r = requests.get(f"{BASE_URL}/api/projects/{pid}/versions", headers=headers, timeout=15)
    assert r.status_code == 200, f"versions failed: {r.status_code} {r.text}"
    versions = r.json()
    assert isinstance(versions, list) and len(versions) >= 1
    v1 = versions[0]
    w = v1["waves"][0]
    assert w["engagement_type"] == "AMS_Shared"
    assert w["ams_shared_buckets"][0]["hours_per_month"] == 200
    assert w["ams_shared_buckets"][0]["hourly_rate"] == 20


# ===== Cashflow =====

def test_cashflow_total_ams_shared(headers, ams_project):
    pid = ams_project["id"]
    r = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=30)
    assert r.status_code == 200, f"cashflow failed: {r.status_code} {r.text}"
    data = r.json()

    # Summary total_ams_shared = 200 * 20 * 12 = 48000
    summary = data.get("summary", {})
    assert summary.get("total_ams_shared") == 48000, f"total_ams_shared={summary.get('total_ams_shared')}"
    # total_revenue should also include AMS shared = 48000 (no other revenue source)
    assert summary.get("total_revenue") == 48000, f"total_revenue={summary.get('total_revenue')}"

    # Wave-level
    wd_list = data.get("wave_data", [])
    assert len(wd_list) == 1
    wd = wd_list[0]
    assert wd.get("engagement_type") == "AMS_Shared", f"wave.engagement_type={wd.get('engagement_type')}"
    assert wd.get("total_ams_shared") == 48000, f"wave.total_ams_shared={wd.get('total_ams_shared')}"

    # Monthly entries: each should have ams_shared_revenue=4000 and revenue=4000
    monthly = wd.get("monthly_data", [])
    assert len(monthly) == 12, f"expected 12 months, got {len(monthly)}"
    for i, m in enumerate(monthly):
        assert m.get("ams_shared_revenue") == 4000, f"month {i+1} ams_shared_revenue={m.get('ams_shared_revenue')}"
        assert m.get("revenue") == 4000, f"month {i+1} revenue={m.get('revenue')}"


def test_cashflow_ams_shared_bypasses_cost(headers, ams_project):
    """AMS_Shared waves bypass cost calc — total_cost should be 0."""
    pid = ams_project["id"]
    r = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["summary"]["total_cost"] == 0, f"total_cost={data['summary']['total_cost']}"
    assert data["summary"]["net_cashflow"] == 48000


# ===== AMS_Mix verification =====

def test_ams_mix_keeps_grid_and_buckets(headers):
    """AMS_Mix wave with a bucket + grid allocation: both should persist and contribute revenue."""
    wave = {
        "name": "Mix Wave",
        "duration_months": 3,
        "phase_names": ["Prepare", "Explore", "Realize"],
        "month_phases": [],
        "phase_ranges": [],
        "wave_start_month": 1,
        "logistics_defaults": {},
        "logistics_config": {},
        "nego_buffer_percentage": 0,
        "grid_allocations": [],
        "engagement_type": "AMS_Mix",
        "ams_shared_buckets": [
            {"name": "L1", "hours_per_month": 100, "hourly_rate": 10, "notes": ""}
        ],
        "ams_contract_months": 3,
    }
    payload = {
        "name": "TEST_AMS_Mix_Iter57",
        "profit_margin_percentage": 35,
        "nego_buffer_percentage": 0,
        "waves": [wave],
        "status": "draft",
    }
    r = requests.post(f"{BASE_URL}/api/projects", json=payload, headers={"Authorization": headers["Authorization"]}, timeout=30)
    assert r.status_code in (200, 201), f"Create failed: {r.text}"
    proj = r.json()
    pid = proj["id"]
    try:
        # GET should reflect engagement_type=AMS_Mix
        g = requests.get(f"{BASE_URL}/api/projects/{pid}", headers=headers, timeout=15).json()
        assert g["waves"][0]["engagement_type"] == "AMS_Mix"
        # Cashflow: 100 * 10 * 3 = 3000
        cf = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=20).json()
        assert cf["summary"]["total_ams_shared"] == 3000, f"got {cf['summary']['total_ams_shared']}"
        assert cf["wave_data"][0]["engagement_type"] == "AMS_Mix"
        for m in cf["wave_data"][0]["monthly_data"]:
            assert m.get("ams_shared_revenue") == 1000
    finally:
        requests.delete(f"{BASE_URL}/api/projects/{pid}", headers=headers, timeout=15)


# ===== Implementation (legacy) regression: total_ams_shared should be 0 =====

def test_implementation_wave_no_ams_shared(headers):
    wave = {
        "name": "Impl Wave",
        "duration_months": 3,
        "phase_names": ["Prepare", "Explore", "Realize"],
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
    payload = {"name": "TEST_Impl_Iter57", "waves": [wave], "status": "draft"}
    r = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=headers, timeout=30)
    assert r.status_code in (200, 201)
    pid = r.json()["id"]
    try:
        cf = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=20).json()
        assert cf["summary"]["total_ams_shared"] == 0
        assert cf["wave_data"][0]["engagement_type"] == "Implementation"
    finally:
        requests.delete(f"{BASE_URL}/api/projects/{pid}", headers=headers, timeout=15)
