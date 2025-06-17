# Practice Test Start Error Resolution

## Issue
When trying to start a practice test, users encountered a validation error with the message:
`"Failed to start test: Invalid input data. Please check your submission."`

## Investigation and Diagnosis

### Part 1: Template Creation
1. First, we verified that the template creation worked correctly. This was confirmed by observing that the POST request to `/tests/templates` returned a successful response with status code 200.
2. The frontend correctly sent required fields `template_name` and `test_type` in the template creation request.
3. We implemented a fix in the API service's `createTemplate` method to ensure these fields are always included, even if missing in the data passed to the method.

### Part 2: Test Start Issue
1. Investigation of the backend logs revealed a 422 validation error for the POST request to `/tests/start`.
2. The error message indicated: `body -> adaptive_strategy: Input should be 'easy_to_hard', 'hard_to_easy', 'adaptive' or 'random'`.
3. The mismatch was between what the frontend was sending (`progressive`) and what the backend expected (`adaptive`).

### Part 3: Backend Error
1. After fixing the frontend to map the strategies correctly, we discovered another issue in the backend.
2. The backend had a variable name error in `tests.py` around line 502:
   - It was using `section_id_ref` instead of the proper `section.section_id_ref`.
3. This caused a 500 internal server error when trying to start a test.

## Solution

### 1. Frontend Fix
We updated the `startTest` method in the API service (`api.ts`) to properly map frontend strategy names to what the backend expects:

```typescript
startTest: (templateId: number, durationMinutes: number = 60, adaptiveOptions?: { 
  adaptive: boolean; 
  adaptiveStrategy?: 'progressive' | 'easy-first' | 'hard-first' | 'random' 
}) => {
  const payload: any = { 
    test_template_id: templateId,
    duration_minutes: durationMinutes 
  };
  
  // Add adaptive options if provided
  if (adaptiveOptions?.adaptive) {
    payload.is_adaptive = true;
    if (adaptiveOptions.adaptiveStrategy) {
      // Map frontend strategies to backend expected values
      const strategyMap: Record<string, string> = {
        'progressive': 'adaptive',
        'easy-first': 'easy_to_hard',
        'hard-first': 'hard_to_easy',
        'random': 'random'
      };
      
      const mappedStrategy = strategyMap[adaptiveOptions.adaptiveStrategy] || 'adaptive';
      payload.adaptive_strategy = mappedStrategy;
    }
  }
}
```

### 2. Backend Fix
We fixed the variable name error in the backend file `tests.py`:

```python
# Original code (problematic)
section_exists = db.query(Section).filter(
    Section.section_id == section_id_ref,
    Section.paper_id == section.paper_id
).first()

# Fixed code
section_exists = db.query(Section).filter(
    Section.section_id == section.section_id_ref,
    Section.paper_id == section.paper_id
).first()
```

## Testing and Validation
- Created test scripts to verify both the template creation and test start endpoints work correctly
- Verified the adaptive strategy mapping works correctly
- Applied the fixes to the appropriate files
- Created documentation to explain the strategy mapping

## Documentation
Created a new document `adaptive_strategy_mapping.md` that explains:
- The mapping between frontend and backend strategy names
- How the frontend API service automatically handles this mapping
- Example usage for future reference

## Conclusion
Two issues were identified and fixed:
1. A mapping issue between frontend adaptive strategy names and backend expectations
2. A variable name error in the backend code

Both fixes were implemented with minimal changes to maintain compatibility and avoid any unintended side effects.
