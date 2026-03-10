"""
Test suite for Batch 5 features:
1. CRM ID + Sub Technology fields in Project Estimator
2. Projects List Export to Excel 
3. Dashboard Total Projects click → navigate to Projects
4. Sub Technologies master data CRUD
5. Grid column layout verification ($/Month not overlapping Onsite)
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://yash-estimator.preview.emergentagent.com')


class TestSubTechnologies:
    """Test Sub-Technologies CRUD operations"""
    
    def test_get_sub_technologies(self):
        """GET /api/sub-technologies - List all sub-technologies"""
        response = requests.get(f"{BASE_URL}/api/sub-technologies")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} sub-technologies")
        
        # Verify structure if data exists
        if len(data) > 0:
            item = data[0]
            assert 'id' in item
            assert 'name' in item
            assert 'technology_id' in item
            assert 'technology_name' in item
            print(f"Sample sub-technology: {item['name']} -> {item['technology_name']}")
    
    def test_get_technologies_for_sub_tech(self):
        """GET /api/technologies - Ensure parent technologies exist for linking"""
        response = requests.get(f"{BASE_URL}/api/technologies")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Need at least one technology for sub-technology linking"
        print(f"Found {len(data)} parent technologies")
        return data
    
    def test_create_sub_technology(self):
        """POST /api/sub-technologies - Create new sub-technology"""
        # Get a parent technology first
        tech_response = requests.get(f"{BASE_URL}/api/technologies")
        technologies = tech_response.json()
        if len(technologies) == 0:
            pytest.skip("No parent technologies available")
        
        parent_tech = technologies[0]
        payload = {
            "name": "TEST_SubTech_Automation",
            "technology_id": parent_tech['id'],
            "technology_name": parent_tech['name']
        }
        
        response = requests.post(f"{BASE_URL}/api/sub-technologies", json=payload)
        assert response.status_code == 200, f"Failed to create sub-technology: {response.text}"
        
        created = response.json()
        assert created['name'] == payload['name']
        assert created['technology_id'] == parent_tech['id']
        print(f"Created sub-technology: {created['name']} (ID: {created['id']})")
        return created['id']
    
    def test_delete_sub_technology(self):
        """DELETE /api/sub-technologies/{id} - Delete sub-technology"""
        # First create one to delete
        tech_response = requests.get(f"{BASE_URL}/api/technologies")
        technologies = tech_response.json()
        if len(technologies) == 0:
            pytest.skip("No parent technologies available")
        
        parent_tech = technologies[0]
        payload = {
            "name": "TEST_SubTech_ToDelete",
            "technology_id": parent_tech['id'],
            "technology_name": parent_tech['name']
        }
        
        create_response = requests.post(f"{BASE_URL}/api/sub-technologies", json=payload)
        assert create_response.status_code == 200
        sub_tech_id = create_response.json()['id']
        
        # Now delete it
        delete_response = requests.delete(f"{BASE_URL}/api/sub-technologies/{sub_tech_id}")
        assert delete_response.status_code == 200
        print(f"Successfully deleted sub-technology ID: {sub_tech_id}")


class TestCRMIdField:
    """Test CRM ID field on projects"""
    
    def test_project_model_has_crm_id(self):
        """Verify CRM ID field exists in project model by creating project"""
        # Get required data
        customers = requests.get(f"{BASE_URL}/api/customers").json()
        technologies = requests.get(f"{BASE_URL}/api/technologies").json()
        project_types = requests.get(f"{BASE_URL}/api/project-types").json()
        
        if not customers or not technologies or not project_types:
            pytest.skip("Need customers, technologies, and project types to test")
        
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        token = login_response.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create project with CRM ID
        payload = {
            "name": "TEST_CRM_ID_Project",
            "customer_id": customers[0]['id'],
            "customer_name": customers[0]['name'],
            "technology_ids": [technologies[0]['id']],
            "technology_names": [technologies[0]['name']],
            "project_type_ids": [project_types[0]['id']],
            "project_type_names": [project_types[0]['name']],
            "crm_id": "CRM-12345-TEST",
            "profit_margin_percentage": 35,
            "waves": [{
                "id": "test-wave-1",
                "name": "Test Wave",
                "duration_months": 1,
                "phase_names": ["Month 1"],
                "grid_allocations": []
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        project = response.json()
        assert 'crm_id' in project
        assert project['crm_id'] == "CRM-12345-TEST"
        print(f"Project created with CRM ID: {project['crm_id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=headers)


class TestSubTechnologyOnProject:
    """Test sub-technology field on projects"""
    
    def test_project_has_sub_technology_fields(self):
        """Verify sub_technology_ids field exists in project model"""
        # Get required data
        customers = requests.get(f"{BASE_URL}/api/customers").json()
        technologies = requests.get(f"{BASE_URL}/api/technologies").json()
        project_types = requests.get(f"{BASE_URL}/api/project-types").json()
        sub_technologies = requests.get(f"{BASE_URL}/api/sub-technologies").json()
        
        if not customers or not technologies or not project_types:
            pytest.skip("Need customers, technologies, and project types to test")
        
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        token = login_response.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create project with sub-technologies
        sub_tech_ids = [sub_technologies[0]['id']] if sub_technologies else []
        sub_tech_names = [sub_technologies[0]['name']] if sub_technologies else []
        
        payload = {
            "name": "TEST_SubTech_Project",
            "customer_id": customers[0]['id'],
            "customer_name": customers[0]['name'],
            "technology_ids": [technologies[0]['id']],
            "technology_names": [technologies[0]['name']],
            "project_type_ids": [project_types[0]['id']],
            "project_type_names": [project_types[0]['name']],
            "sub_technology_ids": sub_tech_ids,
            "sub_technology_names": sub_tech_names,
            "profit_margin_percentage": 35,
            "waves": [{
                "id": "test-wave-1",
                "name": "Test Wave",
                "duration_months": 1,
                "phase_names": ["Month 1"],
                "grid_allocations": []
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        project = response.json()
        assert 'sub_technology_ids' in project
        assert 'sub_technology_names' in project
        print(f"Project created with sub_technology_ids: {project.get('sub_technology_ids')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=headers)


class TestProjectsExport:
    """Test Projects list export functionality"""
    
    def test_projects_endpoint_supports_latest_only_false(self):
        """GET /api/projects?latest_only=false - Should return all versions"""
        response = requests.get(f"{BASE_URL}/api/projects?latest_only=false")
        assert response.status_code == 200
        all_versions = response.json()
        print(f"All projects (including all versions): {len(all_versions)}")
        
        # Also test default behavior (latest only)
        response_latest = requests.get(f"{BASE_URL}/api/projects")
        assert response_latest.status_code == 200
        latest_only = response_latest.json()
        print(f"Latest versions only: {len(latest_only)}")
        
        # All versions should be >= latest only
        assert len(all_versions) >= len(latest_only)
    
    def test_download_file_endpoint(self):
        """Test download file proxy endpoint exists"""
        # POST to upload (should work even with empty payload for testing endpoint existence)
        response = requests.post(
            f"{BASE_URL}/api/download-file",
            data=b"test content",
            headers={"X-Filename": "test.txt", "X-Content-Type": "text/plain"}
        )
        
        # Endpoint should exist and return a download_id
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert 'download_id' in data
            print(f"Download file endpoint working, got download_id: {data['download_id']}")


class TestDashboardAnalytics:
    """Test Dashboard analytics endpoint"""
    
    def test_dashboard_analytics(self):
        """GET /api/dashboard/analytics - Should return stats including total_projects"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics")
        assert response.status_code == 200
        data = response.json()
        
        assert 'total_projects' in data
        assert 'total_revenue' in data
        assert 'projects_by_status' in data
        
        print(f"Dashboard stats - Total Projects: {data['total_projects']}, Revenue: {data['total_revenue']}")


class TestAuthentication:
    """Test authentication endpoint"""
    
    def test_login(self):
        """POST /api/auth/login - Admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        print(f"Login successful for admin@yash.com")
        return data['token']


# Cleanup test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Clean up TEST_ prefixed data after tests complete"""
    yield
    
    # Cleanup sub-technologies
    try:
        sub_techs = requests.get(f"{BASE_URL}/api/sub-technologies").json()
        for st in sub_techs:
            if st['name'].startswith('TEST_'):
                requests.delete(f"{BASE_URL}/api/sub-technologies/{st['id']}")
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
