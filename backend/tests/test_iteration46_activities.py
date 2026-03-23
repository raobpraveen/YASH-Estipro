"""
Iteration 46 Tests - Phase Activities & Deliverables API
Tests for:
1. Activity Templates CRUD (/api/activity-templates)
2. Project Phase Activities CRUD (/api/projects/{id}/activities)
3. Adopt Template functionality
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
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping tests")

@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture(scope="module")
def project_types(headers):
    """Get project types for template testing"""
    response = requests.get(f"{BASE_URL}/api/project-types", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

@pytest.fixture(scope="module")
def test_project(headers):
    """Get a test project with waves"""
    response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
    if response.status_code == 200:
        projects = response.json()
        # Find a project with waves
        for p in projects:
            if p.get("waves") and len(p["waves"]) > 0:
                return p
    return None


class TestActivityTemplatesAPI:
    """Tests for Activity Templates CRUD"""
    
    def test_get_all_templates(self, headers):
        """Test GET /api/activity-templates"""
        response = requests.get(f"{BASE_URL}/api/activity-templates", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} existing templates")
    
    def test_create_template(self, headers, project_types):
        """Test PUT /api/activity-templates/{project_type_id}/{phase_name} - Create"""
        if not project_types:
            pytest.skip("No project types available")
        
        project_type = project_types[0]
        project_type_id = project_type["id"]
        phase_name = "TEST_Prepare"
        
        payload = {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "TEST_Activity_1", "description": "Test activity", "is_deliverable": False, "owner": "Test Owner", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "TEST_Deliverable_1", "description": "Test deliverable", "is_deliverable": True, "owner": "Test Owner", "sort_order": 1}
            ],
            "project_type_name": project_type.get("name", "")
        }
        
        response = requests.put(
            f"{BASE_URL}/api/activity-templates/{project_type_id}/{phase_name}",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain template id"
        assert data.get("message") in ["Template created", "Template updated"], f"Unexpected message: {data.get('message')}"
        print(f"Template created/updated with id: {data.get('id')}")
    
    def test_get_templates_by_type(self, headers, project_types):
        """Test GET /api/activity-templates/{project_type_id}"""
        if not project_types:
            pytest.skip("No project types available")
        
        project_type_id = project_types[0]["id"]
        response = requests.get(f"{BASE_URL}/api/activity-templates/{project_type_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} templates for project type {project_type_id}")
    
    def test_update_template(self, headers, project_types):
        """Test PUT /api/activity-templates/{project_type_id}/{phase_name} - Update"""
        if not project_types:
            pytest.skip("No project types available")
        
        project_type = project_types[0]
        project_type_id = project_type["id"]
        phase_name = "TEST_Prepare"
        
        # Update with new activities
        payload = {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "TEST_Activity_Updated", "description": "Updated activity", "is_deliverable": False, "owner": "Updated Owner", "sort_order": 0}
            ],
            "project_type_name": project_type.get("name", "")
        }
        
        response = requests.put(
            f"{BASE_URL}/api/activity-templates/{project_type_id}/{phase_name}",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("message") == "Template updated", f"Expected 'Template updated', got: {data.get('message')}"
        print("Template updated successfully")
    
    def test_delete_template(self, headers, project_types):
        """Test DELETE /api/activity-templates/{project_type_id}/{phase_name}"""
        if not project_types:
            pytest.skip("No project types available")
        
        project_type_id = project_types[0]["id"]
        phase_name = "TEST_Prepare"
        
        response = requests.delete(
            f"{BASE_URL}/api/activity-templates/{project_type_id}/{phase_name}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("message") == "Template deleted", f"Expected 'Template deleted', got: {data.get('message')}"
        print("Template deleted successfully")
    
    def test_delete_nonexistent_template(self, headers, project_types):
        """Test DELETE for non-existent template returns 404"""
        if not project_types:
            pytest.skip("No project types available")
        
        project_type_id = project_types[0]["id"]
        phase_name = "NONEXISTENT_PHASE_12345"
        
        response = requests.delete(
            f"{BASE_URL}/api/activity-templates/{project_type_id}/{phase_name}",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Correctly returned 404 for non-existent template")


class TestProjectActivitiesAPI:
    """Tests for Project Phase Activities CRUD"""
    
    def test_get_project_activities(self, headers, test_project):
        """Test GET /api/projects/{project_id}/activities"""
        if not test_project:
            pytest.skip("No test project available")
        
        project_id = test_project["id"]
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/activities", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} activity records for project {project_id}")
    
    def test_get_phase_activities_empty(self, headers, test_project):
        """Test GET /api/projects/{project_id}/activities/{wave_name}/{phase_name} - Empty"""
        if not test_project:
            pytest.skip("No test project available")
        
        project_id = test_project["id"]
        wave_name = test_project["waves"][0]["name"] if test_project.get("waves") else "Wave 1"
        phase_name = "TEST_Phase_Empty"
        
        response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/activities/{wave_name}/{phase_name}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("project_id") == project_id
        assert data.get("wave_name") == wave_name
        assert data.get("phase_name") == phase_name
        assert data.get("activities") == [], "Empty phase should return empty activities list"
        print("Empty phase activities returned correctly")
    
    def test_save_phase_activities(self, headers, test_project):
        """Test PUT /api/projects/{project_id}/activities/{wave_name}/{phase_name}"""
        if not test_project:
            pytest.skip("No test project available")
        
        project_id = test_project["id"]
        wave_name = test_project["waves"][0]["name"] if test_project.get("waves") else "Wave 1"
        phase_name = "TEST_Phase_Save"
        
        payload = {
            "activities": [
                {"id": str(uuid.uuid4()), "name": "TEST_Project_Activity", "description": "Project activity", "is_deliverable": False, "owner": "PM", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "TEST_Project_Deliverable", "description": "Project deliverable", "is_deliverable": True, "owner": "Dev", "sort_order": 1}
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/activities/{wave_name}/{phase_name}",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("message") == "Activities saved", f"Expected 'Activities saved', got: {data.get('message')}"
        print("Project activities saved successfully")
    
    def test_verify_saved_activities(self, headers, test_project):
        """Verify saved activities persist"""
        if not test_project:
            pytest.skip("No test project available")
        
        project_id = test_project["id"]
        wave_name = test_project["waves"][0]["name"] if test_project.get("waves") else "Wave 1"
        phase_name = "TEST_Phase_Save"
        
        response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/activities/{wave_name}/{phase_name}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        activities = data.get("activities", [])
        assert len(activities) == 2, f"Expected 2 activities, got {len(activities)}"
        
        # Verify activity names
        names = [a["name"] for a in activities]
        assert "TEST_Project_Activity" in names, "Activity not found"
        assert "TEST_Project_Deliverable" in names, "Deliverable not found"
        print("Saved activities verified successfully")


class TestAdoptTemplateAPI:
    """Tests for Adopt Template functionality"""
    
    def test_adopt_template_flow(self, headers, project_types, test_project):
        """Test full adopt template flow: create template -> adopt -> verify"""
        if not project_types or not test_project:
            pytest.skip("No project types or test project available")
        
        project_type = project_types[0]
        project_type_id = project_type["id"]
        project_id = test_project["id"]
        wave_name = test_project["waves"][0]["name"] if test_project.get("waves") else "Wave 1"
        phase_name = "TEST_Adopt_Phase"
        
        # Step 1: Create a template
        template_activities = [
            {"id": str(uuid.uuid4()), "name": "Template_Activity_1", "description": "From template", "is_deliverable": False, "owner": "Template Owner", "sort_order": 0},
            {"id": str(uuid.uuid4()), "name": "Template_Deliverable_1", "description": "From template", "is_deliverable": True, "owner": "Template Owner", "sort_order": 1}
        ]
        
        create_response = requests.put(
            f"{BASE_URL}/api/activity-templates/{project_type_id}/{phase_name}",
            json={"activities": template_activities, "project_type_name": project_type.get("name", "")},
            headers=headers
        )
        assert create_response.status_code == 200, f"Template creation failed: {create_response.text}"
        print("Step 1: Template created")
        
        # Step 2: Adopt template to project
        adopt_response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/activities/{wave_name}/{phase_name}/adopt-template",
            json={"project_type_id": project_type_id},
            headers=headers
        )
        assert adopt_response.status_code == 200, f"Adopt template failed: {adopt_response.text}"
        adopt_data = adopt_response.json()
        assert adopt_data.get("message") == "Template adopted", f"Expected 'Template adopted', got: {adopt_data.get('message')}"
        assert "activities" in adopt_data, "Response should contain activities"
        adopted_activities = adopt_data.get("activities", [])
        assert len(adopted_activities) == 2, f"Expected 2 adopted activities, got {len(adopted_activities)}"
        print("Step 2: Template adopted")
        
        # Step 3: Verify adopted activities have new IDs (not same as template)
        template_ids = [a["id"] for a in template_activities]
        adopted_ids = [a["id"] for a in adopted_activities]
        for aid in adopted_ids:
            assert aid not in template_ids, "Adopted activities should have new IDs"
        print("Step 3: Verified new IDs for adopted activities")
        
        # Step 4: Verify activities persisted
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}/activities/{wave_name}/{phase_name}",
            headers=headers
        )
        assert get_response.status_code == 200
        persisted = get_response.json().get("activities", [])
        assert len(persisted) == 2, f"Expected 2 persisted activities, got {len(persisted)}"
        print("Step 4: Verified activities persisted")
        
        # Cleanup: Delete template
        requests.delete(f"{BASE_URL}/api/activity-templates/{project_type_id}/{phase_name}", headers=headers)
        print("Cleanup: Template deleted")
    
    def test_adopt_nonexistent_template(self, headers, project_types, test_project):
        """Test adopt template returns 404 for non-existent template"""
        if not project_types or not test_project:
            pytest.skip("No project types or test project available")
        
        project_type_id = project_types[0]["id"]
        project_id = test_project["id"]
        wave_name = test_project["waves"][0]["name"] if test_project.get("waves") else "Wave 1"
        phase_name = "NONEXISTENT_PHASE_FOR_ADOPT"
        
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/activities/{wave_name}/{phase_name}/adopt-template",
            json={"project_type_id": project_type_id},
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Correctly returned 404 for non-existent template")


class TestMilestonesAPI:
    """Regression tests for milestones API"""
    
    def test_get_milestones(self, headers, test_project):
        """Test GET /api/projects/{project_id}/milestones"""
        if not test_project:
            pytest.skip("No test project available")
        
        project_id = test_project["id"]
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/milestones", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "milestones" in data, "Response should contain milestones"
        print(f"Found {len(data.get('milestones', []))} milestones")
    
    def test_save_milestones(self, headers, test_project):
        """Test PUT /api/projects/{project_id}/milestones"""
        if not test_project:
            pytest.skip("No test project available")
        
        project_id = test_project["id"]
        
        # First get existing milestones
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}/milestones", headers=headers)
        existing = get_response.json()
        
        # Save with same data (regression test)
        payload = {
            "milestones": existing.get("milestones", []),
            "payment_terms_days": existing.get("payment_terms_days", 30)
        }
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}/milestones",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Milestones save API working correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
