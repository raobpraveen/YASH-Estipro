"""
Iteration 47 - Activity Templates & Phase Activities Rework Tests
Tests for:
1. Activity Templates Master Data with combo key (technology_id, sub_technology_id, project_type_id, phase_name)
2. Bulk adopt templates endpoint
3. Wave-specific activities (wave_activities field)
4. Activities export data endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_PROJECT_ID = "6856eeac-928e-4ada-a478-4c2eccad51d8"  # PRJ-0026 v3
SAP_TECH_ID = "7517ff3c-5bb3-47d7-895e-15da5d9da5e1"
PRIVATE_CLOUD_SUBTECH_ID = "8345e748-d51a-4b68-b8b5-0a5417975d1d"
IMPLEMENTATION_PROJTYPE_ID = "e2c5a7ae-d6b3-4fb1-b312-22d41a1af717"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@yash.com",
        "password": "password"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestActivityTemplatesAPI:
    """Tests for Activity Templates Master Data endpoints"""

    def test_get_all_templates(self, headers):
        """GET /api/activity-templates - should return all templates"""
        response = requests.get(f"{BASE_URL}/api/activity-templates", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} activity templates")

    def test_get_templates_by_combo(self, headers):
        """GET /api/activity-templates/by-combo - filter by technology/subtech/projtype"""
        response = requests.get(
            f"{BASE_URL}/api/activity-templates/by-combo",
            params={
                "technology_id": SAP_TECH_ID,
                "sub_technology_id": PRIVATE_CLOUD_SUBTECH_ID,
                "project_type_id": IMPLEMENTATION_PROJTYPE_ID
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # SAP template should have 6 phases
        print(f"Found {len(data)} templates for SAP S/4HANA Private Cloud Implementation")
        # Verify phase names
        phase_names = [t.get("phase_name") for t in data]
        expected_phases = ["Discover", "Prepare", "Explore", "Realize", "Deploy", "Run"]
        for phase in expected_phases:
            assert phase in phase_names, f"Missing phase: {phase}"
        print(f"All 6 SAP Activate phases found: {phase_names}")

    def test_sap_template_discover_phase_content(self, headers):
        """Verify Discover phase has correct activities and deliverables"""
        response = requests.get(
            f"{BASE_URL}/api/activity-templates/by-combo",
            params={
                "technology_id": SAP_TECH_ID,
                "sub_technology_id": PRIVATE_CLOUD_SUBTECH_ID,
                "project_type_id": IMPLEMENTATION_PROJTYPE_ID
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        discover = next((t for t in data if t.get("phase_name") == "Discover"), None)
        assert discover is not None, "Discover phase not found"
        
        activities = discover.get("activities", [])
        acts = [a for a in activities if not a.get("is_deliverable")]
        dels = [a for a in activities if a.get("is_deliverable")]
        
        print(f"Discover phase: {len(acts)} activities, {len(dels)} deliverables")
        assert len(acts) >= 4, f"Expected at least 4 activities, got {len(acts)}"
        assert len(dels) >= 3, f"Expected at least 3 deliverables, got {len(dels)}"
        
        # Check for specific SAP Activate items
        act_names = [a.get("name") for a in acts]
        assert any("DDA" in n or "Digital Discovery" in n for n in act_names), "Missing DDA activity"

    def test_upsert_template_create(self, headers):
        """PUT /api/activity-templates - create new template"""
        test_phase = f"TEST_Phase_{uuid.uuid4().hex[:8]}"
        payload = {
            "technology_id": SAP_TECH_ID,
            "sub_technology_id": PRIVATE_CLOUD_SUBTECH_ID,
            "project_type_id": IMPLEMENTATION_PROJTYPE_ID,
            "phase_name": test_phase,
            "activities": [
                {"id": str(uuid.uuid4()), "name": "Test Activity 1", "description": "Test desc", "is_deliverable": False, "owner": "", "sort_order": 0},
                {"id": str(uuid.uuid4()), "name": "Test Deliverable 1", "description": "Test del desc", "is_deliverable": True, "owner": "", "sort_order": 1},
            ],
            "technology_name": "SAP S/4HANA",
            "sub_technology_name": "Private Cloud",
            "project_type_name": "Implementation",
        }
        response = requests.put(f"{BASE_URL}/api/activity-templates", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("message") == "Template created"
        print(f"Created template with id: {data['id']}")
        
        # Cleanup - delete the test template
        delete_response = requests.delete(f"{BASE_URL}/api/activity-templates/{data['id']}", headers=headers)
        assert delete_response.status_code == 200

    def test_upsert_template_update(self, headers):
        """PUT /api/activity-templates - update existing template"""
        # First create
        test_phase = f"TEST_Update_{uuid.uuid4().hex[:8]}"
        payload = {
            "technology_id": SAP_TECH_ID,
            "sub_technology_id": PRIVATE_CLOUD_SUBTECH_ID,
            "project_type_id": IMPLEMENTATION_PROJTYPE_ID,
            "phase_name": test_phase,
            "activities": [{"id": str(uuid.uuid4()), "name": "Original", "description": "", "is_deliverable": False, "owner": "", "sort_order": 0}],
        }
        create_res = requests.put(f"{BASE_URL}/api/activity-templates", json=payload, headers=headers)
        assert create_res.status_code == 200
        template_id = create_res.json()["id"]
        
        # Update with same combo key
        payload["activities"] = [
            {"id": str(uuid.uuid4()), "name": "Updated Activity", "description": "Updated", "is_deliverable": False, "owner": "Test Owner", "sort_order": 0}
        ]
        update_res = requests.put(f"{BASE_URL}/api/activity-templates", json=payload, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json().get("message") == "Template updated"
        
        # Verify update
        get_res = requests.get(f"{BASE_URL}/api/activity-templates/by-combo", params={
            "technology_id": SAP_TECH_ID,
            "sub_technology_id": PRIVATE_CLOUD_SUBTECH_ID,
            "project_type_id": IMPLEMENTATION_PROJTYPE_ID
        }, headers=headers)
        templates = get_res.json()
        updated = next((t for t in templates if t.get("phase_name") == test_phase), None)
        assert updated is not None
        assert updated["activities"][0]["name"] == "Updated Activity"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/activity-templates/{template_id}", headers=headers)


class TestBulkAdoptTemplates:
    """Tests for bulk adopt templates endpoint"""

    def test_adopt_templates_single_phase(self, headers):
        """POST /api/projects/{id}/activities/adopt-templates - single phase"""
        payload = {
            "technology_id": SAP_TECH_ID,
            "sub_technology_id": PRIVATE_CLOUD_SUBTECH_ID,
            "project_type_id": IMPLEMENTATION_PROJTYPE_ID,
            "wave_name": "Wave1 SF",
            "phase_names": ["Realize"]
        }
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities/adopt-templates",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "adopted" in data
        adopted = data["adopted"]
        assert len(adopted) >= 1
        print(f"Adopted templates: {adopted}")
        
        # Verify the phase was adopted
        realize_adopted = next((a for a in adopted if a["phase_name"] == "Realize"), None)
        assert realize_adopted is not None
        assert realize_adopted["count"] > 0

    def test_adopt_templates_multiple_phases(self, headers):
        """POST /api/projects/{id}/activities/adopt-templates - multiple phases"""
        payload = {
            "technology_id": SAP_TECH_ID,
            "sub_technology_id": PRIVATE_CLOUD_SUBTECH_ID,
            "project_type_id": IMPLEMENTATION_PROJTYPE_ID,
            "wave_name": "Wave2 India",
            "phase_names": ["Prepare", "Explore", "Deploy"]
        }
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities/adopt-templates",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        adopted = data.get("adopted", [])
        # Should adopt for phases that have templates
        print(f"Bulk adopted {len(adopted)} phases: {[a['phase_name'] for a in adopted]}")

    def test_adopt_templates_missing_params(self, headers):
        """POST /api/projects/{id}/activities/adopt-templates - validation error"""
        payload = {
            "technology_id": SAP_TECH_ID,
            # Missing project_type_id, wave_name, phase_names
        }
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities/adopt-templates",
            json=payload,
            headers=headers
        )
        assert response.status_code == 400


class TestProjectActivitiesAPI:
    """Tests for project-specific activities endpoints"""

    def test_get_project_activities(self, headers):
        """GET /api/projects/{id}/activities - get all project activities"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Project has {len(data)} phase activity records")

    def test_get_phase_activities(self, headers):
        """GET /api/projects/{id}/activities/{wave}/{phase} - get specific phase"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities/Wave1%20SF/Prepare",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "activities" in data
        assert "wave_activities" in data
        print(f"Prepare phase: {len(data['activities'])} template items, {len(data['wave_activities'])} wave items")

    def test_save_phase_activities_with_wave_activities(self, headers):
        """PUT /api/projects/{id}/activities/{wave}/{phase} - save with wave_activities"""
        # First get existing
        get_res = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities/Wave1%20SF/Hypercare",
            headers=headers
        )
        existing = get_res.json()
        
        # Add a wave-specific activity
        wave_activities = existing.get("wave_activities", [])
        test_wave_item = {
            "id": str(uuid.uuid4()),
            "name": f"TEST_Wave_Activity_{uuid.uuid4().hex[:6]}",
            "description": "Test wave-specific item",
            "is_deliverable": False,
            "owner": "Test",
            "sort_order": len(wave_activities)
        }
        wave_activities.append(test_wave_item)
        
        payload = {
            "activities": existing.get("activities", []),
            "wave_activities": wave_activities
        }
        response = requests.put(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities/Wave1%20SF/Hypercare",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify persistence
        verify_res = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities/Wave1%20SF/Hypercare",
            headers=headers
        )
        verify_data = verify_res.json()
        wave_items = verify_data.get("wave_activities", [])
        assert any(w["name"] == test_wave_item["name"] for w in wave_items), "Wave activity not persisted"
        print(f"Wave activity persisted successfully. Total wave items: {len(wave_items)}")

    def test_activities_export_data(self, headers):
        """GET /api/projects/{id}/activities/export-data - export data endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities/export-data",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Export data contains {len(data)} phase records")


class TestSeedSAPTemplate:
    """Test SAP template seeding endpoint"""

    def test_seed_sap_template(self, headers):
        """POST /api/activity-templates/seed-sap - seed SAP template"""
        response = requests.post(
            f"{BASE_URL}/api/activity-templates/seed-sap",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "phases" in data
        phases = data["phases"]
        assert len(phases) == 6
        expected = ["Discover", "Prepare", "Explore", "Realize", "Deploy", "Run"]
        for p in expected:
            assert p in phases
        print(f"SAP template seeded with phases: {phases}")


class TestMainExcelExportWithActivities:
    """Test that main Excel export includes activities"""

    def test_project_has_activities_for_export(self, headers):
        """Verify project has activities that would be included in export"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/activities",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        # Should have some activities after adoption tests
        print(f"Project has {len(data)} activity records for export")
        
        # Check structure
        if len(data) > 0:
            sample = data[0]
            assert "wave_name" in sample
            assert "phase_name" in sample
            assert "activities" in sample or "wave_activities" in sample


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
