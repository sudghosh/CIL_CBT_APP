"""
Focused syntax fix script for Python try-except blocks in tests.py

This script focuses on fixing the "Expected expression" errors that show up in VS Code's linter
for try-except blocks. These are structural issues with how the blocks are formed.

Run this script in the project directory.
"""

import os
import re
import shutil
from datetime import datetime
import sys

FILE_PATH = 'backend/src/routers/tests.py'

def create_backup(file_path):
    """Creates a backup of the original file with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{file_path}.bak_{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at: {backup_path}")
    return backup_path

def fix_syntax_try_except(content):
    """
    Fix try-except block syntax issues
    
    This function focuses on ensuring that each try block has properly structured
    except blocks with correct indentation.
    """
    # First, split the content into lines for easier processing
    lines = content.split('\n')
    
    # Initialize variable to track if we're inside a function
    in_function = False
    function_indent = 0
    fixed_lines = []
    
    # Process each line
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Check if we're entering a function definition
        if re.match(r'^(async\s+)?def\s+\w+\(', stripped):
            in_function = True
            function_indent = len(line) - len(line.lstrip())
        
        # Check if this is a try statement
        if stripped == 'try:':
            try_indent = len(line) - len(line.lstrip())
            try_start = i
            
            # Find the corresponding except or finally block
            has_except = False
            j = i + 1
            while j < len(lines) and j < i + 50:  # Look ahead up to 50 lines
                if re.match(r'^\s*except\s+', lines[j]) or lines[j].strip() == 'finally:':
                    except_indent = len(lines[j]) - len(lines[j].lstrip())
                    if except_indent == try_indent:
                        has_except = True
                        break
                # If we hit a line with less indentation than the try, we've exited the block
                if lines[j].strip() and (len(lines[j]) - len(lines[j].lstrip())) <= try_indent:
                    if not re.match(r'^\s*except\s+', lines[j]) and lines[j].strip() != 'finally:':
                        break
                j += 1
            
            # If no except or finally block was found, add one
            if not has_except and j < len(lines):
                # Find where the try block ends (first line with same or less indentation)
                k = i + 1
                try_block_end = k
                while k < j:
                    if lines[k].strip() and (len(lines[k]) - len(lines[k].lstrip())) <= try_indent:
                        try_block_end = k
                        break
                    k += 1
                
                # Add the except blocks
                except_block = [
                    ' ' * try_indent + 'except HTTPException as e:',
                    ' ' * (try_indent + 4) + 'db.rollback()',
                    ' ' * (try_indent + 4) + 'raise e',
                    ' ' * try_indent + 'except Exception as e:',
                    ' ' * (try_indent + 4) + 'db.rollback()',
                    ' ' * (try_indent + 4) + 'logger.error(f"Unexpected error: {str(e)}")',
                    ' ' * (try_indent + 4) + 'raise HTTPException(',
                    ' ' * (try_indent + 8) + 'status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,',
                    ' ' * (try_indent + 8) + 'detail="Internal server error occurred."',
                    ' ' * (try_indent + 4) + ')'
                ]
                
                # Insert the except block
                lines = lines[:try_block_end] + except_block + lines[try_block_end:]
        
        i += 1
    
    # Check for unmatched or improperly nested except blocks
    i = 0
    fixed_lines = []
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Check if this is an except statement without a preceding try
        if re.match(r'^except\s+', stripped):
            except_indent = len(line) - len(line.lstrip())
            
            # Look back to find if there's a matching try block
            has_try = False
            j = i - 1
            while j >= 0 and j > i - 50:  # Look back up to 50 lines
                if lines[j].strip() == 'try:':
                    try_indent = len(lines[j]) - len(lines[j].lstrip())
                    if try_indent == except_indent:
                        has_try = True
                        break
                # If we hit a line with less indentation than the except, we've exited that scope
                if lines[j].strip() and (len(lines[j]) - len(lines[j].lstrip())) < except_indent:
                    break
                j -= 1
            
            # If this except block doesn't have a matching try, add proper indentation
            if not has_try:
                # Find proper indentation by examining previous non-empty line
                j = i - 1
                while j >= 0:
                    if lines[j].strip():
                        proper_indent = len(lines[j]) - len(lines[j].lstrip())
                        # Skip if this is already properly indented
                        if proper_indent == except_indent:
                            break
                        
                        # Otherwise, add a try block before this except
                        lines.insert(i, ' ' * proper_indent + 'try:')
                        lines.insert(i + 1, ' ' * (proper_indent + 4) + '# Added by fix script')
                        i += 2  # Adjust index since we added lines
                        break
                    j -= 1
        
        fixed_lines.append(lines[i])
        i += 1
    
    return '\n'.join(fixed_lines)

def fix_file():
    """Apply syntax fixes to the file"""
    # Create backup first
    if not os.path.exists(FILE_PATH):
        print(f"Error: File not found at {FILE_PATH}")
        return
    
    backup_path = create_backup(FILE_PATH)
    
    # Read the file content
    try:
        with open(FILE_PATH, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    # Apply fixes
    content = fix_syntax_try_except(content)
    
    # Write the fixed content back to the file
    try:
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Successfully wrote fixed content to {FILE_PATH}")
    except Exception as e:
        print(f"❌ Error writing to file: {e}")
        print(f"The original file is backed up at {backup_path}")

def validate_route_definition(content):
    """Check if route definitions are properly structured"""
    route_pattern = r'@router\.(\w+)\("([^"]+)"(?:,\s+response_model=(\w+))?\)\s*\n\s*(async\s+)?def\s+(\w+)\('
    
    matches = re.finditer(route_pattern, content)
    issues = []
    
    for match in matches:
        method = match.group(1)
        path = match.group(2)
        response_model = match.group(3)
        is_async = bool(match.group(4))
        func_name = match.group(5)
        
        # Validate route structure
        if not path.startswith('/'):
            issues.append(f"Warning: Route path '{path}' does not start with '/'")
            
        # Validate function name matches path somewhat
        path_parts = [p for p in path.split('/') if p and not p.startswith('{')]
        if path_parts and not any(part in func_name for part in path_parts):
            issues.append(f"Warning: Function name '{func_name}' doesn't seem related to path '{path}'")
    
    return issues

if __name__ == "__main__":
    print("Starting syntax fixes for tests.py...")
    fix_file()
    
    # Optional validation
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
            
        issues = validate_route_definition(content)
        if issues:
            print("\nPotential issues found:")
            for issue in issues:
                print(f"- {issue}")
    except:
        pass
    
    print("Fix script completed.")
