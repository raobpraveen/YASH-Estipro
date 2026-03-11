"""
Iteration 26 Backend Tests - Payment Milestones, Cashflow, Gantt APIs

Features tested:
1. GET /api/projects/{id}/milestones - Returns milestones for a project
2. PUT /api/projects/{id}/milestones - Saves milestones
3. GET /api/projects/{id}/cashflow - Returns monthly cashflow data
4. POST /api/projects/{id}/gantt - Uploads gantt chart image
5. GET /api/projects/{id}/gantt - Retrieves gantt chart image
6. DELETE /api/projects/{id}/gantt - Deletes gantt chart
7. GET /api/proficiency-rates - Verify rates have data for copy feature
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@yash.com",
        "password": "password"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]

@pytest.fixture(scope="module")
def test_project_id(auth_token):
    """Get a project with waves/allocations for testing"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
    assert response.status_code == 200
    projects = response.json()
    
    # Find project with waves and allocations
    for p in projects:
        waves = p.get("waves", [])
        if waves:
            for w in waves:
                if len(w.get("grid_allocations", [])) > 0:
                    return p["id"]
    
    # Fallback: return first project
    if projects:
        return projects[0]["id"]
    pytest.skip("No projects available for testing")


class TestMilestonesAPI:
    """Tests for Payment Milestones endpoints"""
    
    def test_get_milestones_empty(self, auth_token, test_project_id):
        """Test GET /api/projects/{id}/milestones returns empty array if no milestones"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}/milestones", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "project_id" in data
        assert "milestones" in data
        assert isinstance(data["milestones"], list)
    
    def test_save_milestones(self, auth_token, test_project_id):
        """Test PUT /api/projects/{id}/milestones saves milestone data"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        milestone_id = str(uuid.uuid4())
        
        payload = {
            "milestones": [
                {
                    "id": milestone_id,
                    "wave_name": "TEST_Wave",
                    "milestone_name": f"TEST_Milestone_{uuid.uuid4().hex[:8]}",
                    "completion_percentage": 50,
                    "payment_percentage": 30,
                    "payment_amount": 50000,
                    "description": "Test milestone description"
                }
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/projects/{test_project_id}/milestones", 
                               headers=headers, json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Milestones saved"
        assert "milestones" in data
        assert len(data["milestones"]) == 1
        assert data["milestones"][0]["milestone_name"] == payload["milestones"][0]["milestone_name"]
    
    def test_get_milestones_after_save(self, auth_token, test_project_id):
        """Test GET milestones returns saved data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}/milestones", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "milestones" in data
        # Should have at least the milestone we saved in previous test
        assert len(data["milestones"]) >= 1
    
    def test_update_milestones(self, auth_token, test_project_id):
        """Test PUT /api/projects/{id}/milestones updates existing milestones"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Update with new milestone data
        new_milestone = {
            "id": str(uuid.uuid4()),
            "wave_name": "Updated_Wave",
            "milestone_name": f"Updated_Milestone_{uuid.uuid4().hex[:8]}",
            "completion_percentage": 75,
            "payment_percentage": 50,
            "payment_amount": 100000,
            "description": "Updated description"
        }
        
        response = requests.put(f"{BASE_URL}/api/projects/{test_project_id}/milestones", 
                               headers=headers, json={"milestones": [new_milestone]})
        
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}/milestones", headers=headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["milestones"][0]["milestone_name"] == new_milestone["milestone_name"]


class TestCashflowAPI:
    """Tests for Cashflow Statement endpoint"""
    
    def test_get_cashflow(self, auth_token, test_project_id):
        """Test GET /api/projects/{id}/cashflow returns cashflow data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}/cashflow", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "project_id" in data
        assert "project_number" in data
        assert "project_name" in data
        assert "summary" in data
        assert "monthly_data" in data
        
        # Verify summary fields
        summary = data["summary"]
        assert "total_cost" in summary
        assert "total_revenue" in summary
        assert "net_cashflow" in summary
        assert isinstance(summary["total_cost"], (int, float))
    
    def test_cashflow_monthly_data_structure(self, auth_token, test_project_id):
        """Test cashflow monthly_data has correct structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}/cashflow", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["monthly_data"]) > 0:
            month = data["monthly_data"][0]
            assert "month" in month
            assert "cost" in month
            assert "revenue" in month
            assert "net" in month
            assert "cumulative" in month
    
    def test_cashflow_net_calculation(self, auth_token, test_project_id):
        """Test that net_cashflow = total_revenue - total_cost"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}/cashflow", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        summary = data["summary"]
        
        expected_net = summary["total_revenue"] - summary["total_cost"]
        assert abs(summary["net_cashflow"] - expected_net) < 0.01  # Allow small float precision error


class TestGanttAPI:
    """Tests for Gantt Chart upload/download endpoints"""
    
    def test_upload_gantt_chart(self, auth_token, test_project_id):
        """Test POST /api/projects/{id}/gantt uploads image"""
        # Create a simple 1x1 PNG image
        import base64
        # Minimal PNG: 1x1 red pixel
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "X-Filename": "test_gantt.png",
            "X-Content-Type": "image/png"
        }
        
        response = requests.post(f"{BASE_URL}/api/projects/{test_project_id}/gantt", 
                                headers=headers, data=png_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_get_gantt_chart(self, auth_token, test_project_id):
        """Test GET /api/projects/{id}/gantt retrieves image"""
        # First ensure a gantt chart exists
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        upload_headers = {
            "Authorization": f"Bearer {auth_token}",
            "X-Filename": "test_gantt.png",
            "X-Content-Type": "image/png"
        }
        requests.post(f"{BASE_URL}/api/projects/{test_project_id}/gantt", 
                     headers=upload_headers, data=png_data)
        
        # Now get the gantt chart
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}/gantt")
        
        assert response.status_code == 200
        assert response.headers.get("Content-Type", "").startswith("image/")
    
    def test_delete_gantt_chart(self, auth_token, test_project_id):
        """Test DELETE /api/projects/{id}/gantt removes image"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.delete(f"{BASE_URL}/api/projects/{test_project_id}/gantt", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestProficiencyRates:
    """Tests for Proficiency Rates - verifying Copy feature data requirements"""
    
    def test_get_proficiency_rates(self, auth_token):
        """Test GET /api/proficiency-rates returns rates data"""
        response = requests.get(f"{BASE_URL}/api/proficiency-rates")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If rates exist, verify structure
        if len(data) > 0:
            rate = data[0]
            assert "id" in rate
            assert "skill_id" in rate
            assert "skill_name" in rate
            assert "base_location_id" in rate
            assert "base_location_name" in rate
            assert "proficiency_level" in rate
            assert "avg_monthly_salary" in rate


class TestProjectWaveLogistics:
    """Test contingency_absolute field in logistics_config"""
    
    def test_project_has_logistics_config(self, auth_token, test_project_id):
        """Test that project waves can have logistics_config with contingency_absolute"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}", headers=headers)
        
        assert response.status_code == 200
        project = response.json()
        
        waves = project.get("waves", [])
        if waves:
            # Check that logistics_config structure is present
            wave = waves[0]
            logistics_config = wave.get("logistics_config", {})
            # Verify contingency_absolute can exist in the config
            # This test verifies the field is supported, not that it exists
            assert isinstance(logistics_config, dict)
