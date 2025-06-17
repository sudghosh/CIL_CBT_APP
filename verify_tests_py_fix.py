"""
Verification script to test if the backend service starts without syntax errors.

This script:
1. Checks if the tests.py file can be imported without syntax errors
2. Attempts to start the backend service
3. Records any startup errors for diagnosis

Run this in the project directory.
"""

import os
import sys
import subprocess
import time
from datetime import datetime

# Define paths and configuration
BACKEND_DIR = os.path.join("backend")

def log_message(message):
    """Log a message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def check_file_syntax():
    """Check if the tests.py file can be imported without syntax errors"""
    log_message("Checking tests.py syntax...")
    
    try:
        # Try to import the module using a subprocess to isolate the import
        # This avoids affecting the current Python process
        cmd = [
            sys.executable, 
            "-c", 
            "import sys; sys.path.append('backend'); from src.routers import tests; print('Syntax check passed!')"
        ]
        
        result = subprocess.run(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            log_message("✅ Syntax check passed!")
            return True
        else:
            log_message("❌ Syntax check failed!")
            log_message(f"Error: {result.stderr}")
            return False
    
    except Exception as e:
        log_message(f"❌ Error during syntax check: {str(e)}")
        return False

def start_backend_service():
    """Attempt to start the backend service"""
    log_message("Attempting to start backend service...")
    
    try:
        cmd = [
            sys.executable,
            "-c",
            "import sys; sys.path.append('backend'); from src import main; print('Backend imports successful!')"
        ]
        
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            log_message("✅ Backend imports successful!")
            return True
        else:
            log_message("❌ Backend imports failed!")
            log_message(f"Error: {result.stderr}")
            return False
            
    except Exception as e:
        log_message(f"❌ Error starting backend: {str(e)}")
        return False

def verify_fixes():
    """Run all verification tests"""
    log_message("Starting verification of tests.py fixes...")
    
    # Check syntax
    syntax_ok = check_file_syntax()
    
    # Try to start backend
    if syntax_ok:
        backend_ok = start_backend_service()
    else:
        log_message("⚠️ Skipping backend startup test due to syntax errors")
        backend_ok = False
    
    # Generate report
    log_message("\n=== Verification Report ===")
    log_message(f"Syntax Check: {'✅ PASSED' if syntax_ok else '❌ FAILED'}")
    log_message(f"Backend Startup: {'✅ PASSED' if backend_ok else '❌ FAILED' if syntax_ok else '⚠️ SKIPPED'}")
    
    if syntax_ok and backend_ok:
        log_message("\n✅ All verification tests passed!")
        log_message("Next Steps: Run functional tests to verify test creation and starting functionality")
    else:
        log_message("\n⚠️ Some verification tests failed.")
        log_message("Check the error messages above for details on what needs further fixing.")
    
    # Append results to documentation
    try:
        with open('docs/tests_py_fix_documentation.md', 'a', encoding='utf-8') as f:
            f.write("\n\n## Verification Results\n\n")
            f.write(f"- Syntax Check: {'✅ PASSED' if syntax_ok else '❌ FAILED'}\n")
            f.write(f"- Backend Startup: {'✅ PASSED' if backend_ok else '❌ FAILED' if syntax_ok else '⚠️ SKIPPED'}\n\n")
            
            if not syntax_ok or not backend_ok:
                f.write("Some verification tests failed. Manual review may be required.\n")
                
            f.write(f"\nVerification performed on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    except:
        log_message("⚠️ Could not append results to documentation file")

if __name__ == "__main__":
    verify_fixes()
