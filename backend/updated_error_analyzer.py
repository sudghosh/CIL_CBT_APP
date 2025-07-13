#!/usr/bin/env python3
"""
Updated Adaptive Test Error Analyzer - Correct URL Testing
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_endpoint(url, description=""):
    try:
        response = requests.get(url, timeout=5)
        status = response.status_code
        
        if status == 200:
            log(f"✅ {description}: {status} - WORKING")
            return True
        elif status == 401:
            log(f"🔐 {description}: {status} - REQUIRES AUTH")
            return False
        elif status == 404:
            log(f"❌ {description}: {status} - NOT FOUND")
            return False
        else:
            log(f"⚠️  {description}: {status} - OTHER ERROR")
            return False
    except Exception as e:
        log(f"💥 {description}: ERROR - {str(e)}")
        return False

def main():
    print("=" * 70)
    print("UPDATED ADAPTIVE TEST ERROR ANALYZER - CORRECT URLS")
    print("=" * 70)
    
    log("Testing CORRECT backend endpoint URLs...")
    
    # Test Performance endpoints with CORRECT URLs (hyphens, not underscores)
    print("\n🔍 Testing Performance Endpoints (Correct URLs):")
    performance_endpoints = [
        ("/performance/overall", "Overall Performance"),
        ("/performance/topics", "Topics Performance"),
        ("/performance/difficulty", "Difficulty Performance"),
        ("/performance/time", "Time Performance"),
        ("/performance/dashboard", "Performance Dashboard"),
        ("/performance/difficulty-trends", "Difficulty Trends (HYPHEN)"),
        ("/performance/topic-mastery", "Topic Mastery (HYPHEN)"),
        ("/performance/recommendations", "Performance Recommendations"),
        ("/performance/performance-comparison", "Performance Comparison"),
    ]
    
    working_endpoints = []
    auth_required_endpoints = []
    missing_endpoints = []
    
    for endpoint, description in performance_endpoints:
        url = BASE_URL + endpoint
        if test_endpoint(url, f"{description}: {endpoint}"):
            working_endpoints.append(endpoint)
        elif "401" in str(test_endpoint.__code__):
            # This is a bit hacky, but we'll track auth separately
            pass
    
    # Test Tests endpoints
    print("\n🔍 Testing Tests Endpoints:")
    test_endpoints = [
        ("/tests/templates", "Test Templates"),
        ("/tests/attempts", "Test Attempts"),
        ("/tests/start", "Start Test (POST - will show method not allowed)"),
        ("/tests/finish/1", "Finish Test (POST - will show method not allowed)"),
    ]
    
    for endpoint, description in test_endpoints:
        url = BASE_URL + endpoint
        test_endpoint(url, f"{description}: {endpoint}")
    
    # Test with authentication
    print("\n🔍 Testing with Dev Login Token:")
    
    try:
        # Get auth token
        auth_response = requests.post(f"{BASE_URL}/auth/dev-login")
        if auth_response.status_code == 200:
            token = auth_response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            
            log("✅ Successfully obtained auth token")
            
            # Test protected endpoints
            protected_endpoints = [
                "/performance/overall",
                "/performance/topics", 
                "/performance/difficulty",
                "/performance/time",
                "/performance/dashboard",
                "/tests/attempts"
            ]
            
            print("\n🔐 Testing Protected Endpoints with Auth:")
            for endpoint in protected_endpoints:
                try:
                    response = requests.get(BASE_URL + endpoint, headers=headers, timeout=5)
                    if response.status_code == 200:
                        log(f"✅ {endpoint}: WORKING WITH AUTH")
                    else:
                        log(f"❌ {endpoint}: {response.status_code} - {response.text[:100]}")
                except Exception as e:
                    log(f"💥 {endpoint}: ERROR - {str(e)}")
        else:
            log(f"❌ Failed to get auth token: {auth_response.status_code}")
    
    except Exception as e:
        log(f"💥 Auth test failed: {str(e)}")
    
    # Summary
    print("\n" + "=" * 70)
    log("Summary of findings:")
    print("✅ = Working endpoint")
    print("🔐 = Requires authentication") 
    print("❌ = Missing/broken endpoint")
    print("💥 = Network/server error")
    print("=" * 70)

if __name__ == "__main__":
    main()
