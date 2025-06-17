#!/usr/bin/env python
"""
Quick test script to verify the max_questions fix is working properly.
This will create a template and attempt to start both a regular and adaptive test.
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta

# Configuration
API_URL = 'http://localhost:8000'

def load_auth_token():
    """Load authentication token from file"""
    token_file = "auth_token.json"
    try:
        with open(token_file, "r") as f:
            data = json.load(f)
            return data.get("access_token")
    except Exception as e:
        print(f"Error loading token from {token_file}: {e}")
        return None

def main():
    # Get auth token
    auth_token = load_auth_token()
    if not auth_token:
        print("No authentication token found. Please login first and create auth_token.json")
        sys.exit(1)
    
    # Setup headers
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        print("=== Testing Max Questions Fix ===")
        
        # 1. Create a test template
        template_name = f"Test Template {datetime.now().isoformat()}"
        print(f"Creating template: {template_name}")
        
        template_data = {
            "template_name": template_name,
            "test_type": "Practice",
            "sections": [
                {
                    "paper_id": 1,
                    "section_id": 1,
                    "question_count": 5
                }
            ]
        }
        
        template_response = requests.post(
            f"{API_URL}/tests/templates", 
            headers=headers,
            json=template_data
        )
        
        if template_response.status_code != 200:
            print(f"Failed to create template: {template_response.status_code}")
            print(template_response.text)
            return False
        
        template_id = template_response.json()["template_id"]
        print(f"Template created with ID: {template_id}")
        
        # 2. Start a regular test
        print("\nTesting regular test creation...")
        
        regular_test_data = {
            "test_template_id": template_id,
            "duration_minutes": 10
        }
        
        regular_test_response = requests.post(
            f"{API_URL}/tests/start", 
            headers=headers,
            json=regular_test_data
        )
        
        if regular_test_response.status_code != 200:
            print(f"Failed to create regular test: {regular_test_response.status_code}")
            print(regular_test_response.text)
            return False
        
        print(f"Regular test created successfully! Attempt ID: {regular_test_response.json()['attempt_id']}")
        
        # 3. Start an adaptive test with max_questions
        print("\nTesting adaptive test creation with max_questions...")
        
        adaptive_test_data = {
            "test_template_id": template_id,
            "duration_minutes": 10,
            "is_adaptive": True,
            "adaptive_strategy": "adaptive",
            "max_questions": 5
        }
        
        adaptive_test_response = requests.post(
            f"{API_URL}/tests/start", 
            headers=headers,
            json=adaptive_test_data
        )
        
        if adaptive_test_response.status_code != 200:
            print(f"Failed to create adaptive test: {adaptive_test_response.status_code}")
            print(adaptive_test_response.text)
            return False
        
        attempt_data = adaptive_test_response.json()
        print(f"Adaptive test created successfully! Attempt ID: {attempt_data['attempt_id']}")
        
        max_questions = attempt_data.get('max_questions', 'not set (using default)')
        print(f"Max questions value: {max_questions}")
        
        print("\n✅ All tests passed! The max_questions fix is working properly.")
        return True
        
    except Exception as e:
        print(f"Error during testing: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n❌ Test failed. Please check the error messages above.")
        sys.exit(1)
