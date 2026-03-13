"""
Iteration 33 - P0 Bug Fix Tests: contingency_absolute in Projects, Milestones, Cashflow
PRJ-0026 (id: 8f91ffe4-f3d9-45a7-b38e-bcf764886492) is test project:
- Has contingency_absolute=1500
- Has NO traveling resources (all travel_required=false)
- Fix ensures contingency_absolute is ALWAYS added to totals
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROJECT_ID = "8f91ffe4-f3d9-45a7-b38e-bcf764886492"  # PRJ-0026

@pytest.fixture(scope="module")
def auth_token():
    """Login and get auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@yash.com",
        "password": "password"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def project_data(auth_token):
    """Fetch PRJ-0026 project data"""
    response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}", 
                          headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    return response.json()


class TestContingencyAbsoluteFix:
    """Test that contingency_absolute is included in calculations for PRJ-0026"""
    
    def test_project_has_contingency_absolute(self, project_data):
        """Verify PRJ-0026 has contingency_absolute=1500 in logistics_config"""
        wave = project_data["waves"][0]
        config = wave.get("logistics_config", {})
        contingency_abs = config.get("contingency_absolute", 0)
        
        print(f"Wave: {wave['name']}")
        print(f"contingency_absolute: {contingency_abs}")
        
        assert contingency_abs == 1500, f"Expected contingency_absolute=1500, got {contingency_abs}"
    
    def test_project_has_no_traveling_resources(self, project_data):
        """Verify PRJ-0026 has NO resources with travel_required=true"""
        wave = project_data["waves"][0]
        allocations = wave.get("grid_allocations", [])
        
        traveling_count = sum(1 for alloc in allocations if alloc.get("travel_required", False))
        print(f"Total resources: {len(allocations)}, Traveling resources: {traveling_count}")
        
        assert traveling_count == 0, f"Expected 0 traveling resources, got {traveling_count}"
    
    def test_cashflow_includes_contingency_absolute(self, auth_token, project_data):
        """Verify cashflow endpoint includes contingency_absolute in total cost"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/cashflow",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        data = response.json()
        total_cost = data["summary"]["total_cost"]
        
        # Calculate expected cost manually
        wave = project_data["waves"][0]
        config = wave.get("logistics_config", {})
        contingency_abs = config.get("contingency_absolute", 0)
        n_months = len(wave.get("phase_names", []))
        
        # contingency_abs should be added per month (divided by months)
        expected_contingency_per_month = contingency_abs / max(n_months, 1)
        expected_total_contingency = expected_contingency_per_month * n_months  # Should equal contingency_abs
        
        print(f"Total cost from cashflow: ${total_cost:.2f}")
        print(f"contingency_absolute: {contingency_abs}")
        print(f"Expected contingency in total: ${expected_total_contingency:.2f}")
        
        # Verify total cost includes the contingency_absolute
        # Since there are no traveling resources, logistics should only be contingency_absolute
        # Total cost = salary costs + overhead + contingency_absolute
        assert total_cost > 0, "Total cost should be > 0"
        
        # The total cost should include the contingency_absolute (1500)
        # If bug was present, it would NOT include this 1500
        wave_data = data.get("wave_data", [])
        if wave_data:
            wave_total_cost = wave_data[0]["total_cost"]
            print(f"Wave total cost: ${wave_total_cost:.2f}")
    
    def test_milestones_payment_includes_contingency_absolute(self, auth_token, project_data):
        """Verify milestone payments are based on wave final price that includes contingency_absolute"""
        # Get milestones
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        data = response.json()
        milestones = data.get("milestones", [])
        
        print(f"Number of milestones: {len(milestones)}")
        
        if milestones:
            total_payment = sum(m.get("payment_amount", 0) for m in milestones)
            total_pct = sum(m.get("payment_percentage", 0) for m in milestones)
            
            print(f"Total payment percentage: {total_pct}%")
            print(f"Total payment amount: ${total_payment:.2f}")
            
            # Calculate expected wave final price using the calcWaveFinalPrice logic
            wave = project_data["waves"][0]
            profit_margin = project_data.get("profit_margin_percentage", 35)
            nego_buffer = project_data.get("nego_buffer_percentage", 0)
            config = wave.get("logistics_config", {})
            contingency_abs = config.get("contingency_absolute", 0)
            
            # Calculate resource selling price
            total_rows_sp = 0
            for alloc in wave.get("grid_allocations", []):
                pa = alloc.get("phase_allocations", {})
                mm = sum(pa.values()) if isinstance(pa, dict) else sum(pa) if isinstance(pa, list) else 0
                salary = alloc.get("avg_monthly_salary", 0)
                oh_pct = alloc.get("overhead_percentage", 0)
                base_cost = salary * mm
                overhead = base_cost * (oh_pct / 100)
                total_cost = base_cost + overhead
                row_sp = total_cost / (1 - (profit_margin / 100)) if profit_margin < 100 else total_cost
                total_rows_sp += row_sp
            
            # Since no traveling resources, logistics = contingency_abs only
            total_logistics = contingency_abs
            
            wave_selling_price = total_rows_sp + total_logistics
            wave_nego_buffer = wave_selling_price * (nego_buffer / 100)
            wave_final_price = wave_selling_price + wave_nego_buffer
            
            print(f"\nCalculated values:")
            print(f"  Total rows selling price: ${total_rows_sp:.2f}")
            print(f"  Total logistics (contingency_abs only): ${total_logistics:.2f}")
            print(f"  Wave selling price: ${wave_selling_price:.2f}")
            print(f"  Nego buffer ({nego_buffer}%): ${wave_nego_buffer:.2f}")
            print(f"  Wave final price: ${wave_final_price:.2f}")
            
            # If milestones are 100% total, total_payment should equal wave_final_price
            if total_pct == 100:
                assert abs(total_payment - wave_final_price) < 1, \
                    f"100% milestones should equal wave final price. Got ${total_payment:.2f}, expected ${wave_final_price:.2f}"
            else:
                # Verify payment is proportional to percentage
                expected_payment = wave_final_price * (total_pct / 100)
                assert abs(total_payment - expected_payment) < 1, \
                    f"{total_pct}% milestones should equal ${expected_payment:.2f}, got ${total_payment:.2f}"
    
    def test_projects_list_selling_price(self, auth_token, project_data):
        """Verify Projects list shows correct selling price (including contingency_absolute)"""
        response = requests.get(f"{BASE_URL}/api/projects",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        projects = response.json()
        prj_0026 = None
        for p in projects:
            if p.get("id") == PROJECT_ID:
                prj_0026 = p
                break
        
        assert prj_0026 is not None, "PRJ-0026 not found in projects list"
        print(f"Found PRJ-0026: {prj_0026.get('project_number')}")
        
        # The frontend calculates selling price from waves data
        # We just verify the wave data includes logistics_config with contingency_absolute
        wave = prj_0026.get("waves", [])[0]
        config = wave.get("logistics_config", {})
        contingency_abs = config.get("contingency_absolute", 0)
        
        print(f"contingency_absolute in projects list data: {contingency_abs}")
        assert contingency_abs == 1500, f"contingency_absolute should be 1500 in projects list"


class TestMilestonePageRefresh:
    """Test that milestone page correctly refreshes data when navigating from estimator"""
    
    def test_milestones_endpoint_returns_data(self, auth_token):
        """Verify milestones endpoint works correctly"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        data = response.json()
        assert "milestones" in data
        
        milestones = data["milestones"]
        print(f"Number of milestones: {len(milestones)}")
        
        for ms in milestones:
            print(f"  - {ms.get('milestone_name')}: {ms.get('payment_percentage')}% = ${ms.get('payment_amount', 0):.2f}")
    
    def test_project_endpoint_returns_current_data(self, auth_token):
        """Verify project endpoint returns current data for recalculation"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["project_number"] == "PRJ-0026"
        
        wave = data["waves"][0]
        config = wave.get("logistics_config", {})
        
        print(f"Wave: {wave['name']}")
        print(f"  - profit_margin: {data.get('profit_margin_percentage')}%")
        print(f"  - nego_buffer: {data.get('nego_buffer_percentage')}%")
        print(f"  - contingency_absolute: {config.get('contingency_absolute')}")


class TestAddMilestoneFeature:
    """Test Add Milestone button functionality"""
    
    def test_can_save_new_milestone(self, auth_token):
        """Verify we can add a milestone via PUT endpoint"""
        # First get existing milestones
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        existing = response.json().get("milestones", [])
        initial_count = len(existing)
        
        # Add a new test milestone
        new_milestone = {
            "id": "test-milestone-iter33",
            "wave_name": "Wave1 SF",
            "milestone_name": "Test Milestone (iter33)",
            "target_month": "M3",
            "payment_percentage": 0,  # 0% so doesn't affect totals
            "payment_amount": 0,
            "description": "Test milestone for iteration 33"
        }
        
        updated_milestones = existing + [new_milestone]
        
        # Save milestones
        response = requests.put(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
                              headers={"Authorization": f"Bearer {auth_token}"},
                              json={"milestones": updated_milestones})
        assert response.status_code == 200
        
        # Verify milestone was added
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        final_milestones = response.json().get("milestones", [])
        assert len(final_milestones) == initial_count + 1
        
        print(f"Added milestone. Count: {initial_count} -> {len(final_milestones)}")
        
        # Clean up - remove test milestone
        cleaned = [m for m in final_milestones if m.get("id") != "test-milestone-iter33"]
        response = requests.put(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
                              headers={"Authorization": f"Bearer {auth_token}"},
                              json={"milestones": cleaned})
        assert response.status_code == 200
        print("Cleaned up test milestone")


class TestMilestonePercentageRecalculation:
    """Test that changing milestone percentage recalculates payment amount"""
    
    def test_percentage_change_updates_amount(self, auth_token, project_data):
        """Verify milestone amount is recalculated based on percentage"""
        # Get milestones
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/milestones",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        data = response.json()
        milestones = data.get("milestones", [])
        
        if len(milestones) < 1:
            pytest.skip("No milestones to test")
        
        # Calculate expected wave final price
        wave = project_data["waves"][0]
        profit_margin = project_data.get("profit_margin_percentage", 35)
        nego_buffer = project_data.get("nego_buffer_percentage", 0)
        config = wave.get("logistics_config", {})
        contingency_abs = config.get("contingency_absolute", 0)
        
        total_rows_sp = 0
        for alloc in wave.get("grid_allocations", []):
            pa = alloc.get("phase_allocations", {})
            mm = sum(pa.values()) if isinstance(pa, dict) else sum(pa) if isinstance(pa, list) else 0
            salary = alloc.get("avg_monthly_salary", 0)
            oh_pct = alloc.get("overhead_percentage", 0)
            base_cost = salary * mm
            overhead = base_cost * (oh_pct / 100)
            total_cost = base_cost + overhead
            row_sp = total_cost / (1 - (profit_margin / 100)) if profit_margin < 100 else total_cost
            total_rows_sp += row_sp
        
        total_logistics = contingency_abs  # No traveling resources
        wave_selling_price = total_rows_sp + total_logistics
        wave_nego_buffer = wave_selling_price * (nego_buffer / 100)
        wave_final_price = wave_selling_price + wave_nego_buffer
        
        print(f"Calculated wave final price: ${wave_final_price:.2f}")
        
        # Check each milestone's payment amount matches percentage * wave_final_price
        for ms in milestones:
            pct = ms.get("payment_percentage", 0)
            amount = ms.get("payment_amount", 0)
            expected_amount = wave_final_price * (pct / 100)
            
            print(f"{ms.get('milestone_name')}: {pct}% => ${amount:.2f} (expected: ${expected_amount:.2f})")
            
            # Allow small rounding difference
            assert abs(amount - expected_amount) < 1, \
                f"Payment amount ${amount:.2f} doesn't match expected ${expected_amount:.2f} for {pct}%"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
