"""
Test script to diagnose issues with section_id 4 in paper_id 1.
"""
import requests
import json
import sys
from datetime import datetime

# Configuration
API_URL = "http://localhost:8000"

# Get token from command line argument or use a default one
if len(sys.argv) > 1:
    TOKEN = sys.argv[1]
    print(f"Using token provided via command line")
else:
    # Read token from local storage JavaScript file
    try:
        with open("../frontend/token.js", "r") as f:
            js_content = f.read()
            # Extract token from JavaScript file
            TOKEN = js_content.split("'")[1]  # Very simple extraction
    except:
        print("ERROR: Unable to read token from frontend/token.js")
        TOKEN = input("Please enter a valid token: ")

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

def check_section_exists(paper_id, section_id):
    """Check if a section exists in the database"""
    print(f"\n=== Checking if section {section_id} exists in paper {paper_id} ===")
    
    # First check if the paper exists
    response = requests.get(f"{API_URL}/papers/{paper_id}", headers=HEADERS)
    
    if response.status_code != 200:
        print(f"ERROR: Paper {paper_id} does not exist. Status code: {response.status_code}")
        print(f"Response: {response.text}")
        return False
        
    print(f"Paper {paper_id} exists")
    
    # Check for sections in that paper
    paper_data = response.json()
    if 'sections' not in paper_data:
        print(f"ERROR: Paper {paper_id} has no sections field")
        return False
    
    for section in paper_data.get('sections', []):
        if section.get('section_id') == section_id:
            print(f"Found section {section_id} in paper {paper_id}: {section.get('section_name', 'Unknown')}")
            return True
    
    print(f"ERROR: Section {section_id} not found in paper {paper_id}")
    print(f"Available sections: {[s.get('section_id') for s in paper_data.get('sections', [])]}")
    return False

def test_questions_endpoint(paper_id, section_id):
    """Test the /questions endpoint with the given paper and section IDs"""
    print(f"\n=== Testing /questions endpoint with paper_id={paper_id}, section_id={section_id} ===")
    
    # Try with the large page size that causes the 422 error
    response = requests.get(
        f"{API_URL}/questions/", 
        params={"paper_id": paper_id, "section_id": section_id, "page": 1, "page_size": 1000},
        headers=HEADERS
    )
    
    print(f"Status code: {response.status_code}")
    if response.status_code != 200:
        print(f"ERROR: Request failed with status {response.status_code}")
        print(f"Response: {response.text}")
    else:
        data = response.json()
        print(f"Total questions found: {data.get('total', 0)}")

    # Try with a valid page size that should work
    response = requests.get(
        f"{API_URL}/questions/", 
        params={"paper_id": paper_id, "section_id": section_id, "page": 1, "page_size": 100},
        headers=HEADERS
    )
    
    print(f"\nWith valid page size (100), status code: {response.status_code}")
    if response.status_code != 200:
        print(f"ERROR: Request still failed with status {response.status_code}")
        print(f"Response: {response.text}")
    else:
        data = response.json()
        print(f"Total questions found: {data.get('total', 0)}")
    
    return response.status_code == 200

def suggest_fixes(paper_id, section_id, section_exists):
    """Suggest potential fixes based on diagnostics"""
    print("\n=== Suggested Fixes ===")
    
    if not section_exists:
        print("1. The section does not exist in the paper. Possible solutions:")
        print("   - Fix your frontend to not allow selecting this non-existent section")
        print("   - Add this missing section to the paper")
        print("   - Update the frontend to handle 404 errors gracefully")
    else:
        print(f"1. The section {section_id} exists but there might be no valid questions:")
        print("   - Check if any questions have expired (valid_until < today)")
        print("   - Add some questions to this section")
        print("   - Update frontend to show a clear 'No questions available' message")
    
    print("\n2. Backend validation issues:")
    print("   - Update the backend to return a 404 instead of a 422 for non-existent sections")
    print("   - Add better logging to capture exact validation failures")
    
    print("\n3. Frontend improvements:")
    print("   - Update API service to use a valid page_size (<=100)")
    print("   - Improve error handling by showing specific messages for different error types")
    print("   - Add retry logic with decreasing page_size on 422 errors")

def main():
    """Main test function"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"=== Section Missing Test - {timestamp} ===")
    
    paper_id = 1
    section_id = 4
    
    # Step 1: Check if the section exists
    section_exists = check_section_exists(paper_id, section_id)
    
    # Step 2: Test the questions endpoint
    endpoint_works = test_questions_endpoint(paper_id, section_id)
    
    # Step 3: Suggest fixes
    suggest_fixes(paper_id, section_id, section_exists)
    
    print(f"\n=== Test Complete - Result: {'Success' if endpoint_works else 'Failed'} ===")

if __name__ == "__main__":
    main()
