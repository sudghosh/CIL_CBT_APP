# Backend Issues Fix Summary

This document outlines the fixes implemented for the backend issues related to authentication and test template/question handling.

## Problems Identified

1. **Authentication Token Expiration**: JWT tokens were configured to expire after only 30 minutes, causing "Signature has expired" errors and 401 Unauthorized responses.

2. **Test Template Section Handling**: Mismatch between `section_id` from the frontend and `section_id_ref` in the database was causing the "No valid questions found for any of the requested sections" error.

3. **Question Validity Dates**: Some questions may have expired validity dates, making them unavailable for test creation.

## Fixes Implemented

### 1. Authentication Token Fix

- Extended the JWT token expiration time from 30 minutes to 8 hours.
- Updated the token creation function to use the configured expiration time.

### 2. Test Template Creation Fix

- Improved validation to ensure that `section_id_ref` values are consistent with existing questions.
- Added checks to verify that sections have valid questions before creating a template.
- Implemented better error handling and more descriptive error messages.

### 3. Test Starting Fix

- Enhanced the test start function to better handle and fix inconsistent `section_id_ref` values.
- Added validation to ensure that questions have not expired before including them in a test.
- Improved logging for debugging template and section issues.

## Additional Utility Scripts

1. **fix_question_validity.py**: A script to extend the validity dates of expired questions and fix inconsistent `section_id_ref` values in test templates.

## How To Use These Fixes

1. **Restart the Backend Service**:
   ```powershell
   ./restart_backend.ps1
   ```
   This will restart the backend service to apply the code changes.

2. **Fix Expired Questions** (if needed):
   ```powershell
   python fix_question_validity.py --all
   ```
   This will extend the validity of all expired questions and fix any test templates with invalid section references.

3. **Fix Specific Templates** (if needed):
   ```powershell
   python fix_question_validity.py --template-id <id>
   ```
   This will fix a specific template if you're having issues with it.

## Troubleshooting

If you continue experiencing issues after applying these fixes:

1. Check the backend logs:
   ```powershell
   docker logs cil_cbt_app-backend-1
   ```

2. Look for errors related to:
   - "No valid questions found"
   - "JWT error during token verification"
   - "Section_id_ref" issues

3. Verify question validity in the database:
   ```sql
   SELECT COUNT(*) FROM questions WHERE valid_until >= CURRENT_DATE;
   ```

4. Check that test templates have valid section references:
   ```sql
   SELECT tt.template_name, tts.paper_id, tts.section_id_ref, 
     (SELECT COUNT(*) FROM questions q 
      WHERE q.paper_id = tts.paper_id 
      AND q.section_id = tts.section_id_ref
      AND q.valid_until >= CURRENT_DATE) AS valid_question_count
   FROM test_templates tt
   JOIN test_template_sections tts ON tt.template_id = tts.template_id;
   ```

## Prevention for Future Issues

1. When creating test templates, always ensure that sections have valid questions.
2. Regularly extend the validity of questions using the provided script.
3. Monitor authentication token expiration and adjust the expiration time if needed.
