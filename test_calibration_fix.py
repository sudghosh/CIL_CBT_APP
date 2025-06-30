"""
Test script to verify the calibration status fix.

This script tests that:
1. The is_calibrated flag updates correctly with the new thresholds
2. The calibration API endpoints return the correct status
"""

import requests
import time

# Test configuration
BASE_URL = "http://localhost:8000"
DEV_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoyNTM0MDIzMDA4MDB9.mzm9CF1NXM9E0SvGIBqe4w7TgG2G_qk6r3Ye1vz6Rp8"

def test_calibration_status():
    """Test the calibration status endpoint."""
    headers = {"Authorization": f"Bearer {DEV_TOKEN}"}
    
    print("🔬 Testing calibration status endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/calibration/status", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Calibration Status:")
            print(f"   Total questions attempted: {data['total_questions_attempted']}")
            print(f"   Calibrated questions: {data['calibrated_questions']}")
            print(f"   Calibrating questions: {data['calibrating_questions']}")
            print(f"   Calibration progress: {data['calibration_progress_percentage']}%")
            print(f"   Is calibrated: {data['is_calibrated']} ✅" if data['is_calibrated'] else f"   Is calibrated: {data['is_calibrated']} ❌")
            print(f"   Status: {data['calibration_status']}")
            
            # Verify the fix
            if data['total_questions_attempted'] >= 8 and data['calibrated_questions'] >= 3:
                expected_calibrated = True
            else:
                expected_calibrated = False
                
            if data['is_calibrated'] == expected_calibrated:
                print(f"🎉 CALIBRATION FIX VERIFIED: is_calibrated flag is working correctly!")
                return True
            else:
                print(f"❌ CALIBRATION FIX FAILED: Expected is_calibrated={expected_calibrated}, got {data['is_calibrated']}")
                return False
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_calibration_details():
    """Test the calibration details endpoint."""
    headers = {"Authorization": f"Bearer {DEV_TOKEN}"}
    
    print("\n🔬 Testing calibration details endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/calibration/details", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Calibration Details:")
            print(f"   Overall total: {data['overall_metrics']['total']}")
            print(f"   Overall calibrated: {data['overall_metrics']['calibrated']}")
            print(f"   Overall accuracy: {data['overall_metrics']['accuracy']}%")
            print(f"   Is calibrated (details): {data['is_calibrated']}")
            
            # Show difficulty breakdown
            for difficulty in ['easy', 'medium', 'hard']:
                metrics = data['difficulty_metrics'][difficulty]
                print(f"   {difficulty.capitalize()}: {metrics['calibrated']}/{metrics['total']} calibrated ({metrics['calibration_progress']}%)")
            
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def main():
    """Run all calibration tests."""
    print("🧪 Starting calibration status fix verification...\n")
    
    # Test status endpoint
    status_ok = test_calibration_status()
    
    # Test details endpoint
    details_ok = test_calibration_details()
    
    # Overall result
    print("\n" + "="*60)
    if status_ok and details_ok:
        print("🎉 ALL CALIBRATION TESTS PASSED! The is_calibrated flag fix is working correctly.")
        print("✅ Users with 8+ questions and 3+ calibrated questions are now marked as calibrated.")
    else:
        print("❌ Some calibration tests failed. Please check the output above for details.")
    print("="*60)

if __name__ == "__main__":
    main()
