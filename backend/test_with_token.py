"""
Simple test script to verify the available-count endpoint.
"""
import requests
import json
import sys

def test_endpoint(token):
    """Test the available-count endpoint with a provided token."""
    BASE_URL = "http://localhost:8000"
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test cases
    test_cases = [
        {"name": "Paper ID only", "params": {"paper_id": 1}},
        {"name": "Paper ID and Section ID", "params": {"paper_id": 1, "section_id": 1}},
    ]
    
    print(f"\nTesting /questions/available-count endpoint...")
    
    for case in test_cases:
        print(f"\n[Test Case] {case['name']}:")
        print(f"Parameters: {case['params']}")
        
        # Build URL
        endpoint = "/questions/available-count"
        query_params = "&".join([f"{key}={value}" for key, value in case['params'].items()])
        url = f"{BASE_URL}{endpoint}?{query_params}"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                print(f"✅ SUCCESS (Status {response.status_code})")
                print(f"Response: {json.dumps(response.json(), indent=2)}")
                print(f"The fix worked! Available question count is successfully returned.")
            else:
                print(f"❌ ERROR (Status {response.status_code})")
                print(f"Response: {response.text}")
                if response.status_code == 422:
                    print(f"The bug is still present! 422 Unprocessable Entity error.")
        except Exception as e:
            print(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_with_token.py <auth-token>")
        print("Please provide an authentication token obtained from the browser.")
        sys.exit(1)
    
    token = sys.argv[1]
    test_endpoint(token)
