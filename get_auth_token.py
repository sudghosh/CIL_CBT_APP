"""
Script to get a valid authentication token from the backend API.
"""
import requests
import json
from pathlib import Path
import sys

def get_token(email="admin@example.com", password="admin"):
    """Get a valid authentication token using direct login credentials."""
    BASE_URL = "http://localhost:8000"
    
    try:
        # For this test, we'll use a direct login endpoint if available
        # Note: This depends on your actual authentication implementation
        login_data = {
            "username": email,
            "password": password
        }
        
        print(f"Attempting to authenticate with {email}...")
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            print("Authentication successful!")
            
            # Save the token to a file for reuse
            with open("auth_token.json", "w") as f:
                json.dump(token_data, f)
            
            print(f"Token saved to auth_token.json")
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
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@example.com"
    password = sys.argv[2] if len(sys.argv) > 2 else "admin"
    
    get_token(email, password)
