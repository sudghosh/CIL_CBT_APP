"""
Script to test the papers API using direct authentication.
"""
import requests
import json
import sys

def test_papers_api():
    """Test the papers API with authentication."""
    BASE_URL = "http://localhost:8000"
    
    try:
        # Authenticate directly
        print("🔐 Authenticating...")
        auth_response = requests.post(f"{BASE_URL}/auth/dev-login", 
                                    json={"email": "test@example.com", "password": "test123"})
        
        if auth_response.status_code == 200:
            token = auth_response.json()['access_token']
            print("✅ Authentication successful")
        else:
            print(f"❌ Authentication failed: {auth_response.status_code}")
            return
            
        # Set up headers with token
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Test the papers endpoint
        print("Testing papers API endpoint...")
        
        # Try multiple possible endpoints
        endpoints_to_try = [
            "/papers/",
            "/papers", 
            "/admin/papers/",
            "/admin/papers",
            "/api/papers/",
            "/api/papers"
        ]
        
        for endpoint in endpoints_to_try:
            print(f"Trying endpoint: {endpoint}")
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            print(f"Status code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                papers_count = len(data.get('items', [])) if 'items' in data else len(data) if isinstance(data, list) else 0
                print(f"✅ Success! Retrieved {papers_count} papers from {endpoint}")
                
                # Show first few papers
                papers = data.get('items', []) if 'items' in data else data if isinstance(data, list) else []
                for idx, paper in enumerate(papers[:3]):
                    print(f"  {idx+1}. Paper ID: {paper.get('paper_id')}, Name: {paper.get('paper_name')}")
                return endpoint, data
            else:
                print(f"  Failed: {response.status_code}")
                
        print("❌ No working papers endpoint found")
                
    except Exception as e:
        print(f"Error testing papers API: {str(e)}")

if __name__ == "__main__":
    test_papers_api()
