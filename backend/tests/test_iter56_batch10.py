"""
Iteration 56 - Batch of 10 fixes.
Backend coverage:
  #10 Cashflow: is_advance milestone places cash-in at target_month (no payment_terms_days offset).
       Non-advance milestone shifts by ceil(payment_terms_days/30).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@yash.com"
ADMIN_PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def test_project(headers):
    """Pick a project (latest version) that has at least one wave with >=5 months for indexing tests."""
    r = requests.get(f"{BASE_URL}/api/projects", headers=headers, timeout=15)
    assert r.status_code == 200
    projects = r.json()
    # prefer one with a wave with phase_names length >= 6
    for p in projects:
        if not p.get("is_latest_version", True):
            continue
        for w in p.get("waves", []):
            if len(w.get("phase_names", [])) >= 6:
                return {"id": p["id"], "wave_name": w["name"], "n_months": len(w["phase_names"])}
    # fallback - first latest project's first wave
    for p in projects:
        if p.get("is_latest_version", True) and p.get("waves"):
            w = p["waves"][0]
            return {"id": p["id"], "wave_name": w["name"], "n_months": len(w.get("phase_names", []))}
    pytest.skip("No project with waves available")


def test_advance_milestone_no_offset(headers, test_project):
    """#10: is_advance=true → cash-in at target_month index (no shift). Non-advance shifts by 60d -> 2 months."""
    pid = test_project["id"]
    wave_name = test_project["wave_name"]

    advance_amount = 10000
    regular_amount = 5000

    payload = {
        "milestones": [
            {
                "id": "TEST_MS_ADV",
                "name": "TEST_Advance_M3",
                "wave_name": wave_name,
                "target_month": "M3",
                "payment_amount": advance_amount,
                "payment_percentage": 0,
                "is_advance": True,
            },
            {
                "id": "TEST_MS_REG",
                "name": "TEST_Regular_M3",
                "wave_name": wave_name,
                "target_month": "M3",
                "payment_amount": regular_amount,
                "payment_percentage": 0,
                "is_advance": False,
            },
        ],
        "payment_terms_days": 60,
    }
    save = requests.put(f"{BASE_URL}/api/projects/{pid}/milestones", headers=headers, json=payload, timeout=15)
    assert save.status_code == 200, save.text

    cf = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=15)
    assert cf.status_code == 200, cf.text
    data = cf.json()
    assert data["payment_offset_months"] == 2

    wave = next(w for w in data["wave_data"] if w["wave_name"] == wave_name)
    months = wave["monthly_data"]

    # Advance: cash_in_idx = 2 (M3 -> index 2)
    m3 = months[2]
    assert m3["advance_revenue"] == advance_amount, f"Expected advance_revenue={advance_amount} at M3, got {m3}"
    assert m3["revenue"] >= advance_amount, f"M3 revenue should include advance, got {m3}"

    # Regular: cash_in_idx = 2 + 2 = 4 (M5)
    m5 = months[4]
    assert m5["revenue"] == regular_amount, f"Expected M5 revenue={regular_amount}, got {m5}"
    assert m5.get("advance_revenue", 0) == 0, "Regular milestone must not contribute to advance_revenue"

    # Total advance == advance_amount
    assert data["summary"]["total_advance"] == advance_amount


def test_non_advance_only_shifts(headers, test_project):
    """Sanity: with is_advance=False both milestones shift by payment_offset (no advance revenue)."""
    pid = test_project["id"]
    wave_name = test_project["wave_name"]
    payload = {
        "milestones": [
            {"id": "TEST_MS_R1", "name": "TEST_Reg_M2", "wave_name": wave_name,
             "target_month": "M2", "payment_amount": 3000, "payment_percentage": 0, "is_advance": False},
        ],
        "payment_terms_days": 30,
    }
    r = requests.put(f"{BASE_URL}/api/projects/{pid}/milestones", headers=headers, json=payload, timeout=15)
    assert r.status_code == 200
    cf = requests.get(f"{BASE_URL}/api/projects/{pid}/cashflow", headers=headers, timeout=15).json()
    assert cf["payment_offset_months"] == 1
    wave = next(w for w in cf["wave_data"] if w["wave_name"] == wave_name)
    # M2 idx=1, +1 offset -> idx 2 (M3)
    assert wave["monthly_data"][2]["revenue"] == 3000
    assert wave["monthly_data"][1]["revenue"] == 0
    assert cf["summary"]["total_advance"] == 0


def test_cleanup_milestones(headers, test_project):
    """Cleanup: clear test milestones."""
    pid = test_project["id"]
    r = requests.put(
        f"{BASE_URL}/api/projects/{pid}/milestones",
        headers=headers,
        json={"milestones": [], "payment_terms_days": 0},
        timeout=15,
    )
    assert r.status_code == 200
