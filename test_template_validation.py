"""
Test Script for Template Validation

This script tests the template creation endpoint with various valid and invalid section combinations
to verify the error handling and validation is working correctly.

Usage: python test_template_validation.py
"""

import requests
import json
import sys

# Configuration
API_URL = "http://localhost:8000"  # Update to actual API URL if different
TOKEN = None  # Will be filled in from token.js

# First, get the token
try:
    with open("token.js", "r") as f:
        token_content = f.read()
        token_line = [line for line in token_content.split("\n") if "const TOKEN" in line][0]
        TOKEN = token_line.split("=")[1].strip().strip('"').strip("';")
except Exception as e:
    print(f"Could not read token: {e}")
    print("Please create a token.js file with: const TOKEN = 'your_jwt_token';")
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_template_creation(test_data, expected_status):
    """
    Test template creation with the given data and expected status
    """
    print(f"\n======== TEST: {test_data.get('description', 'No description')} ========")
    print(f"Request data: {json.dumps(test_data['payload'], indent=2)}")
    
    try:
        response = requests.post(
            f"{API_URL}/tests/templates", 
            headers=headers,
            json=test_data["payload"],
            timeout=10
        )
        
        print(f"Status code: {response.status_code} (expected {expected_status})")
        
        if response.status_code == expected_status:
            print("✓ Status code matches expected")
        else:
            print(f"✗ Status code mismatch! Got {response.status_code}, expected {expected_status}")
        
        try:
            response_json = response.json()
            print(f"Response: {json.dumps(response_json, indent=2)}")
        except:
            print(f"Response (text): {response.text}")
            
        print("=" * 50)
        return response.status_code == expected_status
        
    except Exception as e:
        print(f"Request error: {e}")
        print("=" * 50)
        return False

# Test cases
test_cases = [
    {
        "description": "Valid - Single section with proper IDs",
        "payload": {
            "template_name": "Valid Test Template",
            "test_type": "Practice",
            "sections": [
                {
                    "paper_id": 1,
                    "section_id": 1,
                    "question_count": 10
                }
            ]
        },
        "expected_status": 200
    },
    {
        "description": "Invalid - Non-existent paper ID",
        "payload": {
            "template_name": "Invalid Paper Template",
            "test_type": "Practice",
            "sections": [
                {
                    "paper_id": 999,  # Assuming this doesn't exist
                    "section_id": 1,
                    "question_count": 5
                }
            ]
        },
        "expected_status": 404
    },
    {
        "description": "Invalid - Section doesn't belong to paper",
        "payload": {
            "template_name": "Invalid Section Template",
            "test_type": "Practice",
            "sections": [
                {
                    "paper_id": 1,
                    "section_id": 999,  # Assuming this doesn't exist
                    "question_count": 5
                }
            ]
        },
        "expected_status": 404
    },
    {
        "description": "Invalid - Duplicate sections",
        "payload": {
            "template_name": "Duplicate Sections Template",
            "test_type": "Practice",
            "sections": [
                {
                    "paper_id": 1,
                    "section_id": 1,
                    "question_count": 5
                },
                {
                    "paper_id": 1,
                    "section_id": 1,
                    "question_count": 10
                }
            ]
        },
        "expected_status": 400
    },
    {
        "description": "Invalid - No sections provided",
        "payload": {
            "template_name": "No Sections Template",
            "test_type": "Practice",
            "sections": []
        },
        "expected_status": 400
    }
]

def run_tests():
    """Run all test cases"""
    results = []
    
    print("Starting template validation tests...")
    for i, test_case in enumerate(test_cases):
        print(f"\nRunning test {i+1}/{len(test_cases)}")
        result = test_template_creation(
            {
                "description": test_case["description"],
                "payload": test_case["payload"]
            },
            test_case["expected_status"]
        )
        results.append(result)
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST RESULTS SUMMARY")
    print("=" * 50)
    passed = results.count(True)
    failed = results.count(False)
    print(f"Passed: {passed}/{len(results)} ({passed/len(results)*100:.1f}%)")
    print(f"Failed: {failed}/{len(results)} ({failed/len(results)*100:.1f}%)")
    
    # Show details of failed tests
    if failed > 0:
        print("\nFailed tests:")
        for i, (result, test) in enumerate(zip(results, test_cases)):
            if not result:
                print(f"  {i+1}. {test['description']}")
    
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
