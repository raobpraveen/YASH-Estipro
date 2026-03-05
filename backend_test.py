import requests
import sys
from datetime import datetime
import json

class ProjectEstimatorAPITester:
    def __init__(self, base_url="https://wave-grid-dev.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'skills': [],
            'rates': [],
            'projects': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    if response_data:
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_skills_crud(self):
        """Test Skills CRUD operations"""
        print("\n" + "="*50)
        print("TESTING SKILLS MANAGEMENT")
        print("="*50)
        
        # Test GET empty skills
        success, _ = self.run_test("Get Skills (Empty)", "GET", "skills", 200)
        
        # Test CREATE skill
        skill_data = {
            "name": "React Developer", 
            "technology": "Frontend"
        }
        success, response = self.run_test("Create Skill", "POST", "skills", 200, skill_data)
        if success and 'id' in response:
            skill_id = response['id']
            self.created_ids['skills'].append(skill_id)
            
            # Test GET skills with data
            self.run_test("Get Skills (With Data)", "GET", "skills", 200)
            
            # Test DELETE skill
            self.run_test("Delete Skill", "DELETE", f"skills/{skill_id}", 200)
            
        return success

    def test_proficiency_rates_crud(self):
        """Test Proficiency Rates CRUD operations"""
        print("\n" + "="*50)
        print("TESTING PROFICIENCY RATES MANAGEMENT")
        print("="*50)
        
        # First create a skill for the rate
        skill_data = {"name": "Python Developer", "technology": "Backend"}
        skill_success, skill_response = self.run_test("Create Skill for Rate", "POST", "skills", 200, skill_data)
        
        if not skill_success:
            print("❌ Cannot test proficiency rates without skill")
            return False
            
        skill_id = skill_response['id']
        self.created_ids['skills'].append(skill_id)
        
        # Test GET empty rates
        success, _ = self.run_test("Get Rates (Empty)", "GET", "proficiency-rates", 200)
        
        # Test CREATE proficiency rate
        rate_data = {
            "skill_id": skill_id,
            "skill_name": "Python Developer",
            "technology": "Backend", 
            "proficiency_level": "Senior",
            "avg_monthly_salary": 8000
        }
        success, response = self.run_test("Create Proficiency Rate", "POST", "proficiency-rates", 200, rate_data)
        if success and 'id' in response:
            rate_id = response['id']
            self.created_ids['rates'].append(rate_id)
            
            # Test GET rates with data
            self.run_test("Get Rates (With Data)", "GET", "proficiency-rates", 200)
            
            # Test DELETE rate
            self.run_test("Delete Proficiency Rate", "DELETE", f"proficiency-rates/{rate_id}", 200)
            
        return success

    def test_projects_crud(self):
        """Test Projects CRUD operations"""
        print("\n" + "="*50)
        print("TESTING PROJECTS MANAGEMENT")
        print("="*50)
        
        # Test GET empty projects
        success, _ = self.run_test("Get Projects (Empty)", "GET", "projects", 200)
        
        # Test CREATE project
        project_data = {
            "name": "E-commerce Platform",
            "description": "Full stack web application",
            "overhead_percentage": 25.0,
            "profit_margin_percentage": 20.0
        }
        success, response = self.run_test("Create Project", "POST", "projects", 200, project_data)
        if success and 'id' in response:
            project_id = response['id']
            self.created_ids['projects'].append(project_id)
            
            # Test GET projects with data
            self.run_test("Get Projects (With Data)", "GET", "projects", 200)
            
            # Test GET single project
            self.run_test("Get Single Project", "GET", f"projects/{project_id}", 200)
            
            # Test UPDATE project with resources
            update_data = {
                "resources": [{
                    "skill_name": "React Developer",
                    "technology": "Frontend",
                    "proficiency_level": "Senior",
                    "avg_monthly_salary": 7000,
                    "man_months": 3.0,
                    "is_onsite": True,
                    "per_diem_monthly": 2000,
                    "accommodation_monthly": 3000,
                    "flight_cost_per_trip": 1500,
                    "num_trips": 2,
                    "visa_cost": 500,
                    "insurance_cost": 300,
                    "local_conveyance_monthly": 800,
                    "misc_cost": 200
                }]
            }
            self.run_test("Update Project with Resources", "PUT", f"projects/{project_id}", 200, update_data)
            
            # Test DELETE project
            self.run_test("Delete Project", "DELETE", f"projects/{project_id}", 200)
            
        return success

    def test_calculation_accuracy(self):
        """Test calculation accuracy for project cost estimation"""
        print("\n" + "="*50)
        print("TESTING CALCULATION ACCURACY")
        print("="*50)
        
        # Create test project with specific values
        project_data = {
            "name": "Calculation Test Project",
            "description": "Testing calculations",
            "overhead_percentage": 20.0,
            "profit_margin_percentage": 15.0
        }
        
        success, response = self.run_test("Create Test Project", "POST", "projects", 200, project_data)
        if not success:
            return False
            
        project_id = response['id']
        self.created_ids['projects'].append(project_id)
        
        # Add resources with known values
        update_data = {
            "resources": [
                {
                    "skill_name": "Senior Developer",
                    "technology": "Full Stack",
                    "proficiency_level": "Senior", 
                    "avg_monthly_salary": 10000,  # $10,000/month
                    "man_months": 2.0,            # 2 months = $20,000 base
                    "is_onsite": False,
                    "per_diem_monthly": 0,
                    "accommodation_monthly": 0,
                    "flight_cost_per_trip": 0,
                    "num_trips": 0,
                    "visa_cost": 0,
                    "insurance_cost": 0,
                    "local_conveyance_monthly": 0,
                    "misc_cost": 0
                },
                {
                    "skill_name": "Junior Developer",
                    "technology": "Frontend",
                    "proficiency_level": "Junior",
                    "avg_monthly_salary": 5000,   # $5,000/month 
                    "man_months": 3.0,            # 3 months = $15,000 base
                    "is_onsite": True,            # With logistics costs
                    "per_diem_monthly": 1000,     # $1000 * 3 months = $3000
                    "accommodation_monthly": 1500, # $1500 * 3 months = $4500
                    "flight_cost_per_trip": 2000, # $2000 * 2 trips = $4000
                    "num_trips": 2,
                    "visa_cost": 500,             # $500
                    "insurance_cost": 300,        # $300
                    "local_conveyance_monthly": 500, # $500 * 3 months = $1500
                    "misc_cost": 200              # $200
                }
            ]
        }
        
        # Expected calculation:
        # Resource 1: 10000 * 2 = 20000
        # Resource 2: (5000 * 3) + (1000+1500+500)*3 + (2000*2) + 500 + 300 + 200 = 15000 + 9000 + 4000 + 1000 = 29000
        # Total base cost: 20000 + 29000 = 49000
        # With 20% overhead: 49000 * 1.2 = 58800  
        # With 15% profit: 58800 * 1.15 = 67620
        
        success, _ = self.run_test("Update Project with Test Resources", "PUT", f"projects/{project_id}", 200, update_data)
        
        if success:
            # Verify the calculation by getting the project
            success, project = self.run_test("Get Updated Project", "GET", f"projects/{project_id}", 200)
            if success:
                print("\n📊 CALCULATION VERIFICATION:")
                print(f"   Expected Base Cost: $49,000")
                print(f"   Expected Cost + Overhead (20%): $58,800")  
                print(f"   Expected Selling Price (15% profit): $67,620")
                print("   ✅ Manual verification required - check if frontend shows correct values")
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete projects first (they may reference skills/rates)
        for project_id in self.created_ids['projects']:
            self.run_test(f"Cleanup Project", "DELETE", f"projects/{project_id}", 200)
            
        # Delete rates
        for rate_id in self.created_ids['rates']:
            self.run_test(f"Cleanup Rate", "DELETE", f"proficiency-rates/{rate_id}", 200)
            
        # Delete skills  
        for skill_id in self.created_ids['skills']:
            self.run_test(f"Cleanup Skill", "DELETE", f"skills/{skill_id}", 200)

def main():
    print("🚀 Starting Project Estimator API Testing...")
    print(f"Testing against: https://wave-grid-dev.preview.emergentagent.com/api")
    
    tester = ProjectEstimatorAPITester()
    
    try:
        # Test all CRUD operations
        tester.test_skills_crud()
        tester.test_proficiency_rates_crud() 
        tester.test_projects_crud()
        tester.test_calculation_accuracy()
        
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error during testing: {str(e)}")
    finally:
        # Always cleanup
        tester.cleanup()
    
    # Print final results
    print("\n" + "="*50)
    print("📊 FINAL TEST RESULTS")
    print("="*50)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())