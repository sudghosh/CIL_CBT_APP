"""
Test script to verify the fixed available-count endpoint.
This script makes direct HTTP requests to test the endpoint without
requiring a frontend or browser interaction.
"""
import requests
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("available_count_test.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Base URL - adjust if your backend runs on a different port
BASE_URL = "http://localhost:8000"

def get_token():
    """
    Get a JWT token by making a direct request to the auth endpoint.
    You may need to modify this based on your actual authentication system.
    """
    try:
        # Try to read token from file if previously saved
        with open("test_token.txt", "r") as f:
            token = f.read().strip()
            if token:
                logger.info("Using token from file")
                return token
    except FileNotFoundError:
        logger.info("No saved token file found, will try to authenticate")
    
    # Replace with your actual login credentials
    login_data = {
        "username": "admin@example.com",
        "password": "admin" 
    }
    
    try:
        logger.info("Attempting to authenticate...")
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            logger.info("Authentication successful!")
            
            # Save the token to a file for future use
            with open("test_token.txt", "w") as f:
                f.write(token)
            
            return token
        else:
            logger.error(f"Authentication failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error during authentication: {e}")
        return None

def test_available_count():
    """Test the available-count endpoint with various parameters."""
    token = get_token()
    if not token:
        logger.error("No token available, cannot proceed with tests")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test cases
    test_cases = [
        {"name": "Missing paper_id", "params": {}, "expected_status": 422},
        {"name": "Paper ID only", "params": {"paper_id": 1}, "expected_status": 200},
        {"name": "Paper ID and Section ID", "params": {"paper_id": 1, "section_id": 1}, "expected_status": 200},
        {"name": "All parameters", "params": {"paper_id": 1, "section_id": 1, "subsection_id": 1}, "expected_status": 200},
        {"name": "Invalid paper ID", "params": {"paper_id": 9999}, "expected_status": 200},  # Should return count: 0
        {"name": "Invalid section ID", "params": {"paper_id": 1, "section_id": 9999}, "expected_status": 200}  # Should return count: 0
    ]
    
    results = []
    success_count = 0
    
    logger.info("\n" + "=" * 60)
    logger.info(f"TESTING AVAILABLE-COUNT ENDPOINT: {datetime.now().isoformat()}")
    logger.info("=" * 60 + "\n")
    
    for case in test_cases:
        logger.info(f"\n[TEST CASE] {case['name']}:")
        logger.info(f"Parameters: {case['params']}")
        
        # Build URL with query parameters
        endpoint = "/questions/available-count"
        query_params = "&".join([f"{key}={value}" for key, value in case['params'].items()])
        url = f"{BASE_URL}{endpoint}?{query_params}" if query_params else f"{BASE_URL}{endpoint}"
        
        try:
            response = requests.get(url, headers=headers)
            status = response.status_code
            
            logger.info(f"Status: {status} (Expected: {case['expected_status']})")
            
            if status == case['expected_status']:
                if status == 200:
                    data = response.json()
                    logger.info(f"Response data: {json.dumps(data, indent=2)}")
                    count = data.get("count", None)
                    if count is not None:
                        logger.info(f"✅ SUCCESS: Got count = {count}")
                        success_count += 1
                    else:
                        logger.error("❌ FAILURE: Response missing 'count' field")
                else:
                    logger.info(f"✅ SUCCESS: Got expected error status {status}")
                    success_count += 1
            else:
                logger.error(f"❌ FAILURE: Status {status} does not match expected {case['expected_status']}")
                logger.error(f"Response: {response.text}")
            
            results.append({
                "case": case['name'],
                "url": url,
                "expected_status": case['expected_status'],
                "actual_status": status,
                "response": response.text if status != 200 else response.json(),
                "success": status == case['expected_status']
            })
            
        except Exception as e:
            logger.error(f"❌ EXCEPTION: {str(e)}")
            results.append({
                "case": case['name'],
                "url": url,
                "error": str(e)
            })
    
    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info(f"TEST SUMMARY: {success_count}/{len(test_cases)} tests passed")
    logger.info("=" * 60)
    
    return results

if __name__ == "__main__":
    test_available_count()
