"""
Script to test the fix for test template creation and section saving.
This script:
1. Creates a new test template with sections
2. Verifies that the sections are correctly saved to the database
3. Attempts to start a practice test using the template
"""

import requests
import json
import logging
import time
import sys
import os
import psycopg2
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Base URL for API
BASE_URL = "http://localhost:8000"

# Get authentication token from the saved file
try:
    with open("auth_token.json", "r") as f:
        auth_data = json.load(f)
        MOCK_TOKEN = auth_data.get("access_token")
        if not MOCK_TOKEN:
            logger.error("No valid token found in auth_token.json")
            sys.exit(1)
except Exception as e:
    logger.error(f"Failed to load auth token: {e}")
    logger.error("Please run get_auth_token.py first")
    sys.exit(1)

# Function to create a test template
def create_test_template():
    """Create a test template with sections"""
    # Headers for authentication
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MOCK_TOKEN}"
    }
    
    # Template data - adjust paper_id and section_id as needed for your database
    template_data = {
        "template_name": f"Test Template {datetime.now().strftime('%Y%m%d%H%M%S')}",
        "test_type": "Practice",
        "sections": [
            {
                "paper_id": 1,  # Adjust to a valid paper_id in your database
                "section_id": 1,  # Adjust to a valid section_id in your database
                "question_count": 5
            }
        ]
    }
    
    # Make the API call
    response = requests.post(f"{BASE_URL}/tests/templates", 
                            headers=headers, 
                            data=json.dumps(template_data))
    
    if response.status_code == 200 or response.status_code == 201:
        logger.info("Test template created successfully")
        template = response.json()
        logger.info(f"Template ID: {template.get('template_id')}")
        return template
    else:
        logger.error(f"Failed to create template: {response.status_code} - {response.text}")
        return None

# Function to verify template sections in the database
def verify_template_sections(template_id):
    """Check the database to verify sections were saved"""    # Database connection parameters from docker-compose.dev.yml
    conn_params = {
        "dbname": "cil_cbt_db",
        "user": "cildb",
        "password": "cildb123",
        "host": "localhost",
        "port": "5432"
    }
    
    try:
        # Connect to the database
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        
        # Query the test_template_sections table
        cursor.execute("""
            SELECT * FROM test_template_sections WHERE template_id = %s
        """, (template_id,))
        
        sections = cursor.fetchall()
        logger.info(f"Found {len(sections)} sections for template ID {template_id}")
        
        # Print section details
        for idx, section in enumerate(sections):
            logger.info(f"Section {idx+1}: section_id={section[0]}, template_id={section[1]}, "
                       f"paper_id={section[2]}, section_id_ref={section[3]}, question_count={section[5]}")
        
        # Close the connection
        cursor.close()
        conn.close()
        
        return len(sections) > 0
    
    except Exception as e:
        logger.error(f"Database error: {e}")
        return False

# Function to start a test using the template
def start_test(template_id):
    """Attempt to start a practice test with the template"""
    # Headers for authentication
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MOCK_TOKEN}"
    }
    
    # Test start data
    test_data = {
        "test_template_id": template_id,
        "duration_minutes": 30  # 30 minutes for the test
    }
    
    # Make the API call
    response = requests.post(f"{BASE_URL}/tests/start", 
                            headers=headers, 
                            data=json.dumps(test_data))
    
    if response.status_code == 200 or response.status_code == 201:
        logger.info("Test started successfully")
        test_attempt = response.json()
        logger.info(f"Attempt ID: {test_attempt.get('attempt_id')}")
        return test_attempt
    else:
        logger.error(f"Failed to start test: {response.status_code} - {response.text}")
        return None

if __name__ == "__main__":
    # Step 1: Create a test template
    template = create_test_template()
    if not template:
        logger.error("Failed to create template. Exiting.")
        sys.exit(1)
    
    template_id = template.get('template_id')
    
    # Step 2: Verify the sections were saved
    logger.info("Verifying template sections in the database...")
    if verify_template_sections(template_id):
        logger.info("Template sections verified successfully!")
    else:
        logger.error("Template sections verification failed. Fix not working correctly.")
        sys.exit(1)
    
    # Step 3: Try to start a test with the template
    logger.info(f"Attempting to start a test with template ID {template_id}...")
    test_attempt = start_test(template_id)
    if test_attempt:
        logger.info("Test started successfully! Fix is working correctly.")
    else:
        logger.error("Failed to start test. Fix may not be complete.")
        sys.exit(1)
    
    logger.info("All tests passed! The fix for test template creation is working correctly.")
