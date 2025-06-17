"""
Script to test the paper management API endpoints with proper authentication.
This script tests:
1. Getting papers list
2. Creating a paper
3. Updating a paper
4. Activating/deactivating a paper
5. Deleting a paper

It uses the authentication token from auth_token.json.
"""
import requests
import json
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define API base URL
BASE_URL = "http://localhost:8000"

def load_auth_token():
    """Load the authentication token from auth_token.json file."""
    try:
        with open("auth_token.json", "r") as f:
            token_data = json.load(f)
            return token_data.get('access_token')
    except Exception as e:
        logger.error(f"Failed to load token from auth_token.json: {str(e)}")
        return None

def get_headers(token):
    """Create headers with authentication token."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_get_papers(token):
    """Test getting the list of papers."""
    logger.info("Testing GET /api/papers/ endpoint...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/papers/",
            headers=get_headers(token)
        )
        
        if response.status_code == 200:
            data = response.json()
            papers_count = len(data.get('items', []))
            logger.info(f"✓ Successfully retrieved {papers_count} papers")
            return True, data
        else:
            logger.error(f"✗ Failed to get papers: Status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False, None
    except Exception as e:
        logger.error(f"✗ Error getting papers: {str(e)}")
        return False, None

def test_create_paper(token):
    """Test creating a new paper."""
    logger.info("Testing POST /api/papers/ endpoint...")
    
    # Create a test paper with timestamp to ensure uniqueness
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    paper_data = {
        "paper_name": f"Test Paper {timestamp}",
        "total_marks": 100,
        "description": "This is a test paper created by the API test script",
        "sections": [
            {
                "section_name": "Test Section 1",
                "marks_allocated": 50,
                "description": "Test section description",
                "subsections": [
                    {
                        "subsection_name": "Test Subsection 1",
                        "description": "Test subsection description"
                    }
                ]
            },
            {
                "section_name": "Test Section 2",
                "marks_allocated": 50,
                "description": "Another test section",
                "subsections": []
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/papers/",
            headers=get_headers(token),
            json=paper_data
        )
        
        if response.status_code == 200:
            data = response.json()
            paper_id = data.get('paper_id')
            logger.info(f"✓ Successfully created paper with ID: {paper_id}")
            return True, data
        else:
            logger.error(f"✗ Failed to create paper: Status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False, None
    except Exception as e:
        logger.error(f"✗ Error creating paper: {str(e)}")
        return False, None

def test_update_paper(token, paper_id):
    """Test updating a paper."""
    logger.info(f"Testing PUT /api/papers/{paper_id} endpoint...")
    
    # Update data
    paper_data = {
        "paper_name": f"Updated Test Paper {paper_id}",
        "total_marks": 120,
        "description": "This paper was updated by the test script",
        "sections": []  # We'll keep it simple for the test
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/api/papers/{paper_id}/",
            headers=get_headers(token),
            json=paper_data
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✓ Successfully updated paper with ID: {paper_id}")
            return True, data
        else:
            logger.error(f"✗ Failed to update paper: Status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False, None
    except Exception as e:
        logger.error(f"✗ Error updating paper: {str(e)}")
        return False, None

def test_activate_deactivate_paper(token, paper_id):
    """Test activating and deactivating a paper."""
    # First deactivate
    logger.info(f"Testing POST /api/papers/{paper_id}/deactivate/ endpoint...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/papers/{paper_id}/deactivate/",
            headers=get_headers(token)
        )
        
        if response.status_code == 200:
            logger.info(f"✓ Successfully deactivated paper with ID: {paper_id}")
        else:
            logger.error(f"✗ Failed to deactivate paper: Status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"✗ Error deactivating paper: {str(e)}")
        return False
    
    # Then activate
    logger.info(f"Testing POST /api/papers/{paper_id}/activate/ endpoint...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/papers/{paper_id}/activate/",
            headers=get_headers(token)
        )
        
        if response.status_code == 200:
            logger.info(f"✓ Successfully activated paper with ID: {paper_id}")
            return True
        else:
            logger.error(f"✗ Failed to activate paper: Status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"✗ Error activating paper: {str(e)}")
        return False

def test_delete_paper(token, paper_id):
    """Test deleting a paper."""
    logger.info(f"Testing DELETE /api/papers/{paper_id} endpoint...")
    
    try:
        response = requests.delete(
            f"{BASE_URL}/api/papers/{paper_id}/",
            headers=get_headers(token)
        )
        
        if response.status_code == 200:
            logger.info(f"✓ Successfully deleted paper with ID: {paper_id}")
            return True
        else:
            logger.error(f"✗ Failed to delete paper: Status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"✗ Error deleting paper: {str(e)}")
        return False

def run_all_tests():
    """Run all the tests in sequence."""
    # Load the authentication token
    token = load_auth_token()
    if not token:
        logger.error("No authentication token found. Please run get_auth_token.py first.")
        return False
    
    logger.info(f"Using token: {token[:10]}...")
    
    # Run the tests in sequence
    success, papers_data = test_get_papers(token)
    if not success:
        return False
    
    # Create a paper
    success, paper_data = test_create_paper(token)
    if not success:
        return False
    
    # Get the paper ID for subsequent tests
    paper_id = paper_data.get('paper_id')
    
    # Update the paper
    success, _ = test_update_paper(token, paper_id)
    if not success:
        return False
    
    # Activate/deactivate the paper
    success = test_activate_deactivate_paper(token, paper_id)
    if not success:
        return False
    
    # Delete the paper
    success = test_delete_paper(token, paper_id)
    if not success:
        return False
    
    logger.info("✓ All paper management API tests passed successfully!")
    return True

if __name__ == "__main__":
    logger.info("Starting paper management API tests...")
    success = run_all_tests()
    sys.exit(0 if success else 1)
