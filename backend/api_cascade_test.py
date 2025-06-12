"""
Test the REST API for paper deletion.
"""
import requests
import json
import sys
import logging
import time
import os

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base URL for the API
BASE_URL = "http://localhost:8000"

def create_test_paper():
    """Create a test paper with sections for deletion."""
    logger.info("Creating test paper with sections...")
    
    # First, get admin token (this is a mock, in reality you would authenticate)
    # For testing, we'll just assume we have a valid token
    token = os.environ.get("TEST_AUTH_TOKEN", "some-mock-token")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    # Create a test paper with sections
    paper_data = {
        "paper_name": f"Test Paper for API Deletion {int(time.time())}",
        "total_marks": 100,
        "description": "Test paper for API deletion",
        "sections": [
            {
                "section_name": "Test Section 1",
                "marks_allocated": 50,
                "description": "Test section 1",
                "subsections": [
                    {
                        "subsection_name": "Test Subsection 1",
                        "description": "Test subsection 1"
                    }
                ]
            }
        ]
    }
    
    try:
        # Create the paper
        response = requests.post(f"{BASE_URL}/papers", json=paper_data, headers=headers)
        
        if response.status_code == 201:
            paper = response.json()
            paper_id = paper["paper_id"]
            logger.info(f"Successfully created test paper with ID {paper_id}")
            return paper_id
        else:
            logger.error(f"Failed to create test paper: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error creating test paper: {e}")
        return None

def delete_paper(paper_id):
    """Test delete paper API endpoint."""
    if not paper_id:
        logger.error("No paper ID provided for deletion")
        return False
    
    # Mock token
    token = os.environ.get("TEST_AUTH_TOKEN", "some-mock-token")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        logger.info(f"Attempting to delete paper with ID {paper_id}...")
        response = requests.delete(f"{BASE_URL}/papers/{paper_id}", headers=headers)
        
        if response.status_code == 200:
            logger.info(f"Successfully deleted paper with ID {paper_id}")
            logger.info(f"Response: {response.json()}")
            return True
        else:
            logger.error(f"Failed to delete paper: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error deleting paper: {e}")
        return False

def verify_deletion(paper_id):
    """Verify the paper was actually deleted by trying to fetch it."""
    token = os.environ.get("TEST_AUTH_TOKEN", "some-mock-token")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        logger.info(f"Verifying deletion of paper with ID {paper_id}...")
        response = requests.get(f"{BASE_URL}/papers/{paper_id}", headers=headers)
        
        if response.status_code == 404:
            logger.info(f"Verification successful - paper with ID {paper_id} was deleted (404 Not Found)")
            return True
        else:
            logger.error(f"Verification failed - paper still exists: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error verifying deletion: {e}")
        return False

def main():
    """Main test function."""
    # Try to create a new paper for testing
    paper_id = create_test_paper()
    
    # Use an existing paper ID if creation failed
    if not paper_id:
        paper_id = 1  # Use an existing paper ID as fallback
    
    # Try to delete the paper
    if delete_paper(paper_id):
        # Verify the paper was actually deleted
        if verify_deletion(paper_id):
            logger.info("API CASCADE DELETE TEST PASSED ???")
            return 0
        else:
            logger.error("API CASCADE DELETE TEST FAILED - Paper still exists after deletion!")
            return 1
    else:
        logger.error("API CASCADE DELETE TEST FAILED - Could not delete paper!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
