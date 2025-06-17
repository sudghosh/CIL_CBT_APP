# Adaptive Testing Guide

This guide explains how to use the adaptive testing feature in the CIL CBT App.

## Overview

Adaptive testing dynamically adjusts the difficulty of questions based on a user's performance during a test. This provides a more personalized experience and better assessment of a user's knowledge level.

## Features

- **Question Difficulty Levels**: Questions are assigned "Easy", "Medium", or "Hard" difficulty levels
- **Adaptive Test Strategies**: Multiple strategies for selecting the next question
- **Performance Tracking**: Detailed tracking of user performance across difficulty levels and topics

## How it Works

1. When a test begins in adaptive mode, an initial question is selected based on the chosen strategy
2. As the user answers questions, the system analyzes their performance
3. The next question's difficulty is adjusted accordingly:
   - If the user answers correctly, subsequent questions may become harder
   - If the user answers incorrectly, subsequent questions may become easier
4. The adaptive algorithm helps identify knowledge gaps and strengths

## Adaptive Test Strategies

The following strategies are available:

1. **Progressive**: Starts with medium difficulty questions and adjusts based on performance
2. **Easy-First**: Starts with easier questions and gradually increases difficulty
3. **Hard-First**: Starts with challenging questions and adjusts based on performance
4. **Random**: Selects questions randomly across all difficulty levels

## Using Adaptive Tests

### Creating Tests with Difficulty Levels

When creating or uploading questions, you can now specify a difficulty level:

1. In the Question Management interface, use the new "Difficulty Level" field
2. When uploading questions via CSV, include the "difficulty_level" column
3. If no difficulty is specified, the system defaults to "Medium"

### Starting an Adaptive Test

To start an adaptive test:

1. From the test selection screen, choose a test paper
2. Enable the "Use Adaptive Testing" option
3. Select a strategy or leave it as "Automatic"
4. Click "Start Test"

### API Endpoints

For developers integrating with the system:

```
POST /tests/start
{
  "paper_id": 123,
  "adaptive": true,
  "adaptive_strategy": "progressive" // Optional, can be "progressive", "easy-first", "hard-first", or "random"
}
```

## Performance Tracking

The system now tracks detailed performance metrics:

- Question-level performance across difficulty levels
- Topic and subtopic performance analysis
- Response time tracking
- Aggregated performance statistics

Access your performance data through the Performance Dashboard in the user interface.

## Best Practices

- **Creating Balanced Tests**: Include questions across all difficulty levels
- **Assigning Difficulty Levels**: Use consistent criteria when assigning difficulty
- **Interpreting Results**: Consider both the score and the difficulty progression

## Technical Implementation

The adaptive testing system uses the following components:

- Question model with difficulty_level field
- TestAttempt model with adaptive_strategy_chosen field
- Adaptive question selection algorithm
- Performance tracking and aggregation

For more technical details, refer to the Developer Documentation.
