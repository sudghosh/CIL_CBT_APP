"""
A simplified practice test starter
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

# Helper function to call API with error handling
def api_call(method, endpoint, headers=None, params=None, json_data=None):
    try:
        if method.lower() == 'get':
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params)
        elif method.lower() == 'post':
            response = requests.post(f"{BASE_URL}{endpoint}", headers=headers, json=json_data)
        else:
            print(f"Unsupported method: {method}")
            return None
            
        if response.status_code >= 400:
            print(f"API Error: {response.status_code} - {response.text}")
            return None
            
        return response.json()
        
    except Exception as e:
        print(f"API call failed: {str(e)}")
        return None

# 2. Get a Paper ID
print("Step 1: Getting a paper_id")
papers = api_call('get', '/papers', headers)
if not papers or 'items' not in papers or not papers['items']:
    print("No papers found!")
    sys.exit(1)

paper_id = papers['items'][0]['paper_id']
print(f"Using paper_id: {paper_id}")

# 3. Get Questions for the Paper to find a valid section_id
print(f"Step 2: Getting questions for paper_id={paper_id}")
questions = api_call('get', '/questions', headers, {'paper_id': paper_id, 'page_size': 10})

if not questions or 'items' not in questions or not questions['items']:
    print("No questions found for this paper!")
    sys.exit(1)

# Get actual section_id from questions
section_id = questions['items'][0]['section_id']
print(f"Using section_id={section_id} from actual question data")

# Get question IDs from the section for direct test creation
question_ids = [q['question_id'] for q in questions['items'][:5]]  # Take first 5 questions
print(f"Using {len(question_ids)} question IDs: {question_ids}")

# 4. Create a test attempt directly
print("Step 3: Creating test attempt directly with known question IDs")

# Get current timestamp
current_time = datetime.utcnow().isoformat() + 'Z'

# Create a test attempt directly in API using question IDs
attempt_data = {
    "paper_id": paper_id,
    "section_id": section_id,
    "question_ids": question_ids,
    "duration_minutes": 30,
    "test_type": "Practice"
}

print(f"Request: {json.dumps(attempt_data, indent=2)}")
attempt_response = api_call('post', '/tests/direct', headers, json_data=attempt_data)

if not attempt_response:
    print("Failed to create test attempt")
    sys.exit(1)

print(f"Success! Created test attempt: {json.dumps(attempt_response, indent=2)}")
print("Test completed successfully!")
