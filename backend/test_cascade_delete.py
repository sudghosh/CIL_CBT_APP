"""
Test script to verify cascading delete functionality for papers, sections, subsections, and questions.

Run this script after applying the database migrations to verify that the cascade delete fix works correctly.
"""
import sys
import time
import logging
import os
from sqlalchemy.orm import Session
from sqlalchemy import func, text

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the src directory to the path so we can import our models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

try:
    from database.database import get_db
    from database.models import Paper, Section, Subsection, Question, QuestionOption
except ImportError as e:
    logger.error(f"Import error: {e}")
    logger.error("Make sure this script is run from the backend directory")
    sys.exit(1)

def test_cascade_delete():
    """Test that deleting a paper cascades to sections, subsections, and questions."""
    logger.info("Starting cascade delete test...")
    
    # Get a database session
    db = next(get_db())
    
    try:
        # Get counts before deletion
        paper_count_before = db.query(func.count(Paper.paper_id)).scalar()
        section_count_before = db.query(func.count(Section.section_id)).scalar()
        subsection_count_before = db.query(func.count(Subsection.subsection_id)).scalar()
        question_count_before = db.query(func.count(Question.question_id)).scalar()
        
        logger.info(f"Before deletion: {paper_count_before} papers, {section_count_before} sections, "
                   f"{subsection_count_before} subsections, {question_count_before} questions")
        
        # Find a paper that has sections, subsections, and questions
        # Using raw SQL for more flexibility
        sql = text("""
            SELECT p.paper_id, p.paper_name, 
                   COUNT(DISTINCT s.section_id) as section_count, 
                   COUNT(DISTINCT sub.subsection_id) as subsection_count,
                   COUNT(DISTINCT q.question_id) as question_count
            FROM papers p
            LEFT JOIN sections s ON s.paper_id = p.paper_id
            LEFT JOIN subsections sub ON sub.section_id = s.section_id
            LEFT JOIN questions q ON q.paper_id = p.paper_id
            GROUP BY p.paper_id, p.paper_name
            HAVING COUNT(DISTINCT s.section_id) > 0 
               AND COUNT(DISTINCT sub.subsection_id) > 0
               AND COUNT(DISTINCT q.question_id) > 0
            ORDER BY question_count DESC
            LIMIT 1
        """)
        
        result = db.execute(sql).fetchone()
        
        if not result:
            logger.warning("No paper found with sections, subsections, and questions")
            logger.info("Creating test data for deletion test...")
            
            # Create test data
            test_paper = Paper(
                paper_name=f"Test Paper for Deletion {int(time.time())}",
                total_marks=100,
                description="Test paper for testing cascade deletion",
                is_active=True,
                created_by_user_id=1
            )
            db.add(test_paper)
            db.flush()
            
            test_section = Section(
                paper_id=test_paper.paper_id,
                section_name="Test Section",
                marks_allocated=50,
                description="Test section for cascade deletion"
            )
            db.add(test_section)
            db.flush()
            
            test_subsection = Subsection(
                section_id=test_section.section_id,
                subsection_name="Test Subsection",
                description="Test subsection for cascade deletion"
            )
            db.add(test_subsection)
            db.flush()
            
            test_question = Question(
                question_text="Test Question for cascade deletion?",
                question_type="MCQ",
                correct_option_index=0,
                paper_id=test_paper.paper_id,
                section_id=test_section.section_id,
                subsection_id=test_subsection.subsection_id,
                default_difficulty_level="Easy",
                created_by_user_id=1
            )
            db.add(test_question)
            db.flush()
            
            for i in range(4):
                option = QuestionOption(
                    question_id=test_question.question_id,
                    option_text=f"Option {i+1}",
                    option_order=i
                )
                db.add(option)
                
            db.commit()
            
            paper_id = test_paper.paper_id
            paper_name = test_paper.paper_name
            section_count = 1
            subsection_count = 1
            question_count = 1
            
            logger.info(f"Created test paper '{paper_name}' (ID: {paper_id}) with 1 section, 1 subsection, 1 question")
        else:
            paper_id, paper_name, section_count, subsection_count, question_count = result
            logger.info(f"Found paper '{paper_name}' (ID: {paper_id}) with {section_count} sections, "
                       f"{subsection_count} subsections, {question_count} questions")
        
        # Get details of sections, subsections, and questions that will be deleted
        sections = db.query(Section.section_id).filter(Section.paper_id == paper_id).all()
        section_ids = [s.section_id for s in sections]
        
        subsections = db.query(Subsection.subsection_id).filter(Subsection.section_id.in_(section_ids)).all()
        subsection_ids = [sub.subsection_id for sub in subsections]
        
        questions = db.query(Question.question_id).filter(Question.paper_id == paper_id).all()
        question_ids = [q.question_id for q in questions]
        
        logger.info(f"Section IDs that should be deleted: {section_ids}")
        logger.info(f"Subsection IDs that should be deleted: {subsection_ids}")
        logger.info(f"Question IDs that should be deleted: {question_ids}")
        
        # Delete the paper
        paper_to_delete = db.query(Paper).filter(Paper.paper_id == paper_id).first()
        if not paper_to_delete:
            logger.error(f"Paper with ID {paper_id} not found!")
            return
        
        logger.info(f"Deleting paper '{paper_name}' (ID: {paper_id})...")
        db.delete(paper_to_delete)
        db.commit()
        
        # Verify deletion
        paper_exists = db.query(Paper).filter(Paper.paper_id == paper_id).first() is not None
        sections_exist = db.query(func.count(Section.section_id)).filter(
            Section.section_id.in_(section_ids)).scalar() > 0 if section_ids else False
        subsections_exist = db.query(func.count(Subsection.subsection_id)).filter(
            Subsection.subsection_id.in_(subsection_ids)).scalar() > 0 if subsection_ids else False
        questions_exist = db.query(func.count(Question.question_id)).filter(
            Question.question_id.in_(question_ids)).scalar() > 0 if question_ids else False
        
        # Get counts after deletion
        paper_count_after = db.query(func.count(Paper.paper_id)).scalar()
        section_count_after = db.query(func.count(Section.section_id)).scalar()
        subsection_count_after = db.query(func.count(Subsection.subsection_id)).scalar()
        question_count_after = db.query(func.count(Question.question_id)).scalar()
        
        logger.info(f"After deletion: {paper_count_after} papers, {section_count_after} sections, "
                   f"{subsection_count_after} subsections, {question_count_after} questions")
        
        # Log results
        if not paper_exists and not sections_exist and not subsections_exist and not questions_exist:
            logger.info("CASCADE DELETE TEST PASSED! ???")
            logger.info("Paper and all related sections, subsections, and questions were deleted successfully")
            logger.info(f"Deleted: {paper_count_before - paper_count_after} papers, "
                      f"{section_count_before - section_count_after} sections, "
                      f"{subsection_count_before - subsection_count_after} subsections, "
                      f"{question_count_before - question_count_after} questions")
            return True
        else:
            logger.error("CASCADE DELETE TEST FAILED! ???")
            if paper_exists:
                logger.error(f"Paper {paper_id} still exists!")
            if sections_exist:
                logger.error(f"Some sections in {section_ids} still exist!")
            if subsections_exist:
                logger.error(f"Some subsections in {subsection_ids} still exist!")
            if questions_exist:
                logger.error(f"Some questions in {question_ids} still exist!")
            return False
    
    except Exception as e:
        logger.error(f"Error during cascade delete test: {e}")
        db.rollback()
        return False

if __name__ == "__main__":
    success = test_cascade_delete()
    sys.exit(0 if success else 1)
