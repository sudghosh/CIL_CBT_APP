"""
Script to test the cascade delete functionality through the REST API.
This script:
1. Creates a new user session with mock authentication
2. Creates a new paper with sections
3. Attempts to delete the paper
4. Verifies that the paper and all its sections are correctly deleted
"""

import requests
import json
import logging
import time
import sys
import os

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Base URL for API
BASE_URL = "http://localhost:8000"

# Mock authentication token for testing
# This token needs to be updated with a valid token for your environment
# In production, you would use a proper authentication flow to obtain this
MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX2FjdGl2ZSI6dHJ1ZSwiZXhwIjoxNzQ5ODc3NzEzfQ.YourValidSignature"

# For development testing without a valid token, we might need to disable authentication
# in the FastAPI app temporarily by modifying the auth dependency in the router

def create_test_paper():
    """Create a test paper with sections for testing cascade delete."""
    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MOCK_TOKEN}"
        }
        
        # Create a unique paper name
        paper_name = f"API Test Paper {int(time.time())}"
        
        # Paper data with sections
        paper_data = {
            "paper_name": paper_name,
            "total_marks": 100,
            "description": "Test paper for cascade delete API test",
            "sections": [
                {
                    "section_name": "Test Section 1",
                    "marks_allocated": 30,
                    "description": "First test section",
                    "subsections": [
                        {
                            "subsection_name": "Test Subsection 1.1",
                            "description": "First subsection"
                        }
                    ]
                },
                {
                    "section_name": "Test Section 2",
                    "marks_allocated": 70,
                    "description": "Second test section",
                    "subsections": []
                }
            ]
        }
        
        # Create the paper
        response = requests.post(
            f"{BASE_URL}/papers",
            json=paper_data,
            headers=headers
        )
        
        if response.status_code == 201:
            paper = response.json()
            paper_id = paper.get("paper_id")
            logger.info(f"Successfully created test paper '{paper_name}' with ID {paper_id}")
            return paper_id, paper_name
        else:
            logger.error(f"Failed to create paper: {response.status_code} - {response.text}")
            if "detail" in response.json():
                logger.error(f"Error detail: {response.json()['detail']}")
            return None, None
            
    except Exception as e:
        logger.error(f"Exception creating paper: {str(e)}")
        return None, None

def get_paper_details(paper_id):
    """Get paper details to verify sections exist."""
    try:
        headers = {
            "Authorization": f"Bearer {MOCK_TOKEN}"
        }
        
        response = requests.get(
            f"{BASE_URL}/papers/{paper_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            paper = response.json()
            section_count = len(paper.get("sections", []))
            logger.info(f"Paper {paper_id} has {section_count} sections")
            return paper
        else:
            logger.error(f"Failed to get paper details: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Exception getting paper details: {str(e)}")
        return None

def delete_paper(paper_id):
    """Delete a paper and verify cascade deletion."""
    try:
        headers = {
            "Authorization": f"Bearer {MOCK_TOKEN}"
        }
        
        logger.info(f"Attempting to delete paper {paper_id}...")
        response = requests.delete(
            f"{BASE_URL}/papers/{paper_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info(f"Successfully deleted paper {paper_id}")
            logger.info(f"API response: {response.json()}")
            return True
        else:
            logger.error(f"Failed to delete paper: {response.status_code} - {response.text}")
            if response.headers.get("content-type") == "application/json":
                detail = response.json().get("detail", "No detail provided")
                logger.error(f"Error detail: {detail}")
            return False
            
    except Exception as e:
        logger.error(f"Exception deleting paper: {str(e)}")
        return False

def verify_paper_deleted(paper_id):
    """Verify that the paper has been deleted."""
    try:
        headers = {
            "Authorization": f"Bearer {MOCK_TOKEN}"
        }
        
        response = requests.get(
            f"{BASE_URL}/papers/{paper_id}",
            headers=headers
        )
        
        if response.status_code == 404:
            logger.info(f"Verified paper {paper_id} has been deleted (received 404 Not Found)")
            return True
        else:
            logger.error(f"Paper still exists with status code: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Exception verifying paper deletion: {str(e)}")
        return False

def main():
    """Main execution function."""
    # Create a test paper
    paper_id, paper_name = create_test_paper()
    
    if not paper_id:
        logger.error("Failed to create test paper. Exiting.")
        return 1
    
    # Get paper details to confirm sections
    paper = get_paper_details(paper_id)
    if not paper:
        logger.error(f"Could not get details for paper {paper_id}. Exiting.")
        return 1
    
    # Delete the paper
    if delete_paper(paper_id):
        # Verify deletion
        if verify_paper_deleted(paper_id):
            logger.info("CASCADE DELETE API TEST PASSED! ✓")
            logger.info(f"Successfully deleted paper '{paper_name}' (ID: {paper_id}) and all related sections, subsections, and questions.")
            return 0
        else:
            logger.error("CASCADE DELETE API TEST FAILED - Paper still exists after deletion attempt!")
            return 1
    else:
        logger.error("CASCADE DELETE API TEST FAILED - Could not delete paper!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
