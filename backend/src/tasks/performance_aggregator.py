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
    UserPerformanceProfile, UserOverallSummary, UserTopicSummary
)
import logging

logger = logging.getLogger(__name__)


async def performance_aggregation_task(attempt_id: int, db: Session):
    """
    Aggregates performance data from a test attempt and updates summary tables.
    
    Args:
        attempt_id: The ID of the TestAttempt to aggregate data from
        db: SQLAlchemy database session
    """
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
        correct_answers = sum(1 for a in answers if a.is_correct is True)
        incorrect_answers = sum(1 for a in answers if a.is_correct is False)
        unanswered = total_questions - answered_questions
        total_time_seconds = sum(a.time_taken_seconds for a in answers if a.time_taken_seconds is not None)
        
        avg_time_per_question = total_time_seconds / answered_questions if answered_questions > 0 else 0
        accuracy = (correct_answers / answered_questions) * 100 if answered_questions > 0 else 0
        
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
                if answer.is_correct:
                    metrics["correct_easy"] += 1
            elif difficulty == "Medium":
                metrics["total_medium"] += 1
                if answer.is_correct:
                    metrics["correct_medium"] += 1
            elif difficulty == "Hard":
                metrics["total_hard"] += 1
                if answer.is_correct:
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
