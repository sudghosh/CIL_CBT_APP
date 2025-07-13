#!/usr/bin/env python3
"""
API Endpoint Analysis for Performance Data
This script analyzes the gap between available backend endpoints and what the frontend expects.
"""

import json
from datetime import datetime

def analyze_api_endpoints():
    """Analyze available vs expected API endpoints"""
    
    print("="*70)
    print("API ENDPOINT ANALYSIS FOR PERFORMANCE DATA")
    print("="*70)
    
    # Current available endpoints in performance router
    available_performance_endpoints = [
        "/performance/overall",
        "/performance/topics", 
        "/performance/difficulty",
        "/performance/time",
        "/performance/dashboard",
        "/performance/topics/{topic_id}",
        "/performance/difficulty-trends",
        "/performance/topic-mastery",
        "/performance/recommendations",
        "/performance/performance-comparison"
    ]
    
    # Current available endpoints in tests router
    available_test_endpoints = [
        "/tests/templates",
        "/tests/start",
        "/tests/submit/{attempt_id}/answer",
        "/tests/finish/{attempt_id}",
        "/tests/attempts",
        "/tests/questions/{attempt_id}",
        "/tests/attempts/{attempt_id}/details",
        "/tests/{attempt_id}/next_question",
        "/tests/attempts/{attempt_id}/next-question"
    ]
    
    # Frontend expected endpoints (from error analysis)
    frontend_expected_endpoints = [
        "/performance/user_performance",
        "/performance/topic_mastery",
        "/performance/difficulty_trends", 
        "/performance/time_analysis",
        "/tests/results",
        "/tests/performance",
        "/tests/user_stats",
        "/api/performance/dashboard",
        "/api/performance/summary",
        "/api/performance/charts",
        "/api/user/performance",
        "/api/tests/results/performance",
        "/api/analytics/performance",
        "/performance/summary"
    ]
    
    print("\n📊 AVAILABLE PERFORMANCE ENDPOINTS:")
    print("-" * 50)
    for endpoint in available_performance_endpoints:
        print(f"✅ {endpoint}")
    
    print("\n📊 AVAILABLE TEST ENDPOINTS:")
    print("-" * 50)
    for endpoint in available_test_endpoints:
        print(f"✅ {endpoint}")
    
    print("\n❌ MISSING ENDPOINTS (Frontend expects but not available):")
    print("-" * 50)
    
    # Compare available vs expected
    missing_endpoints = []
    available_all = available_performance_endpoints + available_test_endpoints
    
    for expected in frontend_expected_endpoints:
        # Check if this endpoint exists in available endpoints
        found = False
        for available in available_all:
            # Handle different naming conventions (underscore vs hyphen)
            if expected.replace('_', '-') in available.replace('_', '-'):
                found = True
                break
            if expected.replace('/', '/api/') in available:
                found = True
                break
        
        if not found:
            missing_endpoints.append(expected)
            print(f"❌ {expected}")
    
    print("\n🔄 ENDPOINT MAPPING ISSUES:")
    print("-" * 50)
    
    # Check for naming convention mismatches
    mapping_issues = []
    
    # Check underscore vs hyphen issues
    underscore_endpoints = [ep for ep in frontend_expected_endpoints if '_' in ep]
    for endpoint in underscore_endpoints:
        hyphen_version = endpoint.replace('_', '-')
        if any(hyphen_version in avail for avail in available_all):
            mapping_issues.append({
                'frontend_expects': endpoint,
                'backend_has': hyphen_version,
                'issue': 'Underscore vs Hyphen naming mismatch'
            })
    
    # Check /api/ prefix issues
    api_endpoints = [ep for ep in frontend_expected_endpoints if ep.startswith('/api/')]
    for endpoint in api_endpoints:
        non_api_version = endpoint.replace('/api', '')
        if any(non_api_version in avail for avail in available_all):
            mapping_issues.append({
                'frontend_expects': endpoint,
                'backend_has': non_api_version,
                'issue': 'API prefix routing mismatch'
            })
    
    for issue in mapping_issues:
        print(f"🔄 {issue['frontend_expects']} -> {issue['backend_has']}")
        print(f"   Issue: {issue['issue']}")
    
    print("\n🎯 SPECIFIC ANALYSIS:")
    print("-" * 50)
    
    # Analyze specific problematic endpoints
    problematic_endpoints = [
        ("/performance/user_performance", "NOT FOUND - needs implementation"),
        ("/performance/topic_mastery", "AVAILABLE as /performance/topic-mastery (hyphen vs underscore)"),
        ("/performance/difficulty_trends", "AVAILABLE as /performance/difficulty-trends (hyphen vs underscore)"),
        ("/performance/time_analysis", "NOT FOUND - needs implementation"),
        ("/tests/results", "NOT FOUND - needs implementation"),
        ("/tests/performance", "NOT FOUND - needs implementation"),
        ("/tests/user_stats", "NOT FOUND - needs implementation"),
        ("/api/performance/dashboard", "AVAILABLE as /performance/dashboard (missing /api/ prefix)"),
        ("/api/performance/summary", "NOT FOUND - needs implementation"),
        ("/api/performance/charts", "NOT FOUND - needs implementation")
    ]
    
    for endpoint, status in problematic_endpoints:
        print(f"{endpoint}: {status}")
    
    print("\n💡 RECOMMENDATIONS:")
    print("-" * 50)
    print("1. 🔧 Fix naming convention mismatches (underscore vs hyphen)")
    print("2. ➕ Add missing endpoints that frontend expects")
    print("3. 🔀 Set up proper API prefix routing")
    print("4. 📝 Document the actual API structure for frontend team")
    print("5. 🧪 Test all endpoints with authentication")
    
    print("\n📋 SUMMARY:")
    print("-" * 50)
    print(f"✅ Available Performance Endpoints: {len(available_performance_endpoints)}")
    print(f"✅ Available Test Endpoints: {len(available_test_endpoints)}")
    print(f"❌ Missing Endpoints: {len(missing_endpoints)}")
    print(f"🔄 Mapping Issues: {len(mapping_issues)}")
    
    print("\n" + "="*70)

if __name__ == "__main__":
    analyze_api_endpoints()
