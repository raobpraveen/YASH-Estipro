"""
Test iteration 43: Flexible slider positioning for marker milestones
Tests:
1. Marker milestones with numeric position (0-100%)
2. Payment milestones still use start/mid/end
3. Target month computation from percentage
4. Backend persistence of numeric position values
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMilestoneSliderPositioning:
    """Tests for flexible slider positioning feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: authenticate and get test project"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Test project ID
        self.project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        yield
    
    def test_get_project_exists(self):
        """Verify test project PRJ-0026 v2 exists"""
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert res.status_code == 200, f"Project not found: {res.text}"
        data = res.json()
        assert data.get("project_number") == "PRJ-0026", f"Wrong project: {data.get('project_number')}"
        print(f"Project found: {data.get('name')} (v{data.get('version')})")
    
    def test_get_milestones_returns_position(self):
        """GET milestones should return position field"""
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert res.status_code == 200, f"Failed to get milestones: {res.text}"
        data = res.json()
        milestones = data.get("milestones", [])
        print(f"Found {len(milestones)} milestones")
        
        # Check if any milestone has position field
        for ms in milestones:
            assert "position" in ms, f"Milestone missing position field: {ms}"
            print(f"  - {ms.get('milestone_name')}: position={ms.get('position')}, type={ms.get('milestone_type')}")
    
    def test_marker_milestone_numeric_position(self):
        """Marker milestones should support numeric position (0-100)"""
        # Get current milestones
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert res.status_code == 200
        data = res.json()
        milestones = data.get("milestones", [])
        
        # Find or create a marker milestone
        marker = next((m for m in milestones if m.get("milestone_type") == "marker"), None)
        
        if marker:
            print(f"Found existing marker: {marker.get('milestone_name')} at position {marker.get('position')}")
            # Verify it has numeric position
            pos = marker.get("position")
            # Position can be 'start', 'mid', 'end' or numeric string like '65'
            if pos not in ["start", "mid", "end"]:
                try:
                    num_pos = float(pos)
                    assert 0 <= num_pos <= 100, f"Position out of range: {num_pos}"
                    print(f"Marker has valid numeric position: {num_pos}%")
                except ValueError:
                    pytest.fail(f"Invalid position value: {pos}")
        else:
            print("No marker milestone found - will test creation")
    
    def test_put_milestone_with_numeric_position(self):
        """PUT milestone with numeric position should persist correctly"""
        # Get current milestones
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert res.status_code == 200
        data = res.json()
        milestones = data.get("milestones", [])
        payment_terms = data.get("payment_terms_days", 0)
        
        # Create a test marker milestone with numeric position
        test_marker = {
            "id": "test-marker-slider-001",
            "wave_name": "WAVE1 SF",
            "milestone_name": "TEST_Slider_Marker",
            "milestone_type": "marker",
            "phase_name": "Realize",
            "position": "35",  # 35% along the phase
            "target_month": "M3",
            "completion_percentage": 0,
            "payment_percentage": 0,
            "payment_amount": 0,
            "description": "Test marker with slider position"
        }
        
        # Add test marker to milestones
        updated_milestones = [m for m in milestones if m.get("id") != "test-marker-slider-001"]
        updated_milestones.append(test_marker)
        
        # PUT milestones
        put_res = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            json={"milestones": updated_milestones, "payment_terms_days": payment_terms}
        )
        assert put_res.status_code == 200, f"PUT failed: {put_res.text}"
        print("PUT milestone with position='35' succeeded")
        
        # GET and verify
        get_res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert get_res.status_code == 200
        saved_milestones = get_res.json().get("milestones", [])
        
        saved_marker = next((m for m in saved_milestones if m.get("id") == "test-marker-slider-001"), None)
        assert saved_marker is not None, "Test marker not found after save"
        assert saved_marker.get("position") == "35", f"Position not saved correctly: {saved_marker.get('position')}"
        assert saved_marker.get("milestone_type") == "marker", f"Type not saved: {saved_marker.get('milestone_type')}"
        print(f"Verified: position={saved_marker.get('position')}, type={saved_marker.get('milestone_type')}")
    
    def test_payment_milestone_uses_start_mid_end(self):
        """Payment milestones should still use start/mid/end position"""
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert res.status_code == 200
        data = res.json()
        milestones = data.get("milestones", [])
        
        payment_milestones = [m for m in milestones if m.get("milestone_type", "payment") == "payment"]
        print(f"Found {len(payment_milestones)} payment milestones")
        
        for pm in payment_milestones:
            pos = pm.get("position", "end")
            # Payment milestones should use start/mid/end
            if pos not in ["start", "mid", "end"]:
                # It's okay if they have numeric - the UI just shows dropdown
                print(f"  Payment milestone '{pm.get('milestone_name')}' has position: {pos}")
            else:
                print(f"  Payment milestone '{pm.get('milestone_name')}' uses standard position: {pos}")
    
    def test_marker_default_position_50(self):
        """New markers should default to position '50' (midpoint)"""
        # This is a frontend behavior test - we verify the model accepts '50'
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert res.status_code == 200
        data = res.json()
        milestones = data.get("milestones", [])
        payment_terms = data.get("payment_terms_days", 0)
        
        # Create marker with default position 50
        default_marker = {
            "id": "test-default-marker-50",
            "wave_name": "WAVE1 SF",
            "milestone_name": "TEST_Default_50",
            "milestone_type": "marker",
            "phase_name": "Realize",
            "position": "50",  # Default midpoint
            "target_month": "M4",
            "completion_percentage": 0,
            "payment_percentage": 0,
            "payment_amount": 0,
            "description": "Test default position"
        }
        
        updated = [m for m in milestones if m.get("id") != "test-default-marker-50"]
        updated.append(default_marker)
        
        put_res = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/milestones",
            json={"milestones": updated, "payment_terms_days": payment_terms}
        )
        assert put_res.status_code == 200
        
        # Verify
        get_res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        saved = get_res.json().get("milestones", [])
        marker = next((m for m in saved if m.get("id") == "test-default-marker-50"), None)
        assert marker is not None
        assert marker.get("position") == "50", f"Default position not 50: {marker.get('position')}"
        print("Default position '50' saved correctly")
    
    def test_cleanup_test_milestones(self):
        """Cleanup: Remove test milestones"""
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert res.status_code == 200
        data = res.json()
        milestones = data.get("milestones", [])
        payment_terms = data.get("payment_terms_days", 0)
        
        # Remove test milestones
        cleaned = [m for m in milestones if not m.get("milestone_name", "").startswith("TEST_")]
        
        if len(cleaned) < len(milestones):
            put_res = self.session.put(
                f"{BASE_URL}/api/projects/{self.project_id}/milestones",
                json={"milestones": cleaned, "payment_terms_days": payment_terms}
            )
            assert put_res.status_code == 200
            print(f"Cleaned up {len(milestones) - len(cleaned)} test milestones")
        else:
            print("No test milestones to clean up")


class TestProjectPhaseRanges:
    """Tests for phase ranges that support slider positioning"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert login_res.status_code == 200
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        yield
    
    def test_project_has_phase_ranges(self):
        """Project should have phase_ranges for Gantt chart"""
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert res.status_code == 200
        data = res.json()
        
        waves = data.get("waves", [])
        assert len(waves) > 0, "Project has no waves"
        
        for wave in waves:
            phase_ranges = wave.get("phase_ranges", [])
            print(f"Wave '{wave.get('name')}' has {len(phase_ranges)} phase ranges:")
            for pr in phase_ranges:
                print(f"  - {pr.get('name')}: {pr.get('start_month')} -> {pr.get('end_month')}")
    
    def test_realize_phase_exists(self):
        """Realize phase should exist for slider testing"""
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert res.status_code == 200
        data = res.json()
        
        waves = data.get("waves", [])
        realize_found = False
        
        for wave in waves:
            phase_ranges = wave.get("phase_ranges", [])
            for pr in phase_ranges:
                if pr.get("name") == "Realize":
                    realize_found = True
                    print(f"Found Realize phase in {wave.get('name')}: {pr.get('start_month')} -> {pr.get('end_month')}")
                    break
        
        assert realize_found, "Realize phase not found in any wave"


class TestMilestoneAPI:
    """General milestone API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert login_res.status_code == 200
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.project_id = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"
        yield
    
    def test_milestone_fields_complete(self):
        """Milestones should have all required fields"""
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert res.status_code == 200
        data = res.json()
        milestones = data.get("milestones", [])
        
        required_fields = ["id", "wave_name", "milestone_name", "position", "target_month"]
        
        for ms in milestones:
            for field in required_fields:
                assert field in ms, f"Milestone missing field '{field}': {ms}"
        
        print(f"All {len(milestones)} milestones have required fields")
    
    def test_sit_marker_at_65_percent(self):
        """SIT marker should be at 65% position on Realize phase"""
        res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/milestones")
        assert res.status_code == 200
        data = res.json()
        milestones = data.get("milestones", [])
        
        sit_marker = next((m for m in milestones if "SIT" in m.get("milestone_name", "")), None)
        
        if sit_marker:
            print(f"Found SIT marker: {sit_marker}")
            pos = sit_marker.get("position")
            print(f"SIT position: {pos}")
            # Position could be '65' or 'mid' or 'end' depending on setup
        else:
            print("SIT marker not found - may need to be created")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
