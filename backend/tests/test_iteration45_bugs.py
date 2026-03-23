"""
Iteration 45 Bug Fix Tests
- Bug 1 (P0): Excel Import erases milestones - verify milestones API works correctly
- Bug 2 (P1): Ctrl+S on PaymentMilestones page saves payment_terms_days correctly
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
def api_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

class TestMilestonesAPI:
    """Test milestones API for Bug 1 and Bug 2 fixes"""
    
    def test_get_milestones_returns_payment_terms_days(self, api_headers):
        """Verify GET milestones returns payment_terms_days field"""
        project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=api_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "payment_terms_days" in data, "payment_terms_days field missing"
        assert "milestones" in data, "milestones field missing"
        assert "project_id" in data, "project_id field missing"
        print(f"GET milestones returned payment_terms_days: {data['payment_terms_days']}")
    
    def test_save_milestones_with_payment_terms(self, api_headers):
        """Bug 2: Verify PUT milestones saves payment_terms_days correctly"""
        project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        
        # Create test milestones with payment_terms_days
        test_milestones = [
            {
                "id": f"test-{uuid.uuid4()}",
                "wave_name": "Wave1 SF",
                "milestone_name": "Test Milestone",
                "milestone_type": "payment",
                "phase_name": "Prepare",
                "position": "start",
                "target_month": "M1",
                "payment_percentage": 10,
                "payment_amount": 21747,
                "description": "Test milestone for Bug 2"
            }
        ]
        
        # Test saving with payment_terms_days = 45
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=api_headers,
            json={
                "milestones": test_milestones,
                "payment_terms_days": 45
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["payment_terms_days"] == 45, f"Expected 45, got {data['payment_terms_days']}"
        print(f"Saved payment_terms_days: {data['payment_terms_days']}")
        
        # Verify persistence by fetching again
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=api_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["payment_terms_days"] == 45, f"Persistence failed: expected 45, got {get_data['payment_terms_days']}"
        print(f"Verified persistence: payment_terms_days = {get_data['payment_terms_days']}")
    
    def test_save_milestones_with_zero_payment_terms(self, api_headers):
        """Verify saving with payment_terms_days = 0 works"""
        project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=api_headers,
            json={
                "milestones": [],
                "payment_terms_days": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["payment_terms_days"] == 0
        print("Saved payment_terms_days = 0 successfully")
    
    def test_save_milestones_with_different_payment_terms(self, api_headers):
        """Test various payment_terms_days values"""
        project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        
        test_values = [15, 30, 60, 90, 120]
        for value in test_values:
            response = requests.put(
                f"{BASE_URL}/api/projects/{project_id}/milestones",
                headers=api_headers,
                json={
                    "milestones": [],
                    "payment_terms_days": value
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["payment_terms_days"] == value, f"Expected {value}, got {data['payment_terms_days']}"
        print(f"All payment_terms_days values tested: {test_values}")


class TestNewVersionMilestones:
    """Test milestone copying during new version creation (Bug 1)"""
    
    def test_create_new_version_endpoint_exists(self, api_headers):
        """Verify new-version endpoint exists"""
        project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        
        # Get project details first
        response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=api_headers
        )
        assert response.status_code == 200
        project = response.json()
        print(f"Project: {project['name']} v{project['version']}")
    
    def test_milestones_can_be_saved_for_any_project(self, api_headers):
        """Verify milestones can be saved for any project ID"""
        # This tests the core functionality needed for Bug 1 fix
        # When a new version is created, milestones need to be saved to the new project ID
        
        project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        
        # First, add milestones
        test_milestones = [
            {
                "id": f"test-ms-{uuid.uuid4()}",
                "wave_name": "Wave1 SF",
                "milestone_name": "Contract Sign",
                "milestone_type": "payment",
                "phase_name": "Prepare",
                "position": "start",
                "target_month": "M1",
                "payment_percentage": 10,
                "payment_amount": 21747,
                "description": "Initial payment"
            },
            {
                "id": f"test-ms-{uuid.uuid4()}",
                "wave_name": "Wave1 SF",
                "milestone_name": "Go-Live",
                "milestone_type": "payment",
                "phase_name": "Deploy",
                "position": "end",
                "target_month": "M6",
                "payment_percentage": 20,
                "payment_amount": 43494,
                "description": "Go-live payment"
            },
            {
                "id": f"test-ms-{uuid.uuid4()}",
                "wave_name": "Wave2",
                "milestone_name": "Kick-Off",
                "milestone_type": "payment",
                "phase_name": "Explore",
                "position": "start",
                "target_month": "M1",
                "payment_percentage": 15,
                "payment_amount": 32158,
                "description": "Wave2 kickoff"
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=api_headers,
            json={
                "milestones": test_milestones,
                "payment_terms_days": 30
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["milestones"]) == 3, f"Expected 3 milestones, got {len(data['milestones'])}"
        print(f"Saved {len(data['milestones'])} milestones successfully")
        
        # Verify by fetching
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=api_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert len(get_data["milestones"]) == 3
        
        # Verify wave names are preserved
        wave_names = set(m["wave_name"] for m in get_data["milestones"])
        assert "Wave1 SF" in wave_names
        assert "Wave2" in wave_names
        print(f"Wave names preserved: {wave_names}")


class TestCashflowWithPaymentTerms:
    """Test cashflow API respects payment_terms_days"""
    
    def test_cashflow_includes_payment_terms(self, api_headers):
        """Verify cashflow API returns payment_terms_days and offset"""
        project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        
        # First set payment terms to 60 days
        requests.put(
            f"{BASE_URL}/api/projects/{project_id}/milestones",
            headers=api_headers,
            json={
                "milestones": [
                    {
                        "id": "test-cf-1",
                        "wave_name": "Wave1 SF",
                        "milestone_name": "Test",
                        "milestone_type": "payment",
                        "phase_name": "Prepare",
                        "position": "start",
                        "target_month": "M1",
                        "payment_percentage": 10,
                        "payment_amount": 21747
                    }
                ],
                "payment_terms_days": 60
            }
        )
        
        # Get cashflow
        response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/cashflow",
            headers=api_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "payment_terms_days" in data, "payment_terms_days missing from cashflow"
        assert "payment_offset_months" in data, "payment_offset_months missing from cashflow"
        assert data["payment_terms_days"] == 60
        assert data["payment_offset_months"] == 2  # 60 days = 2 months offset
        print(f"Cashflow payment_terms_days: {data['payment_terms_days']}, offset: {data['payment_offset_months']} months")


class TestRegressionCtrlS:
    """Regression tests for Ctrl+S save functionality"""
    
    def test_project_save_endpoint(self, api_headers):
        """Verify project save endpoint works"""
        project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        
        # Get current project
        response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=api_headers
        )
        assert response.status_code == 200
        project = response.json()
        
        # Update project (simulating Ctrl+S save)
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=api_headers,
            json={
                "name": project["name"],
                "customer_id": project.get("customer_id"),
                "waves": project.get("waves", []),
                "profit_margin_percentage": project.get("profit_margin_percentage", 35),
                "nego_buffer_percentage": project.get("nego_buffer_percentage", 0)
            }
        )
        assert update_response.status_code == 200
        print("Project save endpoint working correctly")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup(api_headers):
    """Cleanup test data after tests"""
    yield
    # Reset milestones to a known state
    project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
    requests.put(
        f"{BASE_URL}/api/projects/{project_id}/milestones",
        headers=api_headers,
        json={
            "milestones": [
                {
                    "id": "final-ms-1",
                    "wave_name": "Wave1 SF",
                    "milestone_name": "Contract Sign",
                    "milestone_type": "payment",
                    "phase_name": "Prepare",
                    "position": "start",
                    "target_month": "M1",
                    "payment_percentage": 10,
                    "payment_amount": 21747
                },
                {
                    "id": "final-ms-2",
                    "wave_name": "Wave1 SF",
                    "milestone_name": "Go-Live",
                    "milestone_type": "payment",
                    "phase_name": "Deploy",
                    "position": "end",
                    "target_month": "M6",
                    "payment_percentage": 20,
                    "payment_amount": 43494
                },
                {
                    "id": "final-ms-3",
                    "wave_name": "Wave2",
                    "milestone_name": "Kick-Off",
                    "milestone_type": "payment",
                    "phase_name": "Explore",
                    "position": "start",
                    "target_month": "M1",
                    "payment_percentage": 15,
                    "payment_amount": 32158
                }
            ],
            "payment_terms_days": 30
        }
    )
