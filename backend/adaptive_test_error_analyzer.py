#!/usr/bin/env python3
"""
Adaptive Test Error Analyzer
This script simulates an adaptive test submission and analyzes console errors
that occur after test completion, particularly focusing on performance dashboard issues.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
HEADERS = {"Content-Type": "application/json"}

def log_with_timestamp(message):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_adaptive_submission_flow():
    """Test the full adaptive test submission flow and identify errors"""
    
    log_with_timestamp("Starting adaptive test submission flow analysis...")
    
    # 1. First, let's check the health endpoint
    try:
        response = requests.get(f"{BASE_URL}/health", headers=HEADERS)
        log_with_timestamp(f"Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        log_with_timestamp(f"Health check failed: {str(e)}")
        return
    
    # 2. Try to get user info (simulating logged in user)
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=HEADERS)
        log_with_timestamp(f"User info: {response.status_code} - {response.text[:200]}...")
    except Exception as e:
        log_with_timestamp(f"User info failed: {str(e)}")
    
    # 3. Check performance dashboard endpoints (based on new dashboard)
    performance_endpoints = [
        "/performance/overall",
        "/performance/topics",
        "/performance/difficulty",
        "/performance/time",
        "/performance/dashboard",
        "/performance/topic-mastery",
        "/performance/difficulty-trends",
        "/performance/recommendations",
        "/performance/performance-comparison"
    ]
    
    log_with_timestamp("Checking performance dashboard endpoints...")
    for endpoint in performance_endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS)
            log_with_timestamp(f"Endpoint {endpoint}: {response.status_code} - {response.text[:100]}...")
        except Exception as e:
            log_with_timestamp(f"Endpoint {endpoint} failed: {str(e)}")
    
    # 4. Check if test result endpoints exist
    test_endpoints = [
        "/tests/results",
        "/tests/attempts",
        "/tests/performance",
        "/tests/user_stats"
    ]
    
    log_with_timestamp("Checking test result endpoints...")
    for endpoint in test_endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS)
            log_with_timestamp(f"Test endpoint {endpoint}: {response.status_code} - {response.text[:100]}...")
        except Exception as e:
            log_with_timestamp(f"Test endpoint {endpoint} failed: {str(e)}")
    
    # 5. Check available routes
    try:
        response = requests.get(f"{BASE_URL}/docs", headers=HEADERS)
        log_with_timestamp(f"API docs available: {response.status_code}")
    except Exception as e:
        log_with_timestamp(f"API docs failed: {str(e)}")

def analyze_frontend_api_calls():
    """Analyze what API calls the frontend is making for performance dashboard"""
    
    log_with_timestamp("Analyzing frontend API patterns...")
    
    # Based on new performance dashboard patterns, check these endpoints
    expected_endpoints = [
        "/performance/overall",
        "/performance/topics",
        "/performance/difficulty",
        "/performance/time",
        "/performance/dashboard",
        "/performance/topic-mastery",
        "/performance/difficulty-trends",
        "/performance/recommendations",
        "/performance/performance-comparison"
    ]
    
    for endpoint in expected_endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS)
            log_with_timestamp(f"Expected endpoint {endpoint}: {response.status_code} - {response.text[:100]}...")
        except Exception as e:
            log_with_timestamp(f"Expected endpoint {endpoint} failed: {str(e)}")

def main():
    """Main function to run the analysis"""
    
    print("="*70)
    print("ADAPTIVE TEST ERROR ANALYZER")
    print("="*70)
    
    # Test the adaptive submission flow
    test_adaptive_submission_flow()
    
    print("\n" + "="*70)
    
    # Analyze frontend API calls
    analyze_frontend_api_calls()
    
    print("\n" + "="*70)
    log_with_timestamp("Analysis complete. Check the output above for 404 errors and missing endpoints.")
    print("="*70)

if __name__ == "__main__":
    main()
