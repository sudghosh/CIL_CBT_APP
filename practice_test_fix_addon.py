"""
Additional fixes for practice test template creation and test starting issues
"""

# Add this to the fix_template.py to incorporate the new fixes

def apply_adaptive_strategy_fix():
    """
    Fix the variable name error in the backend code.
    This corrects the error where section_id_ref was used incorrectly instead of section.section_id_ref
    """
    print("\nApplying fix for adaptive strategy and section_id_ref variable name error...")
    
    # Path to the file
    file_path = os.path.join("backend", "src", "routers", "tests.py")
    
    try:
        # Read the file content
        with open(file_path, "r") as f:
            content = f.read()
        
        # Fix the variable name error
        content = content.replace(
            "Section.section_id == section_id_ref",
            "Section.section_id == section.section_id_ref"
        )
        
        content = content.replace(
            "print(f\"WARNING: section_id_ref={section_id_ref} doesn't exist",
            "print(f\"WARNING: section_id_ref={section.section_id_ref} doesn't exist"
        )
        
        # Write the fixed content back to the file
        with open(file_path, "w") as f:
            f.write(content)
            
        print("✅ Successfully fixed variable name error in tests.py")
    except Exception as e:
        print(f"❌ Error applying fix to backend code: {str(e)}")
        
    # Now check if we need to add the strategy mapping to the frontend code
    frontend_fix_path = os.path.join("frontend", "src", "services", "api.ts")
    try:
        with open(frontend_fix_path, "r") as f:
            frontend_code = f.read()
            
        if "strategyMap" not in frontend_code:
            print("\nAdding adaptive strategy mapping to frontend code...")
            # Here we would insert the mapping code, but this would require more complex
            # string manipulation since we need to find the right place to insert it
            print("⚠️ Manual intervention required: Please ensure the strategy mapping is added to api.ts")
            print("See docs/adaptive_strategy_mapping.md for details on the required mapping")
            
    except Exception as e:
        print(f"❌ Error checking frontend code: {str(e)}")
        
    print("\nRecommended action:")
    print("1. Restart the backend service")
    print("2. Verify that test creation and starting works correctly")

# Add this to the main function of fix_template.py
# if __name__ == "__main__":
#     ...existing code...
#     apply_adaptive_strategy_fix()
