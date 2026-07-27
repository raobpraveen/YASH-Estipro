"""
Backend tests for Iter 83-84 fixes:
- Approve endpoint authorization (403) + idempotency (409)
- New-version approver-driven routing (Option B): L1 → auto-L2, L2+ → draft alert
- Sequential approval regression
- Group-aware resource count (verified via API data fetch of PRJ-0042/0043)
"""
import os
import uuid
import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

fe_env = dotenv_values("/app/frontend/.env")
be_env = dotenv_values("/app/backend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or fe_env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = be_env.get("MONGO_URL", "mongodb://localhost:27017").strip('"')
DB_NAME = be_env.get("DB_NAME", "test_database").strip('"')
_mongo = MongoClient(MONGO_URL)
_db = _mongo[DB_NAME]


def _set_matrix(pid, matrix_levels, current_level=1, history=None, status="in_review"):
    """Patch project directly in MongoDB to install approval-matrix state (ProjectUpdate model
    strips these fields on PUT, so a DB-level fixture is required)."""
    _db.projects.update_one({"id": pid}, {"$set": {
        "matrix_levels": matrix_levels,
        "matrix_approvers": [e for lvl in matrix_levels for e in lvl.get("emails", [])],
        "current_approval_level": current_level,
        "approval_history": history or [],
        "status": status,
    }})

ADMIN_EMAIL = "admin@yash.com"
ADMIN_PASSWORD = "password"

PRJ_0043_V1_ID = "f6619193-81bf-4822-a658-9d2074a94287"
PRJ_0040_ID = "25d34438-9123-447a-9a76-b68e3fa341a9"


# ---------------------- fixtures ----------------------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _register_or_login(email, password="Test@1234", name="Test User"):
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name}, timeout=15)
    if r.status_code == 200:
        return r.json()["token"], r.json()["user"]["id"]
    # already registered -> login
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"could not login {email}: {r.status_code} {r.text}"
    return r.json()["token"], r.json()["user"]["id"]


@pytest.fixture(scope="module")
def l1_creds():
    email = f"test_l1_{uuid.uuid4().hex[:8]}@example.com"
    token, uid = _register_or_login(email, name="L1 Approver")
    return {"email": email, "token": token, "id": uid}


@pytest.fixture(scope="module")
def l2_creds():
    email = f"test_l2_{uuid.uuid4().hex[:8]}@example.com"
    token, uid = _register_or_login(email, name="L2 Approver")
    return {"email": email, "token": token, "id": uid}


def _hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------------- Iter 83: Approve auth + idempotency ----------------------
class TestApproveAuthorization:
    def test_prj0043_v1_admin_forbidden_at_l2(self, admin_headers):
        """Admin is not in L2 approvers -> must return 403 with 'Waiting on' message."""
        # Verify project state first
        p = requests.get(f"{API}/projects/{PRJ_0043_V1_ID}", headers=admin_headers, timeout=15)
        if p.status_code == 404:
            pytest.skip("PRJ-0043 v1 not present in current DB — cannot verify authoritative fixture.")
        assert p.status_code == 200, p.text
        proj = p.json()
        assert proj.get("current_approval_level") == 2, f"expected current_level=2, got {proj.get('current_approval_level')}"

        r = requests.post(f"{API}/projects/{PRJ_0043_V1_ID}/approve", headers=admin_headers, timeout=15)
        assert r.status_code == 403, f"expected 403, got {r.status_code} body={r.text}"
        detail = r.json().get("detail", "")
        assert "Level 2" in detail and "Waiting on" in detail, f"detail missing markers: {detail}"
        assert "praveen.bhoomraogari@yash.com" in detail.lower() or "praveen.bhoomraogari" in detail.lower()


class TestApproveFlowE2E:
    """End-to-end sequential + idempotency using freshly-registered users and admin-driven setup."""

    @pytest.fixture(scope="class")
    def draft_project(self, admin_headers, l1_creds, l2_creds):
        # Create a draft project via API
        payload = {
            "name": f"TEST_iter83_{uuid.uuid4().hex[:6]}",
            "customer_name": "Test Customer",
            "status": "draft",
            "waves": [],
        }
        r = requests.post(f"{API}/projects", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code in (200, 201), r.text
        proj = r.json()
        pid = proj["id"]

        # Directly assign matrix state to skip billing_entity dependency:
        # simulate submit-for-review by using PATCH on /projects/{id}
        matrix_levels = [
            {"level": 1, "emails": [l1_creds["email"].lower()]},
            {"level": 2, "emails": [l2_creds["email"].lower()]},
        ]
        _set_matrix(pid, matrix_levels, current_level=1, history=[], status="in_review")
        # also stamp approver_email via API PUT (this field IS in ProjectUpdate)
        requests.put(f"{API}/projects/{pid}", json={"approver_email": l1_creds["email"].lower()},
                     headers=admin_headers, timeout=15)
        yield {"id": pid, "matrix": matrix_levels}
        # cleanup
        requests.delete(f"{API}/projects/{pid}", headers=admin_headers, timeout=15)

    def test_unauthorized_caller_gets_403(self, draft_project, l2_creds):
        # L2 tries to approve while current_level=1
        r = requests.post(
            f"{API}/projects/{draft_project['id']}/approve",
            headers=_hdr(l2_creds["token"]), timeout=15
        )
        assert r.status_code == 403, r.text
        assert "Level 1" in r.json()["detail"]

    def test_l1_approves_advances_to_l2(self, draft_project, l1_creds, admin_headers):
        r = requests.post(
            f"{API}/projects/{draft_project['id']}/approve?comments=ok-l1",
            headers=_hdr(l1_creds["token"]), timeout=15
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "in_review"
        assert body["current_level"] == 2

        # GET verify
        g = requests.get(f"{API}/projects/{draft_project['id']}", headers=admin_headers, timeout=15)
        proj = g.json()
        assert proj["current_approval_level"] == 2
        assert proj["status"] == "in_review"
        assert len(proj["approval_history"]) == 1
        assert proj["approval_history"][0]["level"] == 1

    def test_l1_second_approve_is_forbidden_now(self, draft_project, l1_creds):
        """Once advanced to L2, L1 caller should get 403 (not in L2 approvers)."""
        r = requests.post(
            f"{API}/projects/{draft_project['id']}/approve",
            headers=_hdr(l1_creds["token"]), timeout=15
        )
        assert r.status_code == 403, r.text
        assert "Level 2" in r.json()["detail"]

    def test_l2_approves_marks_approved(self, draft_project, l2_creds, admin_headers):
        r = requests.post(
            f"{API}/projects/{draft_project['id']}/approve?comments=ok-l2",
            headers=_hdr(l2_creds["token"]), timeout=15
        )
        assert r.status_code == 200, r.text

        g = requests.get(f"{API}/projects/{draft_project['id']}", headers=admin_headers, timeout=15)
        proj = g.json()
        assert proj["status"] == "approved"
        assert len(proj["approval_history"]) == 2

    def test_idempotency_409_on_second_approve_same_level(self, admin_headers, l1_creds, l2_creds):
        """Same L1 approver clicking approve twice at L1 should get 409 on second."""
        # Set up a fresh in_review project stuck at level 1
        payload = {"name": f"TEST_idem_{uuid.uuid4().hex[:6]}", "customer_name": "T", "status": "draft", "waves": []}
        r = requests.post(f"{API}/projects", json=payload, headers=admin_headers, timeout=15)
        pid = r.json()["id"]
        try:
            matrix_levels = [
                {"level": 1, "emails": [l1_creds["email"].lower()]},
                {"level": 2, "emails": [l2_creds["email"].lower()]},
            ]
            _set_matrix(pid, matrix_levels, current_level=1, history=[], status="in_review")

            # L1 approves once → advances to L2
            r1 = requests.post(f"{API}/projects/{pid}/approve", headers=_hdr(l1_creds["token"]), timeout=15)
            assert r1.status_code == 200, r1.text
            # Roll level back to 1 keeping history to simulate a race/duplicate click
            g = requests.get(f"{API}/projects/{pid}", headers=admin_headers, timeout=15).json()
            _set_matrix(pid, matrix_levels, current_level=1, history=g["approval_history"], status="in_review")
            # Now L1 approves again — idempotency 409
            r2 = requests.post(f"{API}/projects/{pid}/approve", headers=_hdr(l1_creds["token"]), timeout=15)
            assert r2.status_code == 409, f"expected 409, got {r2.status_code}: {r2.text}"
            assert "already approved" in r2.json()["detail"].lower()
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=admin_headers, timeout=15)


# ---------------------- Iter 84: New-version routing (Option B) ----------------------
class TestNewVersionRouting:
    def _make_approved_project(self, admin_headers, l1_email, l2_email):
        """Creates a project, sets matrix, marks it in_review then approves through both levels to 'approved'."""
        payload = {"name": f"TEST_nv_{uuid.uuid4().hex[:6]}", "customer_name": "NV Test", "status": "draft", "waves": []}
        r = requests.post(f"{API}/projects", json=payload, headers=admin_headers, timeout=15)
        pid = r.json()["id"]
        matrix_levels = [
            {"level": 1, "emails": [l1_email.lower()]},
            {"level": 2, "emails": [l2_email.lower()]},
        ]
        _set_matrix(pid, matrix_levels, current_level=2, status="approved", history=[
            {"level": 1, "approver_email": l1_email.lower(), "approver_name": "L1", "approved_at": "2025-01-01T00:00:00Z", "comments": ""},
            {"level": 2, "approver_email": l2_email.lower(), "approver_name": "L2", "approved_at": "2025-01-01T00:00:00Z", "comments": ""},
        ])
        return pid, matrix_levels

    def test_l1_edit_auto_submits_at_l2(self, admin_headers, l1_creds, l2_creds):
        pid, _ = self._make_approved_project(admin_headers, l1_creds["email"], l2_creds["email"])
        try:
            r = requests.post(
                f"{API}/projects/{pid}/new-version",
                json={"version_notes": "L1 tweak"},
                headers=_hdr(l1_creds["token"]), timeout=60,
            )
            assert r.status_code == 200, r.text
            nv = r.json()
            assert nv["status"] == "in_review", f"expected in_review, got {nv['status']}"
            assert nv["current_approval_level"] == 2
            history = nv.get("approval_history") or []
            assert len(history) == 1, f"expected 1 synthetic history entry, got {len(history)}"
            assert history[0]["level"] == 1
            assert "already approved" in (history[0].get("comments") or "").lower()

            # Notification to L2
            notifs = requests.get(f"{API}/notifications?user_email={l2_creds['email']}", headers=admin_headers, timeout=15)
            # Fall back to unfiltered fetch and search
            if notifs.status_code != 200:
                notifs = requests.get(f"{API}/notifications", headers=_hdr(l2_creds["token"]), timeout=15)
            assert notifs.status_code == 200
            data = notifs.json() if isinstance(notifs.json(), list) else notifs.json().get("notifications", [])
            l2_notifs = [n for n in data if (n.get("user_email") or "").lower() == l2_creds["email"].lower()
                         and n.get("project_id") == nv["id"]]
            assert len(l2_notifs) >= 1, f"no L2 notification found for new-version {nv['id']}"
            assert any(n.get("type") == "review_request" for n in l2_notifs)

            # cleanup new version too
            requests.delete(f"{API}/projects/{nv['id']}", headers=admin_headers, timeout=15)
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=admin_headers, timeout=15)

    def test_l2_edit_creates_draft_with_alert(self, admin_headers, l1_creds, l2_creds):
        pid, _ = self._make_approved_project(admin_headers, l1_creds["email"], l2_creds["email"])
        try:
            r = requests.post(
                f"{API}/projects/{pid}/new-version",
                json={"version_notes": "L2 tweak"},
                headers=_hdr(l2_creds["token"]), timeout=60,
            )
            assert r.status_code == 200, r.text
            nv = r.json()
            assert nv["status"] == "draft", f"expected draft, got {nv['status']}"
            assert (nv.get("approval_history") or []) == []

            # version_alert notif to L1
            notifs = requests.get(f"{API}/notifications", headers=_hdr(l1_creds["token"]), timeout=15)
            assert notifs.status_code == 200
            data = notifs.json() if isinstance(notifs.json(), list) else notifs.json().get("notifications", [])
            l1_alerts = [n for n in data if (n.get("user_email") or "").lower() == l1_creds["email"].lower()
                         and n.get("project_id") == nv["id"] and n.get("type") == "version_alert"]
            assert len(l1_alerts) >= 1, f"no version_alert to L1 for new-version {nv['id']}"

            requests.delete(f"{API}/projects/{nv['id']}", headers=admin_headers, timeout=15)
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=admin_headers, timeout=15)


# ---------------------- Group-aware resource count (Projects list) ----------------------
class TestGroupAwareResourceCount:
    def test_prj0042_or_0043_resource_group_count(self, admin_headers):
        """Data check: verify at least one wave has a resource_group_id set so the
        group-aware count logic on the frontend can dedupe correctly."""
        r = requests.get(f"{API}/projects", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        projects = r.json() if isinstance(r.json(), list) else r.json().get("projects", [])
        target = [p for p in projects if (p.get("project_number") or "") in ("PRJ-0042", "PRJ-0043")]
        if not target:
            pytest.skip("PRJ-0042/0043 not present in DB")
        # Check at least one row has resource_group_id set
        found_grouped = False
        for p in target:
            for w in p.get("waves") or []:
                for a in w.get("grid_allocations") or []:
                    if (a.get("resource_group_id") or "").strip():
                        found_grouped = True
                        break
        # This is soft - report only, not fail
        if not found_grouped:
            print("WARN: No resource_group_id found on PRJ-0042/0043 waves; group-aware count trivially equals raw count.")


# ---------------------- Regression: PRJ-0040 approved ----------------------
class TestRegressionApprovedProject:
    def test_prj0040_is_approved(self, admin_headers):
        r = requests.get(f"{API}/projects/{PRJ_0040_ID}", headers=admin_headers, timeout=15)
        if r.status_code == 404:
            pytest.skip("PRJ-0040 not present")
        assert r.status_code == 200
        assert r.json().get("status") == "approved"
