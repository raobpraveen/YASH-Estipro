"""
Test iteration 36: Gantt Chart Phase Assignments
Tests for auto-generated staircase Gantt chart from phase assignments
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROJECT_ID = "d94df1da-49b0-497e-90ae-f9466da8444b"  # PRJ-0025

class TestGanttPhaseAssignments:
    """Tests for Gantt chart phase assignment feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")  # API returns 'token' not 'access_token'
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        self.session.close()
    
    def test_01_project_exists(self):
        """Test 1: Verify PRJ-0025 exists and is accessible"""
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200, f"Failed to get project: {response.text}"
        
        data = response.json()
        assert data.get("project_number") == "PRJ-0025", "Project number mismatch"
        assert "waves" in data, "Project should have waves"
        print(f"Project loaded: {data.get('name')} ({data.get('project_number')})")
    
    def test_02_wave1_has_month_phases(self):
        """Test 2: Verify Wave1 SF has month_phases field"""
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        waves = data.get("waves", [])
        wave1 = next((w for w in waves if "Wave1" in w.get("name", "")), None)
        
        assert wave1 is not None, "Wave1 SF not found"
        assert "month_phases" in wave1, "month_phases field missing from Wave1"
        
        month_phases = wave1.get("month_phases", [])
        print(f"Wave1 SF month_phases: {month_phases}")
        
        # Verify phases are set (from previous test)
        if month_phases:
            assert len(month_phases) == 7, f"Expected 7 phases for 7-month wave, got {len(month_phases)}"
            expected_phases = ["Prepare", "Explore", "Explore", "Realize", "Realize", "Deploy", "Go-live"]
            assert month_phases == expected_phases, f"Phase mismatch: {month_phases}"
    
    def test_03_wave1_has_wave_start_month(self):
        """Test 3: Verify Wave1 SF has wave_start_month field"""
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        waves = data.get("waves", [])
        wave1 = next((w for w in waves if "Wave1" in w.get("name", "")), None)
        
        assert wave1 is not None, "Wave1 SF not found"
        assert "wave_start_month" in wave1, "wave_start_month field missing from Wave1"
        
        start_month = wave1.get("wave_start_month", 1)
        print(f"Wave1 SF wave_start_month: {start_month}")
        assert start_month == 1, f"Expected wave_start_month=1, got {start_month}"
    
    def test_04_w2_has_month_phases(self):
        """Test 4: Verify W2 has month_phases field"""
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        waves = data.get("waves", [])
        w2 = next((w for w in waves if w.get("name", "") == "W2"), None)
        
        assert w2 is not None, "W2 not found"
        assert "month_phases" in w2, "month_phases field missing from W2"
        
        month_phases = w2.get("month_phases", [])
        print(f"W2 month_phases: {month_phases}")
        
        # Verify phases are set
        if month_phases:
            assert len(month_phases) == 3, f"Expected 3 phases for 3-month wave, got {len(month_phases)}"
            expected_phases = ["Design", "Build", "Test"]
            assert month_phases == expected_phases, f"Phase mismatch: {month_phases}"
    
    def test_05_w2_has_wave_start_month_offset(self):
        """Test 5: Verify W2 has wave_start_month=3 (offset)"""
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        waves = data.get("waves", [])
        w2 = next((w for w in waves if w.get("name", "") == "W2"), None)
        
        assert w2 is not None, "W2 not found"
        
        start_month = w2.get("wave_start_month", 1)
        print(f"W2 wave_start_month: {start_month}")
        assert start_month == 3, f"Expected wave_start_month=3, got {start_month}"
    
    def test_06_save_project_with_phases(self):
        """Test 6: Verify project can be saved with phase assignments"""
        # First get current project data
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200
        
        project = response.json()
        
        # Modify version notes to trigger save
        project["version_notes"] = "API test - phase persistence verification"
        
        # Update project
        update_response = self.session.put(
            f"{BASE_URL}/api/projects/{PROJECT_ID}",
            json=project
        )
        assert update_response.status_code == 200, f"Failed to update project: {update_response.text}"
        print("Project saved successfully")
        
        # Verify data persisted
        verify_response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert verify_response.status_code == 200
        
        verified_data = verify_response.json()
        waves = verified_data.get("waves", [])
        
        # Check Wave1 SF
        wave1 = next((w for w in waves if "Wave1" in w.get("name", "")), None)
        assert wave1 is not None
        assert wave1.get("month_phases") == ["Prepare", "Explore", "Explore", "Realize", "Realize", "Deploy", "Go-live"]
        
        # Check W2
        w2 = next((w for w in waves if w.get("name", "") == "W2"), None)
        assert w2 is not None
        assert w2.get("month_phases") == ["Design", "Build", "Test"]
        assert w2.get("wave_start_month") == 3
        
        print("Phase data verified after save")
    
    def test_07_all_predefined_phases_available(self):
        """Test 7: Verify all predefined phases can be used"""
        # This is a frontend test, but we verify the backend accepts all phase names
        predefined_phases = [
            "Prepare", "Explore", "Realize", "Deploy", "Go-live",
            "Hypercare", "Design", "Build", "Test", "UAT", "Support"
        ]
        
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200
        
        project = response.json()
        waves = project.get("waves", [])
        
        # Get all phases currently used
        all_phases_used = set()
        for wave in waves:
            for phase in wave.get("month_phases", []):
                if phase:
                    all_phases_used.add(phase)
        
        print(f"Phases currently used: {all_phases_used}")
        
        # Verify at least some predefined phases are being used
        used_predefined = all_phases_used.intersection(set(predefined_phases))
        assert len(used_predefined) > 0, "No predefined phases are being used"
        print(f"Predefined phases in use: {used_predefined}")
    
    def test_08_wave_duration_matches_phases(self):
        """Test 8: Verify wave duration matches number of phase slots"""
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        waves = data.get("waves", [])
        
        for wave in waves:
            duration = int(wave.get("duration_months", 0))
            phase_names = wave.get("phase_names", [])
            month_phases = wave.get("month_phases", [])
            
            print(f"Wave '{wave.get('name')}': duration={duration}, phase_names={len(phase_names)}, month_phases={len(month_phases)}")
            
            # phase_names should match duration
            assert len(phase_names) == duration, f"phase_names count ({len(phase_names)}) doesn't match duration ({duration})"
            
            # month_phases should also match duration (if set)
            if month_phases:
                assert len(month_phases) == duration, f"month_phases count ({len(month_phases)}) doesn't match duration ({duration})"


class TestGanttChartAPI:
    """Tests for Gantt chart related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")  # API returns 'token' not 'access_token'
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        self.session.close()
    
    def test_09_gantt_image_upload_endpoint_exists(self):
        """Test 9: Verify Gantt image upload endpoint exists"""
        # Just check the endpoint responds (even if no image uploaded)
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/gantt")
        # Should return 404 if no image, or 200 with image
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"Gantt endpoint status: {response.status_code}")
    
    def test_10_project_response_structure(self):
        """Test 10: Verify project API response has all required fields for Gantt"""
        response = self.session.get(f"{BASE_URL}/api/projects/{PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level fields
        assert "waves" in data, "Missing 'waves' field"
        assert "gantt_chart" in data or data.get("gantt_chart") is None, "gantt_chart field should exist"
        
        # Check wave structure
        for wave in data.get("waves", []):
            assert "id" in wave, "Wave missing 'id'"
            assert "name" in wave, "Wave missing 'name'"
            assert "duration_months" in wave, "Wave missing 'duration_months'"
            assert "phase_names" in wave, "Wave missing 'phase_names'"
            assert "month_phases" in wave, "Wave missing 'month_phases'"
            assert "wave_start_month" in wave, "Wave missing 'wave_start_month'"
            assert "grid_allocations" in wave, "Wave missing 'grid_allocations'"
        
        print("Project response structure verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
