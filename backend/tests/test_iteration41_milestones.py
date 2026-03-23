"""
Iteration 41: Phase-based Milestone Tests
Tests for the new phase-based milestone model with phase_name and position fields.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROJECT_ID = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"  # PRJ-0026 v2
ALT_PROJECT_ID = "d94df1da-49b0-497e-90ae-f9466da8444b"  # PRJ-0025 v1


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@yash.com",
        "password": "password"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestMilestoneAPI:
    """Tests for GET/PUT /api/projects/{project_id}/milestones"""

    def test_get_milestones_returns_200(self, auth_headers):
        """Test GET milestones endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "milestones" in data, "Response should contain 'milestones' field"
        assert "project_id" in data, "Response should contain 'project_id' field"
        print(f"GET milestones returned {len(data.get('milestones', []))} milestones")

    def test_get_milestones_structure(self, auth_headers):
        """Test milestones response structure includes phase_name and position"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "payment_terms_days" in data, "Response should contain 'payment_terms_days'"
        # If milestones exist, check structure
        if data.get("milestones"):
            ms = data["milestones"][0]
            print(f"Sample milestone structure: {list(ms.keys())}")

    def test_put_milestone_with_phase_name_and_position(self, auth_headers):
        """Test saving a milestone with phase_name and position fields"""
        test_milestone = {
            "id": "test-ms-iter41-001",
            "wave_name": "Wave1 SF",
            "milestone_name": "Test Phase Milestone",
            "phase_name": "Explore",
            "position": "mid",
            "target_month": "M3",
            "completion_percentage": 25,
            "payment_percentage": 20,
            "payment_amount": 50000,
            "description": "Test milestone for iteration 41"
        }
        
        # First get existing milestones
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        existing = get_response.json().get("milestones", [])
        
        # Filter out any previous test milestones
        existing = [m for m in existing if not m.get("id", "").startswith("test-ms-iter41")]
        
        # Add test milestone
        updated_milestones = existing + [test_milestone]
        
        put_response = requests.put(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers,
            json={
                "milestones": updated_milestones,
                "payment_terms_days": 30
            }
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        print(f"PUT milestone response: {put_response.json()}")

    def test_milestone_persistence_with_phase_fields(self, auth_headers):
        """Test that phase_name and position fields persist after save"""
        # GET to verify persistence
        response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find our test milestone
        test_ms = next((m for m in data.get("milestones", []) if m.get("id") == "test-ms-iter41-001"), None)
        assert test_ms is not None, "Test milestone should persist"
        assert test_ms.get("phase_name") == "Explore", f"phase_name should be 'Explore', got {test_ms.get('phase_name')}"
        assert test_ms.get("position") == "mid", f"position should be 'mid', got {test_ms.get('position')}"
        print(f"Verified milestone persistence: phase_name={test_ms.get('phase_name')}, position={test_ms.get('position')}")

    def test_put_milestone_start_position(self, auth_headers):
        """Test saving milestone with 'start' position"""
        test_milestone = {
            "id": "test-ms-iter41-002",
            "wave_name": "Wave1 SF",
            "milestone_name": "Start Position Test",
            "phase_name": "Prepare",
            "position": "start",
            "target_month": "M1",
            "payment_percentage": 10,
            "payment_amount": 25000,
            "description": "Start position test"
        }
        
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        existing = get_response.json().get("milestones", [])
        existing = [m for m in existing if m.get("id") != "test-ms-iter41-002"]
        
        put_response = requests.put(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers,
            json={"milestones": existing + [test_milestone], "payment_terms_days": 30}
        )
        assert put_response.status_code == 200
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        data = verify_response.json()
        test_ms = next((m for m in data.get("milestones", []) if m.get("id") == "test-ms-iter41-002"), None)
        assert test_ms is not None
        assert test_ms.get("position") == "start"
        print(f"Start position milestone saved successfully")

    def test_put_milestone_end_position(self, auth_headers):
        """Test saving milestone with 'end' position"""
        test_milestone = {
            "id": "test-ms-iter41-003",
            "wave_name": "Wave1 SF",
            "milestone_name": "End Position Test",
            "phase_name": "Deploy",
            "position": "end",
            "target_month": "M8",
            "payment_percentage": 30,
            "payment_amount": 75000,
            "description": "End position test"
        }
        
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        existing = get_response.json().get("milestones", [])
        existing = [m for m in existing if m.get("id") != "test-ms-iter41-003"]
        
        put_response = requests.put(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers,
            json={"milestones": existing + [test_milestone], "payment_terms_days": 30}
        )
        assert put_response.status_code == 200
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        data = verify_response.json()
        test_ms = next((m for m in data.get("milestones", []) if m.get("id") == "test-ms-iter41-003"), None)
        assert test_ms is not None
        assert test_ms.get("position") == "end"
        print(f"End position milestone saved successfully")

    def test_get_project_has_phase_ranges(self, auth_headers):
        """Verify test project has phase_ranges defined for milestone linking"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        waves = data.get("waves", [])
        assert len(waves) > 0, "Project should have waves"
        
        wave = waves[0]
        phase_ranges = wave.get("phase_ranges", [])
        print(f"Wave '{wave.get('name')}' has {len(phase_ranges)} phase ranges")
        if phase_ranges:
            for pr in phase_ranges:
                print(f"  - {pr.get('name')}: M{pr.get('start_month')} -> M{pr.get('end_month')}")
        
        # Check if phases like Prepare, Explore, Realize, Deploy exist
        phase_names = [pr.get("name") for pr in phase_ranges]
        print(f"Available phases: {phase_names}")

    def test_cleanup_test_milestones(self, auth_headers):
        """Cleanup: Remove test milestones"""
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers
        )
        existing = get_response.json().get("milestones", [])
        
        # Remove test milestones
        cleaned = [m for m in existing if not m.get("id", "").startswith("test-ms-iter41")]
        
        put_response = requests.put(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            headers=auth_headers,
            json={"milestones": cleaned, "payment_terms_days": 30}
        )
        assert put_response.status_code == 200
        print(f"Cleaned up {len(existing) - len(cleaned)} test milestones")


class TestMilestoneWithoutAuth:
    """Test milestone endpoints require authentication"""

    def test_get_milestones_requires_auth(self):
        """GET milestones should require auth"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_put_milestones_requires_auth(self):
        """PUT milestones should require auth"""
        response = requests.put(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
            json={"milestones": [], "payment_terms_days": 0}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
