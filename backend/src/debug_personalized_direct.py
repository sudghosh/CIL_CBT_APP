#!/usr/bin/env python3
"""
Debug script to test the get_personalized_questions function directly.
"""
import sys
import os
sys.path.append('/app/src')

from database.connection import get_db
from routers.tests import get_personalized_questions

def test_personalized_questions():
    """Test the get_personalized_questions function directly."""
    db = next(get_db())
    
    # Test with same parameters as in the mock test
    questions = get_personalized_questions(
        db=db,
        user_id=1,  # binty.ghosh@gmail.com
        paper_id=1,
        section_id=1,
        subsection_id=None,
        question_count=100,
        difficulty_strategy="balanced"
    )
    
    print(f"✅ Function returned {len(questions)} questions")
    
    # Check for duplicates
    question_ids = [q.question_id for q in questions]
    unique_ids = set(question_ids)
    print(f"📊 Unique question IDs: {len(unique_ids)}")
    print(f"📊 Total questions: {len(questions)}")
    
    if len(questions) != len(unique_ids):
        print(f"🔄 {len(questions) - len(unique_ids)} questions are repeated")
        
        # Show which questions are repeated
        from collections import Counter
        id_counts = Counter(question_ids)
        repeated = {qid: count for qid, count in id_counts.items() if count > 1}
        print(f"🔄 Repeated questions: {repeated}")
    
    return questions

if __name__ == "__main__":
    questions = test_personalized_questions()
