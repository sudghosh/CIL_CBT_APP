# Test Templates Error Fix

## Issue Description
Users were experiencing 500/422/400 errors when creating test templates for practice tests. The errors occurred when:
1. Creating a test template with sections that didn't exist in the database
2. When section references were mismatching (wrong paper_id/section_id combinations)
3. Due to field name mismatch in the database model vs API

## Root Causes

### 1. Field Name Mismatch
The `TestTemplateSection` model has a field named `section_id_ref` which refers to the `sections.section_id` foreign key, but the API code was using `section_id` to set this field.

```python
# INCORRECT (original code)
db_section = TestTemplateSection(
    # ...
    section_id=section.section_id,  # Wrong field name
)

# FIXED CODE
db_section = TestTemplateSection(
    # ...
    section_id_ref=section.section_id,  # Correct field name
)
```

### 2. Missing Validation
The original code didn't validate whether the paper and sections being referenced actually existed before trying to create the template, leading to database integrity constraint violations.

### 3. Frontend API Inconsistency
The frontend was attempting to use different formats for creating templates - sometimes with a direct paper/section ID approach, and sometimes with a sections array.

## Fixes Applied

### Backend Fixes:
1. Added comprehensive validation to check that papers, sections, and subsections exist before creating the template
2. Fixed the field name from `section_id` to `section_id_ref` to match the actual database model
3. Added validation for duplicate sections in the same template
4. Enhanced error handling for more descriptive error messages
5. Added proper transaction handling with rollbacks on error

### Frontend Fixes:
1. Normalized the template creation request format to always use an array of sections
2. Added handling for the legacy format (direct paper_id/section_id)
3. Enhanced error handling to store section-specific errors in sessionStorage for the UI to reference

## Testing Notes
1. Tests with non-existent sections now return a 404 error with a descriptive message
2. Tests with duplicate sections now return a 400 error
3. All valid section combinations work properly

## Future Improvements
1. Consider adding API version information to better manage changes
2. Update the frontend to only use the sections array approach instead of supporting both formats
3. Add database constraints to ensure the section belongs to the referenced paper
