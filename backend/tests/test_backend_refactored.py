"""
Backend API Tests for YASH EstPro - Post Refactoring Verification
Tests all API endpoints after backend was split into modular routers
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://estpro-staging.preview.emergentagent.com').rstrip('/')

class TestHealthAndAuth:
    """Test health endpoint and authentication flows"""
    
    def test_health_endpoint(self):
        """Health check endpoint (no /api prefix)"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health endpoint working")
    
    def test_login_success(self):
        """Login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@yash.com"
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful for {data['user']['email']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Login with wrong credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login rejected correctly")
    
    def test_auth_me_endpoint(self):
        """Get current user info"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        token = login_resp.json()["token"]
        
        # Then get me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@yash.com"
        print("✓ Auth me endpoint working")


class TestProjects:
    """Test project CRUD and related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_projects_list(self):
        """Get list of projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Projects list returned {len(data)} projects")
    
    def test_get_archived_projects(self):
        """Get archived projects"""
        response = requests.get(f"{BASE_URL}/api/projects/archived", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Archived projects endpoint working, {len(data)} archived")
    
    def test_get_templates(self):
        """Get project templates"""
        response = requests.get(f"{BASE_URL}/api/templates", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Templates endpoint working, {len(data)} templates")
    
    def test_get_single_project(self):
        """Get a single project by ID"""
        # First get list
        list_resp = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = list_resp.json()
        
        if projects:
            project_id = projects[0]["id"]
            response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == project_id
            print(f"✓ Single project retrieved: {data.get('name', 'N/A')}")
        else:
            pytest.skip("No projects available to test")
    
    def test_get_project_versions(self):
        """Get versions of a project"""
        list_resp = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = list_resp.json()
        
        if projects:
            project_id = projects[0]["id"]
            response = requests.get(f"{BASE_URL}/api/projects/{project_id}/versions", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Project versions endpoint working, {len(data)} versions")
        else:
            pytest.skip("No projects available to test")


class TestMasterData:
    """Test master data endpoints - Customers, Technologies, Skills, etc."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_customers(self):
        """Get customers list"""
        response = requests.get(f"{BASE_URL}/api/customers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customers endpoint working, {len(data)} customers")
    
    def test_get_technologies(self):
        """Get technologies list"""
        response = requests.get(f"{BASE_URL}/api/technologies", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Technologies endpoint working, {len(data)} technologies")
    
    def test_get_sub_technologies(self):
        """Get sub-technologies list"""
        response = requests.get(f"{BASE_URL}/api/sub-technologies", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sub-technologies endpoint working, {len(data)} sub-technologies")
    
    def test_get_skills(self):
        """Get skills list"""
        response = requests.get(f"{BASE_URL}/api/skills", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Skills endpoint working, {len(data)} skills")
    
    def test_get_proficiency_rates(self):
        """Get proficiency rates list"""
        response = requests.get(f"{BASE_URL}/api/proficiency-rates", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Proficiency rates endpoint working, {len(data)} rates")
    
    def test_get_base_locations(self):
        """Get base locations list"""
        response = requests.get(f"{BASE_URL}/api/base-locations", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Base locations endpoint working, {len(data)} locations")
    
    def test_get_project_types(self):
        """Get project types list"""
        response = requests.get(f"{BASE_URL}/api/project-types", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Project types endpoint working, {len(data)} types")
    
    def test_get_sales_managers(self):
        """Get sales managers list"""
        response = requests.get(f"{BASE_URL}/api/sales-managers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sales managers endpoint working, {len(data)} managers")


class TestDashboard:
    """Test dashboard analytics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_analytics(self):
        """Get dashboard analytics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_projects" in data
        assert "total_revenue" in data
        assert "projects_by_status" in data
        print(f"✓ Dashboard analytics working, {data['total_projects']} total projects")
    
    def test_dashboard_compare(self):
        """Test dashboard compare periods"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/compare",
            params={
                "period1_from": "2025-01-01",
                "period1_to": "2025-06-30",
                "period2_from": "2025-07-01",
                "period2_to": "2025-12-31"
            },
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period1" in data
        assert "period2" in data
        assert "deltas" in data
        print("✓ Dashboard compare endpoint working")


class TestFinancials:
    """Test financial endpoints - Milestones, Cashflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_milestones(self):
        """Get milestones for a project"""
        # Get a project first
        list_resp = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = list_resp.json()
        
        if projects:
            project_id = projects[0]["id"]
            response = requests.get(f"{BASE_URL}/api/projects/{project_id}/milestones", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert "project_id" in data
            print(f"✓ Milestones endpoint working")
        else:
            pytest.skip("No projects available to test")
    
    def test_get_cashflow(self):
        """Get cashflow for a project"""
        list_resp = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = list_resp.json()
        
        if projects:
            project_id = projects[0]["id"]
            response = requests.get(f"{BASE_URL}/api/projects/{project_id}/cashflow", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert "project_id" in data
            assert "summary" in data
            print(f"✓ Cashflow endpoint working")
        else:
            pytest.skip("No projects available to test")


class TestUsers:
    """Test user management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_users_list(self):
        """Get list of users (admin only)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Users list endpoint working, {len(data)} users")
    
    def test_get_approvers_list(self):
        """Get list of approvers"""
        response = requests.get(f"{BASE_URL}/api/users/approvers/list", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Approvers list endpoint working, {len(data)} approvers")
    
    def test_get_user_settings(self):
        """Get user settings"""
        response = requests.get(f"{BASE_URL}/api/user/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "theme" in data
        print(f"✓ User settings endpoint working")


class TestNotificationsAndAudit:
    """Test notifications and audit log endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_notifications(self):
        """Get notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Notifications endpoint working, {len(data)} notifications")
    
    def test_get_audit_logs(self):
        """Get audit logs"""
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Audit logs endpoint working, {len(data)} logs")
    
    def test_get_audit_summary(self):
        """Get audit logs summary (admin only)"""
        response = requests.get(f"{BASE_URL}/api/audit-logs/summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_logs" in data
        print(f"✓ Audit summary endpoint working, {data['total_logs']} total logs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
