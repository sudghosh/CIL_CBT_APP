# Performance Dashboard Guide

This guide explains how to use the Performance Dashboard feature in the CIL CBT App.

## Overview

The Performance Dashboard provides comprehensive insights into user performance across tests, question types, and topics. It helps identify strengths, weaknesses, and progress over time.

## Features

- **Overall Performance Summary**: See test completion rates, average scores, and progress trends
- **Topic-wise Analysis**: Detailed breakdown of performance by subject areas
- **Difficulty Analysis**: Performance metrics across Easy, Medium, and Hard questions
- **Response Time Metrics**: Track speed and accuracy together

## Accessing the Dashboard

1. Log in to your account
2. Click on "Performance Dashboard" in the navigation menu
3. View your personalized performance metrics

## Dashboard Components

### 1. Overall Performance

This section shows:
- Total tests taken
- Average score percentage
- Total questions attempted
- Overall accuracy rate
- Recent test performance trend

### 2. Topic Breakdown

This section provides:
- Performance by topic area (e.g., Mathematics, Science)
- Accuracy percentage for each topic
- Identification of strongest and weakest topics
- Question attempt distribution

### 3. Difficulty Analysis

Review your performance across different difficulty levels:
- Easy question accuracy percentage
- Medium question accuracy percentage
- Hard question accuracy percentage
- Comparative performance visualization

### 4. Time Analysis

Understand your speed and efficiency:
- Average response time overall
- Response time by topic
- Response time by difficulty level
- Speed vs. accuracy correlation

## Interpreting the Data

- **Identifying Strengths**: Topics with high accuracy percentages
- **Finding Improvement Areas**: Topics with lower scores or longer response times
- **Progress Tracking**: Changes in performance over time
- **Test-Taking Strategy**: Balance between speed and accuracy

## API Endpoints

For developers integrating with the system:

```
GET /performance/overall
Returns the user's overall performance metrics

GET /performance/topics
Returns topic-wise performance breakdown

GET /performance/difficulty
Returns performance metrics across difficulty levels

GET /performance/time
Returns response time analysis
```

## Data Collection

Performance data is automatically collected during test attempts:
- Each question attempt is tracked
- Response times are measured
- Results are aggregated after test completion
- Historical data is maintained for trend analysis

## Privacy and Data Usage

- All performance data is private to your account
- Administrators may see anonymized aggregate data
- Data is used to improve question quality and test design

## Technical Implementation

The performance tracking system uses the following components:

- UserPerformanceProfile for detailed question attempt data
- UserOverallSummary for aggregated user metrics
- UserTopicSummary for topic-specific performance
- Background processing for data aggregation

For more technical details, refer to the Developer Documentation.
