import requests
import json
import sys
import os

# Get authentication token using the project's existing method
def get_auth_token():
    BASE_URL = "http://localhost:8000"
    
    try:
        # For this test, we'll use the direct login endpoint
        login_data = {
            "username": "admin@example.com",
            "password": "admin"
        }
        
        print("Attempting to authenticate...")
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            print("Authentication successful!")
            return token_data.get("access_token")
        else:
            print(f"Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"Error during authentication: {str(e)}")
        return None

# Base URL - adjust if your backend runs on a different port
BASE_URL = "http://localhost:8000"

# Test cases for the available-count endpoint
test_cases = [
    {
        "name": "Paper ID only",
        "params": {"paper_id": 1}
    },
    {
        "name": "Paper ID and Section ID",
        "params": {"paper_id": 1, "section_id": 1}
    },
    {
        "name": "Paper ID, Section ID, and Subsection ID",
        "params": {"paper_id": 1, "section_id": 1, "subsection_id": 1}
    },
]

def main():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    if not token:
        print("Warning: No authentication token available. API calls may fail.")
    
    print(f"Testing /questions/available-count endpoint...")
    
    for case in test_cases:
        print(f"\n[Test Case] {case['name']}:")
        print(f"Parameters: {case['params']}")
        
        # Build URL with query parameters
        endpoint = "/questions/available-count"
        query_params = "&".join([f"{key}={value}" for key, value in case['params'].items()])
        url = f"{BASE_URL}{endpoint}?{query_params}"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                print(f"✅ Success (Status {response.status_code})")
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            else:
                print(f"❌ Error (Status {response.status_code})")
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
    
    print("\nTests completed.")

if __name__ == "__main__":
    main()
