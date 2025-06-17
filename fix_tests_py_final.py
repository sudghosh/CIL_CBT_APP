"""
Final fix script for tests.py structural issues

This script will fix:
1. Try-except blocks with proper structure
2. Indentation issues
3. Complete missing except clauses

Run this script in the project directory.
"""

import os
import re
import shutil
from datetime import datetime

FILE_PATH = 'backend/src/routers/tests.py'

def create_backup(file_path):
    """Creates a backup of the original file with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{file_path}.bak_{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at: {backup_path}")
    return backup_path

def fix_try_except_blocks(content):
    """Fix incomplete try-except blocks"""
    lines = content.split('\n')
    result = []
    
    # Track try and except blocks
    in_try_block = False
    has_except_or_finally = False
    try_indent = 0
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        current_indent = len(line) - len(line.lstrip()) if line.strip() else 0
        
        # Start of a try block
        if line_stripped == "try:":
            in_try_block = True
            has_except_or_finally = False
            try_indent = current_indent
            
        # Check for except or finally clauses
        if in_try_block and (line_stripped.startswith("except ") or line_stripped == "finally:"):
            has_except_or_finally = True
        
        # Add line to result
        result.append(line)
        
        # Check for end of function or next route
        if in_try_block and line_stripped and current_indent <= try_indent:
            # This is a line at same or lower indentation than the try
            # and it's not an except or finally, meaning the try block ended improperly
            if not (line_stripped.startswith("except ") or line_stripped == "finally:"):
                # Only add missing blocks if we haven't seen any yet
                if not has_except_or_finally:
                    # Insert except blocks before this line
                    result.pop()  # Remove the line we just added
                    
                    # Add missing except blocks
                    result.append((" " * try_indent) + "except HTTPException as e:")
                    result.append((" " * (try_indent + 4)) + "db.rollback()")  
                    result.append((" " * (try_indent + 4)) + "raise e")
                    result.append((" " * try_indent) + "except Exception as e:")
                    result.append((" " * (try_indent + 4)) + "db.rollback()")
                    result.append((" " * (try_indent + 4)) + "import traceback")
                    result.append((" " * (try_indent + 4)) + "error_trace = traceback.format_exc()")
                    result.append((" " * (try_indent + 4)) + "logger.error(f\"Error: {str(e)}\")")
                    result.append((" " * (try_indent + 4)) + "logger.error(f\"Error trace: {error_trace}\")")
                    result.append((" " * (try_indent + 4)) + "raise HTTPException(")
                    result.append((" " * (try_indent + 8)) + "status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,") 
                    result.append((" " * (try_indent + 8)) + "detail=\"Internal server error occurred. The error has been logged.\"")
                    result.append((" " * (try_indent + 4)) + ")")
                    
                    # Add the current line back
                    result.append(line)
                
                in_try_block = False
    
    return '\n'.join(result)

def fix_structure(content):
    """Fix structural issues with route handlers and try-except blocks"""
    # Fix try without except by ensuring each try has a matching except
    content = fix_try_except_blocks(content)
    
    # Fix dangling "return" statements
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("return ") and i > 0:
            prev_indent = len(lines[i-1]) - len(lines[i-1].lstrip()) if lines[i-1].strip() else 0
            curr_indent = len(lines[i]) - len(lines[i].lstrip())
            
            # If return is not properly indented with previous line
            if curr_indent < prev_indent:
                # Fix indentation to match previous line
                lines[i] = (" " * prev_indent) + line
        
        i += 1
    
    return '\n'.join(lines)

def fix_file():
    """Apply final fixes to the file"""
    # Create backup first
    if not os.path.exists(FILE_PATH):
        print(f"Error: File not found at {FILE_PATH}")
        return
    
    backup_path = create_backup(FILE_PATH)
    
    # Read the file content
    try:
        with open(FILE_PATH, 'r', encoding='utf-8-sig') as f:  # utf-8-sig handles BOM characters
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    # Apply fixes
    content = fix_structure(content)
    
    # Write the fixed content back to the file
    try:
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Successfully wrote fixed content to {FILE_PATH}")
    except Exception as e:
        print(f"❌ Error writing to file: {e}")
        print(f"The original file is backed up at {backup_path}")

if __name__ == "__main__":
    print("Starting final fixes for tests.py...")
    fix_file()
    print("Fix script completed.")
