"""Iteration 59: verify cost_rate flows through cashflow → ams_shared_cost + summary.total_ams_cost."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@yash.com", "password": "password"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def project_id(headers):
    payload = {
        "name": "TEST_Iter59_CostRate_Cashflow",
        "profit_margin_percentage": 35.0,
        "nego_buffer_percentage": 0.0,
        "waves": [
            {
                "name": "AMS Shared Wave",
                "duration_months": 12,
                "engagement_type": "AMS_Shared",
                "ams_contract_months": 12,
                "ams_shared_buckets": [
                    {"name": "L1 Tickets", "hours_per_month": 250, "hourly_rate": 18, "cost_rate": 20, "notes": ""}
                ],
                "phase_names": [],
                "grid_allocations": [],
                "logistics_config": {},
            }
        ],
    }
    r = requests.post(f"{API}/projects", json=payload, headers=headers, timeout=15)
    assert r.status_code in (200, 201), r.text
    pid = r.json()["id"]
    yield pid
    requests.delete(f"{API}/projects/{pid}", headers=headers, timeout=15)


def test_persistence_cost_rate(headers, project_id):
    r = requests.get(f"{API}/projects/{project_id}", headers=headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    bucket = data["waves"][0]["ams_shared_buckets"][0]
    assert bucket["cost_rate"] == 20
    assert bucket["hours_per_month"] == 250
    assert bucket["hourly_rate"] == 18


def test_cashflow_ams_shared_cost_and_total(headers, project_id):
    r = requests.get(f"{API}/projects/{project_id}/cashflow", headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    cf = r.json()

    # summary.total_ams_cost = 250 * 20 * 12 = 60000
    assert cf["summary"]["total_ams_cost"] == 60000, f"got {cf['summary']['total_ams_cost']}"
    # summary.total_ams_shared (revenue) = 250 * 18 * 12 = 54000
    assert cf["summary"]["total_ams_shared"] == 54000
    # summary.total_cost should include the AMS cost
    assert cf["summary"]["total_cost"] >= 60000

    wd = cf["wave_data"][0]
    assert wd["engagement_type"] == "AMS_Shared"
    assert wd["total_ams_cost"] == 60000

    months = wd["monthly_data"]
    assert len(months) == 12
    for m in months:
        assert m["ams_shared_cost"] == 5000, f"month {m['month']} got {m['ams_shared_cost']}"
        assert m["cost"] >= 5000  # at least the AMS cost
        assert m["ams_shared_revenue"] == 4500  # 250 * 18


def test_cashflow_non_ams_zero_cost(headers):
    payload = {
        "name": "TEST_Iter59_Impl",
        "waves": [
            {
                "name": "Impl Wave",
                "duration_months": 3,
                "engagement_type": "Implementation",
                "phase_names": ["Prepare", "Explore", "Realize"],
                "grid_allocations": [],
                "logistics_config": {},
            }
        ],
    }
    r = requests.post(f"{API}/projects", json=payload, headers=headers, timeout=15)
    assert r.status_code in (200, 201)
    pid = r.json()["id"]
    try:
        cf = requests.get(f"{API}/projects/{pid}/cashflow", headers=headers, timeout=15).json()
        assert cf["summary"]["total_ams_cost"] == 0
        assert cf["summary"]["total_ams_shared"] == 0
        for m in cf["wave_data"][0]["monthly_data"]:
            assert m.get("ams_shared_cost", 0) == 0
    finally:
        requests.delete(f"{API}/projects/{pid}", headers=headers, timeout=15)
