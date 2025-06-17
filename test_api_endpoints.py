
import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:5000"  # Adjust to your backend URL
AUTH_TOKEN = None  # Will be populated from auth_token.json if available

def load_auth_token():
    global AUTH_TOKEN
    try:
        with open("auth_token.json", "r") as f:
            data = json.load(f)
            AUTH_TOKEN = data.get("token")
        if AUTH_TOKEN:
            print("✅ Loaded authentication token from auth_token.json")
        else:
            print("⚠️ No token found in auth_token.json")
    except:
        print("⚠️ Could not load auth_token.json, proceeding without authentication")

def get_headers():
    if AUTH_TOKEN:
        return {"Authorization": f"Bearer {AUTH_TOKEN}"}
    return {}

def test_create_template():
    print("Testing template creation...")
    
    template_data = {
        "template_name": "Test Template",
        "test_type": "Practice",
        "is_adaptive": False,
        "sections": [
            {
                "paper_id": 1,  # Adjust to a valid paper_id
                "section_id": 1,  # This should map to section_id_ref
                "question_count": 5
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/tests/templates",
            json=template_data,
            headers=get_headers()
        )
        
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("✅ Template created successfully")
            print(response.json())
            return response.json()
        else:
            print(f"❌ Error creating template: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return None

def test_start_test(template_id=None):
    if not template_id:
        print("No template ID provided, cannot start test")
        return None
    
    print(f"Testing test start with template ID {template_id}...")
    
    test_data = {
        "test_template_id": template_id,
        "duration_minutes": 30,
        "is_adaptive": False
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/tests/start",
            json=test_data,
            headers=get_headers()
        )
        
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("✅ Test started successfully")
            print(json.dumps(response.json(), indent=2))
            return response.json()
        else:
            print(f"❌ Error starting test: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return None

if __name__ == "__main__":
    load_auth_token()
    
    command = sys.argv[1] if len(sys.argv) > 1 else None
    
    if command == "template":
        test_create_template()
    elif command == "start":
        template_id = int(sys.argv[2]) if len(sys.argv) > 2 else None
        test_start_test(template_id)
    else:
        print("Available commands:")
        print("  python test_api.py template    - Test template creation")
        print("  python test_api.py start <id>  - Test starting a test with template ID")
