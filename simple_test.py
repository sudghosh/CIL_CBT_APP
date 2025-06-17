"""
Simple test script for practice test functionality
"""
import requests
import json
import os
import sys
import time
from datetime import datetime

# Setup
BASE_URL = "http://localhost:8000"

# 1. Get Auth Token
def get_auth_token():
    """Get authentication token"""
    token = None
    
    # Get from environment
    token = os.environ.get('TEST_AUTH_TOKEN')
    
    # Or from token.js
    if not token:
        token_file = os.path.join("frontend", "token.js")
        if os.path.exists(token_file):
            with open(token_file, 'r') as f:
                content = f.read()
                if "TOKEN = '" in content:
                    token = content.split("TOKEN = '")[1].split("'")[0]
    
    return token

token = get_auth_token()
if not token:
    print("ERROR: No auth token found")
    sys.exit(1)

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# 2. Get a Paper ID
print("Step 1: Getting a paper_id")
papers = requests.get(f"{BASE_URL}/papers", headers=headers).json()
if not papers or 'items' not in papers or not papers['items']:
    print("No papers found!")
    sys.exit(1)

paper_id = papers['items'][0]['paper_id']
print(f"Using paper_id: {paper_id}")

# 3. Get Questions for the Paper to find a valid section_id
print(f"Step 2: Getting questions for paper_id={paper_id}")
questions = requests.get(
    f"{BASE_URL}/questions", 
    headers=headers,
    params={'paper_id': paper_id, 'page_size': 10}
).json()

if not questions or 'items' not in questions or not questions['items']:
    print("No questions found for this paper!")
    sys.exit(1)

# Get actual section_id from questions
section_id = questions['items'][0]['section_id']
print(f"Using section_id={section_id} from actual question data")

# 4. Create a test template using this section_id
template_name = f"Test Template {datetime.now().strftime('%H:%M:%S')}"
print(f"Step 3: Creating template '{template_name}'")

template_data = {
    "template_name": template_name,
    "test_type": "Practice",
    "sections": [
        {
            "paper_id": paper_id,
            "section_id": section_id,
            "question_count": 5
        }
    ]
}

print(f"Request: {json.dumps(template_data, indent=2)}")
template_response = requests.post(
    f"{BASE_URL}/tests/templates",
    headers=headers,
    json=template_data
)

print(f"Response status: {template_response.status_code}")
if template_response.status_code != 200:
    print(f"Failed to create template: {template_response.text}")
    sys.exit(1)

template = template_response.json()
template_id = template['template_id']
print(f"Created template ID: {template_id}")
print(f"Template details: {json.dumps(template, indent=2)}")

# 5. Start a test with this template
print(f"Step 4: Starting test with template_id={template_id}")

start_test_data = {
    "test_template_id": template_id,
    "duration_minutes": 30
}

start_response = requests.post(
    f"{BASE_URL}/tests/start",
    headers=headers,
    json=start_test_data
)

print(f"Response status: {start_response.status_code}")
print(f"Response body: {start_response.text}")

if start_response.status_code == 200:
    test_attempt = start_response.json()
    print(f"Success! Created test attempt ID: {test_attempt['attempt_id']}")
    print("Test completed successfully!")
else:
    print("Failed to start test")
