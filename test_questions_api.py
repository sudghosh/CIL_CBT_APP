import requests
import json

# Test endpoint: /tests/questions/{attempt_id}

# Mock auth data
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6IkFkbWluIn0.8B5Y_XC9-L-I9HAgJ3-ozIYeDElzxrLxOB5lOQYYVD4"

# Base URL (adjust as needed)
base_url = "http://localhost:8000"

# Test attempt ID (adjust as needed)
attempt_id = 1  # Replace with a valid attempt ID from your database

# Set headers with token
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

try:
    # Test getting questions for an attempt
    response = requests.get(f"{base_url}/tests/questions/{attempt_id}", headers=headers)
    
    # Print response details
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response JSON: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response Text: {response.text}")
        
    if response.status_code == 500:
        print("\nERROR: The endpoint is returning a 500 Internal Server Error.")
        print("Possible reasons:")
        print("1. The attempt_id does not exist")
        print("2. The questions linked to the attempt have issues")
        print("3. There's a bug in the API endpoint when processing questions data")
        
except Exception as e:
    print(f"Error calling API: {e}")
