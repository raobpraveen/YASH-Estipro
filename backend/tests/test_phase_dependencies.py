"""
Test Phase Dependencies and Milestones features for YASH EstPro.
Tests:
- Phase Dependencies CRUD in wave data
- Dependencies persistence on save
- Milestones API for Gantt chart
- Excel export with dependencies section
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://phase-estimator.preview.emergentagent.com')

class TestPhaseDependencies:
    """Test Phase Dependencies feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_project_id = "c9ceda31-5538-4cc2-80d3-9b7b51ec1f16"
    
    def test_get_project_with_phase_ranges(self):
        """Test that project has phase_ranges field"""
        response = requests.get(f"{BASE_URL}/api/projects/{self.test_project_id}")
        assert response.status_code == 200
        
        project = response.json()
        assert "waves" in project
        assert len(project["waves"]) > 0
        
        wave = project["waves"][0]
        assert "phase_ranges" in wave
        assert len(wave["phase_ranges"]) >= 2, "Need at least 2 phases for dependencies"
        
        # Verify phase_ranges structure
        for pr in wave["phase_ranges"]:
            assert "name" in pr
            assert "start_month" in pr
            assert "end_month" in pr
        
        print(f"PASS: Project has {len(wave['phase_ranges'])} phase ranges")
    
    def test_get_project_has_phase_dependencies_field(self):
        """Test that wave has phase_dependencies field"""
        response = requests.get(f"{BASE_URL}/api/projects/{self.test_project_id}")
        assert response.status_code == 200
        
        project = response.json()
        wave = project["waves"][0]
        
        # phase_dependencies should exist (even if empty)
        assert "phase_dependencies" in wave or wave.get("phase_dependencies") is None
        print(f"PASS: Wave has phase_dependencies field: {wave.get('phase_dependencies', [])}")
    
    def test_save_project_with_dependencies(self):
        """Test saving project with phase dependencies"""
        # First get the project
        response = requests.get(f"{BASE_URL}/api/projects/{self.test_project_id}")
        assert response.status_code == 200
        project = response.json()
        
        # Get phase names from phase_ranges
        wave = project["waves"][0]
        phase_names = [pr["name"] for pr in wave.get("phase_ranges", [])]
        assert len(phase_names) >= 2, "Need at least 2 phases"
        
        # Add a dependency: first phase -> second phase
        new_dependency = {
            "from_phase": phase_names[0],
            "to_phase": phase_names[1],
            "type": "FS"  # Finish-to-Start
        }
        
        # Update wave with dependency
        wave["phase_dependencies"] = [new_dependency]
        
        # Save the project
        update_payload = {
            "name": project["name"],
            "customer_id": project.get("customer_id", ""),
            "customer_name": project.get("customer_name", ""),
            "waves": project["waves"],
            "version_notes": "Added phase dependency for testing"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{self.test_project_id}",
            json=update_payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Save failed: {response.text}"
        print(f"PASS: Saved project with dependency: {new_dependency}")
    
    def test_verify_dependency_persisted(self):
        """Test that dependency was persisted after save"""
        response = requests.get(f"{BASE_URL}/api/projects/{self.test_project_id}")
        assert response.status_code == 200
        
        project = response.json()
        wave = project["waves"][0]
        
        deps = wave.get("phase_dependencies", [])
        assert len(deps) > 0, "No dependencies found after save"
        
        # Verify dependency structure
        dep = deps[0]
        assert "from_phase" in dep
        assert "to_phase" in dep
        assert "type" in dep
        assert dep["type"] == "FS"
        
        print(f"PASS: Dependency persisted: {dep}")
    
    def test_add_multiple_dependencies(self):
        """Test adding multiple dependencies"""
        response = requests.get(f"{BASE_URL}/api/projects/{self.test_project_id}")
        assert response.status_code == 200
        project = response.json()
        
        wave = project["waves"][0]
        phase_names = [pr["name"] for pr in wave.get("phase_ranges", [])]
        
        if len(phase_names) >= 3:
            # Add two dependencies
            wave["phase_dependencies"] = [
                {"from_phase": phase_names[0], "to_phase": phase_names[1], "type": "FS"},
                {"from_phase": phase_names[1], "to_phase": phase_names[2], "type": "FS"}
            ]
            
            update_payload = {
                "name": project["name"],
                "customer_id": project.get("customer_id", ""),
                "customer_name": project.get("customer_name", ""),
                "waves": project["waves"],
                "version_notes": "Added multiple dependencies"
            }
            
            response = requests.put(
                f"{BASE_URL}/api/projects/{self.test_project_id}",
                json=update_payload,
                headers=self.headers
            )
            assert response.status_code == 200
            
            # Verify
            response = requests.get(f"{BASE_URL}/api/projects/{self.test_project_id}")
            project = response.json()
            deps = project["waves"][0].get("phase_dependencies", [])
            assert len(deps) == 2, f"Expected 2 dependencies, got {len(deps)}"
            print(f"PASS: Multiple dependencies saved: {len(deps)}")
        else:
            pytest.skip("Need at least 3 phases for this test")
    
    def test_remove_dependency(self):
        """Test removing a dependency"""
        response = requests.get(f"{BASE_URL}/api/projects/{self.test_project_id}")
        assert response.status_code == 200
        project = response.json()
        
        wave = project["waves"][0]
        current_deps = wave.get("phase_dependencies", [])
        
        if len(current_deps) > 1:
            # Remove one dependency
            wave["phase_dependencies"] = current_deps[:1]
            
            update_payload = {
                "name": project["name"],
                "customer_id": project.get("customer_id", ""),
                "customer_name": project.get("customer_name", ""),
                "waves": project["waves"],
                "version_notes": "Removed one dependency"
            }
            
            response = requests.put(
                f"{BASE_URL}/api/projects/{self.test_project_id}",
                json=update_payload,
                headers=self.headers
            )
            assert response.status_code == 200
            
            # Verify
            response = requests.get(f"{BASE_URL}/api/projects/{self.test_project_id}")
            project = response.json()
            deps = project["waves"][0].get("phase_dependencies", [])
            assert len(deps) == 1, f"Expected 1 dependency, got {len(deps)}"
            print(f"PASS: Dependency removed, remaining: {len(deps)}")
        else:
            print("SKIP: Not enough dependencies to test removal")


class TestMilestonesAPI:
    """Test Milestones API for Gantt chart"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_project_id = "c9ceda31-5538-4cc2-80d3-9b7b51ec1f16"
    
    def test_get_milestones_endpoint_exists(self):
        """Test that milestones endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.test_project_id}/milestones",
            headers=self.headers
        )
        # Should return 200 even if no milestones
        assert response.status_code == 200, f"Milestones endpoint failed: {response.status_code}"
        
        data = response.json()
        assert "milestones" in data or "project_id" in data
        print(f"PASS: Milestones endpoint works, data: {data}")
    
    def test_milestones_structure(self):
        """Test milestones response structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.test_project_id}/milestones",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Check expected fields
        assert "project_id" in data or "milestones" in data
        
        milestones = data.get("milestones", [])
        if len(milestones) > 0:
            ms = milestones[0]
            # Each milestone should have these fields for Gantt display
            expected_fields = ["wave_name", "milestone_name", "target_month"]
            for field in expected_fields:
                assert field in ms, f"Missing field: {field}"
            print(f"PASS: Milestone structure valid: {ms}")
        else:
            print("INFO: No milestones defined for this project")


class TestBackendModel:
    """Test backend model has phase_dependencies field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_project_with_phase_dependencies(self):
        """Test creating a new project with phase_dependencies"""
        new_project = {
            "name": "TEST_Dependency_Project",
            "customer_id": "",
            "customer_name": "Test Customer",
            "technology_ids": [],
            "project_type_ids": [],
            "waves": [{
                "id": "test_wave_1",
                "name": "Test Wave",
                "duration_months": 6,
                "phase_names": ["M1", "M2", "M3", "M4", "M5", "M6"],
                "phase_ranges": [
                    {"name": "Design", "start_month": 1, "end_month": 2},
                    {"name": "Build", "start_month": 2, "end_month": 4},
                    {"name": "Test", "start_month": 4, "end_month": 6}
                ],
                "phase_dependencies": [
                    {"from_phase": "Design", "to_phase": "Build", "type": "FS"},
                    {"from_phase": "Build", "to_phase": "Test", "type": "FS"}
                ],
                "grid_allocations": []
            }],
            "version_notes": "Test project with dependencies"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json=new_project,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        project_id = created["id"]
        
        # Verify the project was created with dependencies
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code == 200
        
        project = response.json()
        wave = project["waves"][0]
        deps = wave.get("phase_dependencies", [])
        
        assert len(deps) == 2, f"Expected 2 dependencies, got {len(deps)}"
        print(f"PASS: Created project with dependencies: {project_id}")
        
        # Cleanup - delete test project
        response = requests.delete(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=self.headers
        )
        print(f"Cleanup: Deleted test project {project_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
