"""
Iter 65 regression tests:
- Non-AMS T&M waves and implementation-only projects must be completely unaffected
  by the AMS-specific wave_start_month + arrears +1-month invoice convention change.
"""
import os
import requests

API = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001") + "/api"


def _login():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@yash.com", "password": "password"})
    r.raise_for_status()
    return r.json()["token"]


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


def test_tm_implementation_only_project_unaffected():
    """Create a fresh implementation-only project with 1 T&M resource in a wave.
    Cashflow must contain per-month cost/revenue and be unaffected by the AMS block.
    Just verify wave_data exists, has monthly_data, no AMS fields populated, and
    total_ams_shared == 0.
    """
    token = _login()
    body = {
        "name": "TEST_iter65_tm_only",
        "description": "regression",
        "waves": [{
            "name": "Impl W1",
            "description": "",
            "duration_months": 3,
            "phase_names": ["M1", "M2", "M3"],
            "logistics_config": {},
            "nego_buffer_percentage": 0,
            "grid_allocations": [],
            # No engagement_type => defaults to Implementation/T&M path
        }],
    }
    r = requests.post(f"{API}/projects", json=body, headers=_headers(token))
    r.raise_for_status()
    pid = r.json()["id"]
    try:
        cf = requests.get(f"{API}/projects/{pid}/cashflow", headers=_headers(token))
        cf.raise_for_status()
        data = cf.json()
        assert "wave_data" in data
        assert len(data["wave_data"]) == 1
        w = data["wave_data"][0]
        assert "monthly_data" in w
        # No AMS shared revenue should be added
        assert w.get("total_ams_shared", 0) == 0
        # All months should have zero ams_shared_revenue
        for m in w["monthly_data"]:
            assert m.get("ams_shared_revenue", 0) == 0
            assert m.get("ams_shared_cost", 0) == 0
        print("PASS: T&M implementation-only project unaffected")
    finally:
        requests.delete(f"{API}/projects/{pid}", headers=_headers(token))


def test_ams_default_start_month_1_new_convention():
    """AMS wave with wave_start_month=1 (default), Monthly, NOT advance, 60d terms, contract=3.
    New Iter 65 convention: invoice raised month AFTER period end.
       M1 delivered → invoice M2 → +60d → M4
       M2 delivered → invoice M3 → +60d → M5
       M3 delivered → invoice M4 → +60d → M6
    Costs M1..M3 = 1500 each. total_ams_shared = 6000.
    """
    token = _login()
    body = {
        "name": "TEST_iter65_ams_default_start",
        "description": "",
        "waves": [{
            "name": "AMS W1",
            "description": "",
            "duration_months": 1,
            "phase_names": ["M1"],
            "logistics_config": {},
            "nego_buffer_percentage": 0,
            "grid_allocations": [],
            "engagement_type": "AMS_Shared",
            "ams_shared_buckets": [
                {"name": "L1", "hours_per_month": 100, "hourly_rate": 20, "cost_rate": 15, "notes": ""}
            ],
            "ams_contract_months": 3,
            "ams_billing_frequency": "Monthly",
            "ams_billing_advance": False,
            "wave_start_month": 1,
        }],
    }
    r = requests.post(f"{API}/projects", json=body, headers=_headers(token))
    r.raise_for_status()
    pid = r.json()["id"]
    try:
        requests.put(
            f"{API}/projects/{pid}/milestones",
            json={"milestones": [], "payment_terms_days": 60},
            headers=_headers(token),
        )
        cf = requests.get(f"{API}/projects/{pid}/cashflow", headers=_headers(token)).json()
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        # Costs M1..M3
        assert months[0]["cost"] == 1500.0
        assert months[1]["cost"] == 1500.0
        assert months[2]["cost"] == 1500.0
        # No revenue during service months
        assert months[0]["revenue"] == 0
        assert months[1]["revenue"] == 0
        assert months[2]["revenue"] == 0
        # M4, M5, M6 receive 2000 each
        assert months[3]["revenue"] == 2000.0, f"M4={months[3]['revenue']}"
        assert months[4]["revenue"] == 2000.0, f"M5={months[4]['revenue']}"
        assert months[5]["revenue"] == 2000.0, f"M6={months[5]['revenue']}"
        assert w["total_ams_shared"] == 6000.0
        print("PASS: AMS default start_month=1 new convention")
    finally:
        requests.delete(f"{API}/projects/{pid}", headers=_headers(token))


if __name__ == "__main__":
    test_tm_implementation_only_project_unaffected()
    test_ams_default_start_month_1_new_convention()
    print("\nAll Iter 65 regression tests PASSED ✓")
