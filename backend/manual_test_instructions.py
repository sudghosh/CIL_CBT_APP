"""
Simple script to test the backend API manually without authentication.

You should run this script while logged in on your web browser, then copy
the authentication token from your browser's local storage or cookies.
This will allow us to test the API endpoint with proper authentication.
"""

def main():
    print("===============================================")
    print("MANUAL TESTING INSTRUCTIONS")
    print("===============================================")
    print("1. Log in to the application in your web browser")
    print("2. Open the browser's developer tools (F12)")
    print("3. Go to the 'Application' tab")
    print("4. Look for 'Local Storage' or 'Session Storage'")
    print("5. Find your authentication token")
    print("6. Make a manual API request to test the endpoint:")
    print()
    print("API Endpoint: http://localhost:8000/questions/available-count?paper_id=1")
    print("API Endpoint (with section): http://localhost:8000/questions/available-count?paper_id=1&section_id=1")
    print()
    print("You can use tools like:")
    print("- The browser's fetch API in the console")
    print("- Postman")
    print("- curl in a terminal")
    print("- Other REST client tools")
    print()
    print("Example curl command:")
    print('curl -X GET "http://localhost:8000/questions/available-count?paper_id=1" -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "accept: application/json"')
    print()
    print("If the endpoint returns a JSON response with a 'count' field instead of a 422 error, the fix was successful!")

if __name__ == "__main__":
    main()
