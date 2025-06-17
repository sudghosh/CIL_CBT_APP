#!/usr/bin/env python
"""
Paper API Authentication Fix Verification Script

This script verifies that both the backend API and frontend API functions
for paper management are working correctly with authentication.
"""

import requests
import json
import os
import sys
import webbrowser
import time
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"
SCRIPT_DIR = Path(__file__).parent.absolute()
TEST_PAPER_ID = 1  # Default paper ID to test with

def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f" {text}")
    print("=" * 60)

def print_success(text):
    """Print a success message."""
    print(f"✅ {text}")

def print_error(text):
    """Print an error message."""
    print(f"❌ {text}")

def print_info(text):
    """Print an info message."""
    print(f"ℹ️ {text}")

def get_auth_token():
    """Get the authentication token from auth_token.json."""
    try:
        token_path = SCRIPT_DIR / "auth_token.json"
        if token_path.exists():
            with open(token_path, "r") as f:
                token_data = json.load(f)
                token = token_data.get("access_token")
                if token:
                    return token
    except Exception as e:
        print_error(f"Error reading auth token: {str(e)}")
    
    return None

def verify_backend_api():
    """Verify that the backend API is working correctly."""
    print_header("BACKEND API VERIFICATION")
    token = get_auth_token()
    
    if not token:
        print_error("No authentication token found. Run get_auth_token.py first.")
        return False
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Check if backend is accessible
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print_success("Backend API is accessible")
        else:
            print_error(f"Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Backend API is not accessible: {str(e)}")
        return False
    
    # Test GET papers endpoint
    try:
        print_info("Testing GET /api/papers/ endpoint...")
        response = requests.get(f"{BASE_URL}/api/papers/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            papers_count = data.get("total", 0)
            print_success(f"Successfully retrieved {papers_count} papers")
            
            # Get a paper ID to test with if available
            global TEST_PAPER_ID
            if data.get("items") and len(data["items"]) > 0:
                TEST_PAPER_ID = data["items"][0].get("paper_id", TEST_PAPER_ID)
                print_info(f"Using paper ID {TEST_PAPER_ID} for activation tests")
        else:
            print_error(f"GET papers failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Error testing GET papers: {str(e)}")
        return False
    
    # Test paper activation
    try:
        print_info(f"Testing POST /api/papers/{TEST_PAPER_ID}/activate/ endpoint...")
        response = requests.post(
            f"{BASE_URL}/api/papers/{TEST_PAPER_ID}/activate/", 
            headers=headers,
            json={}
        )
        if response.status_code == 200:
            print_success("Paper activation successful")
        else:
            print_error(f"Paper activation failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Error testing paper activation: {str(e)}")
        return False
    
    # Test paper deactivation
    try:
        print_info(f"Testing POST /api/papers/{TEST_PAPER_ID}/deactivate/ endpoint...")
        response = requests.post(
            f"{BASE_URL}/api/papers/{TEST_PAPER_ID}/deactivate/", 
            headers=headers,
            json={}
        )
        if response.status_code == 200:
            print_success("Paper deactivation successful")
        else:
            print_error(f"Paper deactivation failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Error testing paper deactivation: {str(e)}")
        return False
    
    # Restore paper to active state
    try:
        print_info(f"Restoring paper to active state...")
        response = requests.post(
            f"{BASE_URL}/api/papers/{TEST_PAPER_ID}/activate/", 
            headers=headers,
            json={}
        )
        if response.status_code == 200:
            print_success("Paper restored to active state")
        else:
            print_error(f"Failed to restore paper: {response.status_code}")
    except Exception:
        print_error("Failed to restore paper to active state")
    
    return True

def verify_frontend_api():
    """Check if the frontend is running and provide instructions for manual testing."""
    print_header("FRONTEND API VERIFICATION")
    
    # Check if frontend is accessible
    try:
        response = requests.get(FRONTEND_URL)
        if response.status_code == 200:
            print_success("Frontend is accessible")
        else:
            print_error(f"Frontend check failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Frontend is not accessible: {str(e)}")
        return False
    
    # Open the paper management page for manual testing
    try:
        paper_management_url = f"{FRONTEND_URL}/papers"
        print_info(f"Opening paper management page at {paper_management_url}")
        webbrowser.open(paper_management_url)
        
        print_info("Follow these steps to manually verify the fix:")
        print("1. Ensure you are logged in")
        print("2. Find a paper in the list")
        print("3. Try to activate/deactivate the paper")
        print("4. Check that no authentication errors appear in the console")
        print("5. Confirm the paper status toggles successfully")
        
        input("Press Enter when you've completed the verification...")
        print_success("Frontend verification completed")
        return True
    except Exception as e:
        print_error(f"Error launching browser: {str(e)}")
        return False

def main():
    """Main verification function."""
    print_header("PAPER API AUTHENTICATION FIX VERIFICATION")
    
    # Verify backend API
    backend_ok = verify_backend_api()
    
    # Verify frontend API
    frontend_ok = verify_frontend_api()
    
    # Summary
    print_header("VERIFICATION SUMMARY")
    if backend_ok:
        print_success("Backend API verification: PASSED")
    else:
        print_error("Backend API verification: FAILED")
    
    if frontend_ok:
        print_success("Frontend API verification: PASSED")
    else:
        print_error("Frontend API verification: FAILED")
    
    if backend_ok and frontend_ok:
        print_success("All tests passed! The authentication fix is working correctly.")
    else:
        print_error("Some tests failed. Please check the output for details.")

if __name__ == "__main__":
    main()
