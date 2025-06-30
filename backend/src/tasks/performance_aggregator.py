"""
Performance Aggregation Tasks

This module contains functions for aggregating user performance data from test attempts.
These functions are designed to be run in the background to avoid delaying API responses.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from ..database.models import (
    TestAttempt, TestAnswer, Question, User, Paper, Section, Subsection,
    UserPerformanceProfile, UserOverallSummary, UserTopicSummary, UserQuestionDifficulty
)
from ..database.database import SessionLocal
import logging

logger = logging.getLogger(__name__)


async def performance_aggregation_task(attempt_id: int):
    """
    Aggregates performance data from a test attempt and updates summary tables.
    
    Args:
        attempt_id: The ID of the TestAttempt to aggregate data from
    """
    # Create a new database session for this background task
    db = SessionLocal()
    try:
        logger.info(f"Starting performance aggregation for attempt ID {attempt_id}")
        
        # Get the test attempt with its answers and questions
        attempt = db.query(TestAttempt).filter(TestAttempt.attempt_id == attempt_id).first()
        if not attempt:
            logger.error(f"TestAttempt with ID {attempt_id} not found")
            return
        
        user_id = attempt.user_id
        
        # Get all answers for this attempt with their associated questions
        answers = db.query(TestAnswer).filter(TestAnswer.attempt_id == attempt_id).all()
        
        if not answers:
            logger.warning(f"No answers found for attempt ID {attempt_id}")
            return
        
        # Gather metrics
        total_questions = len(answers)
        answered_questions = sum(1 for a in answers if a.selected_option_index is not None)
        
        # Calculate correct answers by comparing with question's correct option
        correct_answers = 0
        incorrect_answers = 0
        
        for answer in answers:
            if answer.selected_option_index is not None:  # Only consider answered questions
                question = db.query(Question).filter(Question.question_id == answer.question_id).first()
                if question and answer.selected_option_index == question.correct_option_index:
                    correct_answers += 1
                elif question:
                    incorrect_answers += 1
        
        unanswered = total_questions - answered_questions
        total_time_seconds = sum(a.time_taken_seconds for a in answers if a.time_taken_seconds is not None)
        
        avg_time_per_question = total_time_seconds / answered_questions if answered_questions > 0 else 0
        accuracy = (correct_answers / answered_questions) * 100 if answered_questions > 0 else 0
          # Process each answer to update both global and user-specific difficulty
        for answer in answers:
            if answer.selected_option_index is not None:  # Only process answered questions
                # Get the question
                question = db.query(Question).filter(Question.question_id == answer.question_id).first()
                
                if not question:
                    continue
                
                # Calculate if answer is correct
                is_answer_correct = answer.selected_option_index == question.correct_option_index
                
                # Get or create the user-specific question difficulty record
                user_question_difficulty = db.query(UserQuestionDifficulty).filter(
                    UserQuestionDifficulty.user_id == user_id,
                    UserQuestionDifficulty.question_id == answer.question_id
                ).first()
                
                if not user_question_difficulty:
                    # Create new user-specific difficulty record
                    user_question_difficulty = UserQuestionDifficulty(
                        user_id=user_id,
                        question_id=answer.question_id,
                        numeric_difficulty=question.numeric_difficulty,
                        difficulty_level=question.difficulty_level,
                        confidence=0.1,  # Initial low confidence
                        attempts=0,
                        correct_answers=0,
                        avg_time_seconds=0.0,
                        is_calibrating=True
                    )
                
                # Update user-specific metrics
                user_question_difficulty.attempts += 1
                if is_answer_correct:
                    user_question_difficulty.correct_answers += 1
                
                # Update average time
                if answer.time_taken_seconds:
                    if user_question_difficulty.avg_time_seconds > 0:
                        # Weighted average based on attempts
                        weight = 1.0 / user_question_difficulty.attempts
                        user_question_difficulty.avg_time_seconds = (
                            user_question_difficulty.avg_time_seconds * (1 - weight) + 
                            answer.time_taken_seconds * weight
                        )
                    else:
                        user_question_difficulty.avg_time_seconds = answer.time_taken_seconds
                
                # Update user-specific difficulty based on performance
                if not is_answer_correct:
                    # Increase difficulty if answered incorrectly
                    user_question_difficulty.numeric_difficulty = min(10, user_question_difficulty.numeric_difficulty + 1.0)
                else:
                    # Decrease difficulty slightly if answered correctly
                    user_question_difficulty.numeric_difficulty = max(0, user_question_difficulty.numeric_difficulty - 0.5)
                
                # Update difficulty level string based on numeric value
                if 0 <= user_question_difficulty.numeric_difficulty <= 3:
                    user_question_difficulty.difficulty_level = 'Easy'
                elif 4 <= user_question_difficulty.numeric_difficulty <= 6:
                    user_question_difficulty.difficulty_level = 'Medium'
                else:  # 7-10
                    user_question_difficulty.difficulty_level = 'Hard'
                
                # Update confidence based on number of attempts
                user_question_difficulty.confidence = min(1.0, 0.1 + (user_question_difficulty.attempts * 0.05))
                
                # Update calibration status
                # Reduced threshold from 5 to 3 attempts for more practical calibration
                if user_question_difficulty.attempts >= 3:
                    user_question_difficulty.is_calibrating = False
                
                # Update last attempted timestamp
                user_question_difficulty.last_attempted_at = datetime.utcnow()
                
                db.add(user_question_difficulty)
                logger.info(f"Updated user-specific difficulty for user {user_id}, question {question.question_id} to {user_question_difficulty.numeric_difficulty} ({user_question_difficulty.difficulty_level})")
                
                # Also update the global question difficulty metrics (less aggressively)
                # Only update if the user has passed calibration phase for better data quality
                if not user_question_difficulty.is_calibrating:
                    if not is_answer_correct:
                        # Increment the global numeric difficulty by a small amount
                        question.numeric_difficulty = min(10, question.numeric_difficulty + 0.2)
                    else:
                        # Decrease global difficulty by a very small amount 
                        question.numeric_difficulty = max(0, question.numeric_difficulty - 0.1)
                    
                    # Update the global string difficulty level based on the numeric value
                    if 0 <= question.numeric_difficulty <= 3:
                        question.difficulty_level = 'Easy'
                    elif 4 <= question.numeric_difficulty <= 6:
                        question.difficulty_level = 'Medium'
                    else:  # 7-10
                        question.difficulty_level = 'Hard'
                    
                    # Update the last calculated timestamp for global difficulty
                    question.difficulty_last_calculated = datetime.utcnow()
                    
                    db.add(question)
                    logger.info(f"Updated global difficulty for question {question.question_id} to {question.numeric_difficulty} ({question.difficulty_level})")
        
        # Update UserOverallSummary
        user_summary = db.query(UserOverallSummary).filter(
            UserOverallSummary.user_id == user_id
        ).first()
        
        if not user_summary:
            user_summary = UserOverallSummary(
                user_id=user_id,
                total_tests_completed=0,
                total_questions_answered=0,
                overall_accuracy_percentage=0,
                avg_score_completed_tests=0,
                avg_time_per_question_overall=0
            )
        
        # Update summary data
        user_summary.total_tests_completed += 1 if attempt.status == "Completed" else 0
        
        # Add new questions to the total
        new_total_questions = user_summary.total_questions_answered + answered_questions
        
        # Recalculate weighted averages for accuracy and time
        if new_total_questions > 0:
            # Weighted accuracy calculation
            existing_accuracy_weight = user_summary.total_questions_answered / new_total_questions
            new_accuracy_weight = answered_questions / new_total_questions
            
            user_summary.overall_accuracy_percentage = (
                (user_summary.overall_accuracy_percentage * existing_accuracy_weight) +
                (accuracy * new_accuracy_weight)
            )
            
            # Weighted average time calculation
            user_summary.avg_time_per_question_overall = (
                (user_summary.avg_time_per_question_overall * existing_accuracy_weight) +
                (avg_time_per_question * new_accuracy_weight)
            )
        
        user_summary.total_questions_answered = new_total_questions
        
        # Update score averages for completed tests
        if attempt.status == "Completed" and attempt.score is not None:
            old_avg = user_summary.avg_score_completed_tests
            old_count = user_summary.total_tests_completed - 1  # Subtract 1 because we already incremented
            
            if old_count > 0:
                user_summary.avg_score_completed_tests = (
                    (old_avg * old_count) + attempt.score
                ) / user_summary.total_tests_completed
            else:
                user_summary.avg_score_completed_tests = attempt.score
        
        db.add(user_summary)
        
        # Process topic-level performance
        # Group answers by topics (paper, section, subsection combinations)
        topic_metrics: Dict[Tuple[int, Optional[int], Optional[int]], Dict[str, Any]] = {}
        
        for answer in answers:
            if answer.selected_option_index is None:
                continue  # Skip unanswered questions
                
            # Get the question to determine its topic and difficulty
            question = db.query(Question).filter(Question.question_id == answer.question_id).first()
            if not question:
                continue
            
            # Calculate if answer is correct
            is_answer_correct = answer.selected_option_index == question.correct_option_index
                
            topic_key = (question.paper_id, question.section_id, question.subsection_id)
            
            if topic_key not in topic_metrics:
                topic_metrics[topic_key] = {
                    "total": 0,
                    "correct_easy": 0,
                    "total_easy": 0,
                    "correct_medium": 0,
                    "total_medium": 0,
                    "correct_hard": 0,
                    "total_hard": 0,
                    "total_time": 0
                }
            
            metrics = topic_metrics[topic_key]
            metrics["total"] += 1
            metrics["total_time"] += answer.time_taken_seconds or 0
            
            # Track performance by difficulty
            difficulty = question.difficulty_level or "Medium"  # Default to Medium if missing
            
            if difficulty == "Easy":
                metrics["total_easy"] += 1
                if is_answer_correct:
                    metrics["correct_easy"] += 1
            elif difficulty == "Medium":
                metrics["total_medium"] += 1
                if is_answer_correct:
                    metrics["correct_medium"] += 1
            elif difficulty == "Hard":
                metrics["total_hard"] += 1
                if is_answer_correct:
                    metrics["correct_hard"] += 1
        
        # Update UserTopicSummary for each topic
        for (paper_id, section_id, subsection_id), metrics in topic_metrics.items():
            topic_summary = db.query(UserTopicSummary).filter(
                UserTopicSummary.user_id == user_id,
                UserTopicSummary.paper_id == paper_id,
                UserTopicSummary.section_id == section_id,
                UserTopicSummary.subsection_id == subsection_id
            ).first()
            
            if not topic_summary:
                topic_summary = UserTopicSummary(
                    user_id=user_id,
                    paper_id=paper_id,
                    section_id=section_id,
                    subsection_id=subsection_id,
                    total_questions_answered_in_topic=0,
                    accuracy_easy_topic=0,
                    accuracy_medium_topic=0,
                    accuracy_hard_topic=0,
                    avg_time_per_question_topic=0
                )
            
            # Calculate new total questions for weighting
            new_total = topic_summary.total_questions_answered_in_topic + metrics["total"]
            
            # Update time average (weighted)
            if new_total > 0:
                old_weight = topic_summary.total_questions_answered_in_topic / new_total
                new_weight = metrics["total"] / new_total
                
                if metrics["total"] > 0:
                    new_avg_time = metrics["total_time"] / metrics["total"]
                    topic_summary.avg_time_per_question_topic = (
                        (topic_summary.avg_time_per_question_topic * old_weight) +
                        (new_avg_time * new_weight)
                    )
            
            # Update accuracy metrics by difficulty
            if metrics["total_easy"] > 0:
                accuracy_easy = (metrics["correct_easy"] / metrics["total_easy"]) * 100
                topic_summary.accuracy_easy_topic = accuracy_easy
                
            if metrics["total_medium"] > 0:
                accuracy_medium = (metrics["correct_medium"] / metrics["total_medium"]) * 100
                topic_summary.accuracy_medium_topic = accuracy_medium
                
            if metrics["total_hard"] > 0:
                accuracy_hard = (metrics["correct_hard"] / metrics["total_hard"]) * 100
                topic_summary.accuracy_hard_topic = accuracy_hard
            
            topic_summary.total_questions_answered_in_topic = new_total
            
            db.add(topic_summary)
        
        # Commit all changes
        db.commit()
        logger.info(f"Successfully aggregated performance data for attempt ID {attempt_id}")
        
    except Exception as e:
        logger.error(f"Error in performance aggregation task: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        db.rollback()
    finally:
        # Always close the database session
        db.close()
