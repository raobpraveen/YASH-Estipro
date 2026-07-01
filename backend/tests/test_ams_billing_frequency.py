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


def _create_project(token, billing_frequency, billing_advance, contract_months=12, payment_terms_days=0, wave_start_month=1):
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
            "wave_start_month": wave_start_month,
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
       New convention (Iter 65): invoice raised month AFTER period ends.
       Q1 covers M1-M3, invoice raised M4, cash-in = M4 + 30d = M5.
       Q2 covers M4-M6, invoice raised M7, cash-in = M7 + 30d = M8.
    """
    token = _login()
    pid = _create_project(token, "Quarterly", billing_advance=False, contract_months=6, payment_terms_days=30)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        # Q1 cash-in at M5 (index 4)
        assert months[4]["revenue"] == 6000.0, f"M5 (Q1 invoice M4 + 30d): {months[4]['revenue']}"
        # Q2 cash-in at M8 (index 7)
        m8 = next((m for m in months if m["month"] == 8), None)
        assert m8 is not None, "month 8 should have been created"
        assert m8["revenue"] == 6000.0, f"M8 (Q2 invoice M7 + 30d): {m8['revenue']}"
        # No advance flags
        assert months[0]["advance_revenue"] == 0
        assert m8["advance_revenue"] == 0
        # Total ams_shared revenue = 12000
        assert w["total_ams_shared"] == 12000.0
        print("PASS: quarterly+arrears+30days")
    finally:
        _delete(token, pid)


def test_monthly_arrears_with_60day_terms():
    """Monthly + Arrears + 60-day terms: payment_offset=2.
       Iter 65 convention: invoice raised month AFTER period ends.
       M1 delivered → invoice M2 → cash-in = M2 + 60d = M4.
       M2 delivered → invoice M3 → cash-in = M5.
       M3 delivered → invoice M4 → cash-in = M6.
    """
    token = _login()
    pid = _create_project(token, "Monthly", billing_advance=False, contract_months=3, payment_terms_days=60)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        assert len(months) >= 6, f"expected >=6 months, got {len(months)}"
        # M1-M3 no revenue
        assert months[0]["revenue"] == 0
        assert months[1]["revenue"] == 0
        assert months[2]["revenue"] == 0
        # M4: M1 delivered → invoice M2 + 60d = M4
        assert months[3]["revenue"] == 2000.0, f"M4 revenue={months[3]['revenue']}"
        # M5: M2 delivered → M5
        assert months[4]["revenue"] == 2000.0
        # M6: M3 delivered → M6
        assert months[5]["revenue"] == 2000.0
        assert w["total_ams_shared"] == 6000.0
        print("PASS: monthly+arrears+60days")
    finally:
        _delete(token, pid)


def test_ams_start_month_arrears_user_scenario():
    """User Iter 65 scenario:
       AMS wave starts at project M6, Monthly billing, NOT advance, payment terms 60 days.
       M6 delivered → invoice raised M7 → +60d → cash-in M9.
       Contract 3 months (M6, M7, M8) → cash-in at M9, M10, M11.
       Cost: level monthly at M6, M7, M8 (nothing before M6).
    """
    token = _login()
    pid = _create_project(token, "Monthly", billing_advance=False, contract_months=3, payment_terms_days=60, wave_start_month=6)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        # M1-M5 must be all-zero (nothing before wave_start_month)
        for i in range(5):
            assert months[i]["cost"] == 0 and months[i]["revenue"] == 0, \
                f"M{i+1} must be zero, got cost={months[i]['cost']} rev={months[i]['revenue']}"
        # M6, M7, M8: level cost = 100 * 15 = 1500
        for i in [5, 6, 7]:
            assert months[i]["cost"] == 1500.0, f"M{i+1} cost={months[i]['cost']} (want 1500)"
            assert months[i]["revenue"] == 0.0, f"M{i+1} revenue={months[i]['revenue']} (arrears — no rev here)"
        # M9 = cash-in for M6 delivered (M7 invoice + 60d = M9)
        m9 = next((m for m in months if m["month"] == 9), None)
        assert m9 is not None, "M9 should exist"
        assert m9["revenue"] == 2000.0, f"M9 revenue={m9['revenue']} (want 2000 — M6 billing)"
        assert m9["advance_revenue"] == 0.0
        # M10, M11 = cash-in for M7, M8 delivered
        m10 = next((m for m in months if m["month"] == 10), None)
        assert m10 and m10["revenue"] == 2000.0, f"M10 revenue={m10['revenue'] if m10 else None}"
        m11 = next((m for m in months if m["month"] == 11), None)
        assert m11 and m11["revenue"] == 2000.0, f"M11 revenue={m11['revenue'] if m11 else None}"
        assert w["total_ams_shared"] == 6000.0
        print("PASS: user scenario — start M6, arrears, 60d → cash-in M9/M10/M11")
    finally:
        _delete(token, pid)


def test_ams_start_month_advance():
    """Advance ON with wave_start_month=6:
       cash-in at first day of each period, absolute project month = wave_start + period_start_local.
       Monthly, 3 months → cash-in at M6, M7, M8 (each = 2000, advance_revenue set).
       No M1-M5 revenue/cost.
    """
    token = _login()
    pid = _create_project(token, "Monthly", billing_advance=True, contract_months=3, payment_terms_days=60, wave_start_month=6)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        for i in range(5):
            assert months[i]["cost"] == 0 and months[i]["revenue"] == 0, f"M{i+1} must be zero"
        # M6, M7, M8: cost 1500 AND advance revenue 2000
        for i in [5, 6, 7]:
            assert months[i]["cost"] == 1500.0
            assert months[i]["revenue"] == 2000.0, f"M{i+1} revenue={months[i]['revenue']}"
            assert months[i]["advance_revenue"] == 2000.0
        assert w["total_ams_shared"] == 6000.0
        print("PASS: start M6 + advance → cash-in M6/M7/M8")
    finally:
        _delete(token, pid)


def test_ams_start_month_quarterly_arrears():
    """Quarterly + Arrears + wave_start_month=6 + 60d terms.
       Contract 6 months. Q1 covers M6-M8 → invoice M9 → cash-in M11.
       Q2 covers M9-M11 → invoice M12 → cash-in M14.
    """
    token = _login()
    pid = _create_project(token, "Quarterly", billing_advance=False, contract_months=6, payment_terms_days=60, wave_start_month=6)
    try:
        cf = _get_cashflow(token, pid)
        w = cf["wave_data"][0]
        months = w["monthly_data"]
        # Cost span M6..M11 = 6 months × 1500
        for i in range(5):
            assert months[i]["cost"] == 0
        for i in range(5, 11):
            assert months[i]["cost"] == 1500.0, f"M{i+1} cost={months[i]['cost']}"
        m11 = next((m for m in months if m["month"] == 11), None)
        assert m11 and m11["revenue"] == 6000.0, f"M11 (Q1) revenue={m11['revenue'] if m11 else None}"
        m14 = next((m for m in months if m["month"] == 14), None)
        assert m14 and m14["revenue"] == 6000.0, f"M14 (Q2) revenue={m14['revenue'] if m14 else None}"
        assert w["total_ams_shared"] == 12000.0
        print("PASS: start M6 + quarterly arrears + 60d → M11/M14")
    finally:
        _delete(token, pid)


if __name__ == "__main__":
    test_monthly_advance_no_terms()
    test_quarterly_advance()
    test_quarterly_arrears_with_30day_terms()
    test_monthly_arrears_with_60day_terms()
    test_ams_start_month_arrears_user_scenario()
    test_ams_start_month_advance()
    test_ams_start_month_quarterly_arrears()
    print("\nAll AMS billing frequency + start-month tests PASSED ✓")
