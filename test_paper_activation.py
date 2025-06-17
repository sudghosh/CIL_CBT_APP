"""
Script to test the paper activation API using the authentication token.
"""
import requests
import json
import sys

def test_paper_activation():
    """Test the paper activation API with authentication."""
    BASE_URL = "http://localhost:8000"
    PAPER_ID = 1
    
    try:
        # Load the token from auth_token.json
        with open("auth_token.json", "r") as f:
            token_data = json.load(f)
            token = token_data.get('access_token')
            
        if not token:
            print("Error: No token found in auth_token.json")
            return
        
        print(f"Using token: {token[:20]}...")
            
        # Set up headers with token
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # First test the papers endpoint to verify authentication works
        print("Testing papers GET endpoint (for verification)...")
        response = requests.get(f"{BASE_URL}/api/papers/", headers=headers)
        print(f"Papers GET Status code: {response.status_code}")
        
        # Now test the paper activation endpoint
        print(f"\nTesting paper activation endpoint for paper ID {PAPER_ID}...")
        activation_response = requests.post(f"{BASE_URL}/api/papers/{PAPER_ID}/activate/", 
                                         headers=headers, 
                                         json={})
        
        print(f"Activation Status code: {activation_response.status_code}")
        if activation_response.status_code == 200:
            print("Success!")
            print(json.dumps(activation_response.json(), indent=2))
        else:
            print("Error activating paper")
            try:
                print(f"Error details: {json.dumps(activation_response.json(), indent=2)}")
            except:
                print(f"Response: {activation_response.text}")
                
    except Exception as e:
        print(f"Error testing paper activation: {str(e)}")

if __name__ == "__main__":
    test_paper_activation()
