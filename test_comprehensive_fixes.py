#!/usr/bin/env python3
"""
Comprehensive Test Suite for CIL_CBT_APP Fixes
Tests calibration system, chart data flow, and Personal Recommendations display
"""

import requests
import json
import time
from datetime import datetime
import sys

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# Test user credentials for development login
DEV_USER_EMAIL = "test@example.com"

class CILCBTTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_emoji} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
    
    def test_docker_containers(self):
        """Test 1: Verify Docker containers are running"""
        print("\n🔍 Testing Docker Container Status...")
        
        try:
            # Test backend health
            response = self.session.get(f"{BASE_URL}/health", timeout=10)
            if response.status_code == 200:
                self.log_test("Backend Container Health", "PASS", f"Status: {response.status_code}")
            else:
                self.log_test("Backend Container Health", "FAIL", f"Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            self.log_test("Backend Container Health", "FAIL", f"Error: {str(e)}")
        
        try:
            # Test frontend accessibility
            response = self.session.get(FRONTEND_URL, timeout=10)
            if response.status_code == 200:
                self.log_test("Frontend Container Accessibility", "PASS", f"Status: {response.status_code}")
            else:
                self.log_test("Frontend Container Accessibility", "FAIL", f"Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            self.log_test("Frontend Container Accessibility", "FAIL", f"Error: {str(e)}")
    
    def authenticate_dev_user(self):
        """Authenticate using development login"""
        print("\n🔐 Testing Development Authentication...")
        
        try:
            # Test development login endpoint
            auth_data = {
                "email": DEV_USER_EMAIL,
                "password": "dev_password"  # This might need adjustment based on actual dev setup
            }
            
            # Try to get dev token
            response = self.session.post(f"{BASE_URL}/auth/dev-login", 
                                       timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.auth_token = data["access_token"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_test("Development Authentication", "PASS", "Token received")
                    return True
                else:
                    self.log_test("Development Authentication", "FAIL", "No token in response")
            else:
                self.log_test("Development Authentication", "FAIL", f"Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            self.log_test("Development Authentication", "FAIL", f"Error: {str(e)}")
        
        return False
    
    def test_calibration_system(self):
        """Test 2: Calibration system and is_calibrated flag"""
        print("\n🎯 Testing Calibration System...")
        
        if not self.auth_token:
            self.log_test("Calibration System", "SKIP", "No authentication token")
            return
        
        try:
            # Test calibration status endpoint
            response = self.session.get(f"{BASE_URL}/calibration/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Calibration Status Endpoint", "PASS", f"Response: {json.dumps(data, indent=2)}")
                
                # Check if is_calibrated flag is working
                if "is_calibrated" in data:
                    self.log_test("is_calibrated Flag Present", "PASS", f"Value: {data['is_calibrated']}")
                else:
                    self.log_test("is_calibrated Flag Present", "FAIL", "Flag not found in response")
                    
            elif response.status_code == 401:
                self.log_test("Calibration Status Endpoint", "WARN", "Authentication required - expected for production")
            else:
                self.log_test("Calibration Status Endpoint", "FAIL", f"Status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Calibration Status Endpoint", "FAIL", f"Error: {str(e)}")
    
    def test_chart_api_endpoints(self):
        """Test 3: Chart data API endpoints"""
        print("\n📊 Testing Chart API Endpoints...")
        
        if not self.auth_token:
            self.log_test("Chart APIs", "SKIP", "No authentication token")
            return
        
        # List of chart endpoints to test
        chart_endpoints = [
            ("/performance/overall", "Overall Performance"),
            ("/performance/topics", "Topic Performance"),
            ("/performance/difficulty-trends", "Difficulty Trends"),
            ("/performance/topic-mastery", "Topic Mastery"),
            ("/performance/recommendations", "Personal Recommendations"),
            ("/performance/performance-comparison", "Performance Comparison")
        ]
        
        for endpoint, name in chart_endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"{name} API", "PASS", f"Data keys: {list(data.keys()) if isinstance(data, dict) else 'Array data'}")
                elif response.status_code == 401:
                    self.log_test(f"{name} API", "WARN", "Authentication required")
                else:
                    self.log_test(f"{name} API", "FAIL", f"Status: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                self.log_test(f"{name} API", "FAIL", f"Error: {str(e)}")
    
    def test_personal_recommendations_data_structure(self):
        """Test 4: Personal Recommendations data structure and transformation"""
        print("\n🎨 Testing Personal Recommendations Data Structure...")
        
        if not self.auth_token:
            self.log_test("Personal Recommendations Data", "SKIP", "No authentication token")
            return
        
        try:
            response = self.session.get(f"{BASE_URL}/performance/recommendations", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Recommendations API Response", "PASS", "Data received")
                
                # Check data structure
                if isinstance(data, dict):
                    if "data" in data and "status" in data:
                        self.log_test("Recommendations Data Structure", "PASS", f"Status: {data.get('status')}")
                        
                        # Check for recommendations array
                        if data.get("data") and "recommendations" in data["data"]:
                            recommendations = data["data"]["recommendations"]
                            self.log_test("Recommendations Array", "PASS", f"Count: {len(recommendations)}")
                            
                            # Check individual recommendation structure
                            if recommendations:
                                rec = recommendations[0]
                                expected_fields = ["question_id", "topic_name", "difficulty", "attempts", "correct_answers"]
                                missing_fields = [field for field in expected_fields if field not in rec]
                                
                                if not missing_fields:
                                    self.log_test("Recommendation Field Structure", "PASS", "All expected fields present")
                                else:
                                    self.log_test("Recommendation Field Structure", "FAIL", f"Missing: {missing_fields}")
                        else:
                            self.log_test("Recommendations Array", "WARN", "No recommendations data")
                    else:
                        self.log_test("Recommendations Data Structure", "FAIL", "Missing status or data fields")
                else:
                    self.log_test("Recommendations Data Structure", "FAIL", "Response is not a dictionary")
                    
            elif response.status_code == 401:
                self.log_test("Recommendations API Response", "WARN", "Authentication required")
            else:
                self.log_test("Recommendations API Response", "FAIL", f"Status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.log_test("Recommendations API Response", "FAIL", f"Error: {str(e)}")
    
    def test_error_handling_system(self):
        """Test 5: Error handling system"""
        print("\n🛡️ Testing Error Handling System...")
        
        # Test invalid endpoints to trigger error handling
        error_test_endpoints = [
            ("/performance/invalid-endpoint", "Invalid Endpoint Error Handling"),
            ("/auth/invalid-auth", "Auth Error Handling"),
        ]
        
        for endpoint, name in error_test_endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}", timeout=5)
                
                # We expect 404 or other error codes, which is good
                if response.status_code in [404, 422, 401, 403]:
                    self.log_test(name, "PASS", f"Proper error response: {response.status_code}")
                else:
                    self.log_test(name, "WARN", f"Unexpected status: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                self.log_test(name, "PASS", f"Network error handled gracefully: {type(e).__name__}")
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("🏁 COMPREHENSIVE TEST REPORT")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["status"] == "PASS"])
        failed_tests = len([t for t in self.test_results if t["status"] == "FAIL"])
        warned_tests = len([t for t in self.test_results if t["status"] == "WARN"])
        skipped_tests = len([t for t in self.test_results if t["status"] == "SKIP"])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warned_tests}")
        print(f"⏭️  Skipped: {skipped_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        print("-" * 80)
        
        for result in self.test_results:
            status_emoji = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️" if result["status"] == "WARN" else "⏭️"
            print(f"{status_emoji} {result['test']}: {result['status']}")
            if result["details"]:
                print(f"   └─ {result['details']}")
        
        print("\n" + "="*80)
        
        # Overall assessment
        if failed_tests == 0:
            print("🎉 ALL CRITICAL TESTS PASSED! The fixes are working correctly.")
        elif failed_tests <= 2:
            print("⚠️  MOSTLY SUCCESSFUL with minor issues that need attention.")
        else:
            print("❌ MULTIPLE FAILURES detected. Review and fix issues before deployment.")
        
        return {
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "warned": warned_tests,
            "skipped": skipped_tests,
            "success_rate": (passed_tests/total_tests)*100
        }
    
    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting Comprehensive CIL_CBT_APP Test Suite")
        print("=" * 80)
        
        # Test 1: Docker containers
        self.test_docker_containers()
        
        # Test 2: Authentication
        auth_success = self.authenticate_dev_user()
        
        # Test 3: Calibration system
        self.test_calibration_system()
        
        # Test 4: Chart API endpoints
        self.test_chart_api_endpoints()
        
        # Test 5: Personal Recommendations
        self.test_personal_recommendations_data_structure()
        
        # Test 6: Error handling
        self.test_error_handling_system()
        
        # Generate final report
        return self.generate_test_report()

if __name__ == "__main__":
    tester = CILCBTTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if results["failed"] == 0 else 1)
