import requests
import json
import sys

def test_delete_paper(paper_id):
    # Base URL for API
    BASE_URL = "http://localhost:8000"
    
    # First, get a valid token by logging in
    try:
        # Get a token from the backend directly
        import os
        import json
        from pathlib import Path
        
        # Check if token file exists
        token_file = Path("auth_token.json")
        if token_file.exists():
            with open(token_file, "r") as f:
                token_data = json.load(f)
                MOCK_TOKEN = token_data.get("access_token")
                print("Using cached token")
        else:
            print("No cached token found. Using default mock token.")
            # This is a mock token - in a real scenario, you'd authenticate properly
            MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX2FjdGl2ZSI6dHJ1ZSwiZXhwIjoxNzQ5ODc3NzEzfQ.YourValidSignature"
    
    except Exception as e:
        print(f"Error getting token: {str(e)}")
        MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX2FjdGl2ZSI6dHJ1ZSwiZXhwIjoxNzQ5ODc3NzEzfQ.YourValidSignature"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MOCK_TOKEN}"
    }
    
    # Make the delete request
    try:
        print(f"Attempting to delete paper {paper_id}...")
        response = requests.delete(f"{BASE_URL}/papers/{paper_id}", headers=headers)
        
        # Print the status code
        print(f"Status code: {response.status_code}")
        
        # Print the response body
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Raw response: {response.text}")
        
        if response.status_code == 200:
            print(f"✅ Successfully deleted paper {paper_id}")
            return 0
        else:
            print(f"❌ Failed to delete paper {paper_id}")
            return 1
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_delete_paper.py <paper_id>")
        sys.exit(1)
        
    paper_id = sys.argv[1]
    sys.exit(test_delete_paper(paper_id))
