"""
Script to test the papers API using the authentication token.
"""
import requests
import json
import sys

def test_papers_api():
    """Test the papers API with authentication."""
    BASE_URL = "http://localhost:8000"
    
    try:
        # Load the token from auth_token.json
        with open("auth_token.json", "r") as f:
            token_data = json.load(f)
            token = token_data.get('access_token')
            
        if not token:
            print("Error: No token found in auth_token.json")
            return
            
        # Set up headers with token
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Test the papers endpoint
        print("Testing papers API endpoint...")
        response = requests.get(f"{BASE_URL}/api/papers/", headers=headers)
        
        # Print the response
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Retrieved {data.get('total', 0)} papers")
            for idx, paper in enumerate(data.get('items', [])):
                print(f"{idx+1}. Paper ID: {paper.get('paper_id')}, Name: {paper.get('paper_name')}")
        else:
            print("Error accessing papers API")
            try:
                print(f"Error: {json.dumps(response.json(), indent=2)}")
            except:
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"Error testing papers API: {str(e)}")

if __name__ == "__main__":
    test_papers_api()
