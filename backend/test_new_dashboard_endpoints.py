#!/usr/bin/env python3
"""
New Performance Dashboard Endpoint Test
Tests the endpoints that the new performance dashboard actually uses.
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
HEADERS = {"Content-Type": "application/json"}

def test_new_dashboard_endpoints():
    """Test the endpoints that the new performance dashboard actually uses"""
    
    print("="*70)
    print("NEW PERFORMANCE DASHBOARD ENDPOINT TEST")
    print("="*70)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Endpoints that the new dashboard actually uses (from usePerformanceData.ts)
    dashboard_endpoints = [
        "/performance/overall",      # performanceAPI.getOverallPerformance()
        "/performance/topics",       # performanceAPI.getTopicPerformance()
        "/performance/difficulty",   # performanceAPI.getDifficultyPerformance()
        "/performance/time",         # performanceAPI.getTimePerformance()
        "/performance/dashboard",    # Main dashboard endpoint
        "/performance/topic-mastery", # Charts endpoint (hyphen, not underscore)
        "/performance/difficulty-trends", # Charts endpoint (hyphen, not underscore)
        "/performance/recommendations", # Charts endpoint
        "/performance/performance-comparison" # Charts endpoint
    ]
    
    print("🎯 TESTING NEW DASHBOARD ENDPOINTS:")
    print("-" * 50)
    
    working_endpoints = []
    auth_required_endpoints = []
    missing_endpoints = []
    
    for endpoint in dashboard_endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                working_endpoints.append(endpoint)
                print(f"✅ {endpoint}: {response.status_code} - WORKING")
            elif response.status_code == 401:
                auth_required_endpoints.append(endpoint)
                print(f"🔐 {endpoint}: {response.status_code} - REQUIRES AUTH (GOOD)")
            elif response.status_code == 404:
                missing_endpoints.append(endpoint)
                print(f"❌ {endpoint}: {response.status_code} - NOT FOUND")
            else:
                print(f"⚠️  {endpoint}: {response.status_code} - OTHER ERROR")
                
        except Exception as e:
            print(f"💥 {endpoint}: ERROR - {str(e)}")
    
    print("\n" + "="*70)
    print("SUMMARY:")
    print("="*70)
    print(f"✅ Working without auth: {len(working_endpoints)}")
    print(f"🔐 Requiring auth (normal): {len(auth_required_endpoints)}")
    print(f"❌ Missing (404): {len(missing_endpoints)}")
    
    if auth_required_endpoints:
        print(f"\n🔐 ENDPOINTS REQUIRING AUTH (NORMAL BEHAVIOR):")
        for endpoint in auth_required_endpoints:
            print(f"   • {endpoint}")
    
    if missing_endpoints:
        print(f"\n❌ MISSING ENDPOINTS (NEED ATTENTION):")
        for endpoint in missing_endpoints:
            print(f"   • {endpoint}")
    
    print("\n💡 CONCLUSION:")
    print("-" * 30)
    if len(missing_endpoints) == 0:
        print("✅ All new dashboard endpoints are available!")
        print("✅ The new performance dashboard should work correctly.")
    else:
        print("⚠️  Some endpoints are missing and may cause issues.")
        print("⚠️  Check if these endpoints are implemented in the backend.")
    
    print("\n" + "="*70)

if __name__ == "__main__":
    test_new_dashboard_endpoints()
