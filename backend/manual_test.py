"""
Simplified test script to test the available-count endpoint with a manually provided token.
"""
import requests
import json
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Base URL
BASE_URL = "http://localhost:8000"

def test_endpoint(token):
    """Test the available-count endpoint with various parameters."""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test cases covering different scenarios
    test_cases = [
        {"name": "Paper ID only", "params": {"paper_id": 1}},
        {"name": "Paper ID and Section ID", "params": {"paper_id": 1, "section_id": 1}},
        {"name": "Invalid section ID", "params": {"paper_id": 1, "section_id": 9999}}
    ]
    
    logger.info("\nTesting the available-count endpoint...\n")
    
    for case in test_cases:
        logger.info(f"[TEST CASE] {case['name']}:")
        
        # Build URL
        endpoint = "/questions/available-count"
        query_params = "&".join([f"{key}={value}" for key, value in case['params'].items()])
        url = f"{BASE_URL}{endpoint}?{query_params}"
        
        try:
            response = requests.get(url, headers=headers)
            status = response.status_code
            
            if status == 200:
                data = response.json()
                logger.info(f"✅ SUCCESS (Status {status})")
                logger.info(f"Response: {json.dumps(data, indent=2)}")
                count = data.get("count", None)
                if count is not None:
                    logger.info(f"Available question count: {count}")
                else:
                    logger.warning(f"Response missing 'count' field")
            else:
                logger.error(f"❌ ERROR (Status {status})")
                logger.error(f"Response: {response.text}")
            
        except Exception as e:
            logger.error(f"❌ Exception: {str(e)}")
        
        logger.info("")  # Add a blank line between test cases

def main():
    # Check if token is provided
    if len(sys.argv) < 2:
        logger.info("Usage: python manual_test.py <auth-token>")
        logger.info("\nTo get an authentication token:")
        logger.info("1. Log in to the application in your browser")
        logger.info("2. Open browser developer tools (F12)")
        logger.info("3. Go to Application tab > Local Storage")
        logger.info("4. Find and copy your auth token")
        return
    
    token = sys.argv[1]
    test_endpoint(token)

if __name__ == "__main__":
    main()
