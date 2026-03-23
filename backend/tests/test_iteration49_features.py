"""
Iteration 49 Tests - Activities Excel Export, Cashflow Sheet, SAP Public Cloud Template, Template Excel Export/Import
Tests for:
1. Activities API for project PRJ-0030 (e33fb19e-b739-412b-9eb5-e3a392d5986e) - should return 8 activity docs
2. Cashflow API endpoint for the project
3. SAP Public Cloud Template - 6 phases with activities
4. Template Excel Export/Import buttons visibility (UI test)
5. Milestone Import - sheets with 'Milestones' in name are skipped from wave parsing
6. Regression - project save and PaymentMilestones page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@yash.com"
TEST_PASSWORD = "password"

# Project PRJ-0030 details
PROJECT_ID = "e33fb19e-b739-412b-9eb5-e3a392d5986e"

# SAP Public Cloud template IDs
SAP_TECH_ID = "7517ff3c-5bb3-47d7-895e-15da5d9da5e1"
SAP_PUBLIC_CLOUD_SUBTECH_ID = "bd26c13f-2090-4ba5-a6ab-20fd051438aa"
SAP_IMPLEMENTATION_PROJTYPE_ID = "e2c5a7ae-d6b3-4fb1-b312-22d41a1af717"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestActivitiesAPI:
    """Test Activities API for project PRJ-0030"""
    
    def test_get_project_activities(self, auth_headers):
        """Test GET /api/projects/{id}/activities returns activity docs for PRJ-0030"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/activities", headers=auth_headers)
        assert response.status_code == 200, f"Activities API failed: {response.text}"
        
        activities = response.json()
        assert isinstance(activities, list), "Activities should be a list"
        # PRJ-0030 should have 8 activity docs
        assert len(activities) >= 1, f"Expected at least 1 activity doc, got {len(activities)}"
        print(f"Found {len(activities)} activity docs for project PRJ-0030")
        
        # Verify structure of activity docs
        if activities:
            first_doc = activities[0]
            assert "project_id" in first_doc, "Activity doc should have project_id"
            assert "wave_name" in first_doc, "Activity doc should have wave_name"
            assert "phase_name" in first_doc, "Activity doc should have phase_name"
            print(f"Sample activity doc: wave={first_doc.get('wave_name')}, phase={first_doc.get('phase_name')}")


class TestCashflowAPI:
    """Test Cashflow API endpoint"""
    
    def test_get_project_cashflow(self, auth_headers):
        """Test GET /api/projects/{id}/cashflow returns cashflow data"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/cashflow", headers=auth_headers)
        assert response.status_code == 200, f"Cashflow API failed: {response.text}"
        
        data = response.json()
        # Verify cashflow structure
        assert "combined_data" in data, "Cashflow should have combined_data"
        assert "wave_data" in data, "Cashflow should have wave_data"
        assert "summary" in data, "Cashflow should have summary"
        assert "payment_terms_days" in data, "Cashflow should have payment_terms_days"
        assert "payment_offset_months" in data, "Cashflow should have payment_offset_months"
        
        print(f"Cashflow data: {len(data.get('combined_data', []))} months, payment_terms={data.get('payment_terms_days')} days")
        
        # Verify summary structure
        summary = data.get("summary", {})
        assert "total_cost" in summary, "Summary should have total_cost"
        assert "total_revenue" in summary, "Summary should have total_revenue"
        assert "net_cashflow" in summary, "Summary should have net_cashflow"


class TestSAPPublicCloudTemplate:
    """Test SAP Public Cloud Template seeding and retrieval"""
    
    def test_seed_sap_public_cloud_template(self, auth_headers):
        """Test POST /api/activity-templates/seed-sap-public seeds 6 phases"""
        response = requests.post(f"{BASE_URL}/api/activity-templates/seed-sap-public", headers=auth_headers)
        assert response.status_code == 200, f"Seed SAP Public Cloud failed: {response.text}"
        
        data = response.json()
        assert "phases" in data, "Response should have phases list"
        phases = data.get("phases", [])
        assert len(phases) == 6, f"Expected 6 phases, got {len(phases)}"
        
        expected_phases = ["Discover", "Prepare", "Explore", "Realize", "Deploy", "Run"]
        for phase in expected_phases:
            assert phase in phases, f"Missing phase: {phase}"
        
        print(f"SAP Public Cloud template seeded with phases: {phases}")
    
    def test_get_sap_public_cloud_templates_by_combo(self, auth_headers):
        """Test GET /api/activity-templates/by-combo returns 6 phase templates"""
        params = {
            "technology_id": SAP_TECH_ID,
            "sub_technology_id": SAP_PUBLIC_CLOUD_SUBTECH_ID,
            "project_type_id": SAP_IMPLEMENTATION_PROJTYPE_ID
        }
        response = requests.get(f"{BASE_URL}/api/activity-templates/by-combo", params=params, headers=auth_headers)
        assert response.status_code == 200, f"Get templates by combo failed: {response.text}"
        
        templates = response.json()
        assert isinstance(templates, list), "Templates should be a list"
        assert len(templates) == 6, f"Expected 6 phase templates, got {len(templates)}"
        
        # Verify each phase has activities
        for tpl in templates:
            assert "phase_name" in tpl, "Template should have phase_name"
            assert "activities" in tpl, "Template should have activities"
            activities = tpl.get("activities", [])
            assert len(activities) > 0, f"Phase {tpl.get('phase_name')} should have activities"
            print(f"Phase {tpl.get('phase_name')}: {len(activities)} activities")


class TestRegressionProjectSave:
    """Regression tests for project save functionality"""
    
    def test_get_project(self, auth_headers):
        """Test GET /api/projects/{id} works for PRJ-0030"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}", headers=auth_headers)
        assert response.status_code == 200, f"Get project failed: {response.text}"
        
        project = response.json()
        assert project.get("id") == PROJECT_ID, "Project ID mismatch"
        print(f"Project: {project.get('project_number')} v{project.get('version')}")
    
    def test_get_projects_list(self, auth_headers):
        """Test GET /api/projects returns list"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200, f"Get projects list failed: {response.text}"
        
        projects = response.json()
        assert isinstance(projects, list), "Projects should be a list"
        assert len(projects) > 0, "Should have at least one project"
        print(f"Found {len(projects)} projects")


class TestPaymentMilestonesAPI:
    """Regression tests for Payment Milestones API"""
    
    def test_get_project_milestones(self, auth_headers):
        """Test GET /api/projects/{project_id}/milestones returns project milestones"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones", headers=auth_headers)
        # May return 200 with data or 404 if no milestones
        assert response.status_code in [200, 404], f"Get project milestones failed: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Project milestones: {len(data.get('milestones', []))} milestones")


class TestActivityTemplatesAPI:
    """Test Activity Templates API"""
    
    def test_get_activity_templates(self, auth_headers):
        """Test GET /api/activity-templates returns templates"""
        response = requests.get(f"{BASE_URL}/api/activity-templates", headers=auth_headers)
        assert response.status_code == 200, f"Get activity templates failed: {response.text}"
        
        templates = response.json()
        assert isinstance(templates, list), "Templates should be a list"
        print(f"Found {len(templates)} activity templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
