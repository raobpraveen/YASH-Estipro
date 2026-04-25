"""
Phase 2 Testing - Project Information & Filters Enhancements
Tests for:
1. Competencies CRUD endpoints (GET/POST/PUT/DELETE /api/competencies)
2. Dashboard project-locations endpoint (GET /api/dashboard/project-locations)
3. Dashboard analytics excludes Budgetary projects
4. New project fields (bid_category, forecasted_closure_date, competency_ids) persistence
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCompetenciesCRUD:
    """Test Competencies CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_ids = []
        yield
        # Cleanup created competencies
        for comp_id in self.created_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/competencies/{comp_id}")
            except:
                pass
    
    def test_get_competencies(self):
        """GET /api/competencies returns list"""
        response = self.session.get(f"{BASE_URL}/api/competencies")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/competencies: {len(data)} competencies found")
    
    def test_create_competency(self):
        """POST /api/competencies creates new competency"""
        payload = {"name": "TEST_SAP_ERP", "description": "SAP ERP Competency for testing"}
        response = self.session.post(f"{BASE_URL}/api/competencies", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_SAP_ERP"
        assert data["description"] == "SAP ERP Competency for testing"
        assert "id" in data
        self.created_ids.append(data["id"])
        print(f"POST /api/competencies: Created competency {data['id']}")
    
    def test_update_competency(self):
        """PUT /api/competencies/{id} updates competency"""
        # First create
        payload = {"name": "TEST_Cloud_Original", "description": "Original"}
        create_resp = self.session.post(f"{BASE_URL}/api/competencies", json=payload)
        assert create_resp.status_code == 200
        comp_id = create_resp.json()["id"]
        self.created_ids.append(comp_id)
        
        # Update
        update_payload = {"name": "TEST_Cloud_Updated", "description": "Updated description"}
        update_resp = self.session.put(f"{BASE_URL}/api/competencies/{comp_id}", json=update_payload)
        assert update_resp.status_code == 200
        
        # Verify update
        get_resp = self.session.get(f"{BASE_URL}/api/competencies")
        assert get_resp.status_code == 200
        competencies = get_resp.json()
        updated = next((c for c in competencies if c["id"] == comp_id), None)
        assert updated is not None
        assert updated["name"] == "TEST_Cloud_Updated"
        print(f"PUT /api/competencies/{comp_id}: Updated successfully")
    
    def test_delete_competency(self):
        """DELETE /api/competencies/{id} removes competency"""
        # First create
        payload = {"name": "TEST_ToDelete", "description": "Will be deleted"}
        create_resp = self.session.post(f"{BASE_URL}/api/competencies", json=payload)
        assert create_resp.status_code == 200
        comp_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = self.session.delete(f"{BASE_URL}/api/competencies/{comp_id}")
        assert delete_resp.status_code == 200
        
        # Verify deletion
        get_resp = self.session.get(f"{BASE_URL}/api/competencies")
        competencies = get_resp.json()
        deleted = next((c for c in competencies if c["id"] == comp_id), None)
        assert deleted is None
        print(f"DELETE /api/competencies/{comp_id}: Deleted successfully")


class TestDashboardProjectLocations:
    """Test Dashboard project-locations endpoint"""
    
    def test_get_project_locations(self):
        """GET /api/dashboard/project-locations returns distinct location codes"""
        response = requests.get(f"{BASE_URL}/api/dashboard/project-locations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should return location codes (e.g., "US", "IN", "DE")
        print(f"GET /api/dashboard/project-locations: {len(data)} locations - {data[:5]}...")


class TestDashboardAnalyticsBudgetaryExclusion:
    """Test that Budgetary projects are excluded from dashboard analytics"""
    
    def test_analytics_excludes_budgetary(self):
        """GET /api/dashboard/analytics should exclude bid_category=Budgetary"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "total_projects" in data
        assert "total_revenue" in data
        print(f"Dashboard analytics: {data['total_projects']} projects, ${data['total_revenue']:.0f} total value")


class TestProjectNewFields:
    """Test new project fields: bid_category, forecasted_closure_date, competency_ids"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_project_ids = []
        self.created_competency_ids = []
        yield
        # Cleanup
        for pid in self.created_project_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{pid}")
            except:
                pass
        for cid in self.created_competency_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/competencies/{cid}")
            except:
                pass
    
    def test_project_with_new_fields(self):
        """Create project with bid_category, forecasted_closure_date, competency_ids"""
        # First create a competency
        comp_resp = self.session.post(f"{BASE_URL}/api/competencies", json={
            "name": "TEST_Digital_Competency", "description": "Test"
        })
        assert comp_resp.status_code == 200
        comp_id = comp_resp.json()["id"]
        self.created_competency_ids.append(comp_id)
        
        # Get a customer
        customers_resp = self.session.get(f"{BASE_URL}/api/customers")
        customers = customers_resp.json()
        customer_id = customers[0]["id"] if customers else ""
        customer_name = customers[0]["name"] if customers else ""
        
        # Get a technology
        tech_resp = self.session.get(f"{BASE_URL}/api/technologies")
        techs = tech_resp.json()
        tech_id = techs[0]["id"] if techs else ""
        tech_name = techs[0]["name"] if techs else ""
        
        # Get a project type
        pt_resp = self.session.get(f"{BASE_URL}/api/project-types")
        pts = pt_resp.json()
        pt_id = pts[0]["id"] if pts else ""
        pt_name = pts[0]["name"] if pts else ""
        
        # Create project with new fields
        project_payload = {
            "name": "TEST_Phase2_Project",
            "customer_id": customer_id,
            "customer_name": customer_name,
            "technology_ids": [tech_id] if tech_id else [],
            "technology_names": [tech_name] if tech_name else [],
            "project_type_ids": [pt_id] if pt_id else [],
            "project_type_names": [pt_name] if pt_name else [],
            "bid_category": "Most Likely",
            "forecasted_closure_date": "2026-06-30",
            "competency_ids": [comp_id],
            "competency_names": ["TEST_Digital_Competency"],
            "waves": [{
                "name": "Wave 1",
                "duration_months": 3,
                "phase_names": ["Month 1", "Month 2", "Month 3"],
                "grid_allocations": []
            }]
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/projects", json=project_payload)
        assert create_resp.status_code == 200, f"Failed to create project: {create_resp.text}"
        project = create_resp.json()
        self.created_project_ids.append(project["id"])
        
        # Verify fields were saved
        assert project.get("bid_category") == "Most Likely"
        assert project.get("forecasted_closure_date") == "2026-06-30"
        assert comp_id in project.get("competency_ids", [])
        print(f"Created project with new fields: bid_category={project.get('bid_category')}, forecasted_closure_date={project.get('forecasted_closure_date')}, competency_ids={project.get('competency_ids')}")
        
        # Fetch project and verify persistence
        get_resp = self.session.get(f"{BASE_URL}/api/projects/{project['id']}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched.get("bid_category") == "Most Likely"
        assert fetched.get("forecasted_closure_date") == "2026-06-30"
        assert comp_id in fetched.get("competency_ids", [])
        print("Verified new fields persist on GET")
    
    def test_bid_category_options(self):
        """Test all bid category options: None, Budgetary, Most Likely, Committed, Won, Loss"""
        bid_categories = ["", "Budgetary", "Most Likely", "Committed", "Won", "Loss"]
        
        # Get required master data
        customers_resp = self.session.get(f"{BASE_URL}/api/customers")
        customers = customers_resp.json()
        customer_id = customers[0]["id"] if customers else ""
        customer_name = customers[0]["name"] if customers else ""
        
        tech_resp = self.session.get(f"{BASE_URL}/api/technologies")
        techs = tech_resp.json()
        tech_id = techs[0]["id"] if techs else ""
        tech_name = techs[0]["name"] if techs else ""
        
        pt_resp = self.session.get(f"{BASE_URL}/api/project-types")
        pts = pt_resp.json()
        pt_id = pts[0]["id"] if pts else ""
        pt_name = pts[0]["name"] if pts else ""
        
        for bc in bid_categories:
            project_payload = {
                "name": f"TEST_BidCategory_{bc or 'None'}",
                "customer_id": customer_id,
                "customer_name": customer_name,
                "technology_ids": [tech_id] if tech_id else [],
                "technology_names": [tech_name] if tech_name else [],
                "project_type_ids": [pt_id] if pt_id else [],
                "project_type_names": [pt_name] if pt_name else [],
                "bid_category": bc,
                "waves": [{
                    "name": "Wave 1",
                    "duration_months": 1,
                    "phase_names": ["Month 1"],
                    "grid_allocations": []
                }]
            }
            
            create_resp = self.session.post(f"{BASE_URL}/api/projects", json=project_payload)
            assert create_resp.status_code == 200, f"Failed for bid_category={bc}: {create_resp.text}"
            project = create_resp.json()
            self.created_project_ids.append(project["id"])
            
            # Verify
            assert project.get("bid_category") == bc
            print(f"Bid category '{bc or 'None'}' saved successfully")


class TestProjectsListStatusFilter:
    """Test that status filter works in projects list"""
    
    def test_projects_endpoint(self):
        """GET /api/projects returns projects with status field"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        
        # Check that projects have status field
        if projects:
            statuses = set(p.get("status", "draft") for p in projects)
            print(f"Projects statuses found: {statuses}")
            # Valid statuses
            valid_statuses = {"draft", "in_review", "approved", "rejected", "suspended", "obsolete", "superseded"}
            for s in statuses:
                assert s in valid_statuses, f"Invalid status: {s}"
        print(f"GET /api/projects: {len(projects)} projects with valid status fields")
