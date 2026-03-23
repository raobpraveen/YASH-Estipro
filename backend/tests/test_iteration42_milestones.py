"""
Test iteration 42: Phase-based milestone system improvements
- Bug fix: SelectItem empty value on PaymentMilestones page
- Gantt chart: wave headers, milestone diamonds on phase bars, marker vs payment colors
- Marker milestones: milestone_type='marker' with no payment linkage
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PROJECT_ID = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"

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
def api_client(auth_token):
    """Shared requests session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestMilestoneAPI:
    """Test milestone API endpoints for marker milestone support"""
    
    def test_get_milestones(self, api_client):
        """GET /api/projects/{id}/milestones returns milestones"""
        response = api_client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert response.status_code == 200
        data = response.json()
        assert "milestones" in data
        assert "payment_terms_days" in data
        print(f"Found {len(data['milestones'])} milestones")
    
    def test_put_payment_milestone(self, api_client):
        """PUT /api/projects/{id}/milestones with milestone_type='payment'"""
        test_id = str(uuid.uuid4())
        payload = {
            "milestones": [
                {
                    "id": test_id,
                    "wave_name": "Wave1 SF",
                    "milestone_name": "TEST_Payment_Milestone",
                    "milestone_type": "payment",
                    "phase_name": "Explore",
                    "position": "mid",
                    "target_month": "M2",
                    "payment_percentage": 15,
                    "payment_amount": 30000,
                    "description": "Test payment milestone"
                }
            ],
            "payment_terms_days": 30
        }
        response = api_client.put(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Milestones saved"
        
        # Verify milestone was saved with correct type
        saved_ms = next((m for m in data["milestones"] if m["id"] == test_id), None)
        assert saved_ms is not None
        assert saved_ms["milestone_type"] == "payment"
        assert saved_ms["phase_name"] == "Explore"
        assert saved_ms["position"] == "mid"
        print("Payment milestone saved successfully")
    
    def test_put_marker_milestone(self, api_client):
        """PUT /api/projects/{id}/milestones with milestone_type='marker'"""
        test_id = str(uuid.uuid4())
        payload = {
            "milestones": [
                {
                    "id": test_id,
                    "wave_name": "Wave1 SF",
                    "milestone_name": "TEST_Marker_Milestone",
                    "milestone_type": "marker",
                    "phase_name": "Realize",
                    "position": "start",
                    "target_month": "M3",
                    "payment_percentage": 0,
                    "payment_amount": 0,
                    "description": "Test marker milestone (no payment)"
                }
            ],
            "payment_terms_days": 30
        }
        response = api_client.put(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify marker milestone was saved
        saved_ms = next((m for m in data["milestones"] if m["id"] == test_id), None)
        assert saved_ms is not None
        assert saved_ms["milestone_type"] == "marker"
        assert saved_ms["payment_percentage"] == 0
        assert saved_ms["payment_amount"] == 0
        print("Marker milestone saved successfully")
    
    def test_marker_milestone_persistence(self, api_client):
        """Verify marker milestone persists correctly after GET"""
        # First save a marker milestone
        test_id = str(uuid.uuid4())
        payload = {
            "milestones": [
                {
                    "id": test_id,
                    "wave_name": "Wave1 SF",
                    "milestone_name": "TEST_Persistence_Marker",
                    "milestone_type": "marker",
                    "phase_name": "Deploy",
                    "position": "end",
                    "target_month": "M6",
                    "payment_percentage": 0,
                    "payment_amount": 0,
                    "description": ""
                }
            ],
            "payment_terms_days": 30
        }
        put_response = api_client.put(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones", json=payload)
        assert put_response.status_code == 200
        
        # GET to verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Find the marker milestone
        marker_ms = next((m for m in data["milestones"] if m["id"] == test_id), None)
        assert marker_ms is not None, "Marker milestone not found after GET"
        assert marker_ms["milestone_type"] == "marker"
        assert marker_ms["phase_name"] == "Deploy"
        assert marker_ms["position"] == "end"
        print("Marker milestone persisted correctly")
    
    def test_mixed_milestone_types(self, api_client):
        """Save both payment and marker milestones together"""
        payment_id = str(uuid.uuid4())
        marker_id = str(uuid.uuid4())
        
        payload = {
            "milestones": [
                {
                    "id": payment_id,
                    "wave_name": "Wave1 SF",
                    "milestone_name": "TEST_Mixed_Payment",
                    "milestone_type": "payment",
                    "phase_name": "Prepare",
                    "position": "end",
                    "target_month": "M1",
                    "payment_percentage": 10,
                    "payment_amount": 20000,
                    "description": ""
                },
                {
                    "id": marker_id,
                    "wave_name": "Wave1 SF",
                    "milestone_name": "TEST_Mixed_Marker",
                    "milestone_type": "marker",
                    "phase_name": "Hypercare",
                    "position": "mid",
                    "target_month": "M7",
                    "payment_percentage": 0,
                    "payment_amount": 0,
                    "description": ""
                }
            ],
            "payment_terms_days": 30
        }
        
        response = api_client.put(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify both types saved
        payment_ms = next((m for m in data["milestones"] if m["id"] == payment_id), None)
        marker_ms = next((m for m in data["milestones"] if m["id"] == marker_id), None)
        
        assert payment_ms is not None
        assert payment_ms["milestone_type"] == "payment"
        assert payment_ms["payment_percentage"] == 10
        
        assert marker_ms is not None
        assert marker_ms["milestone_type"] == "marker"
        assert marker_ms["payment_percentage"] == 0
        
        print("Mixed milestone types saved successfully")
    
    def test_milestone_without_phase_name(self, api_client):
        """Milestone without phase_name should be saved (for unlinked milestones)"""
        test_id = str(uuid.uuid4())
        payload = {
            "milestones": [
                {
                    "id": test_id,
                    "wave_name": "Wave1 SF",
                    "milestone_name": "TEST_Unlinked_Milestone",
                    "milestone_type": "payment",
                    "phase_name": "",  # Empty phase_name
                    "position": "end",
                    "target_month": "M4",
                    "payment_percentage": 5,
                    "payment_amount": 10000,
                    "description": ""
                }
            ],
            "payment_terms_days": 30
        }
        
        response = api_client.put(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        saved_ms = next((m for m in data["milestones"] if m["id"] == test_id), None)
        assert saved_ms is not None
        assert saved_ms["phase_name"] == ""
        print("Unlinked milestone (empty phase_name) saved successfully")


class TestProjectAPI:
    """Test project API for wave phase_ranges"""
    
    def test_get_project_with_phase_ranges(self, api_client):
        """GET /api/projects/{id} returns waves with phase_ranges"""
        response = api_client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "waves" in data
        assert len(data["waves"]) > 0
        
        # Check Wave1 SF has phase_ranges
        wave1 = next((w for w in data["waves"] if w["name"] == "Wave1 SF"), None)
        assert wave1 is not None
        assert "phase_ranges" in wave1
        assert len(wave1["phase_ranges"]) > 0
        
        # Verify phase_ranges structure
        for pr in wave1["phase_ranges"]:
            assert "name" in pr
            assert "start_month" in pr
            assert "end_month" in pr
        
        print(f"Wave1 SF has {len(wave1['phase_ranges'])} phase ranges")


class TestAuthRequired:
    """Test that milestone endpoints require authentication"""
    
    def test_get_milestones_requires_auth(self):
        """GET /api/projects/{id}/milestones requires auth"""
        response = requests.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert response.status_code == 401
        print("GET milestones correctly requires authentication")
    
    def test_put_milestones_requires_auth(self):
        """PUT /api/projects/{id}/milestones requires auth"""
        response = requests.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": [], "payment_terms_days": 0}
        )
        assert response.status_code == 401
        print("PUT milestones correctly requires authentication")


@pytest.fixture(scope="module", autouse=True)
def cleanup_test_milestones(api_client):
    """Cleanup test milestones after all tests"""
    yield
    # Restore original milestones
    original_milestones = [
        {"id": "57570665-26d6-4706-bf37-8d12b5e1637d", "wave_name": "Wave1 SF", "milestone_name": "Contract Sign", "target_month": "M1", "payment_percentage": 20, "payment_amount": 40410.86, "description": ""},
        {"id": "122890e6-5f2c-4626-bff7-05520cdba412", "wave_name": "Wave1 SF", "milestone_name": "Explore Phase", "target_month": "M3", "payment_percentage": 20, "payment_amount": 40410.86, "description": ""},
        {"id": "c07474d4-77eb-45a5-979e-0e7aadaf9583", "wave_name": "Wave1 SF", "milestone_name": "Realize Phase", "target_month": "M5", "payment_percentage": 20, "payment_amount": 40410.86, "description": ""},
        {"id": "eee88de9-9c58-40d7-ab43-d709a44b9c1b", "wave_name": "Wave1 SF", "milestone_name": "UAT", "target_month": "M5", "payment_percentage": 30, "payment_amount": 60616.29, "description": ""},
        {"id": "224d7e23-71f5-40bc-a0b1-8472cd080af3", "wave_name": "Wave1 SF", "milestone_name": "Hypercare", "target_month": "M7", "payment_percentage": 10, "payment_amount": 20205.43, "description": ""}
    ]
    try:
        api_client.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": original_milestones, "payment_terms_days": 30}
        )
        print("Restored original milestones")
    except Exception as e:
        print(f"Failed to restore milestones: {e}")
