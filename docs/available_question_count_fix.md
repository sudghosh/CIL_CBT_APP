# Available Question Count Fix

## Problem
Users were encountering the error "Not enough active questions available for the test" when attempting to create practice tests. This occurred because the frontend allowed users to request more questions for a section than were actually available in the database.

## Solution
The solution involved implementing a check for available questions before allowing users to add sections to the practice test. The implementation includes:

1. **Available Question Count Fetching**:
   - Added functionality to fetch the count of available active questions for each paper-section combination
   - Implemented caching to avoid redundant API calls
   - Added a new state variable to track the currently selected section's available count

2. **UI Enhancements**:
   - Updated the question count input field to show the maximum available questions
   - Limited the input to prevent users from selecting more questions than available
   - Added helper text to show when no questions are available
   - Displayed the available count next to each selected section

3. **Validation**:
   - Added validation at multiple points (when adding a section and when starting a test)
   - Prevented test creation attempts when insufficient questions are available
   - Provided clear error messages to guide the user

4. **Error Handling**:
   - Improved error handling for API response failures
   - Added fallback values when the count cannot be retrieved

## Implementation Details

### API Endpoint Used
```typescript
getAvailableQuestionCount: (paperId: number, sectionId: number) => {
  return api.get(`/questions/available-count`, { 
    params: { paper_id: paperId, section_id: sectionId } 
  })
  .then(response => {
    return response.data.count || 0;
  })
  .catch(error => {
    console.error('Failed to get available question count:', error);
    return 0; // Return 0 as default on error
  });
}
```

### UI Components Added
- Loading indicator during count fetching
- Dynamic updating of question count maximum value
- Error display for sections with no questions

## Best Practices
1. Always check for available resources before attempting to create tests
2. Provide clear feedback to users about constraints and limitations
3. Implement caching to reduce unnecessary API calls
4. Add validation at both client-side and server-side

## Testing
To test this fix:
1. Navigate to the Practice Test page
2. Select a paper and section
3. Observe that the question count field shows the maximum available questions
4. Try to create a test with more questions than available - the system should prevent this
5. Check that you can successfully create a test with a valid number of questions

## Future Enhancements
Consider implementing:
1. Admin notifications when sections have low question counts
2. A dashboard to monitor question availability across sections
3. Batch updates to add questions to sections with limited availability
