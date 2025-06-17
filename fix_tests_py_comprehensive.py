"""
Comprehensive fix for tests.py file to address syntax and structural issues.

This script performs the following fixes:
1. Removes BOM character at the beginning of the file if present
2. Fixes indentation issues throughout the file
3. Ensures all try-except blocks are properly closed
4. Restores proper route handler structure

Usage:
    python fix_tests_py_comprehensive.py

This will create a backup of the original file and write the fixed version.
"""

import os
import shutil
import re
from datetime import datetime

# Path to the file we need to fix
FILE_PATH = os.path.join('backend', 'src', 'routers', 'tests.py')

def backup_file(file_path):
    """Create a backup of the file with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{file_path}.backup_{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at: {backup_path}")
    return backup_path

def fix_bom_character(content):
    """Remove BOM character if present"""
    if content.startswith('\ufeff'):
        content = content[1:]
        print("Removed BOM character from the beginning of the file")
    return content

def fix_indentation_and_structure(content):
    """Fix indentation and structure issues"""
    lines = content.split('\n')
    fixed_lines = []
    
    in_route_handler = False
    route_indent = 0
    try_level = 0
    
    for i, line in enumerate(lines):
        # Skip empty lines
        if not line.strip():
            fixed_lines.append(line)
            continue
            
        # Detect router decorator to identify start of route handlers
        if line.strip().startswith('@router.'):
            in_route_handler = True
            route_indent = len(line) - len(line.lstrip())
            fixed_lines.append(line)
            continue
            
        # Check for async def or def to establish base indentation level
        if in_route_handler and (line.strip().startswith('async def') or line.strip().startswith('def')):
            route_indent = len(line) - len(line.lstrip())
            fixed_lines.append(line)
            continue
            
        # Track try blocks
        if line.strip() == 'try:':
            try_level += 1
            
        # Track except or finally blocks
        if line.strip().startswith('except') or line.strip() == 'finally:':
            if try_level > 0:
                try_level -= 1
                
        # Handle indentation for new route handlers
        if in_route_handler and line.strip().startswith('@router.'):
            # Ensure previous try blocks are closed
            if try_level > 0:
                # Add missing except block before the next route
                fixed_lines.append(' ' * (route_indent + 4) + 'except Exception as e:')
                fixed_lines.append(' ' * (route_indent + 8) + 'logger.error(f"Unexpected error: {str(e)}")')
                fixed_lines.append(' ' * (route_indent + 8) + 'raise HTTPException(status_code=500, detail="Internal server error")')
                try_level = 0
            
            in_route_handler = True
            route_indent = len(line) - len(line.lstrip())
            
        fixed_lines.append(line)
    
    # If we still have open try blocks at the end of the file
    if try_level > 0:
        # Add missing except block at the end
        fixed_lines.append(' ' * (route_indent + 4) + 'except Exception as e:')
        fixed_lines.append(' ' * (route_indent + 8) + 'logger.error(f"Unexpected error: {str(e)}")')
        fixed_lines.append(' ' * (route_indent + 8) + 'raise HTTPException(status_code=500, detail="Internal server error")')
    
    return '\n'.join(fixed_lines)

def fix_return_outside_function(content):
    """Fix any 'return' statements outside of functions"""
    lines = content.split('\n')
    fixed_lines = []
    
    in_function = False
    function_indent = 0
    
    for i, line in enumerate(lines):
        # Check for function definition
        if re.match(r'^\s*(async\s+)?def\s+', line):
            in_function = True
            function_indent = len(line) - len(line.lstrip())
            
        # Check for return statement indentation
        if 'return' in line and not line.strip().startswith('#'):
            current_indent = len(line) - len(line.lstrip())
            if not in_function or current_indent <= function_indent:
                # This return is misplaced or at wrong indentation
                # Let's try to fix it by finding proper indentation
                proper_indent = function_indent + 4  # Standard indentation inside a function
                line = ' ' * proper_indent + line.strip()
                print(f"Fixed indentation of return statement at line {i+1}")
                
        # Check if we're exiting the function
        if in_function and line.strip() and len(line) - len(line.lstrip()) <= function_indent:
            if not (line.strip().startswith('except') or line.strip().startswith('finally') or line.strip().startswith('elif') or line.strip().startswith('else')):
                in_function = False
                
        fixed_lines.append(line)
        
    return '\n'.join(fixed_lines)

def fix_file():
    """Fix the file"""
    try:
        # Make sure the file exists
        if not os.path.exists(FILE_PATH):
            print(f"Error: File does not exist at {FILE_PATH}")
            return False
            
        # Backup the original file
        backup_path = backup_file(FILE_PATH)
        
        # Read file content
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Fix issues
        content = fix_bom_character(content)
        content = fix_indentation_and_structure(content)
        content = fix_return_outside_function(content)
        
        # Write fixed content back
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"Fixed file written to {FILE_PATH}")
        print("To restore the original file if needed, use the backup file.")
        return True
        
    except Exception as e:
        print(f"Error fixing file: {str(e)}")
        return False

if __name__ == "__main__":
    print("Starting comprehensive fix for tests.py...")
    if fix_file():
        print("Fix completed successfully!")
    else:
        print("Fix failed. See error messages above.")
