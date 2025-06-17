import requests
import json
import time

def check_server_available():
    try:
        response = requests.get("http://localhost:8000/health")
        return response.status_code == 200
    except:
        return False

def test_subsections_endpoint():
    # Check if server is available
    if not check_server_available():
        print("Backend server is not available at localhost:8000")
        return
        
    # Get an auth token using dev-login endpoint
    token_url = "http://localhost:8000/auth/dev-login"
    token_data = {
        "email": "admin@example.com",
        "is_admin": True
    }
    
    try:
        print("Attempting to get auth token...")
        token_response = requests.post(token_url, json=token_data)
        token_response.raise_for_status()
        token = token_response.json().get("access_token")
        print(f"Successfully obtained auth token: {token[:10]}...")
        
        # Test the subsections endpoint with the /api prefix
        headers = {"Authorization": f"Bearer {token}"}
        section_id = 1  # Replace with an actual section ID
        
        url = f"http://localhost:8000/api/sections/{section_id}/subsections/"
        print(f"\nTesting endpoint: {url}")
        
        response = requests.get(url, headers=headers)
        print(f"Status code: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print("Response data:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Error response: {response.text}")
        
        # Try without the /api prefix for comparison
        url_no_prefix = f"http://localhost:8000/sections/{section_id}/subsections/"
        print(f"\nTesting endpoint without /api prefix: {url_no_prefix}")
        
        response_no_prefix = requests.get(url_no_prefix, headers=headers)
        print(f"Status code: {response_no_prefix.status_code}")
        
        if response_no_prefix.ok:
            data = response_no_prefix.json()
            print("Response data:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Error response: {response_no_prefix.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_subsections_endpoint()
