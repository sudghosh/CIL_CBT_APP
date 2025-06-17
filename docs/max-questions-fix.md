# Adaptive Test Max Questions Fix

## Overview

This document explains the fix implemented to resolve the 500 Internal Server Error that occurred when starting tests.

## Issue Description

Users experienced a 500 Internal Server Error when attempting to start a test (both adaptive and non-adaptive). The error occurred because the code was trying to store a `max_questions` value in the `TestAttempt` model, but either:

1. The database column didn't exist in older deployments that were upgraded without proper migrations, or
2. There was an error in handling null values for this field

## Solution Implemented

We implemented a two-part solution:

### 1. Robust Error Handling in Code

The `start_test` function in `tests.py` was updated to:
- Only set `max_questions` if it's provided in the request
- Handle exceptions if the column doesn't exist
- Continue gracefully without setting the value if there's an issue

Similarly, the `next_question` endpoint was updated to handle cases where `max_questions` is not available.

### 2. Database Schema Update (if needed)

A migration script (`add_max_questions_column.py`) was created to add the `max_questions` column to the `test_attempts` table in existing deployments where it might be missing.

## Model Definition (No Changes Required)

The `max_questions` column was already correctly defined in the `TestAttempt` model in `models.py`:

```python
class TestAttempt(Base):
    __tablename__ = "test_attempts"
    
    # Other fields...
    
    # New columns for adaptive test strategy
    adaptive_strategy_chosen = Column(String, nullable=True)
    current_question_index = Column(Integer, default=0, nullable=False)
    max_questions = Column(Integer, nullable=True)  # Maximum number of questions for adaptive tests
```

This means that new database instances created from scratch will have the correct schema. The issue only affected existing deployments that might have been created before this field was added.

## Deployment Instructions

1. Apply the code changes to handle missing `max_questions` field gracefully
2. For deployments where the error still occurs, run the migration script:
   ```
   python add_max_questions_column.py
   ```
3. Restart the backend service

## Verification

After applying the changes, verify that:
1. Both adaptive and non-adaptive tests can be started successfully
2. Adaptive tests properly respect the maximum questions limit
3. Test completion works correctly

## Conclusion

This fix ensures that tests can be started regardless of whether the `max_questions` column exists in the database, while maintaining the enhanced functionality for adaptive tests. The model definition in `models.py` already includes this column, so new deployments will automatically have the correct schema.
