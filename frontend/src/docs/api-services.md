# API Services Documentation

## Overview

This document outlines the API services used in the CIL CBT App. These services provide an abstraction layer to interact with the backend API endpoints.

## API Services

### Auth API

`authAPI` provides authentication-related functionality:

- `googleLogin`: Handles Google authentication
- `getCurrentUser`: Gets the current user's information
- `getUsers`: Get all users (admin only)
- `whitelistEmail`: Add an email to whitelist (admin only)
- `getAllowedEmails`: Get all whitelisted emails (admin only)
- `deleteAllowedEmail`: Remove an email from whitelist (admin only)
- `updateUserStatus`: Enable/disable a user (admin only)
- `updateUserRole`: Change a user's role (admin only)
- `healthCheck`: Check if the API is functioning

### Papers API

`papersAPI` handles exam papers functionality:

- `getPapers`: Retrieve all papers with optional pagination
- `createPaper`: Create a new paper
- `updatePaper`: Update an existing paper
- `deletePaper`: Delete a paper
- `activatePaper`: Activate a paper
- `deactivatePaper`: Deactivate a paper
- `createSamplePaper`: Create a sample paper for testing

### Sections API

`sectionsAPI` manages paper sections:

- `getSectionsByPaperId`: Get sections for a specific paper
- `createSection`: Create a new section
- `updateSection`: Update an existing section
- `deleteSection`: Delete a section

### Subsections API

`subsectionsAPI` manages section subsections:

- `getSubsections`: Get subsections for a specific section
- `createSubsection`: Create a new subsection
- `updateSubsection`: Update an existing subsection
- `deleteSubsection`: Delete a subsection

### Questions API

`questionsAPI` handles question management:

- `getQuestions`: Get questions with optional filtering
- `getQuestion`: Get a specific question by ID
- `createQuestion`: Create a new question
- `uploadQuestions`: Upload questions from a CSV file
- `updateQuestion`: Update an existing question
- `deactivateQuestion`: Deactivate a question
- `deleteQuestion`: Delete a question
- `downloadAllQuestions`: Download all questions as a CSV file

### Tests API

`testsAPI` provides test-related functionality:

- `getTemplates`: Get test templates
- `createTemplate`: Create a new test template
- `startTest`: Start a new test attempt
- `abandonTest`: Abandon an ongoing test
- `getAvailableQuestionCount`: Get count of available questions
- `submitAnswer`: Submit an answer to a question
- `finishTest`: Finish a test attempt
- `getAttempts`: Get all test attempts for current user
- `getQuestions`: Get questions for a test attempt
- `getAttemptDetails`: Get details about a test attempt
- `toggleMarkForReview`: Mark/unmark a question for review
- `submitAnswerAndGetNextQuestion`: Submit answer and get next question (adaptive tests)

### Performance API

`performanceAPI` handles performance metrics:

- `getOverallPerformance`: Get overall performance statistics
- `getTopicPerformance`: Get performance by topic
- `getDifficultyPerformance`: Get performance by difficulty level
- `getTimePerformance`: Get performance over time
