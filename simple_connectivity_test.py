#!/usr/bin/env python3
"""
Simple test script to verify the development login flow
"""

import requests
import json

def test_backend_dev_login():
    """Test the backend dev-login endpoint"""
    print("Testing backend dev-login endpoint...")
    try:
        response = requests.post('http://localhost:8000/auth/dev-login', timeout=10)
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access_token', '')
            if access_token.startswith('eyJ'):
                print("✅ Backend dev-login endpoint working correctly")
                print(f"   Token received (first 20 chars): {access_token[:20]}...")
                return access_token
            else:
                print("❌ Backend returned invalid token format")
                return None
        else:
            print(f"❌ Backend dev-login failed with status: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend connection failed: {e}")
        return None

def test_frontend_accessibility():
    """Test if the frontend is accessible"""
    print("Testing frontend accessibility...")
    try:
        response = requests.get('http://localhost:3000', timeout=10)
        if response.status_code == 200:
            if 'CIL CBT App' in response.text:
                print("✅ Frontend is accessible and serving the app")
                return True
            else:
                print("❌ Frontend accessible but not serving expected content")
                return False
        else:
            print(f"❌ Frontend returned status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Frontend connection failed: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Testing Development Login Backend/Frontend Connectivity")
    print("=" * 60)
    
    # Test backend
    token = test_backend_dev_login()
    
    print()
    
    # Test frontend
    frontend_ok = test_frontend_accessibility()
    
    print("\n" + "=" * 60)
    
    if token and frontend_ok:
        print("🎉 Basic connectivity tests passed!")
        print(f"   Backend JWT token: {token[:50]}...")
        print("   Frontend is serving the application")
        print("\n📝 Manual test steps:")
        print("   1. Open http://localhost:3000 in your browser")
        print("   2. If not redirected to login, try http://localhost:3000/login")
        print("   3. Click 'Development Login (Bypass Google)' button")
        print("   4. Verify you can navigate to protected pages")
    else:
        print("❌ Basic connectivity tests failed!")
        if not token:
            print("   - Backend dev-login endpoint is not working")
        if not frontend_ok:
            print("   - Frontend is not accessible")

if __name__ == "__main__":
    main()
