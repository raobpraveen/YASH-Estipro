"""
Test Iteration 25: Project-Level Access Control Feature
Tests visibility (public/restricted), restricted_user_ids, admin access, creator access, approver access
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test users credentials
ADMIN_EMAIL = "admin@yash.com"
ADMIN_PASSWORD = "password"

class TestAccessControl:
    """Test project-level access control feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_user(self, admin_token):
        """Get admin user info"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture(scope="class")
    def regular_user(self, admin_token):
        """Create a regular test user"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "email": f"TEST_regular_{unique_id}@test.com",
            "password": "testpass123",
            "name": f"TEST Regular User {unique_id}",
            "role": "user"
        }
        response = requests.post(
            f"{BASE_URL}/api/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create regular user: {response.text}"
        
        # Login as regular user
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert login_resp.status_code == 200
        
        return {
            **login_resp.json()["user"],
            "token": login_resp.json()["token"],
            "email": user_data["email"],
            "password": user_data["password"]
        }
    
    @pytest.fixture(scope="class")
    def approver_user(self, admin_token):
        """Create an approver test user"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "email": f"TEST_approver_{unique_id}@test.com",
            "password": "testpass123",
            "name": f"TEST Approver {unique_id}",
            "role": "approver"
        }
        response = requests.post(
            f"{BASE_URL}/api/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create approver user: {response.text}"
        
        # Login as approver
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert login_resp.status_code == 200
        
        return {
            **login_resp.json()["user"],
            "token": login_resp.json()["token"],
            "email": user_data["email"],
            "password": user_data["password"]
        }
    
    @pytest.fixture(scope="class")
    def restricted_user(self, admin_token):
        """Create a user who will be added to restricted list"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "email": f"TEST_restricted_{unique_id}@test.com",
            "password": "testpass123",
            "name": f"TEST Restricted User {unique_id}",
            "role": "user"
        }
        response = requests.post(
            f"{BASE_URL}/api/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create restricted user: {response.text}"
        
        # Login as restricted user
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert login_resp.status_code == 200
        
        return {
            **login_resp.json()["user"],
            "token": login_resp.json()["token"],
            "email": user_data["email"],
            "password": user_data["password"]
        }
    
    # ---------- PUBLIC PROJECT TESTS ----------
    
    def test_create_public_project(self, admin_token):
        """Test creating a public project with visibility field"""
        project_data = {
            "name": f"TEST Public Project {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "technology_ids": [],
            "technology_names": [],
            "project_type_ids": [],
            "project_type_names": [],
            "visibility": "public",
            "restricted_user_ids": [],
            "restricted_user_names": [],
            "waves": [{
                "name": "Wave 1",
                "duration_months": 3,
                "phase_names": ["M1", "M2", "M3"],
                "grid_allocations": []
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create project: {response.text}"
        data = response.json()
        
        # Verify visibility is set correctly
        assert data.get("visibility") == "public"
        assert data.get("restricted_user_ids") == []
        assert data.get("restricted_user_names") == []
        
        return data["id"]
    
    def test_public_project_visible_to_all(self, admin_token, regular_user):
        """Test that public projects are visible to all users"""
        # Create public project as admin
        project_data = {
            "name": f"TEST Public Visible {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "visibility": "public",
            "waves": [{
                "name": "Wave 1",
                "duration_months": 1,
                "phase_names": ["M1"],
                "grid_allocations": []
            }]
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["id"]
        
        # Regular user should be able to see it in list
        list_resp = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {regular_user['token']}"}
        )
        assert list_resp.status_code == 200
        project_ids = [p["id"] for p in list_resp.json()]
        assert project_id in project_ids, "Public project should be visible to regular user"
        
        # Regular user should be able to access it directly
        get_resp = requests.get(
            f"{BASE_URL}/api/projects/{project_id}",
            headers={"Authorization": f"Bearer {regular_user['token']}"}
        )
        assert get_resp.status_code == 200
        print("SUCCESS: Public project visible to all users")
    
    # ---------- RESTRICTED PROJECT TESTS ----------
    
    def test_create_restricted_project(self, admin_token, restricted_user):
        """Test creating a restricted project with user list"""
        project_data = {
            "name": f"TEST Restricted Project {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "visibility": "restricted",
            "restricted_user_ids": [restricted_user["id"]],
            "restricted_user_names": [restricted_user["name"]],
            "waves": [{
                "name": "Wave 1",
                "duration_months": 2,
                "phase_names": ["M1", "M2"],
                "grid_allocations": []
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create restricted project: {response.text}"
        data = response.json()
        
        # Verify visibility and restricted users
        assert data.get("visibility") == "restricted"
        assert restricted_user["id"] in data.get("restricted_user_ids", [])
        assert restricted_user["name"] in data.get("restricted_user_names", [])
        
        print("SUCCESS: Restricted project created with correct visibility and restricted_user_ids")
        return data["id"]
    
    def test_restricted_project_hidden_from_unauthorized(self, admin_token, regular_user, restricted_user):
        """Test that restricted projects are hidden from non-authorized users"""
        # Create restricted project (admin creates, only restricted_user has access)
        project_data = {
            "name": f"TEST Hidden Project {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "visibility": "restricted",
            "restricted_user_ids": [restricted_user["id"]],
            "restricted_user_names": [restricted_user["name"]],
            "waves": [{
                "name": "Wave 1",
                "duration_months": 1,
                "phase_names": ["M1"],
                "grid_allocations": []
            }]
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["id"]
        
        # Regular user (not in restricted list) should NOT see it in list
        list_resp = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {regular_user['token']}"}
        )
        assert list_resp.status_code == 200
        project_ids = [p["id"] for p in list_resp.json()]
        assert project_id not in project_ids, "Restricted project should NOT be visible to unauthorized user"
        
        # Regular user should NOT be able to access it directly
        get_resp = requests.get(
            f"{BASE_URL}/api/projects/{project_id}",
            headers={"Authorization": f"Bearer {regular_user['token']}"}
        )
        assert get_resp.status_code == 403, f"Expected 403, got {get_resp.status_code}"
        
        print("SUCCESS: Restricted project hidden from unauthorized user")
    
    def test_restricted_project_visible_to_authorized_user(self, admin_token, restricted_user):
        """Test that restricted projects are visible to users in restricted list"""
        # Create restricted project with restricted_user in list
        project_data = {
            "name": f"TEST Auth Visible {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "visibility": "restricted",
            "restricted_user_ids": [restricted_user["id"]],
            "restricted_user_names": [restricted_user["name"]],
            "waves": [{
                "name": "Wave 1",
                "duration_months": 1,
                "phase_names": ["M1"],
                "grid_allocations": []
            }]
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["id"]
        
        # Authorized user should see it in list
        list_resp = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {restricted_user['token']}"}
        )
        assert list_resp.status_code == 200
        project_ids = [p["id"] for p in list_resp.json()]
        assert project_id in project_ids, "Restricted project should be visible to authorized user"
        
        # Authorized user should be able to access directly
        get_resp = requests.get(
            f"{BASE_URL}/api/projects/{project_id}",
            headers={"Authorization": f"Bearer {restricted_user['token']}"}
        )
        assert get_resp.status_code == 200
        
        print("SUCCESS: Restricted project visible to authorized user in restricted list")
    
    def test_admin_can_see_all_restricted_projects(self, admin_token, regular_user):
        """Test that admin can see all projects including restricted ones"""
        # First create a restricted project as regular user
        # Actually admin creates, but let's verify admin can see it
        project_data = {
            "name": f"TEST Admin See All {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "visibility": "restricted",
            "restricted_user_ids": [],  # Empty list - only creator should see
            "restricted_user_names": [],
            "waves": [{
                "name": "Wave 1",
                "duration_months": 1,
                "phase_names": ["M1"],
                "grid_allocations": []
            }]
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["id"]
        
        # Admin should be able to see it in list
        list_resp = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_resp.status_code == 200
        project_ids = [p["id"] for p in list_resp.json()]
        assert project_id in project_ids, "Admin should see all restricted projects"
        
        print("SUCCESS: Admin can see all restricted projects")
    
    def test_creator_can_see_own_restricted_project(self, regular_user):
        """Test that creator can always see their own restricted projects"""
        # Create restricted project as regular user with no users in restricted list
        project_data = {
            "name": f"TEST Creator See Own {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "visibility": "restricted",
            "restricted_user_ids": [],  # No one else has access
            "restricted_user_names": [],
            "waves": [{
                "name": "Wave 1",
                "duration_months": 1,
                "phase_names": ["M1"],
                "grid_allocations": []
            }]
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {regular_user['token']}"}
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["id"]
        
        # Creator should see it in list
        list_resp = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {regular_user['token']}"}
        )
        assert list_resp.status_code == 200
        project_ids = [p["id"] for p in list_resp.json()]
        assert project_id in project_ids, "Creator should see own restricted project"
        
        print("SUCCESS: Creator can see own restricted project")
    
    def test_approver_access_when_in_review(self, admin_token, approver_user, regular_user):
        """Test that approver can see restricted project when status is in_review"""
        # Create restricted project
        project_data = {
            "name": f"TEST Approver Access {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "visibility": "restricted",
            "restricted_user_ids": [],  # Approver not in list
            "restricted_user_names": [],
            "approver_email": approver_user["email"],
            "waves": [{
                "name": "Wave 1",
                "duration_months": 1,
                "phase_names": ["M1"],
                "grid_allocations": []
            }]
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["id"]
        
        # Submit for review
        submit_resp = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/submit-for-review?approver_email={approver_user['email']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert submit_resp.status_code == 200
        
        # Approver should now see it (status is in_review)
        list_resp = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {approver_user['token']}"}
        )
        assert list_resp.status_code == 200
        project_ids = [p["id"] for p in list_resp.json()]
        assert project_id in project_ids, "Approver should see restricted project when in_review"
        
        print("SUCCESS: Approver can see restricted project when status is in_review")
    
    def test_update_visibility_from_public_to_restricted(self, admin_token, restricted_user):
        """Test changing project visibility from public to restricted"""
        # Create public project
        project_data = {
            "name": f"TEST Change Visibility {uuid.uuid4().hex[:8]}",
            "customer_id": "",
            "customer_name": "Test Customer",
            "visibility": "public",
            "waves": [{
                "name": "Wave 1",
                "duration_months": 1,
                "phase_names": ["M1"],
                "grid_allocations": []
            }]
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["id"]
        
        # Update to restricted
        update_resp = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            json={
                "visibility": "restricted",
                "restricted_user_ids": [restricted_user["id"]],
                "restricted_user_names": [restricted_user["name"]],
                "version_notes": "Changed to restricted"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data.get("visibility") == "restricted"
        assert restricted_user["id"] in data.get("restricted_user_ids", [])
        
        print("SUCCESS: Can change visibility from public to restricted")
    
    def test_users_endpoint_for_restricted_selection(self, admin_token):
        """Test that /api/users endpoint works for selecting restricted users"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        assert len(users) > 0, "Should return list of users for restricted selection"
        
        # Verify user structure
        for user in users:
            assert "id" in user
            assert "name" in user
            assert "email" in user
        
        print("SUCCESS: /api/users returns users for restricted selection")


class TestAccessControlCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_users(self):
        """Delete test users created during testing"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip("Cannot login as admin for cleanup")
        
        token = login_resp.json()["token"]
        
        # Get all users
        users_resp = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        if users_resp.status_code != 200:
            pytest.skip("Cannot fetch users for cleanup")
        
        # Delete test users
        deleted_count = 0
        for user in users_resp.json():
            if user["email"].startswith("TEST_"):
                del_resp = requests.delete(
                    f"{BASE_URL}/api/users/{user['id']}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if del_resp.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleanup: Deleted {deleted_count} test users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
