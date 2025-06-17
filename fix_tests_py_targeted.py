"""
Manual fix script for specific errors in tests.py

This script addresses:
1. BOM character issue
2. Try-except block issues
3. Indentation errors in critical sections

Run this script directly in the project directory.
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

def fix_file():
    """Apply manual fixes to the file"""
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
    
    # Fix 1: Remove BOM character if present
    if content.startswith('\ufeff'):
        content = content[1:]
        print("✅ Removed BOM character")
    
    # Fix 2: Fix the incomplete try-except block at line ~416
    try_block_pattern = r'@router\.post\("/start",\s+response_model=TestAttemptResponse\)(?:[^\n]*\n)+?\s+async\s+def\s+start_test\([^)]*\):\s*\n\s+try:'
    match = re.search(try_block_pattern, content)
    
    if match:
        # Check if there's no corresponding except block
        try_start_pos = match.end()
        next_route_pos = content.find('@router.', try_start_pos)
        
        if next_route_pos > 0 and 'except' not in content[try_start_pos:next_route_pos]:
            # Need to add except blocks before the next route
            route_indent = 4  # Assuming standard indentation
            
            # Find where to insert the except blocks
            insert_pos = next_route_pos
            lines = content[:insert_pos].split('\n')
            
            # Go backward to find last non-empty line
            for i in range(len(lines) - 1, 0, -1):
                if lines[i].strip():
                    # Add our except blocks after this line
                    lines_before = '\n'.join(lines[:i+1])
                    lines_after = '\n'.join(lines[i+1:])
                    
                    # Add the missing except blocks
                    except_blocks = f"\n{' ' * route_indent}except HTTPException as e:\n"
                    except_blocks += f"{' ' * (route_indent + 4)}db.rollback()\n"
                    except_blocks += f"{' ' * (route_indent + 4)}raise e\n"
                    except_blocks += f"{' ' * route_indent}except Exception as e:\n"
                    except_blocks += f"{' ' * (route_indent + 4)}db.rollback()\n"
                    except_blocks += f"{' ' * (route_indent + 4)}import traceback\n"
                    except_blocks += f"{' ' * (route_indent + 4)}error_trace = traceback.format_exc()\n"
                    except_blocks += f"{' ' * (route_indent + 4)}logger.error(f\"Error starting test: {{str(e)}}\")\n"
                    except_blocks += f"{' ' * (route_indent + 4)}logger.error(f\"Error trace: {{error_trace}}\")\n"
                    except_blocks += f"{' ' * (route_indent + 4)}raise HTTPException(\n"
                    except_blocks += f"{' ' * (route_indent + 8)}status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,\n"
                    except_blocks += f"{' ' * (route_indent + 8)}detail=\"Internal server error occurred. The error has been logged.\"\n"
                    except_blocks += f"{' ' * (route_indent + 4)})"
                    
                    content = lines_before + except_blocks + '\n' + content[next_route_pos:]
                    print("✅ Fixed incomplete try-except block")
                    break
    
    # Fix 3: Fix indentation issues at around line 734-740
    # This regex finds a return statement followed by except blocks at wrong indentation
    bad_indentation_pattern = r'(\s+)return db_attempt\s*\n(\s*)except HTTPException'
    content = re.sub(bad_indentation_pattern, r'\1return db_attempt\n\1except HTTPException', content)
    
    # Fix similar indentation issues with the second except block
    bad_indentation_pattern2 = r'(\s+)raise e\s*\n(\s*)except Exception'
    content = re.sub(bad_indentation_pattern2, r'\1raise e\n\1except Exception', content)
    
    print("✅ Fixed indentation issues in except blocks")
    
    # Write the fixed content back to the file
    try:
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Successfully wrote fixed content to {FILE_PATH}")
    except Exception as e:
        print(f"❌ Error writing to file: {e}")
        print(f"The original file is backed up at {backup_path}")

if __name__ == "__main__":
    print("Starting targeted fixes for tests.py...")
    fix_file()
    print("Fix script completed.")
