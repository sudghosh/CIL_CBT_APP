"""
Direct patch for try-except blocks in tests.py

This script applies a direct patch to fix the invalid syntax in try-except blocks
in the tests.py file. It uses regex search and replace to locate and fix the problematic blocks.
"""

import os
import re
import shutil
from datetime import datetime

FILE_PATH = 'backend/src/routers/tests.py'

def create_backup(file_path):
    """Creates a backup of the original file with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{file_path}.bak_{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at: {backup_path}")
    return backup_path

def find_problematic_lines():
    """Identify lines with syntax errors"""
    try:
        with open(FILE_PATH, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()
        
        problematic = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('except ') and not re.search(r'try:', ''.join(lines[max(0, i-10):i])):
                problematic.append((i+1, stripped))
        
        return problematic
    except Exception as e:
        print(f"Error finding problematic lines: {str(e)}")
        return []

def fix_syntax_directly():
    """Apply a direct fix by removing and rebuilding problematic sections"""
    # Create backup
    backup_path = create_backup(FILE_PATH)
    
    try:
        # Read content
        with open(FILE_PATH, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        # Find problematic sections and mark for replacement
        problematic_lines = find_problematic_lines()
        if problematic_lines:
            print(f"Found {len(problematic_lines)} problematic except blocks without matching try blocks:")
            for line_num, line in problematic_lines[:5]:  # Show just the first 5
                print(f"Line {line_num}: {line}")
            if len(problematic_lines) > 5:
                print(f"... and {len(problematic_lines) - 5} more")
        
        # Remove the problematic except blocks by commenting them out
        for line_num, line in problematic_lines:
            # Find the line in the content
            line_pattern = re.escape(line)
            # Comment it out
            content = re.sub(f"^\\s*{line_pattern}$", f"    # COMMENTED OUT: {line} # Syntax fix", content, flags=re.MULTILINE)
        
        # Write fixed content
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Applied direct fix by commenting out problematic try-except blocks")
        return True
    
    except Exception as e:
        print(f"❌ Error applying direct fix: {str(e)}")
        return False

def create_test_runner_script():
    """Create a script that can help test the API endpoint once fixed"""
    script_content = """
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
"""
    
    try:
        with open('test_api_endpoints.py', 'w', encoding='utf-8') as f:
            f.write(script_content)
        print("✅ Created test_api_endpoints.py for testing the API once fixed")
        return True
    except Exception as e:
        print(f"❌ Error creating test script: {str(e)}")
        return False

if __name__ == "__main__":
    print("Applying direct syntax fix for tests.py...")
    if fix_syntax_directly():
        print("✅ Syntax fix completed")
    else:
        print("❌ Syntax fix failed")
    
    # Create helper script for testing
    create_test_runner_script()
    
    print("Done. Please try running the backend service now.")
    print("You can test the API endpoints using the test_api_endpoints.py script once the backend is running.")
