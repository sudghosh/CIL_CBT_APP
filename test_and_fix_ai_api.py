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

# Set API key
def set_api_key(token, key_type, key_value):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "key_type": key_type,
        "encrypted_key": key_value,
        "description": f"Test {key_type} API key"
    }
    response = requests.post("http://localhost:8000/admin/api-keys", json=data, headers=headers)
    print(f"Set API key response: {response.status_code}")
    print(f"Response body: {response.text}")
    return response.status_code == 200

# Test the analyze trends endpoint
def test_analyze_trends(token):
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
    print(f"Response body: {response.text}")
    return response.status_code == 200

# Main
token = get_token()
if token:
    print(f"Got token: {token[:20]}...")
    
    # Set up sample API keys
    openrouter_key = "sk-or-test-123456789-test-key-this-is-a-test"
    google_key = "AIzaSyTest123456789test_key_this_is_a_test"
    a4f_key = "sk-a4f-test-123456789-test-key-this-is-a-test"
    
    print("Setting OpenRouter API key...")
    set_api_key(token, "openrouter", openrouter_key)
    
    print("Setting Google API key...")
    set_api_key(token, "google", google_key)
    
    print("Setting A4F API key...")
    set_api_key(token, "a4f", a4f_key)
    
    print("Testing analyze trends endpoint...")
    test_analyze_trends(token)
else:
    print("Failed to get authentication token")
