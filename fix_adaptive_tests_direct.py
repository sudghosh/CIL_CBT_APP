# Direct fix for adaptive test issues in tests.py
# This script should be applied directly to the backend/src/routers/tests.py file

import os
import sys
import re

def fix_adaptive_test_issues():
    """
    Apply direct fixes to tests.py to resolve adaptive test issues:
    1. Remove the 'topic' attribute from the question response
    2. Improve validation for selected_option_id
    """
    # Determine if we're running from the project root or inside the backend directory
    if os.path.exists(os.path.join('backend', 'src', 'routers', 'tests.py')):
        file_path = os.path.join('backend', 'src', 'routers', 'tests.py')
    elif os.path.exists(os.path.join('src', 'routers', 'tests.py')):
        file_path = os.path.join('src', 'routers', 'tests.py')
    else:
        print("ERROR: Could not locate the tests.py file.")
        print("Please run this script from the project root or backend directory.")
        return False
    
    print(f"Found target file: {file_path}")
    
    # Read the file content
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Create a backup
    backup_path = file_path + '.backup'
    with open(backup_path, 'w', encoding='utf-8') as file:
        file.write(content)
    
    print(f"Created backup at: {backup_path}")
    
    # Fix 1: Remove the 'topic' attribute from the question response
    topic_fixed = False
    if '"topic": next_question.topic' in content:
        content = content.replace('''question_response = {
            "question_id": next_question.question_id,
            "question_text": next_question.question_text,
            "difficulty_level": next_question.difficulty_level,
            "options": options,
            "topic": next_question.topic
        }''', '''question_response = {
            "question_id": next_question.question_id,
            "question_text": next_question.question_text,
            "difficulty_level": next_question.difficulty_level,
            "options": options
        }''')
        topic_fixed = True
        print("✅ Fixed issue #1: Removed reference to non-existent 'topic' attribute")
    else:
        print("ℹ️ Topic attribute reference not found or already fixed")
    
    # Fix 2: Improve handling of selected_option_id validation
    validation_fixed = False
    validation_pattern = r'if selected_option_id is not None and selected_option_id > 3:'
    if validation_pattern in content:
        content = content.replace('''if selected_option_id is not None and selected_option_id > 3:
                logger.warning(f"Selected option index ({selected_option_id}) is out of range (0-3). Treating as incorrect.")
                was_correct = False''', '''if selected_option_id is not None:
                if not isinstance(selected_option_id, int) or selected_option_id < 0 or selected_option_id > 3:
                    logger.warning(f"Selected option index ({selected_option_id}) is out of range (0-3) or not an integer. Treating as incorrect.")
                    was_correct = False''')
        validation_fixed = True
        print("✅ Fixed issue #2: Improved validation for selected_option_id")
    else:
        print("ℹ️ Selected option validation pattern not found or already fixed")
    
    # Write the updated content back to the file
    if topic_fixed or validation_fixed:
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)
        print("\n✅ Successfully applied fixes to tests.py")
        return True
    else:
        print("\n⚠️ No changes were needed or could be applied")
        return False

if __name__ == "__main__":
    print("="*60)
    print("Adaptive Test Backend Fix Script")
    print("="*60)
    success = fix_adaptive_test_issues()
    
    if success:
        print("\n✅ All fixes have been applied successfully!")
        print("➡️ Please restart your backend service for changes to take effect.")
        print("\nAfter restarting, verify that:")
        print("1. Adaptive tests end after max_questions are reached")
        print("2. No 'topic' attribute errors appear in backend logs")
        print("3. Option validation works correctly")
    else:
        print("\n⚠️ No changes were applied or errors occurred.")
        print("Please check the messages above for more details.")
    
    print("\n"+"="*60)
