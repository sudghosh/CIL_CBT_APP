# Adaptive Test Max Questions Fix

## Issue Overview

Adaptive tests were not ending after reaching the specified maximum number of questions (e.g., 2 questions in 2 minutes). Tests would continue until the timer expired, regardless of how many questions had been answered.

## Root Causes

1. **Missing `max_questions` Values**: 
   - The `max_questions` parameter wasn't being consistently set on the `TestAttempt` model when starting an adaptive test.
   - There was no fallback mechanism to derive `max_questions` from template sections.

2. **API Errors Preventing Completion Check**:
   - The `get_next_adaptive_question` function was referencing a non-existent `is_active` attribute on the `Question` model, causing 500 errors.
   - Selected option validation was too strict, causing errors for option IDs outside the 0-3 range.

3. **Ineffective `max_questions` Retrieval**:
   - Code to retrieve the `max_questions` attribute wasn't handling all possible scenarios.

## Fixes Implemented

### 1. Improved `max_questions` Setting

```python
# Add max_questions field for the test attempt
# First check if it's directly provided in the request
if hasattr(attempt, 'max_questions') and attempt.max_questions is not None:
    try:
        db_attempt.max_questions = attempt.max_questions
        logger.info(f"Setting max_questions={attempt.max_questions} for test from request parameter")
    except Exception as e:
        logger.warning(f"Failed to set max_questions from request: {e}. Will fall back to template.")
# If not provided but is an adaptive test, use the total questions from sections as max_questions
elif attempt.is_adaptive:
    try:
        total_questions = sum(section.question_count for section in template.sections)
        db_attempt.max_questions = total_questions
        logger.info(f"Setting max_questions={total_questions} for adaptive test from template sections")
    except Exception as e:
        logger.warning(f"Failed to set max_questions for adaptive test: {e}")
```

### 2. Fixed Error in Question Filter

Removed references to the non-existent `is_active` attribute:

```python
# Build query for potential next questions (excluding already answered)
potential_questions = db.query(Question).filter(
    Question.question_id.notin_(answered_question_ids)
)
```

### 3. Enhanced `max_questions` Retrieval

Improved logic to retrieve the max_questions value, with fallbacks:

```python
# First check if there's a direct attribute
if hasattr(attempt, "max_questions") and attempt.max_questions is not None:
    max_questions = attempt.max_questions
    logger.info(f"Using max_questions directly from attempt model: {max_questions}")
else:
    # Then check if it's in __dict__
    max_questions_dict = attempt.__dict__.get('max_questions')
    if max_questions_dict is not None:
        max_questions = max_questions_dict
        logger.info(f"Found max_questions in __dict__: {max_questions}")
    else:
        # Fall back to the default from template sections
        max_questions = default_max_questions
        logger.info(f"Using default max_questions from sections: {max_questions}")
```

### 4. Fixed Option Validation

Added better handling for option index validation:

```python
# Check if selected option is valid
if selected_option_id is not None and selected_option_id > 3:
    logger.warning(f"Selected option index ({selected_option_id}) is out of range (0-3). Treating as incorrect.")
    was_correct = False
elif current_question and current_question.correct_option_index == selected_option_id:
    was_correct = True
else:
    was_correct = False
```

### 5. Enhanced Response Data

Improved the response to the frontend with more detailed information:

```python
# Return the next question with detailed state information
response_data = {
    "status": "success",
    "next_question": question_response,
    "questions_answered": questions_answered,
    "max_questions": max_questions,
    "progress_percentage": min(100, int((questions_answered / max_questions) * 100)) if max_questions > 0 else 0
}

logger.info(f"Returning next question response with progress: {response_data['progress_percentage']}% " +
           f"({questions_answered}/{max_questions} questions)")
```

## Testing

To verify this fix, perform the following tests:

1. Start an adaptive test with a specific maximum number of questions (e.g., 2 questions)
2. Answer the specified number of questions
3. Confirm that the test automatically completes after reaching the max_questions limit
4. Check that the backend logs show `ADAPTIVE TEST COMPLETE: Reached max questions limit`

## Additional Improvements

1. Added more detailed logging to track questions answered vs max_questions
2. Enhanced the API response with progress percentage information
3. Improved error handling for option validation

This fix ensures that adaptive tests will now correctly end after the specified number of questions have been answered, rather than continuing until the time expires.
