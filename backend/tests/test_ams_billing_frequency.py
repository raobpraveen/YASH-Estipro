"""
Test AMS billing frequency (Monthly|Quarterly) + Bill in Advance cashflow logic.
- Monthly + Arrears: revenue lands at month_end + payment_offset (default = month itself if 0 days).
- Monthly + Advance: revenue lands at the start of each month (period_start).
- Quarterly + Arrears: revenue is bunched every 3rd month with payment offset.
- Quarterly + Advance: revenue lands on the first month of each quarter, advance_revenue set.
"""
import os
import requests

API = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001") + "/api"


def _login():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@yash.com", "password": "password"})
    r.raise_for_status()
    return r.json()["token"]


def _create_project(token, billing_frequency, billing_advance, contract_months=12, payment_terms_days=0):
    headers = {"Authorization": f"Bearer {token}"}
    body = {
        "name": f"AMS BillingFreq Test {billing_frequency}{'-Adv' if billing_advance else ''}",
        "description": "Auto-test",
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
            "ams_contract_months": contract_months,
            "ams_billing_frequency": billing_frequency,
            "ams_billing_advance": billing_advance,
        }],
    }
    r = requests.post(f"{API}/projects", json=body, headers=headers)
    r.raise_for_status()
    pid = r.json()["id"]
    # Set payment terms
    requests.put(f"{API}/projects/{pid}/milestones", json={"milestones": [], "payment_terms_days": payment_terms_days}, headers=headers)
    return pid


def _get_cashflow(token, pid):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{API}/projects/{pid}/cashflow", headers=headers)
    r.raise_for_status()
    return r.json()


def _delete(token, pid):
    requests.delete(f"{API}/projects/{pid}", headers={"Authorization": f"Bearer {token}"})


def test_monthly_advance_no_terms():
    """Monthly + Advance: revenue at M1, M2, ... = 2000 each month (100 hrs * $20)"""
    token = _login()
    pid = _create_project(token, "Monthly", billing_advance=True, contract_months=3, payment_terms_days=0)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        assert len(months) == 3, f"expected 3 months, got {len(months)}"
        for i, m in enumerate(months):
            assert m["revenue"] == 2000.0, f"M{i+1} revenue={m['revenue']} (want 2000)"
            assert m["advance_revenue"] == 2000.0, f"M{i+1} advance_revenue={m['advance_revenue']}"
            assert m["ams_shared_revenue"] == 2000.0
            assert m["cost"] == 1500.0  # 100 * 15
        print("PASS: monthly+advance")
    finally:
        _delete(token, pid)


def test_quarterly_advance():
    """Quarterly + Advance: revenue ONLY at M1 (period start), $6000 = 3 * 2000"""
    token = _login()
    pid = _create_project(token, "Quarterly", billing_advance=True, contract_months=6, payment_terms_days=0)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        # Quarterly with 6-month contract → 2 quarterly periods
        # Q1 advance: M1 gets 6000; M2, M3: 0; Q2 advance: M4 gets 6000; M5, M6: 0
        assert months[0]["revenue"] == 6000.0, f"M1 revenue={months[0]['revenue']}"
        assert months[0]["advance_revenue"] == 6000.0
        assert months[1]["revenue"] == 0
        assert months[2]["revenue"] == 0
        assert months[3]["revenue"] == 6000.0, f"M4 revenue={months[3]['revenue']}"
        assert months[3]["advance_revenue"] == 6000.0
        assert months[4]["revenue"] == 0
        assert months[5]["revenue"] == 0
        # Costs still level monthly
        for m in months:
            assert m["cost"] == 1500.0
        print("PASS: quarterly+advance")
    finally:
        _delete(token, pid)


def test_quarterly_arrears_with_30day_terms():
    """Quarterly + Arrears + 30-day terms: payment_offset=1.
       Q1 covers M1-M3, cash-in lands at M3 + 1 = M4.
       Q2 covers M4-M6, cash-in lands at M6 + 1 = M7. (extends the wave by 1)
    """
    token = _login()
    pid = _create_project(token, "Quarterly", billing_advance=False, contract_months=6, payment_terms_days=30)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        # Sum revenue & verify positions
        assert months[3]["revenue"] == 6000.0, f"M4 (Q1+30d): {months[3]['revenue']}"
        # Q2 lands at M7 (auto-extended)
        m7 = next((m for m in months if m["month"] == 7), None)
        assert m7 is not None, "month 7 should have been created"
        assert m7["revenue"] == 6000.0, f"M7 (Q2+30d): {m7['revenue']}"
        # No advance flags
        assert months[0]["advance_revenue"] == 0
        assert m7["advance_revenue"] == 0
        # Total ams_shared revenue = 12000
        assert w["total_ams_shared"] == 12000.0
        print("PASS: quarterly+arrears+30days")
    finally:
        _delete(token, pid)


def test_monthly_arrears_with_60day_terms():
    """Monthly + Arrears + 60-day terms: payment_offset=2.
       M1 revenue lands at M1 + 2 = M3, M2 at M4, etc.
    """
    token = _login()
    pid = _create_project(token, "Monthly", billing_advance=False, contract_months=3, payment_terms_days=60)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        # Original 3 months + 2 extension = 5 months
        assert len(months) >= 5, f"expected >=5 months, got {len(months)}"
        # M1, M2: no revenue
        assert months[0]["revenue"] == 0
        assert months[1]["revenue"] == 0
        # M3: M1's billing
        assert months[2]["revenue"] == 2000.0, f"M3 revenue={months[2]['revenue']}"
        # M4: M2's billing
        assert months[3]["revenue"] == 2000.0
        # M5: M3's billing
        assert months[4]["revenue"] == 2000.0
        # Total ams_shared = 6000
        assert w["total_ams_shared"] == 6000.0
        print("PASS: monthly+arrears+60days")
    finally:
        _delete(token, pid)


if __name__ == "__main__":
    test_monthly_advance_no_terms()
    test_quarterly_advance()
    test_quarterly_arrears_with_30day_terms()
    test_monthly_arrears_with_60day_terms()
    print("\nAll AMS billing frequency tests PASSED ✓")
