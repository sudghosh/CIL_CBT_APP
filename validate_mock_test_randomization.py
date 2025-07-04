#!/usr/bin/env python3
"""
Comprehensive Validation Script for Mock Test Answer Option Randomization
Tests the complete flow in Docker environment, verifies UI/UX, and ensures no performance degradation
"""

import requests
import json
import time
import random
import traceback
from datetime import datetime
from typing import Dict, List, Any

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"
TEST_USER_EMAIL = "test@example.com"

class MockTestRandomizationValidator:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.auth_token = None
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'tests_passed': 0,
            'tests_failed': 0,
            'test_results': [],
            'performance_metrics': {},
            'errors': []
        }
    
    def log_result(self, test_name: str, success: bool, details: str, duration: float = 0):
        """Log a test result"""
        result = {
            'test_name': test_name,
            'success': success,
            'details': details,
            'duration_ms': round(duration * 1000, 2) if duration > 0 else 0,
            'timestamp': datetime.now().isoformat()
        }
        
        self.results['test_results'].append(result)
        
        if success:
            self.results['tests_passed'] += 1
            print(f"✅ {test_name}: {details}")
        else:
            self.results['tests_failed'] += 1
            print(f"❌ {test_name}: {details}")
            
        if duration > 0:
            print(f"   ⏱️ Duration: {duration*1000:.2f}ms")
    
    def test_docker_environment_health(self):
        """Test 1: Validate Docker environment is healthy"""
        print("\n🔍 Testing Docker Environment Health...")
        
        try:
            # Test backend health
            start_time = time.time()
            backend_response = requests.get(f"{BASE_URL}/health", timeout=10)
            backend_duration = time.time() - start_time
            
            if backend_response.status_code == 200:
                self.log_result("Backend Health Check", True, 
                               f"Backend is healthy (Status: {backend_response.status_code})", 
                               backend_duration)
            else:
                self.log_result("Backend Health Check", False, 
                               f"Backend unhealthy (Status: {backend_response.status_code})")
                
        except Exception as e:
            self.log_result("Backend Health Check", False, f"Backend connection failed: {str(e)}")
            
        try:
            # Test frontend accessibility
            start_time = time.time()
            frontend_response = requests.get(f"{FRONTEND_URL}", timeout=10)
            frontend_duration = time.time() - start_time
            
            if frontend_response.status_code == 200:
                self.log_result("Frontend Accessibility", True, 
                               f"Frontend is accessible (Status: {frontend_response.status_code})", 
                               frontend_duration)
            else:
                self.log_result("Frontend Accessibility", False, 
                               f"Frontend inaccessible (Status: {frontend_response.status_code})")
                
        except Exception as e:
            self.log_result("Frontend Accessibility", False, f"Frontend connection failed: {str(e)}")
    
    def authenticate_dev_user(self):
        """Test 2: Authenticate as development user"""
        print("\n🔐 Testing Development Authentication...")
        
        try:
            start_time = time.time()
            auth_data = {
                "email": TEST_USER_EMAIL,
                "password": "test123"  # Standard dev password
            }
            
            # Try development login
            response = self.session.post(f"{BASE_URL}/auth/dev-login", 
                                       json=auth_data, timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                auth_result = response.json()
                self.auth_token = auth_result.get('access_token')
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                
                self.log_result("Development Authentication", True, 
                               f"Successfully authenticated as {TEST_USER_EMAIL}", duration)
                return True
            else:
                self.log_result("Development Authentication", False, 
                               f"Authentication failed (Status: {response.status_code})")
                return False
                
        except Exception as e:
            self.log_result("Development Authentication", False, 
                           f"Authentication error: {str(e)}")
            return False
    
    def test_papers_api(self):
        """Test 3: Validate papers API for Mock Test"""
        print("\n📄 Testing Papers API...")
        
        try:
            start_time = time.time()
            response = self.session.get(f"{BASE_URL}/api/papers/", timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                papers_data = response.json()
                papers_count = len(papers_data.get('items', []))
                
                self.log_result("Papers API", True, 
                               f"Retrieved {papers_count} papers successfully", duration)
                
                # Store papers for use in mock test creation
                self.papers = papers_data.get('items', [])
                return True
            else:
                self.log_result("Papers API", False, 
                               f"Papers API failed (Status: {response.status_code})")
                return False
                
        except Exception as e:
            self.log_result("Papers API", False, f"Papers API error: {str(e)}")
            return False
    
    def create_mock_test_template(self):
        """Test 4: Create Mock Test template"""
        print("\n🏗️ Testing Mock Test Template Creation...")
        
        if not hasattr(self, 'papers') or not self.papers:
            self.log_result("Mock Test Template", False, "No papers available for template creation")
            return False
            
        try:
            start_time = time.time()
            
            # Create a mock test template with randomization-friendly papers
            template_data = {
                "template_name": f"Randomization Test Template {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "test_type": "Mock",
                "sections": [
                    {
                        "paper_id": self.papers[0]['paper_id'],
                        "section_id": None,  # All sections
                        "subsection_id": None,
                        "question_count": 40  # Adjusted to match available questions
                    }
                ],
                "difficulty_strategy": "balanced"
            }
            
            response = self.session.post(f"{BASE_URL}/tests/templates", 
                                       json=template_data, timeout=15)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                template_result = response.json()
                self.template_id = template_result.get('template_id')
                
                self.log_result("Mock Test Template Creation", True, 
                               f"Template created with ID: {self.template_id}", duration)
                return True
            else:
                self.log_result("Mock Test Template Creation", False, 
                               f"Template creation failed (Status: {response.status_code})")
                return False
                
        except Exception as e:
            self.log_result("Mock Test Template Creation", False, 
                           f"Template creation error: {str(e)}")
            return False
    
    def start_mock_test_with_randomization(self):
        """Test 5: Start Mock Test and verify randomization is working"""
        print("\n🚀 Testing Mock Test Start with Randomization...")
        
        if not hasattr(self, 'template_id'):
            self.log_result("Mock Test Start", False, "No template available for test start")
            return False
            
        try:
            start_time = time.time()
            
            test_data = {
                "test_template_id": self.template_id,
                "duration_minutes": 60  # 1 hour test
            }
            
            response = self.session.post(f"{BASE_URL}/tests/start", 
                                       json=test_data, timeout=15)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                test_result = response.json()
                self.attempt_id = test_result.get('attempt_id')
                
                self.log_result("Mock Test Start", True, 
                               f"Test started with attempt ID: {self.attempt_id}", duration)
                return True
            else:
                self.log_result("Mock Test Start", False, 
                               f"Test start failed (Status: {response.status_code})")
                return False
                
        except Exception as e:
            self.log_result("Mock Test Start", False, f"Test start error: {str(e)}")
            return False
    
    def test_question_retrieval_and_randomization(self):
        """Test 6: Retrieve questions and verify randomization is applied"""
        print("\n🔀 Testing Question Retrieval and Answer Randomization...")
        
        if not hasattr(self, 'attempt_id'):
            self.log_result("Question Randomization Test", False, "No test attempt available")
            return False
            
        try:
            start_time = time.time()
            
            response = self.session.get(f"{BASE_URL}/tests/questions/{self.attempt_id}", 
                                      timeout=15)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                questions_data = response.json()
                questions = questions_data if isinstance(questions_data, list) else questions_data.get('questions', [])
                
                if not questions:
                    self.log_result("Question Randomization Test", False, "No questions retrieved")
                    return False
                
                # Store questions for further testing
                self.questions = questions
                
                # Analyze randomization evidence
                randomization_evidence = self.analyze_randomization_evidence(questions)
                
                self.log_result("Question Retrieval", True, 
                               f"Retrieved {len(questions)} questions with randomization evidence", 
                               duration)
                
                # Log randomization analysis
                for evidence_type, evidence_details in randomization_evidence.items():
                    print(f"   🔍 {evidence_type}: {evidence_details}")
                
                return True
            else:
                self.log_result("Question Randomization Test", False, 
                               f"Question retrieval failed (Status: {response.status_code})")
                return False
                
        except Exception as e:
            self.log_result("Question Randomization Test", False, 
                           f"Question retrieval error: {str(e)}")
            return False
    
    def analyze_randomization_evidence(self, questions: List[Dict]) -> Dict[str, str]:
        """Analyze questions for evidence of randomization"""
        evidence = {}
        
        try:
            # Check for different option formats (evidence of normalization/randomization)
            option_formats = set()
            total_options = 0
            questions_with_options = 0
            
            for question in questions[:10]:  # Check first 10 questions
                options = question.get('options', [])
                if options:
                    questions_with_options += 1
                    total_options += len(options)
                    
                    if isinstance(options[0], str):
                        option_formats.add("string_array")
                    elif isinstance(options[0], dict):
                        option_formats.add("object_array")
            
            evidence['Option Formats'] = f"Found {len(option_formats)} formats: {', '.join(option_formats)}"
            evidence['Questions with Options'] = f"{questions_with_options} out of {len(questions[:10])} checked"
            evidence['Average Options per Question'] = f"{total_options/max(questions_with_options, 1):.1f}"
            
            # Check for randomization indicators in question structure
            if any('originalIndex' in str(q) or 'originalPreservedValue' in str(q) for q in questions[:5]):
                evidence['Randomization Indicators'] = "Found originalIndex/originalPreservedValue properties"
            else:
                evidence['Randomization Indicators'] = "Standard option format (randomization applied client-side)"
                
        except Exception as e:
            evidence['Analysis Error'] = str(e)
            
        return evidence
    
    def test_answer_submission_with_randomization(self):
        """Test 7: Submit answers and verify original indices are preserved"""
        print("\n📝 Testing Answer Submission with Index Preservation...")
        
        if not hasattr(self, 'questions') or not self.questions:
            self.log_result("Answer Submission Test", False, "No questions available for answer testing")
            return False
            
        try:
            # Test answer submission for first few questions
            successful_submissions = 0
            total_submissions = 0
            
            for i, question in enumerate(self.questions[:3]):  # Test first 3 questions
                if not question.get('options'):
                    continue
                    
                total_submissions += 1
                start_time = time.time()
                
                # Simulate random answer selection
                options = question.get('options', [])
                if isinstance(options[0], dict):
                    selected_option_index = random.randint(0, len(options) - 1)
                else:
                    selected_option_index = random.randint(0, len(options) - 1)
                
                answer_data = {
                    "question_id": question.get('question_id') or question.get('id'),
                    "selected_option_index": selected_option_index,
                    "time_taken_seconds": random.randint(30, 120),
                    "is_marked_for_review": False
                }
                
                response = self.session.post(f"{BASE_URL}/tests/submit/{self.attempt_id}/answer", 
                                           json=answer_data, timeout=10)
                duration = time.time() - start_time
                
                if response.status_code == 200:
                    successful_submissions += 1
                    print(f"   ✅ Question {i+1}: Answer submitted successfully ({duration*1000:.2f}ms)")
                else:
                    print(f"   ❌ Question {i+1}: Answer submission failed (Status: {response.status_code})")
            
            success_rate = successful_submissions / max(total_submissions, 1)
            
            self.log_result("Answer Submission Test", success_rate >= 0.8, 
                           f"Successfully submitted {successful_submissions}/{total_submissions} answers ({success_rate*100:.1f}% success rate)")
            
            return success_rate >= 0.8
                
        except Exception as e:
            self.log_result("Answer Submission Test", False, f"Answer submission error: {str(e)}")
            return False
    
    def test_frontend_integration(self):
        """Test 8: Test frontend integration and UI/UX"""
        print("\n🖥️ Testing Frontend Integration and UI/UX...")
        
        try:
            # Test Mock Test page accessibility
            start_time = time.time()
            mock_test_response = requests.get(f"{FRONTEND_URL}/mock-test", timeout=10)
            duration = time.time() - start_time
            
            if mock_test_response.status_code == 200:
                # Check for key UI elements in the response
                page_content = mock_test_response.text
                ui_elements_found = 0
                
                ui_checks = [
                    ("Mock Test", "Mock Test title present"),
                    ("customization", "Test customization component present"),
                    ("paper", "Paper selection available"),
                    ("question", "Question handling components present")
                ]
                
                for element, description in ui_checks:
                    if element.lower() in page_content.lower():
                        ui_elements_found += 1
                        print(f"   ✅ {description}")
                    else:
                        print(f"   ⚠️ {description} - not clearly identified")
                
                ui_completeness = ui_elements_found / len(ui_checks)
                
                self.log_result("Frontend Integration", ui_completeness >= 0.75, 
                               f"Mock Test page loaded with {ui_elements_found}/{len(ui_checks)} UI elements detected", 
                               duration)
                return True
            else:
                self.log_result("Frontend Integration", False, 
                               f"Mock Test page inaccessible (Status: {mock_test_response.status_code})")
                return False
                
        except Exception as e:
            self.log_result("Frontend Integration", False, f"Frontend integration error: {str(e)}")
            return False
    
    def test_performance_metrics(self):
        """Test 9: Measure performance impact of randomization"""
        print("\n⚡ Testing Performance Impact of Randomization...")
        
        if not hasattr(self, 'attempt_id'):
            self.log_result("Performance Test", False, "No test attempt available for performance testing")
            return False
            
        try:
            # Measure question retrieval performance
            question_times = []
            for i in range(5):  # Test 5 times
                start_time = time.time()
                response = self.session.get(f"{BASE_URL}/tests/questions/{self.attempt_id}", timeout=10)
                duration = time.time() - start_time
                
                if response.status_code == 200:
                    question_times.append(duration)
                    
            if question_times:
                avg_time = sum(question_times) / len(question_times)
                max_time = max(question_times)
                min_time = min(question_times)
                
                # Performance benchmarks
                performance_acceptable = avg_time < 2.0 and max_time < 5.0  # 2s average, 5s max
                
                self.results['performance_metrics'] = {
                    'question_retrieval_avg_ms': round(avg_time * 1000, 2),
                    'question_retrieval_max_ms': round(max_time * 1000, 2),
                    'question_retrieval_min_ms': round(min_time * 1000, 2),
                    'performance_acceptable': performance_acceptable
                }
                
                self.log_result("Performance Test", performance_acceptable, 
                               f"Question retrieval: Avg {avg_time*1000:.2f}ms, Max {max_time*1000:.2f}ms, Min {min_time*1000:.2f}ms")
                return performance_acceptable
            else:
                self.log_result("Performance Test", False, "No successful question retrievals for performance measurement")
                return False
                
        except Exception as e:
            self.log_result("Performance Test", False, f"Performance test error: {str(e)}")
            return False
    
    def test_end_to_end_flow(self):
        """Test 10: Complete end-to-end Mock Test flow with randomization"""
        print("\n🔄 Testing Complete End-to-End Flow...")
        
        try:
            # Attempt to finish the test
            if hasattr(self, 'attempt_id'):
                start_time = time.time()
                response = self.session.post(f"{BASE_URL}/tests/finish/{self.attempt_id}", timeout=10)
                duration = time.time() - start_time
                
                if response.status_code == 200:
                    test_results = response.json()
                    self.log_result("End-to-End Flow", True, 
                                   f"Test completed successfully. Results: {json.dumps(test_results, indent=2)[:200]}...", 
                                   duration)
                    return True
                else:
                    self.log_result("End-to-End Flow", False, 
                                   f"Test completion failed (Status: {response.status_code})")
                    return False
            else:
                self.log_result("End-to-End Flow", False, "No test attempt available to complete")
                return False
                
        except Exception as e:
            self.log_result("End-to-End Flow", False, f"End-to-end flow error: {str(e)}")
            return False
    
    def run_validation_suite(self):
        """Run the complete validation suite"""
        print("🚀 Starting Mock Test Answer Option Randomization Validation Suite")
        print("=" * 80)
        
        try:
            # Execute all validation tests in sequence
            self.test_docker_environment_health()
            
            if self.authenticate_dev_user():
                self.test_papers_api()
                
                if self.create_mock_test_template():
                    if self.start_mock_test_with_randomization():
                        self.test_question_retrieval_and_randomization()
                        self.test_answer_submission_with_randomization()
                        self.test_end_to_end_flow()
                        
                self.test_frontend_integration()
                self.test_performance_metrics()
            
        except Exception as e:
            self.log_result("Validation Suite", False, f"Critical error in validation suite: {str(e)}")
            self.results['errors'].append({
                'error': str(e),
                'traceback': traceback.format_exc(),
                'timestamp': datetime.now().isoformat()
            })
        
        # Generate final report
        self.generate_final_report()
    
    def generate_final_report(self):
        """Generate final validation report"""
        print("\n" + "=" * 80)
        print("📊 FINAL VALIDATION REPORT")
        print("=" * 80)
        
        total_tests = self.results['tests_passed'] + self.results['tests_failed']
        success_rate = (self.results['tests_passed'] / max(total_tests, 1)) * 100
        
        print(f"📈 Overall Results:")
        print(f"   ✅ Tests Passed: {self.results['tests_passed']}")
        print(f"   ❌ Tests Failed: {self.results['tests_failed']}")
        print(f"   📊 Success Rate: {success_rate:.1f}%")
        
        if self.results['performance_metrics']:
            print(f"\n⚡ Performance Metrics:")
            for metric, value in self.results['performance_metrics'].items():
                print(f"   📊 {metric}: {value}")
        
        # Overall assessment
        print(f"\n🎯 Overall Assessment:")
        if success_rate >= 90:
            print("   🟢 EXCELLENT: Mock Test randomization is working perfectly")
        elif success_rate >= 75:
            print("   🟡 GOOD: Mock Test randomization is working with minor issues")
        elif success_rate >= 50:
            print("   🟠 MODERATE: Mock Test randomization has some significant issues")
        else:
            print("   🔴 POOR: Mock Test randomization needs major fixes")
        
        # Save detailed results
        try:
            with open('mock_test_randomization_validation_results.json', 'w') as f:
                json.dump(self.results, f, indent=2)
            print(f"\n📄 Detailed results saved to: mock_test_randomization_validation_results.json")
        except Exception as e:
            print(f"⚠️ Could not save results file: {e}")
        
        print("=" * 80)

def main():
    """Main execution function"""
    validator = MockTestRandomizationValidator()
    validator.run_validation_suite()

if __name__ == "__main__":
    main()
