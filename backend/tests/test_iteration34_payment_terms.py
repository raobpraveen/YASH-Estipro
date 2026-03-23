"""
Iteration 34 Tests: Payment Terms in Cashflow Feature
Testing:
1. Milestones API returns payment_terms_days field
2. PUT milestones saves payment_terms_days correctly
3. Cashflow API returns payment_terms_days, payment_offset_months, extended_months
4. Extended months calculated correctly based on payment offset
5. Cash-In shifts by payment offset months
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://estpro-payment-flow.preview.emergentagent.com"

# PRJ-0025 project ID for testing
TEST_PROJECT_ID = "d94df1da-49b0-497e-90ae-f9466da8444b"


class TestPaymentTermsFeature:
    """Tests for Payment Terms in Cashflow feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yash.com",
            "password": "password"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})

    # === MILESTONES API TESTS ===
    
    def test_get_milestones_returns_payment_terms_days(self):
        """Test: GET /api/projects/{id}/milestones returns payment_terms_days field"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert response.status_code == 200
        data = response.json()
        
        # Verify payment_terms_days field exists
        assert "payment_terms_days" in data, "Missing payment_terms_days field"
        assert isinstance(data["payment_terms_days"], (int, float)), "payment_terms_days should be numeric"

    def test_put_milestones_saves_payment_terms_30_days(self):
        """Test: PUT milestones with payment_terms_days=30 saves correctly"""
        # Get current milestones to preserve them
        get_response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert get_response.status_code == 200
        current_milestones = get_response.json().get("milestones", [])
        
        # Update with 30 days payment terms
        response = self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": current_milestones, "payment_terms_days": 30}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["payment_terms_days"] == 30, f"Expected 30, got {data['payment_terms_days']}"
        
        # Verify by GET
        verify_response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert verify_response.status_code == 200
        assert verify_response.json()["payment_terms_days"] == 30

    def test_put_milestones_saves_payment_terms_60_days(self):
        """Test: PUT milestones with payment_terms_days=60 saves correctly"""
        get_response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        current_milestones = get_response.json().get("milestones", [])
        
        response = self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": current_milestones, "payment_terms_days": 60}
        )
        assert response.status_code == 200
        assert response.json()["payment_terms_days"] == 60

    def test_put_milestones_saves_payment_terms_0_immediate(self):
        """Test: PUT milestones with payment_terms_days=0 (Immediate) saves correctly"""
        get_response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        current_milestones = get_response.json().get("milestones", [])
        
        response = self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": current_milestones, "payment_terms_days": 0}
        )
        assert response.status_code == 200
        assert response.json()["payment_terms_days"] == 0

    # === CASHFLOW API TESTS ===
    
    def test_cashflow_returns_payment_terms_fields(self):
        """Test: GET /api/projects/{id}/cashflow returns payment_terms_days and payment_offset_months"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "payment_terms_days" in data, "Missing payment_terms_days"
        assert "payment_offset_months" in data, "Missing payment_offset_months"

    def test_cashflow_returns_extended_months_in_wave_data(self):
        """Test: wave_data includes extended_months field"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        wave_data = data.get("wave_data", [])
        assert len(wave_data) > 0, "wave_data should not be empty"
        
        for wave in wave_data:
            assert "months" in wave, f"Missing months field in wave {wave.get('wave_name')}"
            assert "extended_months" in wave, f"Missing extended_months field in wave {wave.get('wave_name')}"

    def test_cashflow_30_day_offset_is_1_month(self):
        """Test: 30-day payment terms results in +1 month offset"""
        # First set 30 days payment terms
        get_ms = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        milestones = get_ms.json().get("milestones", [])
        self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": milestones, "payment_terms_days": 30}
        )
        
        # Verify cashflow shows +1 month offset
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        assert data["payment_terms_days"] == 30
        assert data["payment_offset_months"] == 1, f"Expected 1 month offset for 30 days, got {data['payment_offset_months']}"

    def test_cashflow_60_day_offset_is_2_months(self):
        """Test: 60-day payment terms results in +2 month offset"""
        # Set 60 days payment terms
        get_ms = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        milestones = get_ms.json().get("milestones", [])
        self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": milestones, "payment_terms_days": 60}
        )
        
        # Verify cashflow shows +2 month offset
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        assert data["payment_terms_days"] == 60
        assert data["payment_offset_months"] == 2, f"Expected 2 month offset for 60 days, got {data['payment_offset_months']}"

    def test_cashflow_0_day_no_offset(self):
        """Test: 0-day (Immediate) payment terms has no offset"""
        get_ms = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        milestones = get_ms.json().get("milestones", [])
        self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": milestones, "payment_terms_days": 0}
        )
        
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        assert data["payment_terms_days"] == 0
        assert data["payment_offset_months"] == 0, f"Expected 0 offset for 0 days, got {data['payment_offset_months']}"

    def test_cashflow_extended_months_with_60_day_offset_w2(self):
        """Test: W2 (3 months) with 60-day offset extends to 5 months (M3 milestone + 2 = M5)"""
        # Set 60 days payment terms
        get_ms = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        milestones = get_ms.json().get("milestones", [])
        self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": milestones, "payment_terms_days": 60}
        )
        
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        # Find W2 in wave_data
        w2 = None
        for wave in data.get("wave_data", []):
            if wave.get("wave_name") == "W2":
                w2 = wave
                break
        
        assert w2 is not None, "W2 wave not found in cashflow data"
        assert w2["months"] == 3, f"W2 should have 3 original months, got {w2['months']}"
        # W2 has milestone in M3, with +2 offset = M5, so extended_months should be 5
        assert w2["extended_months"] == 5, f"W2 extended_months should be 5 (M3+2=M5), got {w2['extended_months']}"

    def test_cashflow_no_extended_months_with_0_day_offset(self):
        """Test: With 0-day offset, extended_months equals original months"""
        # Set 0 days payment terms
        get_ms = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        milestones = get_ms.json().get("milestones", [])
        self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": milestones, "payment_terms_days": 0}
        )
        
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        for wave in data.get("wave_data", []):
            assert wave["extended_months"] == wave["months"], \
                f"With 0 offset, extended_months should equal months for {wave['wave_name']}"

    def test_cashflow_cash_in_shifted_to_correct_month(self):
        """Test: Cash-In (revenue) is shifted to the correct month with payment offset"""
        # Set 60 days (2 months) payment terms
        get_ms = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        milestones = get_ms.json().get("milestones", [])
        self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": milestones, "payment_terms_days": 60}
        )
        
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/cashflow")
        assert response.status_code == 200
        data = response.json()
        
        # W2 has milestones at M1, M2, M3 - with +2 offset, revenue should be at M3, M4, M5
        w2 = None
        for wave in data.get("wave_data", []):
            if wave.get("wave_name") == "W2":
                w2 = wave
                break
        
        assert w2 is not None, "W2 wave not found"
        monthly_data = w2.get("monthly_data", [])
        
        # M1, M2 should have 0 revenue (offset by +2)
        assert monthly_data[0]["revenue"] == 0, f"M1 should have 0 revenue with offset, got {monthly_data[0]['revenue']}"
        assert monthly_data[1]["revenue"] == 0, f"M2 should have 0 revenue with offset, got {monthly_data[1]['revenue']}"
        # M3, M4, M5 should have the shifted revenue
        assert monthly_data[2]["revenue"] > 0, f"M3 should have revenue (M1 milestone shifted)"
        assert monthly_data[3]["revenue"] > 0, f"M4 should have revenue (M2 milestone shifted)"
        assert monthly_data[4]["revenue"] > 0, f"M5 should have revenue (M3 milestone shifted)"


class TestMilestoneDataIntegrity:
    """Additional tests for milestone data integrity"""
    
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

    def test_milestone_structure_complete(self):
        """Test: Milestones have all required fields"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert response.status_code == 200
        data = response.json()
        
        milestones = data.get("milestones", [])
        assert len(milestones) > 0, "PRJ-0025 should have milestones"
        
        for ms in milestones:
            assert "id" in ms, "Missing id field"
            assert "wave_name" in ms, "Missing wave_name field"
            assert "milestone_name" in ms, "Missing milestone_name field"
            assert "target_month" in ms, "Missing target_month field"
            assert "payment_percentage" in ms, "Missing payment_percentage field"
            assert "payment_amount" in ms, "Missing payment_amount field"

    def test_prj0025_has_both_waves(self):
        """Test: PRJ-0025 has milestones for Wave1 SF and W2"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert response.status_code == 200
        milestones = response.json().get("milestones", [])
        
        wave_names = set(ms.get("wave_name") for ms in milestones)
        assert "Wave1 SF" in wave_names, "Missing Wave1 SF milestones"
        assert "W2" in wave_names, "Missing W2 milestones"

    def test_cleanup_restore_60_days(self):
        """Cleanup: Restore payment_terms_days to 60 after tests"""
        get_ms = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        milestones = get_ms.json().get("milestones", [])
        response = self.session.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones",
            json={"milestones": milestones, "payment_terms_days": 60}
        )
        assert response.status_code == 200
        assert response.json()["payment_terms_days"] == 60


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
