#!/usr/bin/env python3
"""
Debug script to identify why get_personalized_questions is returning only 46 questions instead of 100.
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from datetime import date
from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
from database import Base
from models import Question, User, UserQuestionDifficulty, Paper, Section, Subsection

# Database setup
DATABASE_URL = "sqlite:///./cil_cbt_app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def debug_get_personalized_questions():
    """Debug the get_personalized_questions function."""
    db = SessionLocal()
    
    try:
        # Parameters from the failed test
        user_id = 1  # Assuming user_id=1 from logs
        paper_id = 1  # Paper 1 as mentioned in the conversation
        section_id = None  # Based on the logs
        subsection_id = None
        question_count = 100  # Requested count
        difficulty_strategy = "balanced"
        
        print(f"🔍 DEBUG: get_personalized_questions parameters:")
        print(f"  user_id: {user_id}")
        print(f"  paper_id: {paper_id}")
        print(f"  section_id: {section_id}")
        print(f"  subsection_id: {subsection_id}")
        print(f"  question_count: {question_count}")
        print(f"  difficulty_strategy: {difficulty_strategy}")
        print()
        
        # Step 1: Check total questions for paper
        base_query = db.query(Question).filter(
            Question.paper_id == paper_id,
            Question.valid_until >= date.today()
        )
        
        if section_id:
            base_query = base_query.filter(Question.section_id == section_id)
        if subsection_id:
            base_query = base_query.filter(Question.subsection_id == subsection_id)
        
        all_questions = base_query.all()
        print(f"📊 Total questions available: {len(all_questions)}")
        
        # Step 2: Check user's question difficulty data
        user_difficulties = db.query(UserQuestionDifficulty).filter(
            UserQuestionDifficulty.user_id == user_id
        ).all()
        
        print(f"📊 User difficulty records: {len(user_difficulties)}")
        
        # Create mapping
        user_question_map = {uqd.question_id: uqd for uqd in user_difficulties}
        
        # Step 3: Categorize questions
        difficult_questions = []
        easy_questions = []
        new_questions = []
        
        for question in all_questions:
            user_data = user_question_map.get(question.question_id)
            
            if not user_data:
                new_questions.append(question)
            else:
                if user_data.attempts == 0:
                    new_questions.append(question)
                else:
                    success_rate = user_data.correct_answers / user_data.attempts
                    if success_rate < 0.6 or user_data.difficulty_level == 'hard':
                        difficult_questions.append(question)
                    else:
                        easy_questions.append(question)
        
        print(f"📊 Question categorization:")
        print(f"  Difficult questions: {len(difficult_questions)}")
        print(f"  Easy questions: {len(easy_questions)}")
        print(f"  New questions: {len(new_questions)}")
        print()
        
        # Step 4: Apply balanced strategy
        if difficulty_strategy == "balanced":
            target_difficult = int(question_count * 0.5)  # 50
            target_new = int(question_count * 0.3)       # 30
            target_easy = question_count - target_difficult - target_new  # 20
            
            print(f"📊 Balanced strategy targets:")
            print(f"  Target difficult: {target_difficult}")
            print(f"  Target new: {target_new}")
            print(f"  Target easy: {target_easy}")
            print()
            
            selected_questions = []
            selected_questions.extend(difficult_questions[:target_difficult])
            selected_questions.extend(new_questions[:target_new])
            selected_questions.extend(easy_questions[:target_easy])
            
            print(f"📊 After initial selection: {len(selected_questions)} questions")
            print(f"  From difficult: {len(difficult_questions[:target_difficult])}")
            print(f"  From new: {len(new_questions[:target_new])}")
            print(f"  From easy: {len(easy_questions[:target_easy])}")
            print()
            
            # Fill remaining slots
            remaining_needed = question_count - len(selected_questions)
            print(f"📊 Remaining needed: {remaining_needed}")
            
            if remaining_needed > 0:
                remaining_questions = [q for q in all_questions if q not in selected_questions]
                print(f"📊 Remaining questions available: {len(remaining_questions)}")
                selected_questions.extend(remaining_questions[:remaining_needed])
                print(f"📊 After filling remaining: {len(selected_questions)} questions")
                print()
        
        # Step 5: Handle repetition if needed
        if len(selected_questions) < question_count:
            needed = question_count - len(selected_questions)
            print(f"📊 Need to repeat {needed} questions")
            
            # First repeat difficult questions
            repeat_questions = difficult_questions.copy()
            if not repeat_questions:
                repeat_questions = all_questions.copy()
            
            # Remove already selected questions from repeat pool
            repeat_pool = [q for q in repeat_questions if q not in selected_questions]
            print(f"📊 Repeat pool size: {len(repeat_pool)}")
            
            # If still not enough, repeat any questions
            if len(repeat_pool) < needed:
                repeat_pool = all_questions.copy()
                print(f"📊 Expanded repeat pool size: {len(repeat_pool)}")
            
            # Add repeated questions
            import random
            random.shuffle(repeat_pool)
            to_add = repeat_pool[:needed]
            selected_questions.extend(to_add)
            print(f"📊 Added {len(to_add)} repeated questions")
            
        # Final limit
        final_questions = selected_questions[:question_count]
        print(f"📊 Final result: {len(final_questions)} questions")
        
        # Analyze what happened
        if len(final_questions) < question_count:
            print(f"❌ ERROR: Still missing {question_count - len(final_questions)} questions!")
        else:
            print(f"✅ SUCCESS: Got the requested {question_count} questions")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_get_personalized_questions()
