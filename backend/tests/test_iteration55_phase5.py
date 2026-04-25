"""
Phase 5 (Iteration 55) Backend Tests
- PaymentMilestone is_advance field persistence
- GET /api/projects/{id}/cashflow returns total_advance, advance_revenue
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wave-planner-2.preview.emergentagent.com").rstrip("/")
EMAIL = "admin@yash.com"
PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    assert token, f"no token in {r.json()}"
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def project(auth_headers):
    r = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
    assert r.status_code == 200
    projs = r.json()
    assert isinstance(projs, list) and len(projs) > 0, "no projects found"
    # Pick a project that has waves
    for p in projs:
        if p.get("waves") and len(p.get("waves", [])) > 0:
            return p
    return projs[0]


# ---------- is_advance Persistence ----------

def test_milestone_is_advance_persists(auth_headers, project):
    pid = project["id"]
    # Get current milestones
    r = requests.get(f"{BASE_URL}/api/projects/{pid}/milestones", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    milestones = data.get("milestones", []) if isinstance(data, dict) else data
    if not milestones:
        # Create a basic milestone
        wave_name = project["waves"][0]["name"] if project.get("waves") else "Wave 1"
        milestones = [{
            "wave_name": wave_name,
            "milestone_name": "TEST_Adv_M1",
            "milestone_type": "payment",
            "phase_name": "Explore",
            "position": "start",
            "target_month": "M1",
            "completion_percentage": 0,
            "payment_percentage": 50,
            "payment_amount": 100000,
            "is_advance": True,
            "description": "advance test"
        }]
    else:
        milestones[0]["is_advance"] = True
        milestones[0]["payment_amount"] = milestones[0].get("payment_amount") or 100000

    body = {"milestones": milestones, "payment_terms_days": 0}
    r2 = requests.put(f"{BASE_URL}/api/projects/{pid}/milestones", headers=auth_headers, json=body)
    assert r2.status_code == 200, f"PUT failed: {r2.status_code} {r2.text}"

    # Reload
    r3 = requests.get(f"{BASE_URL}/api/projects/{pid}/milestones", headers=auth_headers)
    assert r3.status_code == 200
    payload = r3.json()
    ms_after = payload.get("milestones", []) if isinstance(payload, dict) else payload
    assert len(ms_after) >= 1
    assert ms_after[0].get("is_advance") is True, f"is_advance not persisted: {ms_after[0]}"


# ---------- Cashflow advance fields ----------

def test_cashflow_returns_advance_fields(auth_headers, project):
    pid = project["id"]
    r = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()

    # Summary contains total_advance
    assert "summary" in data
    assert "total_advance" in data["summary"], data["summary"]
    assert isinstance(data["summary"]["total_advance"], (int, float))

    # Each wave has total_advance and monthly_data has advance_revenue
    assert "wave_data" in data and len(data["wave_data"]) > 0
    for wd in data["wave_data"]:
        assert "total_advance" in wd
        for m in wd["monthly_data"]:
            assert "advance_revenue" in m

    # Combined data has advance_revenue per month
    assert "combined_data" in data
    for m in data["combined_data"]:
        assert "advance_revenue" in m


def test_cashflow_advance_revenue_equals_milestone_payment(auth_headers, project):
    """When a milestone is marked is_advance, that exact payment_amount should appear in advance_revenue"""
    pid = project["id"]

    # Get milestones and ensure exactly one milestone is_advance with known amount
    r = requests.get(f"{BASE_URL}/api/projects/{pid}/milestones", headers=auth_headers)
    assert r.status_code == 200
    payload = r.json()
    milestones = payload.get("milestones", []) if isinstance(payload, dict) else payload
    if not milestones:
        pytest.skip("No milestones to test advance amount")

    # Reset all is_advance to False, set first to True with known amount
    advance_amount = 250000
    for ms in milestones:
        ms["is_advance"] = False
    milestones[0]["is_advance"] = True
    milestones[0]["payment_amount"] = advance_amount

    body = {"milestones": milestones, "payment_terms_days": 0}
    r2 = requests.put(f"{BASE_URL}/api/projects/{pid}/milestones", headers=auth_headers, json=body)
    assert r2.status_code == 200

    # Get cashflow
    r3 = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=auth_headers)
    assert r3.status_code == 200
    data = r3.json()

    assert data["summary"]["total_advance"] == advance_amount, (
        f"total_advance={data['summary']['total_advance']} expected={advance_amount}"
    )

    # Sum of advance_revenue across all combined months equals advance_amount
    sum_combined = sum(m.get("advance_revenue", 0) for m in data["combined_data"])
    assert sum_combined == advance_amount


def test_cashflow_advance_zero_when_no_advance(auth_headers, project):
    """If no milestone is_advance, total_advance should be 0"""
    pid = project["id"]
    r = requests.get(f"{BASE_URL}/api/projects/{pid}/milestones", headers=auth_headers)
    assert r.status_code == 200
    payload = r.json()
    milestones = payload.get("milestones", []) if isinstance(payload, dict) else payload
    if not milestones:
        pytest.skip("No milestones")

    for ms in milestones:
        ms["is_advance"] = False

    body = {"milestones": milestones, "payment_terms_days": 0}
    r2 = requests.put(f"{BASE_URL}/api/projects/{pid}/milestones", headers=auth_headers, json=body)
    assert r2.status_code == 200

    r3 = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=auth_headers)
    assert r3.status_code == 200
    data = r3.json()
    assert data["summary"]["total_advance"] == 0
    for wd in data["wave_data"]:
        assert wd["total_advance"] == 0
