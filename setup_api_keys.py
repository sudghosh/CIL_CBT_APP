import requests
import json

# Login to get token
def get_token():
    login_data = {
        "email": "dev@example.com", 
        "role": "Admin"
    }
    response = requests.post("http://localhost:8000/auth/dev-login", json=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

# Add new API key using the admin endpoint
def add_api_key(token, key_type, api_key):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "key_type": key_type,
        "api_key": api_key,
        "description": f"Added {key_type} API key"
    }
    response = requests.post("http://localhost:8000/admin/api-keys", json=data, headers=headers)
    print(f"Add {key_type} API key response: {response.status_code}")
    print(f"Response: {response.text}")
    return response.status_code == 200 or response.status_code == 201

# Test API key status
def test_api_key_status(token):
    headers = {
        "Authorization": f"Bearer {token}"
    }
    response = requests.get("http://localhost:8000/ai/api-key-status", headers=headers)
    print(f"API key status response: {response.status_code}")
    if response.status_code == 200:
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error: {response.text}")

# Main function
def main():
    token = get_token()
    if not token:
        print("Failed to get authentication token")
        return
    
    print(f"Got token: {token[:20]}...")
    
    # First check current API key status
    print("\nChecking current API key status...")
    test_api_key_status(token)
    
    # Add API keys for all providers
    print("\nAdding OpenRouter API key...")
    add_api_key(token, "openrouter", "sk-or-v1-test-key-abc123")
    
    print("\nAdding Google API key...")
    add_api_key(token, "google", "AIzaTestGoogleKeyAbc123")
    
    print("\nAdding A4F API key...")
    add_api_key(token, "a4f", "sk-a4f-test-key-abc123")
    
    # Check API key status after adding keys
    print("\nChecking API key status after adding keys...")
    test_api_key_status(token)
    
    # Test analyze-trends endpoint
    print("\nTesting analyze-trends endpoint...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "timeframe": "month",
        "analysisType": "overall"
    }
    response = requests.post("http://localhost:8000/ai/analyze-trends", json=data, headers=headers)
    print(f"Analyze trends response: {response.status_code}")
    if response.status_code == 200:
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    main()
