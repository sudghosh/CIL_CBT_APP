# Adaptive Test Difficulty Mechanism Guide

## Overview

This document explains how the CBT system manages question difficulty in adaptive tests, particularly when questions in the Question Management page lack difficulty designations or are all marked as "Easy".

## Adaptive Test Difficulty Assignment

### Default Behavior

When all questions in the Question Management page are marked as "Easy" (or have no explicit difficulty level), the system uses a special mechanism to ensure adaptive tests still function properly with varying difficulty levels:

1. **Round-Robin Assignment**: The system automatically assigns difficulty levels in a round-robin fashion:
   - First question: "Easy"
   - Second question: "Medium"
   - Third question: "Hard" 
   - Fourth question: "Easy" (cycle repeats)

2. **Adaptive Strategy Implementation**: 
   - For "easy_to_hard" strategy: Questions are initially presented in the assigned order, progressively increasing difficulty based on user performance
   - For "hard_to_easy" strategy: Questions are presented in reverse difficulty order, offering easier questions if the user struggles

### Implementation Details

The difficulty assignment is handled in the backend (src/routers/tests.py) when starting a test:

```python
# For adaptive tests, if we have enough questions with different difficulty levels,
# we can use them as is. Otherwise, we use a round-robin approach to assign difficulties
questions_by_difficulty = {}
need_round_robin = True

# First try to group questions by their existing difficulty levels
for idx, question in enumerate(questions):
    difficulty = question.difficulty_level.lower() if question.difficulty_level else "easy"
    if difficulty not in questions_by_difficulty:
        questions_by_difficulty[difficulty] = []
    questions_by_difficulty[difficulty].append(question)

# Check if we have enough questions of each difficulty level
if all(level in questions_by_difficulty for level in ["easy", "medium", "hard"]):
    if all(len(questions) >= min_questions_per_level for questions in questions_by_difficulty.values()):
        need_round_robin = False

# If we don't have enough questions in each difficulty level, use round-robin assignment
if need_round_robin:
    difficulties = ["easy", "medium", "hard"]
    for idx, question in enumerate(questions):
        # Assign difficulty in round-robin fashion
        assigned_difficulty = difficulties[idx % len(difficulties)]
        question.difficulty_level = assigned_difficulty
        
        # Group by assigned difficulty
        if assigned_difficulty not in questions_by_difficulty:
            questions_by_difficulty[assigned_difficulty] = []
        questions_by_difficulty[assigned_difficulty].append(question)
```

## Benefits of Round-Robin Approach

1. **Works With Minimal Setup**: The system can run adaptive tests even if administrators haven't assigned difficulty levels
2. **Ensures Question Variety**: Creates a mix of difficulty levels to better assess user knowledge
3. **Graceful Fallback**: Provides automatic behavior that doesn't require configuration

## Recommended Best Practice

While the round-robin approach ensures adaptive tests work even with minimal question metadata, for optimal results:

1. **Assign Accurate Difficulty Levels**: Manually review and assign appropriate difficulty levels to questions
2. **Create Question Pools**: Ensure sufficient questions at each difficulty level
3. **Test Adaptive Strategies**: Run sample tests with both adaptive strategies to verify behavior

## Advanced Configuration

For more sophisticated adaptive testing, consider:

1. Setting explicit difficulty levels for all questions
2. Creating question pools with appropriate distribution across difficulty levels
3. Configuring adaptive test templates with appropriate max_questions settings

---

*Last Updated: June 20, 2025*
