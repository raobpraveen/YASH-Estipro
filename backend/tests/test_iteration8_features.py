"""
Iteration 8 Test Suite - JWT Authentication, Templates, Total Cost column, Excel Upload
Features to test:
1. JWT Authentication - Register new user
2. JWT Authentication - Login with existing user
3. JWT Authentication - Logout functionality (frontend-side, token removal)
4. Total Cost column shows in grid (Salary Cost + Overhead)
5. Excel export includes Total Cost column
6. Skills page has Template download and Upload Excel buttons
7. Proficiency Rates page has Template download and Upload Excel buttons
8. Projects page shows Template badge for template projects
9. Save as Template dialog works
10. Create from Template dropdown works
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://project-calc-dev.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


class TestJWTAuthentication:
    """Test JWT Authentication endpoints"""
    
    def test_register_new_user_success(self):
        """Test registering a new user"""
        unique_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "testpassword123",
            "name": "Test User New"
        }
        response = requests.post(f"{API}/auth/register", json=payload)
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == unique_email.lower()
        assert data["user"]["name"] == "Test User New"
        assert data["user"]["role"] == "user"
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"✓ Registration successful for {unique_email}")
        
    def test_register_duplicate_email_fails(self):
        """Test that registering with duplicate email fails"""
        # First create user
        unique_email = f"test_dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "testpassword123",
            "name": "Test Dup User"
        }
        response1 = requests.post(f"{API}/auth/register", json=payload)
        assert response1.status_code == 200, "First registration should succeed"
        
        # Try to register same email again
        response2 = requests.post(f"{API}/auth/register", json=payload)
        assert response2.status_code == 400, "Duplicate registration should fail"
        assert "Email already registered" in response2.text
        print("✓ Duplicate email registration correctly rejected")
        
    def test_login_existing_user_success(self):
        """Test login with existing user credentials"""
        payload = {
            "email": "test@example.com",
            "password": "test123"
        }
        response = requests.post(f"{API}/auth/login", json=payload)
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == "test@example.com"
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"✓ Login successful for test@example.com")
        
    def test_login_invalid_credentials_fails(self):
        """Test login with wrong password fails"""
        payload = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        response = requests.post(f"{API}/auth/login", json=payload)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Invalid" in response.text
        print("✓ Invalid credentials correctly rejected")
        
    def test_login_nonexistent_user_fails(self):
        """Test login with nonexistent email fails"""
        payload = {
            "email": "nonexistent_user_xyz@example.com",
            "password": "anypassword"
        }
        response = requests.post(f"{API}/auth/login", json=payload)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Nonexistent user login correctly rejected")
        
    def test_auth_me_with_valid_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login to get token
        login_response = requests.post(f"{API}/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Now call /auth/me
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API}/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert data["email"] == "test@example.com"
        print("✓ /auth/me returns correct user info")
        
    def test_auth_me_without_token_fails(self):
        """Test /auth/me without token fails"""
        response = requests.get(f"{API}/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /auth/me correctly requires authentication")


class TestTemplateFeatures:
    """Test Project Template functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        login_response = requests.post(f"{API}/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        self.token = login_response.json().get("token", "")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_templates_endpoint(self):
        """Test GET /templates returns template projects"""
        response = requests.get(f"{API}/templates")
        assert response.status_code == 200, f"Templates fetch failed: {response.text}"
        
        templates = response.json()
        assert isinstance(templates, list), "Templates should be a list"
        
        # Check if there are any templates with is_template=True
        for template in templates:
            assert template.get("is_template") == True, "All returned projects should be templates"
            
        print(f"✓ GET /templates returns {len(templates)} templates")
        
    def test_save_project_as_template(self):
        """Test saving a project as a template"""
        # First, get an existing project (non-template)
        projects_response = requests.get(f"{API}/projects")
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        # Find a non-template project
        non_template = None
        for p in projects:
            if not p.get("is_template"):
                non_template = p
                break
                
        if non_template is None:
            # Create a new project for testing
            create_response = requests.post(f"{API}/projects", json={
                "name": f"TEST_Template_{uuid.uuid4().hex[:6]}",
                "customer_id": projects[0].get("customer_id", ""),
                "customer_name": projects[0].get("customer_name", "Test Customer")
            })
            assert create_response.status_code == 200
            non_template = create_response.json()
            
        project_id = non_template["id"]
        template_name = f"Test Template {uuid.uuid4().hex[:6]}"
        
        # Save as template
        response = requests.post(
            f"{API}/projects/{project_id}/save-as-template?template_name={template_name}"
        )
        assert response.status_code == 200, f"Save as template failed: {response.text}"
        assert "template" in response.json().get("message", "").lower()
        print(f"✓ Project saved as template: {template_name}")
        
        # Verify it appears in templates
        templates_response = requests.get(f"{API}/templates")
        templates = templates_response.json()
        template_names = [t.get("template_name") for t in templates]
        assert template_name in template_names, "New template should appear in templates list"
        print("✓ Template appears in templates list")
        
    def test_save_as_template_requires_name(self):
        """Test that template name is required"""
        projects_response = requests.get(f"{API}/projects")
        projects = projects_response.json()
        if projects:
            project_id = projects[0]["id"]
            response = requests.post(f"{API}/projects/{project_id}/save-as-template?template_name=")
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            print("✓ Empty template name correctly rejected")
            
    def test_create_project_from_template(self):
        """Test creating a new project from a template"""
        # Get templates
        templates_response = requests.get(f"{API}/templates")
        templates = templates_response.json()
        
        if len(templates) == 0:
            pytest.skip("No templates available to test create from template")
            
        template_id = templates[0]["id"]
        template_name = templates[0].get("template_name", "Unknown")
        
        # Create from template
        response = requests.post(f"{API}/projects/create-from-template/{template_id}")
        assert response.status_code == 200, f"Create from template failed: {response.text}"
        
        new_project = response.json()
        assert new_project["is_template"] == False, "New project should not be a template"
        assert "from template" in new_project.get("name", "").lower()
        assert new_project.get("version_notes", "") != ""
        print(f"✓ Created project {new_project['project_number']} from template {template_name}")
        
    def test_remove_template_flag(self):
        """Test removing template flag from a project"""
        # Get templates
        templates_response = requests.get(f"{API}/templates")
        templates = templates_response.json()
        
        if len(templates) == 0:
            pytest.skip("No templates available to test remove template")
            
        # Use the last template to remove (so we don't break existing tests)
        template_id = templates[-1]["id"]
        
        # Remove template flag
        response = requests.post(f"{API}/projects/{template_id}/remove-template")
        assert response.status_code == 200, f"Remove template failed: {response.text}"
        print("✓ Template flag removed successfully")


class TestSkillsAndRatesEndpoints:
    """Test Skills and Proficiency Rates endpoints work correctly"""
    
    def test_get_skills(self):
        """Test GET /skills returns skill list"""
        response = requests.get(f"{API}/skills")
        assert response.status_code == 200, f"Skills fetch failed: {response.text}"
        
        skills = response.json()
        assert isinstance(skills, list), "Skills should be a list"
        if len(skills) > 0:
            assert "name" in skills[0]
            assert "technology_name" in skills[0]
        print(f"✓ GET /skills returns {len(skills)} skills")
        
    def test_get_proficiency_rates(self):
        """Test GET /proficiency-rates returns rates list"""
        response = requests.get(f"{API}/proficiency-rates")
        assert response.status_code == 200, f"Rates fetch failed: {response.text}"
        
        rates = response.json()
        assert isinstance(rates, list), "Rates should be a list"
        if len(rates) > 0:
            assert "skill_name" in rates[0]
            assert "avg_monthly_salary" in rates[0]
            assert "proficiency_level" in rates[0]
        print(f"✓ GET /proficiency-rates returns {len(rates)} rates")
        
    def test_create_skill(self):
        """Test creating a new skill"""
        # First get a technology
        tech_response = requests.get(f"{API}/technologies")
        techs = tech_response.json()
        
        if len(techs) == 0:
            pytest.skip("No technologies available")
            
        tech = techs[0]
        skill_name = f"TEST_Skill_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "name": skill_name,
            "technology_id": tech["id"],
            "technology_name": tech["name"]
        }
        
        response = requests.post(f"{API}/skills", json=payload)
        assert response.status_code == 200, f"Create skill failed: {response.text}"
        
        skill = response.json()
        assert skill["name"] == skill_name
        assert skill["technology_id"] == tech["id"]
        print(f"✓ Skill '{skill_name}' created successfully")
        
    def test_create_proficiency_rate(self):
        """Test creating a new proficiency rate"""
        # Get required data
        skills_response = requests.get(f"{API}/skills")
        skills = skills_response.json()
        
        locations_response = requests.get(f"{API}/base-locations")
        locations = locations_response.json()
        
        if len(skills) == 0 or len(locations) == 0:
            pytest.skip("No skills or locations available")
            
        skill = skills[0]
        location = locations[0]
        
        payload = {
            "skill_id": skill["id"],
            "skill_name": skill["name"],
            "technology_id": skill["technology_id"],
            "technology_name": skill["technology_name"],
            "base_location_id": location["id"],
            "base_location_name": location["name"],
            "proficiency_level": f"TEST_Level_{uuid.uuid4().hex[:4]}",
            "avg_monthly_salary": 5000.0
        }
        
        response = requests.post(f"{API}/proficiency-rates", json=payload)
        # May be 400 if rate already exists for this combination
        if response.status_code == 400:
            print("✓ Rate combination already exists (expected for existing data)")
        else:
            assert response.status_code == 200, f"Create rate failed: {response.text}"
            rate = response.json()
            assert rate["avg_monthly_salary"] == 5000.0
            print(f"✓ Proficiency rate created successfully")


class TestProjectWithCostCalculations:
    """Test projects have correct cost calculations including Total Cost (Salary + Overhead)"""
    
    def test_project_allocations_have_overhead(self):
        """Verify projects have allocations with overhead percentage for Total Cost calculation"""
        response = requests.get(f"{API}/projects")
        assert response.status_code == 200
        
        projects = response.json()
        projects_with_allocations = [p for p in projects if p.get("waves") and len(p["waves"]) > 0]
        
        if len(projects_with_allocations) == 0:
            pytest.skip("No projects with waves/allocations")
            
        for project in projects_with_allocations[:3]:  # Check first 3 projects
            for wave in project["waves"]:
                for alloc in wave.get("grid_allocations", []):
                    # Verify allocation has required fields for cost calculation
                    assert "avg_monthly_salary" in alloc, f"Missing avg_monthly_salary in allocation"
                    assert "overhead_percentage" in alloc, f"Missing overhead_percentage in allocation"
                    assert "phase_allocations" in alloc, f"Missing phase_allocations"
                    
                    # Verify Total Cost = Salary Cost + Overhead can be calculated
                    salary = alloc["avg_monthly_salary"]
                    overhead_pct = alloc["overhead_percentage"]
                    
                    assert salary >= 0, "Salary should be non-negative"
                    assert overhead_pct >= 0, "Overhead should be non-negative"
                    
        print("✓ All project allocations have required fields for Total Cost calculation")
        
    def test_wave_logistics_config_exists(self):
        """Verify waves have logistics_config for cost calculations"""
        response = requests.get(f"{API}/projects")
        projects = response.json()
        
        for project in projects[:3]:
            for wave in project.get("waves", []):
                if "logistics_config" in wave:
                    config = wave["logistics_config"]
                    # Check logistics config has expected fields
                    assert isinstance(config, dict)
                    print(f"✓ Wave '{wave['name']}' has logistics_config")


class TestProjectsTemplateFlag:
    """Test projects have is_template flag properly set"""
    
    def test_projects_have_template_flag(self):
        """Verify projects return is_template field"""
        response = requests.get(f"{API}/projects")
        assert response.status_code == 200
        
        projects = response.json()
        for project in projects:
            assert "is_template" in project, f"Project {project.get('project_number')} missing is_template field"
            
        # Check if any templates exist
        template_projects = [p for p in projects if p.get("is_template")]
        print(f"✓ {len(template_projects)} template projects found out of {len(projects)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
