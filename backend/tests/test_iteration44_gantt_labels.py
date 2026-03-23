"""
Iteration 44 Tests: Gantt Label Grouping, Total % Badge Reactive, Label Positioning
Tests for:
1. Backend milestones API returns milestone_type, phase_name, position fields
2. Milestones with numeric position values (0-100) for markers
3. Payment milestones with start/mid/end positions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMilestonesAPI:
    """Test milestones API for project 8f91ffe4-f3d9-45a7-b38e-bcf764886492"""
    
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
        self.project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
    
    def test_get_milestones_returns_required_fields(self):
        """Test that GET milestones returns milestone_type, phase_name, position fields"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get milestones: {response.text}"
        
        data = response.json()
        assert "milestones" in data
        assert len(data["milestones"]) > 0, "No milestones found"
        
        # Check each milestone has required fields
        for ms in data["milestones"]:
            assert "id" in ms, "Missing id field"
            assert "wave_name" in ms, "Missing wave_name field"
            assert "milestone_name" in ms, "Missing milestone_name field"
            assert "milestone_type" in ms, f"Missing milestone_type field for {ms.get('milestone_name')}"
            assert "phase_name" in ms, f"Missing phase_name field for {ms.get('milestone_name')}"
            assert "position" in ms, f"Missing position field for {ms.get('milestone_name')}"
    
    def test_marker_milestones_have_numeric_position(self):
        """Test that marker milestones can have numeric position (0-100)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        markers = [ms for ms in data["milestones"] if ms.get("milestone_type") == "marker"]
        
        assert len(markers) > 0, "No marker milestones found"
        
        # Check that markers have numeric or valid position
        for marker in markers:
            pos = marker.get("position")
            assert pos is not None, f"Marker {marker.get('milestone_name')} has no position"
            # Position should be numeric string or start/mid/end
            if pos not in ["start", "mid", "end"]:
                try:
                    num_pos = float(pos)
                    assert 0 <= num_pos <= 100, f"Position {pos} out of range for {marker.get('milestone_name')}"
                except ValueError:
                    pytest.fail(f"Invalid position value '{pos}' for marker {marker.get('milestone_name')}")
    
    def test_payment_milestones_have_valid_position(self):
        """Test that payment milestones have start/mid/end position"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        payments = [ms for ms in data["milestones"] if ms.get("milestone_type") == "payment"]
        
        assert len(payments) > 0, "No payment milestones found"
        
        # Check payment milestones have valid position
        for payment in payments:
            pos = payment.get("position")
            assert pos in ["start", "mid", "end"], f"Payment milestone {payment.get('milestone_name')} has invalid position: {pos}"
    
    def test_milestones_have_phase_name(self):
        """Test that all milestones have phase_name for Gantt positioning"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        for ms in data["milestones"]:
            phase_name = ms.get("phase_name")
            assert phase_name is not None and phase_name != "", f"Milestone {ms.get('milestone_name')} missing phase_name"
    
    def test_wave1_sf_milestones_structure(self):
        """Test Wave1 SF milestones have correct structure for Gantt"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        wave1_ms = [ms for ms in data["milestones"] if ms.get("wave_name") == "Wave1 SF"]
        
        assert len(wave1_ms) > 0, "No Wave1 SF milestones found"
        
        # Check for expected milestones
        milestone_names = [ms.get("milestone_name") for ms in wave1_ms]
        assert "Contract Sign" in milestone_names, "Missing Contract Sign milestone"
        assert "Project Closure" in milestone_names, "Missing Project Closure milestone"
        
        # Check Project Closure is at Hypercare end (near right edge)
        project_closure = next((ms for ms in wave1_ms if ms.get("milestone_name") == "Project Closure"), None)
        assert project_closure is not None
        assert project_closure.get("phase_name") == "Hypercare"
        assert project_closure.get("position") == "end"
    
    def test_wave2_milestones_structure(self):
        """Test Wave2 milestones have correct structure for Gantt"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        wave2_ms = [ms for ms in data["milestones"] if ms.get("wave_name") == "Wave2"]
        
        assert len(wave2_ms) > 0, "No Wave2 milestones found"
        
        # Check for Go-Live at Deploy end (near right edge)
        go_live = next((ms for ms in wave2_ms if "Go-Live" in ms.get("milestone_name", "") or "Go-live" in ms.get("milestone_name", "")), None)
        assert go_live is not None, "Missing Go-Live milestone in Wave2"
        assert go_live.get("phase_name") == "Deploy"
        assert go_live.get("position") == "end"
    
    def test_explore_phase_has_multiple_milestones(self):
        """Test that Explore phase has multiple milestones (for grouping test)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check Wave2 Explore phase milestones
        wave2_explore = [ms for ms in data["milestones"] 
                        if ms.get("wave_name") == "Wave2" and ms.get("phase_name") == "Explore"]
        
        # Should have multiple milestones that could be grouped
        assert len(wave2_explore) >= 2, f"Expected at least 2 milestones in Wave2 Explore, found {len(wave2_explore)}"


class TestProjectAPI:
    """Test project API for version data"""
    
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
        self.project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
    
    def test_get_project_version(self):
        """Test that project version can be retrieved"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get project: {response.text}"
        
        data = response.json()
        assert "project_number" in data
        assert "PRJ-0026" in data.get("project_number", "")
    
    def test_get_project_waves(self):
        """Test that project waves have phase_ranges for Gantt"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.project_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        waves = data.get("waves", [])
        
        assert len(waves) > 0, "No waves found"
        
        for wave in waves:
            phase_ranges = wave.get("phase_ranges", [])
            assert len(phase_ranges) > 0, f"Wave {wave.get('name')} has no phase_ranges"
            
            for pr in phase_ranges:
                assert "name" in pr, "Phase range missing name"
                assert "start_month" in pr, "Phase range missing start_month"
                assert "end_month" in pr, "Phase range missing end_month"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
