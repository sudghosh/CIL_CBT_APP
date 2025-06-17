# Multi-Section Practice Test Feature

## Overview

This document describes the implementation of the multi-section selection feature for the Practice Test module in the CIL HR Exam Question Bank application. This feature allows users to create custom practice tests by selecting multiple sections from different papers, improving the test preparation experience.

## Problem Addressed

**Issue**: The original implementation only allowed users to select one paper and one section for a practice test, limiting flexibility and user experience.

**Solution**: The updated implementation enables users to:
1. Select multiple sections from various papers
2. Specify question counts for each selected section
3. Create comprehensive practice tests covering multiple topics

## Technical Implementation

### Frontend Changes (PracticeTestPage.tsx)

1. **Data Model Updates**
   - Added a new `SectionSelection` interface to represent a selected section with paper, section, and question count information
   - Added state management for multiple section selections using `selectedSections` state array

2. **UI Modifications**
   - Created a "Add Section" button to add sections to the test
   - Implemented a table to display selected sections
   - Added ability to remove individual sections from the selection
   - Updated validation to require at least one section before starting the test

3. **API Interaction Improvements**
   - Modified the API request format to send an array of selected sections
   - Implemented fallback mechanism to maintain backward compatibility
   - Enhanced error handling and logging for better diagnostics
   
4. **Backend Integration (June 14, 2025 Update)**
   - Updated the backend `TestTemplateBase` model to include the `sections` field
   - Reorganized model definitions to resolve dependencies
   - Added more detailed logging of API requests and responses
   
5. **Dynamic Test Configuration (June 14, 2025 Update)**
   - Added automatic test duration calculation based on the number of questions selected
   - Improved error handling with context-specific error messages
   - Enhanced API interaction for test start process
   - Implemented graceful error recovery and detailed feedback
   - Updated the API request format to include an array of sections
   - Added fallback mechanism to handle potential backend compatibility issues
   - Enhanced error handling with specific error messages and logging

### API Request Format

The template creation now supports two formats:

**Primary Format (Multi-Section)**:
```json
{
  "template_name": "Practice Test",
  "test_type": "Practice",
  "sections": [
    {
      "paper_id": 1,
      "section_id": 101,
      "subsection_id": null,
      "question_count": 10
    },
    {
      "paper_id": 1,
      "section_id": 102,
      "subsection_id": null,
      "question_count": 15
    },
    {
      "paper_id": 2,
      "section_id": 201,
      "subsection_id": null,
      "question_count": 5
    }
  ]
}
```

**Fallback Format (Single Section)**:
```json
{
  "template_name": "Practice Test",
  "test_type": "Practice",
  "paper_id": 1,
  "section_id": 101,
  "question_count": 10
}
```

## Error Handling

The implementation includes comprehensive error handling to address potential issues:

1. **Frontend Validation**
   - Prevents starting tests with no sections selected
   - Validates question counts (must be between 1-100)
   - Prevents adding duplicate sections to the test

2. **API Error Handling**
   - Detailed console logging for API interaction issues
   - User-friendly error messages
   - Fallback mechanism for potential API format incompatibility

3. **Backend 500 Error Resolution**
   - Added additional logging to identify issues with template creation
   - Implemented format fallback for backward compatibility

## User Experience Improvements

1. **Flexibility**: Users can now create more comprehensive tests covering multiple topics.
2. **Visibility**: The selection table clearly shows which sections have been added.
3. **Control**: Users can remove individual sections without starting over.
4. **Feedback**: Clear error messages and validation help users create valid tests.

## Testing Guidelines

To test this feature:

1. Select a paper and section
2. Enter a question count (1-100)
3. Click "Add Section"
4. Repeat to add multiple sections
5. Verify the sections appear in the table
6. Test removing sections
7. Click "Start Practice Test" to begin the test
8. Verify that questions from all selected sections are included

## Potential Future Enhancements

1. Add ability to reorder sections
2. Support for subsection selection
3. Allow saving custom test templates for later use
4. Provide recommendations for section combinations based on user performance

## Compatibility Notes

The implementation maintains backward compatibility by attempting to use the legacy API format if the new format fails. This ensures the application continues to work even if the backend has not been updated to support the new multi-section format.
