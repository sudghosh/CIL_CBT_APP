# Developer Documentation: Adaptive Testing & Performance Tracking

This document provides technical information about the implementation of the Adaptive Testing and Performance Tracking features in the CIL CBT App.

## Architecture Overview

The adaptive testing and performance tracking features have been implemented using:

- **Database Models**: New fields added to existing models and new models for performance data
- **API Endpoints**: New endpoints for adaptive tests and performance metrics
- **Background Processing**: Asynchronous aggregation of performance data
- **Test Logic**: Adaptive algorithms for question selection

## Database Schema Changes

### Added Fields to Existing Models

1. `Question` model:
   - `difficulty_level` (String): "Easy", "Medium", or "Hard" (default: "Medium")

2. `TestAttempt` model:
   - `adaptive_strategy_chosen` (String, nullable): The strategy used for this test
   - `current_question_index` (Integer): Tracks progress through the test

### New Models

1. `UserPerformanceProfile`:
   - Detailed record of each question attempted
   - Links to user, test attempt, and question
   - Stores topic, subtopic, difficulty, correctness, and response time

2. `UserOverallSummary`:
   - Aggregated user performance metrics
   - One record per user with overall statistics
   - Includes accuracy by difficulty level

3. `UserTopicSummary`:
   - Topic-specific performance metrics
   - One record per user per topic

## API Endpoints

### Adaptive Testing Endpoints

1. `POST /tests/start`:
   - Added fields:
     - `adaptive` (Boolean): Enable adaptive testing
     - `adaptive_strategy` (String, optional): Specify strategy type

2. `GET /tests/{attempt_id}/next_question`:
   - Enhanced to use adaptive logic when applicable
   - Returns questions based on test progress and performance

3. `POST /tests/{attempt_id}/answer`:
   - Records answer and updates performance profile
   - Updates adaptive question selection parameters

4. `POST /tests/{attempt_id}/finish`:
   - Triggers performance aggregation background task

### Performance Dashboard Endpoints

1. `GET /performance/overall`:
   - Returns user's overall performance metrics

2. `GET /performance/topics`:
   - Returns topic-wise performance metrics

## Adaptive Algorithm

The question selection logic is implemented in `src/routers/tests.py` in the `select_adaptive_question()` function with the following strategies:

1. `progressive`: Dynamically adjusts difficulty based on performance:
   - Performance > 70%: Increases difficulty
   - Performance < 40%: Decreases difficulty
   - Otherwise: Maintains current difficulty

2. `easy-first`: Starts with Easy questions, then Medium, then Hard

3. `hard-first`: Starts with Hard questions, then Medium, then Easy

4. `random`: Randomly selects questions from any difficulty level

## Performance Aggregation

Performance data is processed in two stages:

1. **Real-time Processing**:
   - Each question attempt is recorded in `UserPerformanceProfile`
   - Basic metrics are updated during the test

2. **Background Aggregation**:
   - Triggered when a test is completed
   - Updates `UserOverallSummary` with aggregate stats
   - Updates `UserTopicSummary` for each topic

Implementation is in `src/tasks/performance_aggregator.py`.

## CSV Import/Export

The CSV question import functionality has been enhanced to support:
- Reading `difficulty_level` from CSV
- Default value ("Medium") when not specified

## Data Flow

1. User starts an adaptive test
2. System selects initial question based on strategy
3. User answers question
4. System:
   - Records answer in `TestAnswer`
   - Creates `UserPerformanceProfile` entry
   - Selects next question based on performance
5. Upon test completion:
   - `UserOverallSummary` and `UserTopicSummary` are updated via background task

## Testing

Test cases are available in:
- `tests/test_adaptive_tests.py`: Tests adaptive test functionality
- `tests/test_performance_tracking.py`: Tests performance tracking

## Deployment and Migration

1. Run database migrations to create new tables and fields:
   ```
   alembic upgrade head
   ```

2. No additional configuration is required, as all features are backward compatible.

## Best Practices for Extending the System

1. **Adding New Adaptive Strategies**:
   - Add new strategy logic to `select_adaptive_question()`
   - Update validation in `TestAttemptBase.adaptive_strategy`

2. **Extending Performance Metrics**:
   - Add fields to appropriate summary models
   - Update aggregation logic in `performance_aggregation_task()`

3. **Performance Considerations**:
   - Performance aggregation is CPU-intensive for large datasets
   - Consider adding caching for performance dashboard data

## Future Improvements

Potential enhancements for future development:

1. Machine learning-based adaptive algorithms
2. Performance prediction models
3. More granular difficulty levels
4. Time-based performance trending
5. Peer comparison features (anonymized)
