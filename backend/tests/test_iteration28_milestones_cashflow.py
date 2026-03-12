"""
Iteration 28 Tests: Milestones and Cashflow Page Improvements
Testing:
1. Milestones page - LIST/TABLE view (not cards), Excel export with formulas
2. Cashflow page - Project LIST showing only projects with resource data, wave-wise breakdown
3. Backend API - Cashflow returns wave_data and combined_data arrays
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://estpro-staging.preview.emergentagent.com"


class TestMilestonesCashflowFeatures:
    """Tests for Milestones and Cashflow page improvements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Test project IDs (ewf and dasg)
        self.ewf_project_id = "bcb545cf-efb8-4b5f-b5d4-8db988080a68"  # PRJ-0022 ewf
        self.dasg_project_id = "0a7d0101-4c39-4398-af84-dafef153d3a8"  # PRJ-0023 dasg

    # === MILESTONES TESTS ===
    
    def test_get_projects_list_for_milestones(self):
        """Test: GET /api/projects returns list for milestones page"""
        response = self.session.get(f"{BASE_URL}/api/projects?latest_only=true")
        assert response.status_code == 200
        projects = response.json()
        assert isinstance(projects, list)
        assert len(projects) > 0
        
        # Check project structure has required fields for table view
        for project in projects[:5]:
            assert "id" in project
            assert "name" in project
            assert "project_number" in project
            assert "version" in project
            # Waves field should be present (needed for wave count column)
            assert "waves" in project or project.get("waves") is not None

    def test_get_milestones_for_ewf_project(self):
        """Test: GET /api/projects/{id}/milestones returns 2 milestones for ewf"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.ewf_project_id}/milestones")
        assert response.status_code == 200
        data = response.json()
        
        assert "milestones" in data
        milestones = data["milestones"]
        assert len(milestones) == 2, f"Expected 2 milestones for ewf, got {len(milestones)}"
        
        # Verify milestone structure
        for ms in milestones:
            assert "id" in ms
            assert "wave_name" in ms
            assert "milestone_name" in ms
            assert "target_month" in ms
            assert "payment_percentage" in ms
            assert "payment_amount" in ms

    def test_get_milestones_for_dasg_project(self):
        """Test: GET /api/projects/{id}/milestones returns 2 milestones for dasg"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.dasg_project_id}/milestones")
        assert response.status_code == 200
        data = response.json()
        
        assert "milestones" in data
        milestones = data["milestones"]
        assert len(milestones) == 2, f"Expected 2 milestones for dasg, got {len(milestones)}"

    def test_ewf_milestones_amounts(self):
        """Test: ewf milestones have correct amounts - M2=$25,000, M5=$60,000"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.ewf_project_id}/milestones")
        assert response.status_code == 200
        milestones = response.json()["milestones"]
        
        m2_milestone = None
        m5_milestone = None
        for ms in milestones:
            if ms.get("target_month") == "M2":
                m2_milestone = ms
            elif ms.get("target_month") == "M5":
                m5_milestone = ms
        
        assert m2_milestone is not None, "M2 milestone not found"
        assert m5_milestone is not None, "M5 milestone not found"
        assert m2_milestone["payment_amount"] == 25000, f"M2 should be $25,000, got {m2_milestone['payment_amount']}"
        assert m5_milestone["payment_amount"] == 60000, f"M5 should be $60,000, got {m5_milestone['payment_amount']}"

    # === CASHFLOW TESTS ===
    
    def test_cashflow_api_returns_wave_data_and_combined_data(self):
        """Test: GET /api/projects/{id}/cashflow returns wave_data AND combined_data arrays"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.ewf_project_id}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "project_id" in data
        assert "project_name" in data
        assert "project_number" in data
        assert "wave_data" in data, "Missing wave_data array"
        assert "combined_data" in data, "Missing combined_data array"
        assert "summary" in data

    def test_cashflow_wave_data_structure(self):
        """Test: wave_data array has proper structure per wave"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.ewf_project_id}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        wave_data = data["wave_data"]
        assert isinstance(wave_data, list)
        assert len(wave_data) > 0, "wave_data should not be empty"
        
        # Check first wave structure
        wave = wave_data[0]
        assert "wave_name" in wave
        assert wave["wave_name"] == "W1 (Copy)", f"Expected 'W1 (Copy)', got {wave['wave_name']}"
        assert "months" in wave
        assert "monthly_data" in wave
        assert "total_cost" in wave
        assert "total_revenue" in wave
        assert "net" in wave

    def test_cashflow_monthly_data_has_cash_in_cash_out(self):
        """Test: monthly_data has cost (Cash-Out) and revenue (Cash-In) columns"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.ewf_project_id}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        wave_data = data["wave_data"][0]
        monthly_data = wave_data["monthly_data"]
        
        for month in monthly_data:
            assert "month" in month
            assert "phase" in month
            assert "cost" in month, "Missing 'cost' (Cash-Out) field"
            assert "revenue" in month, "Missing 'revenue' (Cash-In) field"

    def test_cashflow_cash_in_from_milestones(self):
        """Test: Cash-In at M2 shows $25,000 and M5 shows $60,000 from milestones"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.ewf_project_id}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        wave_data = data["wave_data"][0]
        monthly_data = wave_data["monthly_data"]
        
        # M2 (index 1) should have revenue = 25000
        m2 = monthly_data[1]  # month 2 is index 1
        assert m2["month"] == 2
        assert m2["revenue"] == 25000, f"M2 Cash-In should be $25,000, got {m2['revenue']}"
        
        # M5 (index 4) should have revenue = 60000
        m5 = monthly_data[4]  # month 5 is index 4
        assert m5["month"] == 5
        assert m5["revenue"] == 60000, f"M5 Cash-In should be $60,000, got {m5['revenue']}"

    def test_cashflow_combined_data_has_cumulative(self):
        """Test: combined_data has cumulative tracking"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.ewf_project_id}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        combined_data = data["combined_data"]
        assert isinstance(combined_data, list)
        assert len(combined_data) > 0
        
        for month in combined_data:
            assert "month" in month
            assert "cost" in month
            assert "revenue" in month
            assert "net" in month
            assert "cumulative" in month, "Missing 'cumulative' field in combined_data"

    def test_cashflow_summary_totals(self):
        """Test: summary has correct totals"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.ewf_project_id}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "total_cost" in summary
        assert "total_revenue" in summary
        assert "net_cashflow" in summary
        
        # Total revenue should be 85000 (25000 + 60000)
        assert summary["total_revenue"] == 85000, f"Total revenue should be 85000, got {summary['total_revenue']}"

    def test_projects_with_resource_data_for_cashflow(self):
        """Test: Projects with resource data can be filtered for cashflow page"""
        response = self.session.get(f"{BASE_URL}/api/projects?latest_only=true")
        assert response.status_code == 200
        projects = response.json()
        
        # Filter projects with resource data (waves with grid_allocations > 0)
        projects_with_resources = []
        for p in projects:
            waves = p.get("waves", [])
            if waves:
                for w in waves:
                    if w.get("grid_allocations") and len(w.get("grid_allocations", [])) > 0:
                        projects_with_resources.append(p)
                        break
        
        # ewf and dasg should be in this list
        project_ids = [p["id"] for p in projects_with_resources]
        assert self.ewf_project_id in project_ids, "ewf should have resource data"
        assert self.dasg_project_id in project_ids, "dasg should have resource data"

    # === DOWNLOAD FILE ENDPOINT TEST (for Excel export) ===
    
    def test_download_file_endpoint_exists(self):
        """Test: POST /api/download-file endpoint exists for Excel export"""
        # This endpoint accepts binary data and returns a download_id
        # Just verify the endpoint is available
        response = self.session.post(
            f"{BASE_URL}/api/download-file",
            headers={
                "X-Filename": "test.xlsx",
                "X-Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            },
            data=b"test"
        )
        # Should return 200 with download_id
        assert response.status_code == 200, f"Download file endpoint failed: {response.text}"
        data = response.json()
        assert "download_id" in data


class TestCashflowMultiWave:
    """Test cashflow with multi-wave project (dasg)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        self.dasg_project_id = "0a7d0101-4c39-4398-af84-dafef153d3a8"

    def test_dasg_cashflow_has_wave_data(self):
        """Test: dasg cashflow returns wave_data array"""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.dasg_project_id}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        assert "wave_data" in data
        wave_data = data["wave_data"]
        assert isinstance(wave_data, list)
        # dasg should have multiple waves
        assert len(wave_data) > 0

    def test_dasg_combined_data_sums_all_waves(self):
        """Test: combined_data sums M1 of Wave1 + M1 of Wave2 etc."""
        response = self.session.get(f"{BASE_URL}/api/projects/{self.dasg_project_id}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        wave_data = data["wave_data"]
        combined_data = data["combined_data"]
        
        if len(combined_data) > 0:
            # For month 1, sum of costs from all waves should equal combined cost
            m1_cost_sum = 0
            for wave in wave_data:
                if wave["monthly_data"] and len(wave["monthly_data"]) > 0:
                    m1_cost_sum += wave["monthly_data"][0]["cost"]
            
            combined_m1_cost = combined_data[0]["cost"]
            # Allow for floating point differences
            assert abs(m1_cost_sum - combined_m1_cost) < 1, f"Combined M1 cost should equal sum of wave M1 costs"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
