import requests
import json
from datetime import datetime
import sys
import os

# Get auth token from local file or environment (you might need to modify this for your setup)
def get_auth_token():
    token = None
    
    # Try to get from environment variable first
    token = os.environ.get('TEST_AUTH_TOKEN')
    
    # If not in environment, try from file (replace with path if needed)
    if not token:
        token_file = os.path.join(os.path.dirname(__file__), 'frontend', 'token.js')
        print(f"Looking for token file at: {token_file}")
        if os.path.exists(token_file):
            with open(token_file, 'r') as f:
                token_content = f.read()
                # Try to extract token from the JavaScript file
                print(f"Token file contents (first 50 chars): {token_content[:50]}...")
                if "TOKEN = '" in token_content:
                    token = token_content.split("TOKEN = '")[1].split("'")[0]
                elif 'TOKEN="' in token_content:
                    token = token_content.split('TOKEN="')[1].split('"')[0]
                elif "TOKEN=" in token_content:
                    token = token_content.split("TOKEN=")[1].split('"')[1]
    
    return token

# API Base URL (modify if needed)
BASE_URL = 'http://localhost:8000'

# Get token
token = get_auth_token()
if not token:
    print("ERROR: No auth token found. Please set TEST_AUTH_TOKEN environment variable or create frontend/token.js")
    sys.exit(1)

print(f"Using token: {token[:20]}...{token[-10:]}")

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

print("Running template creation and test start verification...")
print(f"Using API base URL: {BASE_URL}")

# Step 1: Get available papers
print("\n1. Getting available papers...")
papers_response = requests.get(f"{BASE_URL}/papers", headers=headers)
papers_response.raise_for_status()
papers = papers_response.json().get('items', [])

if not papers:
    print("No papers found. Cannot continue test.")
    sys.exit(1)

print(f"Found {len(papers)} papers")
paper_id = papers[0]['paper_id']
print(f"Using paper_id: {paper_id}")

# Step 2: Get sections for the selected paper
print("\n2. Getting sections for paper...")
sections_response = requests.get(f"{BASE_URL}/sections?paper_id={paper_id}", headers=headers)
sections_response.raise_for_status()
sections = sections_response.json().get('items', [])

if not sections:
    print("No sections found for this paper. Cannot continue test.")
    sys.exit(1)

print(f"Found {len(sections)} sections")
section_id = sections[0]['section_id']
print(f"Using section_id: {section_id}")

# Step 3: Check available question count
print("\n3. Checking available questions...")
questions_response = requests.get(
    f"{BASE_URL}/questions", 
    headers=headers,
    params={'paper_id': paper_id, 'section_id': section_id, 'page_size': 100}
)
questions_response.raise_for_status()
questions = questions_response.json().get('items', [])
print(f"Found {len(questions)} available questions")

question_count = min(len(questions), 10)  # Use at most 10 questions
if question_count == 0:
    print("No questions available for this section. Cannot continue test.")
    sys.exit(1)

# Step 4: Create template with modern format (sections array)
print("\n4. Creating template with modern format (sections array)...")
# Fetch existing questions to know what section_ids are actually valid
print("\nFetching existing questions to verify section_ids...")
existing_questions = requests.get(
    f"{BASE_URL}/questions", 
    headers=headers,
    params={'paper_id': paper_id, 'page_size': 5}
).json().get('items', [])

if existing_questions:
    # Use the actual section_id from questions
    actual_section_id = existing_questions[0]['section_id']
    print(f"Using section_id={actual_section_id} from actual question data")
else:
    actual_section_id = section_id
    print(f"No questions found, using section_id={actual_section_id} from sections API")

modern_template_data = {
    "template_name": f"Test Template (Modern) {datetime.now().strftime('%H:%M:%S')}",
    "test_type": "Practice",
    "sections": [
        {
            "paper_id": paper_id,
            "section_id": actual_section_id,
            "question_count": question_count
        }
    ]
}

print(f"Request payload: {json.dumps(modern_template_data, indent=2)}")
modern_template_response = requests.post(
    f"{BASE_URL}/tests/templates",
    headers=headers,
    json=modern_template_data
)

print(f"Response status: {modern_template_response.status_code}")
print(f"Response body: {modern_template_response.text}")
modern_template_response.raise_for_status()
modern_template = modern_template_response.json()
modern_template_id = modern_template.get('template_id')

print(f"Created template with ID: {modern_template_id}")
print(f"Template sections: {json.dumps(modern_template.get('sections', []), indent=2)}")

# Check what section_id is being used in the returned template
template_section = modern_template.get('sections', [])[0] if modern_template.get('sections', []) else {}
returned_section_id = template_section.get('section_id')
print(f"Returned section_id in template: {returned_section_id}")

# After template creation, sleep briefly to allow any database commits to complete
print("Waiting 1 second for database operations to complete...")
import time
time.sleep(1)

# A key debugging step - directly query the questions that would match this template's first section
print("\nQuerying questions that would match this template's section...")
section_questions = requests.get(
    f"{BASE_URL}/questions", 
    headers=headers,
    params={
        'paper_id': template_section.get('paper_id'),
        'section_id': actual_section_id,  # Important: Use the ACTUAL section_id we got from existing questions
        'page_size': 5
    }
).json().get('items', [])

print(f"Found {len(section_questions)} matching questions for paper_id={template_section.get('paper_id')}, section_id={actual_section_id}")
if section_questions:
    print(f"First matching question: ID={section_questions[0]['question_id']}, Section ID={section_questions[0]['section_id']}")

# Step 5: Start test with the modern format template
print("\n5. Starting test with modern format template...")
modern_test_data = {
    "test_template_id": modern_template_id,
    "duration_minutes": 30
}

modern_test_response = requests.post(
    f"{BASE_URL}/tests/start",
    headers=headers,
    json=modern_test_data
)

print(f"Response status: {modern_test_response.status_code}")
print(f"Response body: {modern_test_response.text}")
modern_test_response.raise_for_status()
modern_test = modern_test_response.json()
modern_attempt_id = modern_test.get('attempt_id')

print(f"Started test with attempt ID: {modern_attempt_id}")

# Step 6: Create template with legacy format (direct paper_id, section_id)
print("\n6. Creating template with legacy format...")
legacy_template_data = {
    "template_name": f"Test Template (Legacy) {datetime.now().strftime('%H:%M:%S')}",
    "test_type": "Practice",
    "paper_id": paper_id,
    "section_id": section_id,
    "question_count": question_count
}

print(f"Request payload: {json.dumps(legacy_template_data, indent=2)}")
legacy_template_response = requests.post(
    f"{BASE_URL}/tests/templates",
    headers=headers,
    json=legacy_template_data
)

print(f"Response status: {legacy_template_response.status_code}")
print(f"Response body: {legacy_template_response.text}")
legacy_template_response.raise_for_status()
legacy_template = legacy_template_response.json()
legacy_template_id = legacy_template.get('template_id')

print(f"Created legacy template with ID: {legacy_template_id}")

# Step 7: Start test with the legacy format template
print("\n7. Starting test with legacy format template...")
legacy_test_data = {
    "test_template_id": legacy_template_id,
    "duration_minutes": 30
}

legacy_test_response = requests.post(
    f"{BASE_URL}/tests/start",
    headers=headers,
    json=legacy_test_data
)

print(f"Response status: {legacy_test_response.status_code}")
print(f"Response body: {legacy_test_response.text}")
legacy_test_response.raise_for_status()
legacy_test = legacy_test_response.json()
legacy_attempt_id = legacy_test.get('attempt_id')

print(f"Started test with attempt ID: {legacy_attempt_id}")

print("\nTest completed successfully!")
print("Both template creation methods (modern and legacy) worked correctly.")
print("Both test start operations completed successfully.")
