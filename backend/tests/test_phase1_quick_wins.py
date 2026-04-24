"""
Phase 1 Quick Wins - Backend API Tests
Tests for:
- PUT /api/sub-technologies/{id} endpoint
- PUT /api/base-locations/{id} endpoint
- Archive/Unarchive endpoints with auth
"""
import pytest
import requests
import os

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
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestSubTechnologiesAPI:
    """Tests for Sub Technologies PUT endpoint"""
    
    def test_get_sub_technologies(self, headers):
        """Test GET /api/sub-technologies returns list"""
        response = requests.get(f"{BASE_URL}/api/sub-technologies", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} sub-technologies")
    
    def test_put_sub_technology_update_name(self, headers):
        """Test PUT /api/sub-technologies/{id} updates name only"""
        # First get a sub-technology
        response = requests.get(f"{BASE_URL}/api/sub-technologies", headers=headers)
        assert response.status_code == 200
        sub_techs = response.json()
        assert len(sub_techs) > 0
        
        sub_tech = sub_techs[0]
        sub_tech_id = sub_tech["id"]
        original_name = sub_tech["name"]
        
        # Update the name
        new_name = f"TEST_{original_name}_Updated"
        response = requests.put(
            f"{BASE_URL}/api/sub-technologies/{sub_tech_id}",
            headers=headers,
            json={"name": new_name}
        )
        assert response.status_code == 200
        assert "updated successfully" in response.json().get("message", "").lower()
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/sub-technologies", headers=headers)
        updated_sub_tech = next((s for s in response.json() if s["id"] == sub_tech_id), None)
        assert updated_sub_tech is not None
        assert updated_sub_tech["name"] == new_name
        
        # Revert the change
        response = requests.put(
            f"{BASE_URL}/api/sub-technologies/{sub_tech_id}",
            headers=headers,
            json={"name": original_name}
        )
        assert response.status_code == 200
        print(f"PASS: Sub-technology name update works correctly")


class TestBaseLocationsAPI:
    """Tests for Base Locations PUT endpoint"""
    
    def test_get_base_locations(self, headers):
        """Test GET /api/base-locations returns list"""
        response = requests.get(f"{BASE_URL}/api/base-locations", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} base locations")
    
    def test_put_base_location_update_overhead(self, headers):
        """Test PUT /api/base-locations/{id} updates overhead_percentage"""
        # First get a base location
        response = requests.get(f"{BASE_URL}/api/base-locations", headers=headers)
        assert response.status_code == 200
        locations = response.json()
        assert len(locations) > 0
        
        location = locations[0]
        location_id = location["id"]
        original_overhead = location["overhead_percentage"]
        
        # Update the overhead percentage
        new_overhead = 99.0 if original_overhead != 99.0 else 98.0
        response = requests.put(
            f"{BASE_URL}/api/base-locations/{location_id}",
            headers=headers,
            json={"overhead_percentage": new_overhead}
        )
        assert response.status_code == 200
        assert "updated successfully" in response.json().get("message", "").lower()
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/base-locations", headers=headers)
        updated_location = next((l for l in response.json() if l["id"] == location_id), None)
        assert updated_location is not None
        assert updated_location["overhead_percentage"] == new_overhead
        
        # Revert the change
        response = requests.put(
            f"{BASE_URL}/api/base-locations/{location_id}",
            headers=headers,
            json={"overhead_percentage": original_overhead}
        )
        assert response.status_code == 200
        print(f"PASS: Base location overhead update works correctly")


class TestProjectArchiveAPI:
    """Tests for Project Archive/Unarchive endpoints"""
    
    def test_get_archived_projects(self, headers):
        """Test GET /api/projects/archived returns list"""
        response = requests.get(f"{BASE_URL}/api/projects/archived", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} archived projects")
    
    def test_archive_unarchive_flow(self, headers):
        """Test archive and unarchive endpoints with auth"""
        # Get active projects
        response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        assert response.status_code == 200
        projects = response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects available to test archive/unarchive")
        
        # Find a project to archive (preferably a test project)
        test_project = next((p for p in projects if "TEST" in p.get("name", "")), projects[0])
        project_id = test_project["id"]
        
        # Archive the project
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/archive",
            headers=headers
        )
        assert response.status_code == 200
        print(f"Archived project {project_id}")
        
        # Verify it's in archived list
        response = requests.get(f"{BASE_URL}/api/projects/archived", headers=headers)
        archived = response.json()
        archived_ids = [p["id"] for p in archived]
        assert project_id in archived_ids, "Project not found in archived list"
        
        # Unarchive the project
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/unarchive",
            headers=headers
        )
        assert response.status_code == 200
        print(f"Unarchived project {project_id}")
        
        # Verify it's back in active list
        response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        active = response.json()
        active_ids = [p["id"] for p in active]
        assert project_id in active_ids, "Project not found in active list after unarchive"
        
        print("PASS: Archive/Unarchive flow works correctly with auth")


class TestProjectsSorting:
    """Tests for Projects sorting by project number
    Note: Backend returns projects in DB order, frontend sorts them in descending order
    """
    
    def test_projects_api_returns_data(self, headers):
        """Test that projects API returns valid data with project_number field"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        assert response.status_code == 200
        projects = response.json()
        
        if len(projects) < 2:
            pytest.skip("Not enough projects to test")
        
        # Verify project_number field exists
        for p in projects[:5]:
            assert "project_number" in p, "project_number field missing"
            assert p["project_number"].startswith("PRJ-"), f"Invalid project number format: {p['project_number']}"
        
        print(f"PASS: Projects API returns valid data with project_number field")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
