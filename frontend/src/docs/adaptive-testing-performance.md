# Adaptive Testing & Performance Tracking

## Overview

The CIL CBT App now features adaptive testing and comprehensive performance tracking capabilities. This document provides information about how these features are implemented on the frontend.

## Adaptive Testing

### How It Works

Adaptive testing dynamically adjusts the difficulty of questions based on the user's performance during the test. This provides a more personalized assessment experience and helps identify knowledge gaps more effectively.

### Key Components

1. **PracticeTestPage.tsx**
   - Added adaptive mode toggle switch
   - Added adaptive strategy selection dropdown
   - Modified test start logic to include adaptive parameters

2. **AdaptiveTestInterface.tsx**
   - New component for handling adaptive tests
   - Fetches questions one at a time based on performance
   - Tracks and displays progress through the test

3. **adaptiveTestUtils.ts**
   - Helper functions for adaptive testing logic
   - Functions for calculating next difficulty level
   - Performance calculation utilities

4. **API Integration**
   - Extended `testsAPI.startTest()` to include adaptive parameters
   - Added `testsAPI.submitAnswerAndGetNextQuestion()` for adaptive progression
   - Mock data fallbacks for testing and development

### Usage

To start an adaptive test:
1. Navigate to the Practice Test page
2. Toggle "Enable Adaptive Test Mode"
3. Select an adaptive strategy (optional)
4. Configure other test parameters as usual
5. Click "Start Test"

The test will dynamically adjust question difficulty based on your performance and the selected strategy.

## Performance Dashboard

### Features

The performance dashboard provides comprehensive insights into user test performance:

1. **Overall Statistics**
   - Tests taken, questions attempted
   - Overall accuracy and scores
   - Average response time

2. **Difficulty Analysis**
   - Performance breakdown by difficulty level (Easy, Medium, Hard)
   - Comparative visualization of results

3. **Topic Performance**
   - Performance breakdown by topic area
   - Multiple visualization options (bar chart, radar chart)

4. **Time Analysis**
   - Performance trends over time
   - Configurable time periods (week, month, year)

### Key Components

1. **PerformanceDashboard.tsx**
   - Main dashboard page with tabs for different analytics views
   - Interactive charts and filters
   - Real-time data refreshing

2. **performanceAPI**
   - API client functions for fetching performance metrics
   - Endpoints for overall, topic, difficulty, and time-based data

### Data Flow

1. When a test is completed, performance data is automatically recorded
2. The dashboard fetches and aggregates this data when loaded
3. Users can filter and analyze their performance across different dimensions

## Technical Implementation Details

### Adaptive Test Flow

```
1. User selects adaptive mode → PracticeTestPage.tsx
2. Test starts with adaptive flag → testsAPI.startTest()
3. First question is loaded → AdaptiveTestInterface.tsx
4. User answers question → testsAPI.submitAnswerAndGetNextQuestion()
5. Next question is selected based on performance → Backend logic
6. Process repeats until test completion
```

### Performance Data Flow

```
1. Test completed → testsAPI.finishTest()
2. Backend aggregates performance data
3. Dashboard loads → performanceAPI.getOverallPerformance() etc.
4. Data is visualized in charts and statistics
```

### Error Handling

Both features include comprehensive error handling:
- API error fallbacks with mock data
- Loading states for async operations
- User-friendly error messages

## Troubleshooting

If you encounter issues with these features:

1. **Adaptive tests not working properly:**
   - Check browser console for API errors
   - Ensure backend adaptive test endpoints are available
   - Verify that questions have difficulty levels assigned

2. **Performance dashboard showing no data:**
   - Check if any tests have been completed
   - Verify API connectivity to performance endpoints
   - Check browser console for specific error messages

## Future Enhancements

Planned enhancements for these features:

1. **Adaptive Testing:**
   - Machine learning-based difficulty adjustment
   - More granular difficulty levels
   - Adaptive time limits based on question complexity

2. **Performance Dashboard:**
   - Peer comparison features (anonymized)
   - Exportable performance reports
   - Custom dashboard layout options
