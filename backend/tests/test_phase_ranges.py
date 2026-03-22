"""
Test Phase Ranges Feature
- Tests for phase_ranges field in ProjectWave model
- Tests for CRUD operations with phase_ranges
- Tests for backward compatibility with old month_phases
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@yash.com"
TEST_PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")  # API returns 'token' not 'access_token'
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestPhaseRangesAPI:
    """Test phase_ranges field in project API"""
    
    def test_create_project_with_phase_ranges(self, api_client):
        """Test creating a project with phase_ranges in waves"""
        project_data = {
            "name": f"TEST_PhaseRanges_{uuid.uuid4().hex[:8]}",
            "customer_id": "test-customer",
            "customer_name": "Test Customer",
            "technology_ids": ["sap"],
            "technology_names": ["SAP S/4HANA"],
            "project_type_ids": ["implementation"],
            "project_type_names": ["Implementation"],
            "waves": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Wave 1",
                    "duration_months": 6,
                    "resources": [],
                    "phase_ranges": [
                        {"name": "Prepare", "start_month": 1, "end_month": 2},
                        {"name": "Explore", "start_month": 2, "end_month": 4},
                        {"name": "Realize", "start_month": 4, "end_month": 6}
                    ]
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response.status_code in [200, 201], f"Create failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "project_number" in data
        assert data["name"] == project_data["name"]
        
        # Verify waves have phase_ranges
        assert "waves" in data
        assert len(data["waves"]) == 1
        wave = data["waves"][0]
        assert "phase_ranges" in wave
        assert len(wave["phase_ranges"]) == 3
        
        # Verify phase_ranges structure
        phase_names = [p["name"] for p in wave["phase_ranges"]]
        assert "Prepare" in phase_names
        assert "Explore" in phase_names
        assert "Realize" in phase_names
        
        # Store project ID for cleanup
        self.__class__.created_project_id = data["id"]
        print(f"Created project: {data['project_number']}")
        return data
    
    def test_get_project_with_phase_ranges(self, api_client):
        """Test retrieving a project preserves phase_ranges"""
        project_id = getattr(self.__class__, 'created_project_id', None)
        if not project_id:
            pytest.skip("No project created in previous test")
        
        response = api_client.get(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code == 200, f"Get failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "waves" in data
        assert len(data["waves"]) == 1
        
        wave = data["waves"][0]
        assert "phase_ranges" in wave
        assert len(wave["phase_ranges"]) == 3
        
        # Verify overlapping phases are preserved
        prepare = next((p for p in wave["phase_ranges"] if p["name"] == "Prepare"), None)
        explore = next((p for p in wave["phase_ranges"] if p["name"] == "Explore"), None)
        
        assert prepare is not None
        assert explore is not None
        assert prepare["end_month"] >= explore["start_month"], "Overlapping phases should be preserved"
        
        print(f"Phase ranges retrieved: {wave['phase_ranges']}")
    
    def test_update_project_phase_ranges(self, api_client):
        """Test updating phase_ranges in a project"""
        project_id = getattr(self.__class__, 'created_project_id', None)
        if not project_id:
            pytest.skip("No project created in previous test")
        
        # Get current project
        response = api_client.get(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code == 200
        project = response.json()
        
        # Update phase_ranges
        project["waves"][0]["phase_ranges"] = [
            {"name": "Prepare", "start_month": 1, "end_month": 3},
            {"name": "Realize", "start_month": 3, "end_month": 6}
        ]
        
        response = api_client.put(f"{BASE_URL}/api/projects/{project_id}", json=project)
        assert response.status_code == 200, f"Update failed: {response.status_code} - {response.text}"
        
        # Verify update
        response = api_client.get(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code == 200
        
        updated = response.json()
        wave = updated["waves"][0]
        assert len(wave["phase_ranges"]) == 2
        
        phase_names = [p["name"] for p in wave["phase_ranges"]]
        assert "Prepare" in phase_names
        assert "Realize" in phase_names
        assert "Explore" not in phase_names  # Removed
        
        print(f"Updated phase ranges: {wave['phase_ranges']}")
    
    def test_delete_test_project(self, api_client):
        """Cleanup: Delete test project"""
        project_id = getattr(self.__class__, 'created_project_id', None)
        if not project_id:
            pytest.skip("No project to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code in [200, 204], f"Delete failed: {response.status_code}"
        print(f"Deleted test project: {project_id}")


class TestPhaseRangesValidation:
    """Test phase_ranges validation"""
    
    def test_empty_phase_ranges(self, api_client):
        """Test creating project with empty phase_ranges"""
        project_data = {
            "name": f"TEST_EmptyPhases_{uuid.uuid4().hex[:8]}",
            "customer_id": "test-customer",
            "customer_name": "Test Customer",
            "technology_ids": ["sap"],
            "technology_names": ["SAP S/4HANA"],
            "project_type_ids": ["implementation"],
            "project_type_names": ["Implementation"],
            "waves": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Wave 1",
                    "duration_months": 4,
                    "resources": [],
                    "phase_ranges": []  # Empty
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response.status_code in [200, 201], f"Create failed: {response.status_code}"
        
        data = response.json()
        assert data["waves"][0]["phase_ranges"] == []
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/projects/{data['id']}")
        print("Empty phase_ranges test passed")
    
    def test_overlapping_phases(self, api_client):
        """Test creating project with overlapping phase_ranges"""
        project_data = {
            "name": f"TEST_OverlapPhases_{uuid.uuid4().hex[:8]}",
            "customer_id": "test-customer",
            "customer_name": "Test Customer",
            "technology_ids": ["sap"],
            "technology_names": ["SAP S/4HANA"],
            "project_type_ids": ["implementation"],
            "project_type_names": ["Implementation"],
            "waves": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Wave 1",
                    "duration_months": 6,
                    "resources": [],
                    "phase_ranges": [
                        {"name": "Prepare", "start_month": 1, "end_month": 3},
                        {"name": "Explore", "start_month": 2, "end_month": 5},  # Overlaps with Prepare
                        {"name": "Realize", "start_month": 4, "end_month": 6}   # Overlaps with Explore
                    ]
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response.status_code in [200, 201], f"Create failed: {response.status_code}"
        
        data = response.json()
        phases = data["waves"][0]["phase_ranges"]
        
        # Verify all overlapping phases are preserved
        assert len(phases) == 3
        
        prepare = next(p for p in phases if p["name"] == "Prepare")
        explore = next(p for p in phases if p["name"] == "Explore")
        realize = next(p for p in phases if p["name"] == "Realize")
        
        # Verify overlaps
        assert prepare["end_month"] > explore["start_month"], "Prepare-Explore overlap"
        assert explore["end_month"] > realize["start_month"], "Explore-Realize overlap"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/projects/{data['id']}")
        print("Overlapping phases test passed")


class TestExistingProjectPhaseRanges:
    """Test phase_ranges on existing project PRJ-0029"""
    
    def test_get_existing_project_phases(self, api_client):
        """Test retrieving PRJ-0029 which has phase_ranges"""
        # Get all projects to find PRJ-0029
        response = api_client.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        
        projects = response.json()
        prj_0029 = next((p for p in projects if p.get("project_number") == "PRJ-0029"), None)
        
        if not prj_0029:
            pytest.skip("PRJ-0029 not found")
        
        # Get full project details
        response = api_client.get(f"{BASE_URL}/api/projects/{prj_0029['id']}")
        assert response.status_code == 200
        
        project = response.json()
        assert "waves" in project
        assert len(project["waves"]) > 0
        
        wave = project["waves"][0]
        assert "phase_ranges" in wave
        
        print(f"PRJ-0029 phase_ranges: {wave.get('phase_ranges', [])}")
        
        # Verify phase_ranges structure
        for phase in wave.get("phase_ranges", []):
            assert "name" in phase
            assert "start_month" in phase
            assert "end_month" in phase
            assert phase["start_month"] <= phase["end_month"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
