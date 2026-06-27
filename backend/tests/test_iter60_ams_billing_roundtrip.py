"""
Iter60 regression: verify ProjectWave.ams_billing_frequency + ams_billing_advance
round-trip via POST → GET, and that PUT update mutates them too.
"""
import os
import requests

API = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/") + "/api"


def _login():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@yash.com", "password": "password"})
    r.raise_for_status()
    return r.json()["token"]


def _payload(freq, adv):
    return {
        "name": f"TEST_Iter60_RT_{freq}_{adv}",
        "description": "Round trip",
        "waves": [{
            "name": "AMS RT W1",
            "description": "",
            "duration_months": 1,
            "phase_names": ["M1"],
            "logistics_config": {},
            "nego_buffer_percentage": 0,
            "grid_allocations": [],
            "engagement_type": "AMS_Shared",
            "ams_shared_buckets": [
                {"name": "L1", "hours_per_month": 50, "hourly_rate": 30, "cost_rate": 10, "notes": ""}
            ],
            "ams_contract_months": 12,
            "ams_billing_frequency": freq,
            "ams_billing_advance": adv,
        }],
    }


def test_post_get_roundtrip_monthly_advance():
    token = _login()
    h = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{API}/projects", json=_payload("Monthly", True), headers=h)
    assert r.status_code in (200, 201), r.text
    pid = r.json()["id"]
    try:
        g = requests.get(f"{API}/projects/{pid}", headers=h)
        assert g.status_code == 200
        w = g.json()["waves"][0]
        assert w["ams_billing_frequency"] == "Monthly", w
        assert w["ams_billing_advance"] is True, w
        assert w["ams_contract_months"] == 12
    finally:
        requests.delete(f"{API}/projects/{pid}", headers=h)


def test_post_get_roundtrip_quarterly_arrears():
    token = _login()
    h = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{API}/projects", json=_payload("Quarterly", False), headers=h)
    assert r.status_code in (200, 201), r.text
    pid = r.json()["id"]
    try:
        g = requests.get(f"{API}/projects/{pid}", headers=h)
        w = g.json()["waves"][0]
        assert w["ams_billing_frequency"] == "Quarterly"
        assert w["ams_billing_advance"] is False
    finally:
        requests.delete(f"{API}/projects/{pid}", headers=h)


def test_put_updates_billing_fields():
    token = _login()
    h = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{API}/projects", json=_payload("Monthly", False), headers=h)
    pid = r.json()["id"]
    try:
        proj = requests.get(f"{API}/projects/{pid}", headers=h).json()
        proj["waves"][0]["ams_billing_frequency"] = "Quarterly"
        proj["waves"][0]["ams_billing_advance"] = True
        u = requests.put(f"{API}/projects/{pid}", json=proj, headers=h)
        assert u.status_code == 200, u.text
        g = requests.get(f"{API}/projects/{pid}", headers=h).json()
        w = g["waves"][0]
        assert w["ams_billing_frequency"] == "Quarterly"
        assert w["ams_billing_advance"] is True
    finally:
        requests.delete(f"{API}/projects/{pid}", headers=h)


def test_default_values_when_omitted():
    """If client omits new fields, defaults should be Monthly + advance False."""
    token = _login()
    h = {"Authorization": f"Bearer {token}"}
    body = _payload("Monthly", False)
    del body["waves"][0]["ams_billing_frequency"]
    del body["waves"][0]["ams_billing_advance"]
    r = requests.post(f"{API}/projects", json=body, headers=h)
    assert r.status_code in (200, 201), r.text
    pid = r.json()["id"]
    try:
        g = requests.get(f"{API}/projects/{pid}", headers=h).json()
        w = g["waves"][0]
        assert w.get("ams_billing_frequency", "Monthly") == "Monthly"
        assert w.get("ams_billing_advance", False) is False
    finally:
        requests.delete(f"{API}/projects/{pid}", headers=h)


if __name__ == "__main__":
    test_post_get_roundtrip_monthly_advance()
    test_post_get_roundtrip_quarterly_arrears()
    test_put_updates_billing_fields()
    test_default_values_when_omitted()
    print("All roundtrip tests PASS")
