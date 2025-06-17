"""
Script to get a valid authentication token from the backend API.
"""
import requests
import json
from pathlib import Path
import sys

def get_token():
    """Get a valid authentication token using development login endpoint."""
    BASE_URL = "http://localhost:8000"
    
    try:
        # Use the development login endpoint specifically designed for testing
        print("Attempting to authenticate using dev login...")
        response = requests.post(f"{BASE_URL}/auth/dev-login")
        
        if response.status_code == 200:
            token_data = response.json()
            print("Authentication successful!")
            
            # Save the token for reuse
            with open("auth_token.json", "w") as f:
                json.dump(token_data, f)
                
            # Also create a token.js file for the frontend tests
            with open("frontend/token.js", "w") as f:
                f.write(f"const TOKEN = '{token_data['access_token']}';\n")
            
            print(f"Token saved to auth_token.json and frontend/token.js")
            return token_data
        else:
            print(f"Authentication failed: {response.status_code}")
            try:
                print(f"Error: {json.dumps(response.json(), indent=2)}")
            except:
                print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error during authentication: {str(e)}")
        return None

if __name__ == "__main__":
    get_token()
