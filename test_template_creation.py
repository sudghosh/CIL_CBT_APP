"""
Test Script for Practice Test Template Creation

This script tests the template creation functionality with different formats
to verify that our fixes work correctly.

Usage:
python test_template_creation.py
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
API_URL = "http://localhost:8000"
TOKEN_FILE = "token.js"

def extract_token():
    """Extract token from token.js file"""
    try:
        with open(TOKEN_FILE, 'r') as f:
            content = f.read()
            token_line = next((line for line in content.splitlines() if 'TOKEN' in line), None)
            if token_line:
                token = token_line.split('=')[1].strip().strip("';").strip('"')
                return token
            raise ValueError("No token found in token.js")
    except Exception as e:
        print(f"Error extracting token: {e}")
        sys.exit(1)

TOKEN = extract_token()

# Set up headers for API calls
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_template_creation_format(format_type, template_data):
    """Test a specific template creation format"""
    print(f"\n=== Testing {format_type} format ===")
    print(f"Request data: {json.dumps(template_data, indent=2)}")

    try:
        response = requests.post(
            f"{API_URL}/tests/templates",
            headers=headers,
            json=template_data,
            timeout=10
        )

        print(f"Status: {response.status_code}")
        
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        except:
            print(f"Raw response: {response.text}")
        
        return response.status_code == 200, response
    except Exception as e:
        print(f"Error: {e}")
        return False, None

def main():
    print("=== Template Creation Test ===")
    print(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API URL: {API_URL}")
    
    # Test 1: Modern format with sections array
    modern_data = {
        "template_name": "Test Modern Format",
        "test_type": "Practice",
        "sections": [
            {
                "paper_id": 1,
                "section_id": 1,
                "question_count": 5
            }
        ]
    }
    success1, response1 = test_template_creation_format("Modern (sections array)", modern_data)
    
    # Test 2: Legacy format with direct fields
    legacy_data = {
        "template_name": "Test Legacy Format",
        "test_type": "Practice",
        "paper_id": 1,
        "section_id": 1,
        "question_count": 5
    }
    success2, response2 = test_template_creation_format("Legacy (direct fields)", legacy_data)
    
    # Summary
    print("\n=== Summary ===")
    print(f"Modern format test: {'PASSED' if success1 else 'FAILED'}")
    print(f"Legacy format test: {'PASSED' if success2 else 'FAILED'}")
    
    template_id1 = response1.json().get('template_id') if success1 and response1 else None
    template_id2 = response2.json().get('template_id') if success2 and response2 else None
    
    print(f"Template ID from modern format: {template_id1}")
    print(f"Template ID from legacy format: {template_id2}")
    
    return success1 and success2

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
