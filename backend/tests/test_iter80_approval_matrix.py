"""
Tests for iter 80/81/82 features:
- Sequential approval matrix flow (submit-for-review + approve L1/L2)
- Project model exposes matrix_levels, matrix_approvers, current_approval_level, approval_history
- submit-for-review accepts empty approver_email when matrix exists
"""
import os
import time
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")

ADMIN_EMAIL = "admin@yash.com"
ADMIN_PASS = "password"


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text[:300]}"
    token = r.json().get("token")
    assert token
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def prj0040(admin_client):
    """Find PRJ-0040 or any project with an approval matrix."""
    r = admin_client.get(f"{BASE_URL}/api/projects?latest_only=true")
    assert r.status_code == 200
    projects = r.json()
    target = next((p for p in projects if p.get("project_number") == "PRJ-0040"), None)
    assert target, "PRJ-0040 not found"
    return target


class TestProjectModelFields:
    """Iter 82: model exposes matrix runtime fields."""

    def test_get_project_returns_matrix_fields(self, admin_client, prj0040):
        r = admin_client.get(f"{BASE_URL}/api/projects/{prj0040['id']}")
        assert r.status_code == 200
        data = r.json()
        for field in ("matrix_levels", "matrix_approvers",
                      "current_approval_level", "approval_history"):
            assert field in data, f"Missing field {field} in project response"
        assert isinstance(data["matrix_levels"], list)
        assert isinstance(data["matrix_approvers"], list)
        assert isinstance(data["approval_history"], list)
        assert isinstance(data["current_approval_level"], int)


class TestSequentialApprovalFlow:
    """Iter 82: sequential level-gating on approve."""

    def _clone_and_get(self, admin_client, prj0040):
        r = admin_client.post(f"{BASE_URL}/api/projects/{prj0040['id']}/clone")
        assert r.status_code == 200, r.text[:300]
        cloned = r.json()
        return cloned

    def test_full_sequential_flow(self, admin_client, prj0040):
        cloned = self._clone_and_get(admin_client, prj0040)
        pid = cloned["id"]
        try:
            # 1. Submit for review with empty approver_email — should pick L1 from matrix
            r = admin_client.post(f"{BASE_URL}/api/projects/{pid}/submit-for-review",
                                  params={"approver_email": ""})
            assert r.status_code == 200, f"submit failed: {r.status_code} {r.text[:300]}"
            body = r.json()
            assert body["status"] == "in_review"
            assert body.get("current_level") == 1
            # Only L1 recipients should be emailed
            l1_recipients = set(body.get("recipients", []))
            assert l1_recipients, "Expected some L1 recipients"

            # 2. Verify project state after submit
            r = admin_client.get(f"{BASE_URL}/api/projects/{pid}")
            assert r.status_code == 200
            proj = r.json()
            assert proj["status"] == "in_review"
            assert proj["current_approval_level"] == 1
            assert len(proj["matrix_levels"]) >= 1, "matrix_levels must be populated"
            assert proj["approver_email"], "approver_email should be auto-set"
            l1_emails = set(proj["matrix_levels"][0]["emails"])
            assert l1_recipients == l1_emails

            # 3. Approve L1 (as admin — admin@yash.com IS the L2 approver per matrix,
            #    but approve endpoint doesn't check identity, uses current_level).
            r = admin_client.post(f"{BASE_URL}/api/projects/{pid}/approve",
                                  params={"comments": "L1 approved by test"})
            assert r.status_code == 200, r.text[:300]
            body = r.json()

            # Check if matrix has more than one level
            r2 = admin_client.get(f"{BASE_URL}/api/projects/{pid}")
            proj2 = r2.json()

            if len(proj2["matrix_levels"]) > 1:
                # Should still be in_review, advanced to L2
                assert body["status"] == "in_review", f"Expected in_review, got {body}"
                assert body["current_level"] == proj2["matrix_levels"][1]["level"]
                assert proj2["current_approval_level"] == proj2["matrix_levels"][1]["level"]
                assert len(proj2["approval_history"]) == 1
                assert proj2["approval_history"][0]["level"] == 1
                assert proj2["approval_history"][0]["comments"] == "L1 approved by test"

                # 4. Approve L2 → should become approved
                r = admin_client.post(f"{BASE_URL}/api/projects/{pid}/approve",
                                      params={"comments": "L2 final approval"})
                assert r.status_code == 200, r.text[:300]
                body = r.json()
                assert body["status"] == "approved"

                r3 = admin_client.get(f"{BASE_URL}/api/projects/{pid}")
                proj3 = r3.json()
                assert proj3["status"] == "approved"
                assert len(proj3["approval_history"]) == 2
                assert proj3["approval_history"][1]["level"] == 2
                assert proj3["approved_at"]
            else:
                # Single-level matrix: L1 approve = final
                assert body["status"] == "approved"
        finally:
            # cleanup
            admin_client.delete(f"{BASE_URL}/api/projects/{pid}")

    def test_submit_without_matrix_requires_approver(self, admin_client):
        # Create a fresh minimal project with no billing_entity
        create = admin_client.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_no_matrix_project",
        })
        assert create.status_code == 200, create.text[:300]
        pid = create.json()["id"]
        try:
            r = admin_client.post(f"{BASE_URL}/api/projects/{pid}/submit-for-review",
                                  params={"approver_email": ""})
            assert r.status_code == 400
            assert "Approver email is required" in r.json().get("detail", "")

            # With explicit approver_email it works
            r = admin_client.post(f"{BASE_URL}/api/projects/{pid}/submit-for-review",
                                  params={"approver_email": "someone@example.com"})
            assert r.status_code == 200, r.text[:300]
            assert r.json()["status"] == "in_review"
        finally:
            admin_client.delete(f"{BASE_URL}/api/projects/{pid}")
